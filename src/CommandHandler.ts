import { App } from "./App";
import { AvaKeystoreUser } from "./AvaClient";
import { log } from "./AppLog";
import { Debug } from "./Debug";
import { OutputPrinter } from "./OutputPrinter";
import { BN } from "bn.js"
import { StringUtility } from "./StringUtility";
import 'reflect-metadata'
import { PendingTxState } from "./PendingTxService";
import * as moment from 'moment';

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
    name: string
    context: string
    countRequiredFields = 0

    constructor(public fields: FieldSpec[], public description:string) {
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
        console.log(`${prefix}- ${this.description}`)
        console.log()
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
    @command(new CommandSpec([], "Show current node ID"))
    nodeId() {
        console.log(App.avaClient.nodeId)
        return App.avaClient.nodeId
    }

    @command(new CommandSpec([], "Show current node version"))
    async nodeVersion() {
        let ver = await App.ava.Info().getNodeVersion()
        console.log(ver)
        return ver
    }

    @command(new CommandSpec([], "Show the peers connected to the node"))
    async peers() {
        let peers = await App.ava.Info().peers()
        console.log(Debug.pprint(peers))
        return peers
    }
}

export class HealthCommandHandler {
    @command(new CommandSpec([], "Check health of node"))
    async getLiveness() {
        let resp = await App.ava.Health().getLiveness()
        console.log(Debug.pprint(resp))
    }
}

export class KeystoreCommandHandler {
    @command(new CommandSpec([], "List the names of all users on the node"))
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

    @command(new CommandSpec([new FieldSpec("username"), new FieldSpec("password")], "Creates a user in the node’s database."))
    async createUser(username, password) {
        let user = await App.ava.NodeKeys().createUser(username, password)
        App.avaClient.keystoreCache.addUser(new AvaKeystoreUser(username, password))
        log.info(`created user: ${username}`)
    }
    
    @command(new CommandSpec([new FieldSpec("username"), new FieldSpec("password")], "Authenticate with a username and password"))
    async login(username:string, password:string) {
        // check if username and password is correct
        try {
        let res = await App.ava.XChain().listAddresses(username, password)
        } catch (error) {
            console.error("Incorrect username/password")
            return
        }

        App.avaClient.keystoreCache.addUser(new AvaKeystoreUser(username, password), true)

        if (!App.avaClient.keystoreCache.getActiveUser()) {
            App.avaClient.keystoreCache.setActiveUser(username)
        }

        console.log("Login successful")
    }

    @command(new CommandSpec([new FieldSpec("username")], "Sets the active user for future avm commands"))
    async setActive(username: string) {
        if (!App.avaClient.keystoreCache.hasUser(username)) {
            console.error("Please authenticate with this user first using command: login")
            return
        }

        App.avaClient.keystoreCache.setActiveUser(username)
        console.log("Set active user to: " + username)
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

    async createAddress() {
        let user = this._getActiveUser()
        if (!user) {
            return
        }
        
        let res = await App.ava.PChain().createAddress(user.username, user.password)
        log.info(`created`, res)
        console.log("Created platform account: " + res)
    }

    async listAddresses() {
        let user = this._getActiveUser()
        if (!user) {
            return
        }

        let res = await App.ava.PChain().listAddresses(user.username, user.password)
        if (!res || !res.length) {
            console.log("No accounts found")
            return
        }

        if (res && res.length) {
            console.log(`${res.length} P-Chain addresses`)
            for (let addr of res) {
                console.log(addr)
            }
        } else {
            console.log("No P-Chain addresses for current user")
        }

        // console.log(OutputPrinter.pprint(res))
    }

    @command(new CommandSpec([new FieldSpec("address")], "Fetch P-Chain account by address"))
    async getBalance(address:string) {
        let res = await App.ava.PChain().getBalance(address)
        console.log(OutputPrinter.pprint(res))
        return res
    }

    @command(new CommandSpec([new FieldSpec("dest"), new FieldSpec("sourceChain", false)], "Finalize a transfer of AVA from the X-Chain to the P-Chain."))
    async importAVAX(dest: string, sourceChain="X") {
        let user = this._getActiveUser()
        if (!user) {
            return
        }

        let res = await App.ava.PChain().importAVAX(user.username, user.password, dest, sourceChain)

        console.log("Issuing Transaction...")
        console.log(res)
        
        await this.issueTx(res)
        
    }

    // async getNextPayerNonce(dest:string) {
    //     let account = await this.getAccount(dest)
    //     if (!account) {
    //         throw new Error("Cannot find account " + dest)
    //     } else {
    //         return +account["nonce"] + 1
    //     }
    // }

    @command(new CommandSpec([new FieldSpec("amount"), new FieldSpec("x-dest"), new FieldSpec("payerNonce")], "Send AVA from an account on the P-Chain to an address on the X-Chain."))
    async exportAVAX(dest: string, amount: number, payerNonce:number) {        
        payerNonce = +payerNonce
        if (isNaN(payerNonce)) {
            console.error("Invalid payer nonce: " + payerNonce)
            return
        }

        // remove any prefix X-
        let dparts = dest.split("-")
        if (dparts.length > 1) {
            dest = dparts[1]
        }

        let user = this._getActiveUser()
        if (!user) {
            return
        }

        let res = await App.ava.PChain().exportAVAX(user.username, user.password, amount, dest)

        console.log("Issuing Transaction...")
        console.log(res)

        await this.issueTx(res)
    }

    @command(new CommandSpec([new FieldSpec("tx")], "Issue a transaction to the platform chain"))
    async issueTx(tx: string) {
        let txId = await App.ava.PChain().issueTx(tx)
        console.log("result txId: " + txId)
    }

    @command(new CommandSpec([new FieldSpec("destination"), new FieldSpec("stakeAmount"), new FieldSpec("endTimeDays")], "Add current node to default subnet (sign and issue the transaction)"))
    async addDefaultSubnetValidator(destination: string, stakeAmount:number, endTimeDays:number) {
        let now = moment().seconds(0).milliseconds(0)
        let startTime = now.clone().add(1, "minute")

        let endTime = now.clone().add(endTimeDays, "days")

        // let payerNonce = await this.getNextPayerNonce(destination)

        let user = this._getActiveUser()
        if (!user) {
            return
        }


        let args = [App.avaClient.nodeId,
            startTime.toDate(),
            endTime.toDate(),
            new BN(stakeAmount),
            destination]
        // log.info("ddx add", Debug.pprint(args))

        let txId = await App.ava.PChain().addValidator(
            user.username,
            user.password,
            App.avaClient.nodeId, 
            startTime.toDate(), 
            endTime.toDate(), 
            new BN(stakeAmount),
            destination)
        
        log.info("transactionId", txId)

        // console.log("signing transaction: ", unsignedTx)


        // let signedTx = await App.ava.PChain().sign(user.username, user.password, unsignedTx, destination)

        // console.log("issuing signed transaction: ", signedTx)
        
        // let res = await this.issueTx(signedTx)
        
    }

    @command(new CommandSpec([new FieldSpec("subnetId", false)], "List pending validator set for a subnet, or the Default Subnet if no subnetId is specified"))
    async getPendingValidators(subnetId?) {
        let pv = await App.ava.PChain().getPendingValidators(subnetId)
        console.log(pv)
    }

    @command(new CommandSpec([new FieldSpec("subnetId", false)], "List current validator set for a subnet, or the Default Subnet if no subnetId is specified"))
    async getCurrentValidators(subnetId?) {
        let pv = await App.ava.PChain().getCurrentValidators(subnetId)
        console.log(pv)
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

    @command(new CommandSpec([new FieldSpec("dest"), new FieldSpec("sourceChain")], "Import AVAX from a source chain."))
    async importAVAX(dest: string, sourceChain="P") {
        let user = this._getActiveUser()
        if (!user) {
            return
        }

        let res = await App.ava.XChain().importAVAX(user.username, user.password, dest, sourceChain)
        console.log("Submitted transaction: " + res)
        App.pendingTxService.add(res)
    }
    
    @command(new CommandSpec([new FieldSpec("dest"), new FieldSpec("amount")], "Send AVA from the X-Chain to an account on the P-Chain."))
    async exportAVAX(dest:string, amount:number) {
        let user = this._getActiveUser()
        if (!user) {
            return
        }

        let res = await App.ava.XChain().exportAVAX(user.username, user.password, dest, amount)
        console.log("Submitted transaction: " + res)
        App.pendingTxService.add(res)
    }

    @command(new CommandSpec([], "List all X-Chain addresses controlled by the current user"))
    async listAddresses() {
        let user = this._getActiveUser()
        if (!user) {
            return
        }
        
        let res = await App.ava.XChain().listAddresses(user.username, user.password)

        console.log("Addresses for keystore: " + user.username)
        if (!res || !res.length) {
            console.log("None found")
            return
        }
        
        for (let address of res) {
            console.log(address)
        }
    }

    @command(new CommandSpec([], "List balances of all X-Chain addresses controlled by the current user"))
    async listBalances() {
        let user = this._getActiveUser()
        if (!user) {
            return
        }
        
        let res = await App.ava.XChain().listAddresses(user.username, user.password)

        console.log("Addresses for keystore: " + user.username)
        if (!res || !res.length) {
            console.log("None found")
            return
        }
        
        for (let address of res) {
            await this.getAllBalances(address)
        }
    }

    @command(new CommandSpec([], "Create a new X-Chain addresses controlled by the current user"))
    async createAddress() {
        let user = this._getActiveUser()
        if (!user) {
            return
        }

        // log.info("ddx active", user)        
        let res = await App.ava.XChain().createAddress(user.username, user.password)
        console.log("Created Address:")
        console.log(res)
    }

    // async getBalance() {
    //     let res = await App.ava.XChain().getAllBalances()
    //     log.info("res", res)
    // }

    // async setActiveUser(username: string, password?: string) {
    //     console.log(`Set active user: ${username}`)
    //     App.avaClient.keystoreCache.addUser(new AvaKeystoreUser(username, password), true)
    // }

    @command(new CommandSpec([new FieldSpec("address"), new FieldSpec("asset", false)], "Get the balance of an asset in an account"))
    async getBalance(address:string, asset:string="AVAX") {
        let bal = await App.ava.XChain().getBalance(address, asset) as BN
        console.log(`Balance on ${address} for asset ${asset}:`, Debug.pprint(bal))
        // console.log(OutputPrinter.pprint(bal))
    }

    @command(new CommandSpec([new FieldSpec("address")], "Get the balance of all assets in an account"))
    async getAllBalances(address) {
        let bal = await App.ava.XChain().getAllBalances(address)
        console.log(`Balance on ${address} for all assets`)
        console.log(OutputPrinter.pprint(bal))
    }

    @command(new CommandSpec([new FieldSpec("fromAddress"), new FieldSpec("toAddress"), new FieldSpec("amount"), new FieldSpec("asset", false)], "Sends asset from an address managed by this node's keystore to a destination address"))
    async send(fromAddress:string, toAddress:string, amount:number, asset="AVAX") {
        log.info("ddx", this)
        let user = this._getActiveUser()
        if (!user) {
            return
        }

        let res = await App.ava.XChain().send(user.username, user.password, asset, amount, toAddress, [fromAddress])
        // console.log(`Balance on ${address} for all assets`)
        console.log("submitted transaction...")
        console.log(res)
        App.pendingTxService.add(res)
    }

    @command(new CommandSpec([new FieldSpec("txId")], "Check the status of a transaction id"))
    async getTxStatus(txId:string) {
        let res = await App.ava.XChain().getTxStatus(txId)
        console.log("Transaction state: " + res)
    }

    @command(new CommandSpec([], "Show the status transactions that have been submitted in this session"))
    async listTxs() {
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
    Platform = "platform",
    Health = "health"
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
    healthHandler: HealthCommandHandler
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
        this.healthHandler = new HealthCommandHandler()

        this.addCommandSpec(this.keystoreHandler, CommandContext.Keystore)
        this.addCommandSpec(this.infoHandler, CommandContext.Info)
        this.addCommandSpec(this.avmHandler, CommandContext.AVM)
        this.addCommandSpec(this.platformHandler, CommandContext.Platform)
        this.addCommandSpec(this.healthHandler, CommandContext.Health)

        // log.info("commandSpecMap", this.commandSpecMap)

        this.handlerMap = {
            "info": this.infoHandler,
            "keystore": this.keystoreHandler,
            "avm": this.avmHandler,
            "platform": this.platformHandler,
            "health": this.healthHandler
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
            map[commandName].name = commandName
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
                    console.log()
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
