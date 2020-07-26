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

export class PlatformCommandHandler {
    _getActiveUser() {
        let user = App.avaClient.keystoreCache.getActiveUser()
        if (!user) {
            console.log("Set active user first with setUser")
        }

        return user
    }

    async createAccount() {
        let user = this._getActiveUser()
        if (!user) {
            return
        }
        
        let res = await App.ava.Platform().createAccount(user.username, user.password)
        log.info(`created`, res)
        console.log("Created platform account: " + res)
    }

    async listAccounts() {
        let user = this._getActiveUser()
        if (!user) {
            return
        }

        let res = await App.ava.Platform().listAccounts(user.username, user.password)
        if (!res || !res.length) {
            console.log("No accounts found")
            return
        }

        console.log(OutputPrinter.pprint(res))
    }

    async getAccount(address:string) {
        let res = await App.ava.Platform().getAccount(address)
        console.log(OutputPrinter.pprint(res))
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

    async importAva(dest: string) {
        let user = this._getActiveUser()
        if (!user) {
            return
        }

        let res = await App.ava.AVM().importAVA(user.username, user.password, dest)
        console.log("Submitted transaction: " + res)
    }
    
    async exportAva(amount:number, dest:string) {
        if (!amount) {
            console.warn("usage: exportAva <amount> <destination>")
            return
        }

        if (!dest) {
            console.warn("usage: exportAva <amount> <destination>")
            return
        }

        let user = this._getActiveUser()
        if (!user) {
            return
        }

        let res = await App.ava.AVM().exportAVA(user.username, user.password, dest, amount)
        console.log("Submitted transaction: " + res)
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

const META_COMMANDS = [
    "help",
    "exit"
]

export class CommandHandler {
    infoHandler: InfoCommandHandler
    keystoreHandler: KeystoreCommandHandler
    avmHandler: AvmCommandHandler
    platformHandler: PlatformCommandHandler
    handlerMap
    activeContext: string

    contextMethodMap:{[key:string]:string[]} = {}

    constructor() {
        log.info("init CommandHandler")
        this.infoHandler = new InfoCommandHandler()
        this.keystoreHandler = new KeystoreCommandHandler()
        this.avmHandler = new AvmCommandHandler()
        this.platformHandler = new PlatformCommandHandler()

        this.handlerMap = {
            "info": this.infoHandler,
            "keystore": this.keystoreHandler,
            "avm": this.avmHandler,
            "platform": this.platformHandler
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
        for (let cmd of META_COMMANDS) {
            out.push(cmd)
        }

        for (let context in this.handlerMap) {
            out.push(context)
        }

        // log.info("tlc", out)
        return out
    }

    getContextCommands(context) {
        let out = this.contextMethodMap[context] || []

        for (let cmd of META_COMMANDS) {
            out.push(cmd)
        }

        return out
    }

    printHelp() {
        console.log("-------------------")
        console.log("SUPPORTED COMMANDS:")
        console.log("-------------------")
        for (let context in this.contextMethodMap) {
            if (this.activeContext) {
                if (context != this.activeContext) {
                    continue
                }
            } else {
                console.log(context)
            }
            
            for (let method of this.contextMethodMap[context]) {
                console.log(`\t${method}`)
            }

            console.log("")
        }
    }

    printHelpBasic() {
        console.error("Invalid command. Type help to see all supported commands")
    }

    isContext(context) {
        return this.handlerMap[context]
    }

    async handleCommand(cmd:string) {
        let params = StringUtility.splitTokens(cmd)

        if (params.length < 1) {
            this.printHelpBasic()
            return
        }

        if (params.length == 1) {
            if (params[0] == "help") {
                this.printHelp()
                return
            }
        }        
        
        let context = this.activeContext

        if (!context) {
            if (params.length < 2) {
                this.printHelpBasic()
                return
            }

            context = params.shift()
        }

        let handler = this.handlerMap[context]
        if (!handler) {
            throw new CommandError("Unknown context: " + context, "not_found")
        }

        let method = params.shift()
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
