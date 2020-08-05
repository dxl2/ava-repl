import { App } from "./App";
import { AvaKeystoreUser } from "./AvaClient";
import { log } from "./AppLog";
import { Debug } from "./Debug";
import { OutputPrinter } from "./OutputPrinter";
import BN from 'bn.js';
import { StringUtility } from "./StringUtility";
import 'reflect-metadata'
import { PendingTxState } from "./PendingTxService";

class FieldSpec {
    constructor(public name:string, public isRequired=true) {

    }

    get toHelpString() {
        if (this.isRequired) {
            return `<${this.name}>`
        } else {
            return `[${this.name}]`
        }
    }
}

class CommandSpec {
    context: string
    countRequiredFields = 0

    constructor(public name: string, public fields: FieldSpec[]) {
        for (let field of fields) {
            if (field.isRequired) {
                this.countRequiredFields++
            }
        }
    }

    validateInput(...params) {
        if (params.length != this.countRequiredFields) {
            return false
        }

        return true
    }

    printUsage(prefix="") {
        let out = `${this.name}`
        let fieldStrs = []

        for (let field of this.fields) {
            fieldStrs.push(field.toHelpString)
        }

        if (fieldStrs.length) {
            out += " " + fieldStrs.join(" ")
        }
        
        console.log(`${prefix}${out}`)
    }

    get id() {
        return `${this.context}_${this.name}`
    }
}

const commandsMetadata = Symbol("commands");

export function command(definition: any) {
    // log.error(`defining column`, definition)
    // return a function that binds the property name to metadata input (definition)
    return (target: object, propertyKey: string) => {
        let properties: {} = Reflect.getMetadata(commandsMetadata, target);

        if (properties) {
            properties[propertyKey] = definition;
        } else {
            properties = {}
            properties[propertyKey] = definition;
            Reflect.defineMetadata(commandsMetadata, properties, target);
        }
    }
}

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

    @command(new CommandSpec("createUser", [new FieldSpec("username"), new FieldSpec("password")]))
    async createUser(username, password) {
        let user = await App.ava.NodeKeys().createUser(username, password)
        App.avaClient.keystoreCache.addUser(new AvaKeystoreUser(username, password))
        log.info(`created user: ${username}`)
    }
    
    @command(new CommandSpec("setUser", [new FieldSpec("username"), new FieldSpec("password")]))
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

    @command(new CommandSpec("getAccount", [new FieldSpec("address")]))
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

    @command(new CommandSpec("importAva", [new FieldSpec("dest")]))
    async importAva(dest: string) {
        let user = this._getActiveUser()
        if (!user) {
            return
        }

        let res = await App.ava.AVM().importAVA(user.username, user.password, dest)
        console.log("Submitted transaction: " + res)
    }
    
    @command(new CommandSpec("exportAva", [new FieldSpec("amount"), new FieldSpec("dest")]))
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

    // async setActiveUser(username: string, password?: string) {
    //     console.log(`Set active user: ${username}`)
    //     App.avaClient.keystoreCache.addUser(new AvaKeystoreUser(username, password), true)
    // }

    @command(new CommandSpec("getBalance", [new FieldSpec("address"), new FieldSpec("asset", false)]))
    async getBalance(address:string, asset:string="AVA") {
        let bal = await App.ava.AVM().getBalance(address, asset) as BN
        console.log(`Balance on ${address} for asset ${asset}: ` + bal.toString(10))
        // console.log(OutputPrinter.pprint(bal))
    }

    @command(new CommandSpec("getAllBalances", [new FieldSpec("address")]))
    async getAllBalances(address) {
        let bal = await App.ava.AVM().getAllBalances(address)
        console.log(`Balance on ${address} for all assets`)
        console.log(OutputPrinter.pprint(bal))
    }

    @command(new CommandSpec("send", [new FieldSpec("fromAddress"), new FieldSpec("toAddress"), new FieldSpec("amount"), new FieldSpec("asset", false)]))
    async send(fromAddress:string, toAddress:string, amount:number, asset="AVA") {
        log.info("ddx", this)
        let user = this._getActiveUser()
        if (!user) {
            return
        }

        let res = await App.ava.AVM().send(user.username, user.password, asset, amount, toAddress, [fromAddress])
        // console.log(`Balance on ${address} for all assets`)
        console.log("submitted transaction...")
        console.log(res)
        App.pendingTxService.add(res)
    }

    @command(new CommandSpec("checkTx", [new FieldSpec("txId")]))
    async checkTx(txId:string) {
        let res = await App.ava.AVM().getTxStatus(txId)
        console.log("Transaction state: " + res)
    }

    async checkTxs() {
        let ptxs = App.pendingTxService.list()
        if (!ptxs.length) {
            console.log("No transactions submitted")
            return
        }
        
        console.log("Submitted transactions")
        for (let tx of ptxs) {
            console.log(`${tx.id}\t\t${tx.ts.fromNow()}\t\t${tx.state || PendingTxState.Processing}`)
        }
    }
}

export enum CommandContext {
    Info = "info",
    Keystore = "keystore",
    AVM = "avm",
    Platform = "platform"
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
    commandSpecMap:{[key:string]: CommandSpec} = {}

    contextMethodMap:{[key:string]:string[]} = {}

    constructor() {
        // log.info("init CommandHandler")
        this.infoHandler = new InfoCommandHandler()
        this.keystoreHandler = new KeystoreCommandHandler()
        this.avmHandler = new AvmCommandHandler()
        this.platformHandler = new PlatformCommandHandler()

        this.addCommandSpec(this.keystoreHandler, CommandContext.Keystore)        
        this.addCommandSpec(this.infoHandler, CommandContext.Info)        
        this.addCommandSpec(this.avmHandler, CommandContext.AVM)        
        this.addCommandSpec(this.platformHandler, CommandContext.Platform)        

        // log.info("commandSpecMap", this.commandSpecMap)

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

    addCommandSpec(obj, context:string) {
        let map = Reflect.getMetadata(commandsMetadata, obj)
        for (let commandName in map) {            
            map[commandName].context = context
            this.commandSpecMap[map[commandName].id] = map[commandName]
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
        let out = []

        for (let cmd of this.contextMethodMap[context] || []) {
            out.push(cmd)
        }

        for (let cmd of META_COMMANDS) {
            out.push(cmd)
        }

        return out
    }

    printHelp(targetContext) {
        targetContext = targetContext || this.activeContext
        console.log("-------------------")
        console.log("SUPPORTED COMMANDS:")
        console.log("-------------------")
        for (let context in this.contextMethodMap) {
            if (targetContext && context != targetContext) {
                continue
            } else {
                console.log(context)
            }
            
            for (let method of this.contextMethodMap[context]) {
                let commandSpec = this.getCommandSpec(context, method)
                if (commandSpec) {
                    commandSpec.printUsage("    ")
                } else {
                    console.log(`    ${method}`)
                }                
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

    getCommandSpec(context, method) {
        let commandId = `${context}_${method}`
        return this.commandSpecMap[commandId]
    }

    async handleCommand(cmd:string) {
        let params = StringUtility.splitTokens(cmd)

        if (params.length < 1) {
            this.printHelpBasic()
            return
        }

        if (params.length == 1 && params[0] == "help") {
            this.printHelp(null)
            return
        } else if (params.length == 2 && this.isContext(params[0]) && params[1] == "help") {
            this.printHelp(params[0])
            return
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
        
        let commandSpec = this.getCommandSpec(context, method)
        if (commandSpec && !commandSpec.validateInput(...params)) {
            console.log("Invalid Arguments")
            commandSpec.printUsage("Usage: ")
            return
        }

        try {
            await methodFn.call(handler, ...params)
        } catch (error) {
            log.error(error)
        }
    }

}
