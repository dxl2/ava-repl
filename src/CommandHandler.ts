import { App } from "./App";
import { AvaKeystoreUser } from "./AvaClient";
import { log } from "./AppLog";
import { Debug } from "./Debug";
import { OutputPrinter } from "./OutputPrinter";
import BN from 'bn.js';
import { StringUtility } from "./StringUtility";

export class CommandError extends Error {
    code: any;
    constructor(message, code) {
        super(message);
        this.code = code
        this.name = this.constructor.name;

        Object.setPrototypeOf(this, CommandError.prototype);
    }
}


export class InfoCommandHandler {
    nodeId() {
        return App.avaClient.nodeId
    }
}

export class KeystoreCommandHandler {
    async listUsers() {
        let usernames = await App.ava.NodeKeys().listUsers()
        if (!usernames || !usernames.length) {
            console.log("No users found")
            return
        }

        console.log(`${usernames.length} users found:`)
        for (let name of usernames) {
            console.log(name)
        }

        // return res
    }

    async createUser(username, password) {
        if (!username) {
            log.error("missing username")
            return
        }

        if (!password) {
            log.error("missing password")
            return
        }

        let user = await App.ava.NodeKeys().createUser(username, password)
        App.avaClient.keystoreCache.addUser(new AvaKeystoreUser(username, password))
        log.info(`created user: ${username}`)
    }
    
    async setUser(username:string, password?:string) {
        App.avaClient.keystoreCache.addUser(new AvaKeystoreUser(username, password), true)
    }
}

export class AvmCommandHandler {
    _getActiveUser() {
        let user = App.avaClient.keystoreCache.getActiveUser()
        if (!user) {
            console.log("Set active user first with setUser")
        }

        return user
    }

    async listAddresses() {
        let user = this._getActiveUser()
        if (!user) {
            return
        }
        
        let res = await App.ava.AVM().listAddresses(user.username, user.password)

        console.log("Addresses for keystore: " + user.username)
        if (!res || !res.length) {
            console.log("None found")
            return
        }
        
        for (let address of res) {
            console.log(address)
        }
    }

    async createAddress() {
        let user = this._getActiveUser()
        if (!user) {
            return
        }

        // log.info("ddx active", user)        
        let res = await App.ava.AVM().createAddress(user.username, user.password)
        console.log("Created Address:")
        console.log(res)
    }

    // async getBalance() {
    //     let res = await App.ava.AVM().getAllBalances()
    //     log.info("res", res)
    // }

    async setActiveUser(username: string, password?: string) {
        console.log(`Set active user: ${username}`)
        App.avaClient.keystoreCache.addUser(new AvaKeystoreUser(username, password), true)
    }

    async getBalance(address:string, asset:string="AVA") {
        log.info("ddx get bal", address, asset)
        let bal = await App.ava.AVM().getBalance(address, asset) as BN
        console.log(`Balance on ${address} for asset ${asset}: ` + bal.toString(10))
        // console.log(OutputPrinter.pprint(bal))
    }

    async getAllBalances(address) {
        let bal = await App.ava.AVM().getAllBalances(address)
        console.log(`Balance on ${address} for all assets`)
        console.log(OutputPrinter.pprint(bal))
    }

    async send(fromAddress:string, toAddress:string, amount:number, asset="AVA") {
        log.info("ddx", this)
        let user = this._getActiveUser()
        if (!user) {
            return
        }

        let res = await App.ava.AVM().send(user.username, user.password, asset, amount, toAddress, [fromAddress])
        // console.log(`Balance on ${address} for all assets`)
        console.log("submitted transaction...")
        console.log(OutputPrinter.pprint(res))
    }

    async checkTx(txId:string) {
        let res = await App.ava.AVM().getTxStatus(txId)
        console.log("Transaction state: " + res)
    }
}

export enum CommandContext {
    Info = "info",
    Keystore = "keystore",
    AVM = "avm"
}


export class CommandHandler {
    infoHandler: InfoCommandHandler
    keystoreHandler: KeystoreCommandHandler
    avmHandler: AvmCommandHandler
    handlerMap
    context: CommandContext

    contextMethodMap:{[key:string]:string[]} = {}

    constructor() {
        log.info("init CommandHandler")
        this.infoHandler = new InfoCommandHandler()
        this.keystoreHandler = new KeystoreCommandHandler()
        this.avmHandler = new AvmCommandHandler()

        this.handlerMap = {
            "info": this.infoHandler,
            "keystore": this.keystoreHandler,
            "avm": this.avmHandler
        }

        for (let context in this.handlerMap) {
            this.contextMethodMap[context] = []

            for (var m in this.handlerMap[context]) {
                // log.info("ddx", m)
                if (m.startsWith("_")) {
                    continue
                }

                this.contextMethodMap[context].push(m)
            }            
        }
    }

    getTopLevelCommands() {
        let out = []
        out.push("help")

        for (let context in this.handlerMap) {
            out.push(context)
        }

        // log.info("tlc", out)
        return out
    }

    getContextCommands(context: CommandContext) {
        return this.contextMethodMap[context]
    }

    printHelp() {
        log.info("ddx", this.contextMethodMap)
        
        console.log("SUPPORTED COMMANDS:")
        for (let context in this.contextMethodMap) {
            console.log(context)
            for (let method of this.contextMethodMap[context]) {
                console.log(`\t${method}`)
            }

            console.log("\n")
        }
    }

    async handleCommand(cmd:string) {
        let params = StringUtility.splitTokens(cmd)

        if (params.length == 1) {
            if (params[0] == "help") {
                this.printHelp()
                return
            }
        }

        if (params.length < 2) {
            console.error("Invalid command. Type help to see all supported commands")
        }

        let context = params.shift()
        let method = params.shift()

        let handler = this.handlerMap[context]
        if (!handler) {
            throw new CommandError("Unknown context: " + context, "not_found")
        }

        let methodFn = handler[method]
        if (!methodFn) {
            throw new CommandError(`Unknown method ${method} in context ${context}`, "not_found")
        }

        try {
            await methodFn.call(handler, ...params)
        } catch (error) {
            log.error(error)
        }
    }

}

