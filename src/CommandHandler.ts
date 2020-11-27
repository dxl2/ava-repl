import { App } from "./App";
import { AvaKeystoreUser, AvaClient } from "./AvaClient";
import { log } from "./AppLog";
import { Debug } from "./Debug";
import { OutputPrinter } from "./OutputPrinter";
import { BN } from "bn.js"
import { StringUtility } from "./StringUtility";
import 'reflect-metadata'
import { PendingTxState } from "./PendingTxService";
import * as moment from 'moment';
import { JsonFile } from "./JsonFile";
import { CommandRegistry } from "./CommandRegistry";
import { AddValidatorCommand, AddDelegatorCommand } from "./PlatformCommands";

const DEFAULT_KEY = "DEFAULT"

export class FieldSpec {
    constructor(public name:string, public defaultValue=null, public helpText=null) {

    }

    get toHelpString() {
        if (!this.defaultValue) {
            return `<${this.name}>`
        } else {
            return `[${this.name}=${this.defaultValue}]`
        }
    }
}

export class CommandSpec {
    name: string
    context: string
    countRequiredFields = 0

    constructor(public fields: FieldSpec[], public description:string) {
        for (let field of fields) {
            if (!field.defaultValue) {
                this.countRequiredFields++
            }
        }
    }

    validateInput(...params) {
        if (params.length < this.countRequiredFields) {
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
export { commandsMetadata }

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

export class MetricsCommandHandler {
    @command(new CommandSpec([], "Show node metrics"))
    async show() {
        let out = await App.ava.Metrics().getMetrics()
        console.log(out)
    }
}

export class InfoCommandHandler {
    @command(new CommandSpec([], "Show current node ID"))
    getNodeId() {
        console.log(App.avaClient.nodeId)
        return App.avaClient.nodeId
    }

    @command(new CommandSpec([], "Get transaction fee of the network"))
    async getTxFee() {
        let res = await App.ava.Info().getTxFee()
        console.log("txFee: " + res.txFee.toString(10))
        console.log("creationTxFee: " + res.creationTxFee.toString(10))
        return res
    }

    @command(new CommandSpec([], "Get the ID of the network this node is participating in."))
    async getNetworkId() {
        let res = await App.ava.Info().getNetworkID()
        console.log(res)
        return res
    }

    @command(new CommandSpec([], "Get the name of the network this node is participating in."))
    async getNetworkName() {
        let res = await App.ava.Info().getNetworkName()
        console.log(res)
        return res
    }

    @command(new CommandSpec([], "Show current node version"))
    async getNodeVersion() {
        let ver = await App.ava.Info().getNodeVersion()
        console.log(ver)    
        return ver
    }

    @command(new CommandSpec([], "Show the peers connected to the node"))
    async peers() {
        let peers = await App.ava.Info().peers()
        console.log(OutputPrinter.pprint(peers))
        return peers
    }

    @command(new CommandSpec([new FieldSpec("alias")], "Fetch the Blockchain ID for a given alias"))
    async getBlockchainID(alias) {
        let peers = await App.ava.Info().getBlockchainID(alias)
        console.log(OutputPrinter.pprint(peers))
        return peers
    }

    @command(new CommandSpec([new FieldSpec("chain")], "Check whether a given chain has finished bootstrapping"))
    async isBootstrapped(chain) {
        let peers = await App.ava.Info().isBootstrapped(chain)
        console.log(OutputPrinter.pprint(peers))
        return peers
    }
}

export class HealthCommandHandler {
    @command(new CommandSpec([], "Check health of node"))
    async getLiveness() {
        let resp = await App.ava.Health().getLiveness()
        console.log(OutputPrinter.pprint(resp))
    }
}

export class ShellCommandHandler {
    @command(new CommandSpec([new FieldSpec("address"), new FieldSpec("port"), new FieldSpec("protocol", "http"), new FieldSpec("networkId", DEFAULT_KEY) ], "Connect to a network"))
    async connect(address, port, protocol, networkId) {
        await App.connectAvaNode(address, port, protocol, networkId)
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
        console.log(`Created user: ${username}`)
    }

    @command(new CommandSpec([new FieldSpec("username"), new FieldSpec("password")], "Delete a user"))
    async deleteUser(username, password) {
        await App.ava.NodeKeys().deleteUser(username, password)
        App.avaClient.keystoreCache.removeUser(username)
        console.log(`Deleted user: ${username}`)
    }

    @command(new CommandSpec([new FieldSpec("username"), new FieldSpec("password")], "Export a user"))
    async exportUser(username, password) {
        let out = await App.ava.NodeKeys().exportUser(username, password)
        console.log(`Exported user`)
        console.log(out)
    }

    @command(new CommandSpec([new FieldSpec("username"), new FieldSpec("password"), new FieldSpec("serializedUser")], "Import a user"))
    async importUser(username, password, encryptedBlob) {
        await App.ava.NodeKeys().importUser(username, encryptedBlob, password)
        console.log(`Successfully imported user`)
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
    async setUser(username: string) {
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
            console.log("Missing user. Set active user with command: 'keystore login' or create user with 'keystore createUser'")
        }

        return user
    }

    @command(new CommandSpec([new FieldSpec("txId")], "Returns the specified transaction."))
    async getTx(txid) {
        let res = await App.ava.PChain().getTx(txid)
        console.log(res)
    }

    @command(new CommandSpec([], "Get upper bound on the number of AVAX that exist, denominated in nAVAX"))
    async getCurrentSupply() {
        let res = await App.ava.PChain().getCurrentSupply()
        console.log(res.toString(10))
    }

    @command(new CommandSpec([], "Returns the height of the last accepted block."))
    async getHeight() {
        let res = await App.ava.PChain().getHeight()
        console.log(res.toString(10))
    }

    @command(new CommandSpec([], "Get all the blockchains that exist (excluding the P-Chain)"))
    async getBlockchains() {
        let res = await App.ava.PChain().getBlockchains()
        console.log(OutputPrinter.pprint(res))
    }

    @command(new CommandSpec([new FieldSpec("addresses...")], "Get the amount of nAVAX staked by a set of addresses. The amount returned does not include staking rewards."))
    async getStake(...addresses) {
        let res = await App.ava.PChain().getStake(addresses)
        console.log(res.toString(10))
    }

    @command(new CommandSpec([], "Get the minimum amount of AVAX required to validate the Primary Network and the minimum amount of AVAX that can be delegated."))
    async getMinStake() {
        let res = await App.ava.PChain().getMinStake()
        // console.log(OutputPrinter.pprint(res))
        console.log("minValidatorStake:", res.minDelegatorStake.toString(10))
        console.log("minDelegatorStake:", res.minDelegatorStake.toString(10))
    }

    @command(new CommandSpec([], "Retrieve an assetID for a subnet’s staking asset. Currently this always returns the Primary Network’s staking assetID."))
    async getStakingAssetID() {
        let res = await App.ava.PChain().getStakingAssetID()
        console.log("AssetID", res)
    }

    @command(new CommandSpec([new FieldSpec("blockchainId")], "Get the status of a blockchain"))
    async getBlockchainStatus(blockchainId) {
        let res = await App.ava.PChain().getBlockchainStatus(blockchainId)
        console.log(res)
    }

    @command(new CommandSpec([new FieldSpec("subnetId")], "Get the IDs of the blockchains a Subnet validates."))
    async validates(subnetId) {
        let res = await App.ava.PChain().sampleValidators(subnetId)
        App.ava.PChain().validates(subnetId)
        console.log(OutputPrinter.pprint(res))
    }

    @command(new CommandSpec([new FieldSpec("blockchainId")], "Get the Subnet that validates a given blockchain."))
    async validatedBy(blockchainId) {
        let res = await App.ava.PChain().validatedBy(blockchainId)
        console.log(res)
    }

    @command(new CommandSpec([new FieldSpec("size"), new FieldSpec("subnetId")], "Sample validators from the specified Subnet. Retrieves a list of valiators IDs."))
    async sampleValidators(size, subnetId) {
        let res = await App.ava.PChain().sampleValidators(size, subnetId)
        console.log(OutputPrinter.pprint(res))
    }

    @command(new CommandSpec([], "Create a new P-Chain address"))
    async createAddress() {
        let user = this._getActiveUser()
        if (!user) {
            return
        }
        
        let res = await App.ava.PChain().createAddress(user.username, user.password)
        // log.info(`created`, res)
        console.log("Created platform account: " + res)
    }

    @command(new CommandSpec([], "Show all P-Chain addresses for current user"))
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

    @command(new CommandSpec([], "List balance for all your P-Chain accounts"))
    async listBalances() {
        let user = this._getActiveUser()
        if (!user) {
            return
        }

        let addresses = await App.ava.PChain().listAddresses(user.username, user.password)
        if (!addresses || !addresses.length) {
            console.log("No accounts found")
            return
        }

        for (let address of addresses) {
            let res = await App.ava.PChain().getBalance(address)
            console.log(`Address: ${address}`)
            console.log(OutputPrinter.pprint(res))
        }
    }

    @command(new CommandSpec([new FieldSpec("address")], "Fetch P-Chain account by address"))
    async getBalance(address:string) {
        let res = await App.ava.PChain().getBalance(address)
        console.log(OutputPrinter.pprint(res))
        return res
    }

    @command(new CommandSpec([new FieldSpec("threshold"), new FieldSpec("controlKeys...")], "Create a new Subnet. The Subnet’s ID is the same as this transaction’s ID."))
    async createSubnet(threshold: number, ...controlKeys) {
        let user = this._getActiveUser()
        if (!user) {
            return
        }

        let res = await App.ava.PChain().createSubnet(user.username, user.password, controlKeys, threshold)
        console.log("Created subnet id", res)
        return res
    }

    @command(new CommandSpec([new FieldSpec("subnetIds...", [])], "Get info about specified subnets. If no id specified, get info on all subnets"))
    async getSubnets(...subnetIds) {
        if (!subnetIds.length) {
            subnetIds = null
        }

        let res = await App.ava.PChain().getSubnets(subnetIds)
        console.log(OutputPrinter.pprint(res))
        return res
    }

    @command(new CommandSpec([new FieldSpec("txId")], "Check the status of a transaction id"))
    async getTxStatus(txId: string) {
        let res = await App.ava.PChain().getTxStatus(txId)
        console.log("Transaction status: ", res)
    }


    @command(new CommandSpec([new FieldSpec("dest"), new FieldSpec("sourceChain", "X")], "Finalize a transfer of AVA from the X-Chain to the P-Chain."))
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

    @command(new CommandSpec([new FieldSpec("amount"), new FieldSpec("x-dest")], "Send AVA from an account on the P-Chain to an address on the X-Chain."))
    async exportAVAX(amount: number, dest: string) {
        // remove any prefix X-
        // let dparts = dest.split("-")
        // if (dparts.length > 1) {
        //     dest = dparts[1]
        // }

        let user = this._getActiveUser()
        if (!user) {
            return
        }

        // log.info("ddx export", amount, dest)
        let res = await App.ava.PChain().exportAVAX(user.username, user.password, new BN(amount), dest)

        console.log("Issuing Transaction...")
        console.log(res)

        await this.issueTx(res)
    }

    @command(new CommandSpec([new FieldSpec("tx")], "Issue a transaction to the platform chain"))
    async issueTx(tx: string) {
        let txId = await App.ava.PChain().issueTx(tx)
        console.log("result txId: " + txId)
    }

    // @command(new CommandSpec([new FieldSpec("destination"), new FieldSpec("stakeAmount"), new FieldSpec("endTimeDays")], "Add current node to default subnet (sign and issue the transaction)"))
    // async addValidator(destination: string, stakeAmount:number, endTimeDays:number) {
    //     let now = moment().seconds(0).milliseconds(0)
    //     let startTime = now.clone().add(1, "minute")

    //     let endTime = now.clone().add(endTimeDays, "days")

    //     let user = this._getActiveUser()
    //     if (!user) {
    //         return
    //     }

    //     let txId = await App.ava.PChain().addValidator(
    //         user.username,
    //         user.password,
    //         App.avaClient.nodeId, 
    //         startTime.toDate(), 
    //         endTime.toDate(), 
    //         new BN(stakeAmount),
    //         destination,
    //         new BN(10))
        
    //     log.info("transactionId", txId)
    // }

    @command(new CommandSpec([new FieldSpec("nodeId"), new FieldSpec("subnetId"), new FieldSpec("weight"), new FieldSpec("endTimeDays")], "Add a validator to a Subnet other than the Primary Network."))
    async addSubnetValidator(nodeId:string, subnetId:string, weight: number, endTimeDays: number) {
        let now = moment().seconds(0).milliseconds(0)
        let startTime = now.clone().add(1, "minute")
        let endTime = now.clone().add(endTimeDays, "days")

        let user = this._getActiveUser()
        if (!user) {
            return
        }

        let txId = await App.ava.PChain().addSubnetValidator(
            user.username,
            user.password,
            nodeId,
            subnetId,
            startTime.toDate(),
            endTime.toDate(),
            weight)

        log.info("transactionId", txId)
    }

    @command(new CommandSpec([new FieldSpec("subnetId", DEFAULT_KEY)], "List pending validator set for a subnet, or the Default Subnet if no subnetId is specified"))
    async getPendingValidators(subnetId?) {
        let pv = await App.ava.PChain().getPendingValidators(subnetId)
        console.log(pv)
    }

    @command(new CommandSpec([new FieldSpec("subnetId", DEFAULT_KEY)], "List current validator set for a subnet, or the Default Subnet if no subnetId is specified"))
    async getCurrentValidators(subnetId?) {
        let pv = await App.ava.PChain().getCurrentValidators(subnetId)
        console.log(pv)
    }

    @command(new CommandSpec([new FieldSpec("subnetId", DEFAULT_KEY)], "Check if current node is a validator for a subnet, or the Default Subnet if no subnetId is specified"))
    async isCurrentValidator(subnetId?) {
        let found = false
        let nodeId = App.avaClient.nodeId
        let res = await App.ava.PChain().getCurrentValidators(subnetId)
        for (let valInfo of res["validators"]) {
            if (valInfo["nodeID"] == nodeId) {
                console.log("Current node is a validator")
                console.log(OutputPrinter.pprint(valInfo))
                found = true
            }
        }

        if (!found) {
            console.log("Current node is not a validator")
        }
    }

    @command(new CommandSpec([new FieldSpec("address")], "Export the private for the current keystore user"))
    async exportKey(address) {
        let user = this._getActiveUser()
        if (!user) {
            return
        }

        let res = await App.ava.PChain().exportKey(user.username, user.password, address)
        console.log(res)
    }

    @command(new CommandSpec([new FieldSpec("privateKey")], "Export the private for the current keystore user"))
    async importKey(privateKey) {
        let user = this._getActiveUser()
        if (!user) {
            return
        }

        let res = await App.ava.PChain().importKey(user.username, user.password, privateKey)
        console.log("Imported private key for address: " + res)
    }
}

export class AdminCommandHandler {
    @command(new CommandSpec([new FieldSpec("endpoint"), new FieldSpec("alias")], "Assign an API endpoint an alias, a different endpoint for the API. The original endpoint will still work. This change only affects this node; other nodes will not know about this alias."))
    async alias(endpoint, alias) {
        let res = await App.ava.Admin().alias(endpoint, alias)
        console.log(OutputPrinter.pprint(res))
    }

    @command(new CommandSpec([new FieldSpec("chain"), new FieldSpec("alias")], "Give a blockchain an alias, a different name that can be used any place the blockchain’s ID is used."))
    async aliasChain(chain, alias) {
        let res = await App.ava.Admin().aliasChain(chain, alias)
        console.log(OutputPrinter.pprint(res))
    }

    @command(new CommandSpec([], "Writes a profile of mutex statistics to lock.profile"))
    async lockProfile() {
        let res = await App.ava.Admin().lockProfile()
        console.log(OutputPrinter.pprint(res))
    }

    @command(new CommandSpec([], "Writes a memory profile of the to mem.profile"))
    async memoryProfile() {
        let res = await App.ava.Admin().memoryProfile()
        console.log(OutputPrinter.pprint(res))
    }

    @command(new CommandSpec([], "Start profiling the CPU utilization of the node. To stop, call stopCPUProfiler. On stop, writes the profile to cpu.profile"))
    async startCPUProfiler() {
        let res = await App.ava.Admin().startCPUProfiler()
        console.log(OutputPrinter.pprint(res))
    }

    @command(new CommandSpec([], "Stop the CPU profile that was previously started"))
    async stopCPUProfiler() {
        let res = await App.ava.Admin().stopCPUProfiler()
        console.log(OutputPrinter.pprint(res))
    }
}

export class AuthCommandHandler {
    @command(new CommandSpec([], "Assign an API endpoint an alias, a different endpoint for the API. The original endpoint will still work. This change only affects this node; other nodes will not know about this alias."))
    async alias(endpoint, alias) {
        let res = await App.ava.Admin().alias(endpoint, alias)
        OutputPrinter.pprint(res)
    }

    @command(new CommandSpec([], "Give a blockchain an alias, a different name that can be used any place the blockchain’s ID is used."))
    async aliasChain(chain, alias) {
        let res = await App.ava.Admin().aliasChain(chain, alias)
        OutputPrinter.pprint(res)
    }

    @command(new CommandSpec([], "Writes a profile of mutex statistics to lock.profile"))
    async lockProfile() {
        let res = await App.ava.Admin().lockProfile()
        OutputPrinter.pprint(res)
    }

    @command(new CommandSpec([], "Writes a memory profile of the to mem.profile"))
    async memoryProfile() {
        let res = await App.ava.Admin().memoryProfile()
        OutputPrinter.pprint(res)
    }

    @command(new CommandSpec([], "Start profiling the CPU utilization of the node. To stop, call stopCPUProfiler. On stop, writes the profile to cpu.profile"))
    async startCPUProfiler() {
        let res = await App.ava.Admin().startCPUProfiler()
        OutputPrinter.pprint(res)
    }

    @command(new CommandSpec([], "Stop the CPU profile that was previously started"))
    async stopCPUProfiler() {
        let res = await App.ava.Admin().stopCPUProfiler()
        OutputPrinter.pprint(res)
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

    @command(new CommandSpec([new FieldSpec("jsonFilePath")], "Given a JSON representation of this Virtual Machine’s genesis state, create the byte representation of that state."))
    async buildGenesis(jsonFilePath) {
        let jf = new JsonFile(jsonFilePath)
        let data = await jf.read()
        let res = await App.ava.XChain().buildGenesis(data)
        console.log(OutputPrinter.pprint(res))
    }

    @command(new CommandSpec([new FieldSpec("address")], "Export the private for the current keystore user"))
    async exportKey(address) {
        let user = this._getActiveUser()
        if (!user) {
            return
        }

        let res = await App.ava.XChain().exportKey(user.username, user.password, address)
        console.log(res)
    }

    @command(new CommandSpec([new FieldSpec("privateKey")], "Export the private for the current keystore user"))
    async importKey(privateKey) {
        let user = this._getActiveUser()
        if (!user) {
            return
        }

        let res = await App.ava.XChain().importKey(user.username, user.password, privateKey)
        console.log("Imported private key for address: " + res)
    }


    @command(new CommandSpec([new FieldSpec("assetId")], "Get an asset's name and symbol from asset id"))
    async getAssetDescription(assetId: string) {
        let res = await App.ava.XChain().getAssetDescription(assetId)
        console.log(`name: ${res.name}`)
        console.log(`description: ${res.symbol}`)
        // console.log(res)
    }

    @command(new CommandSpec([new FieldSpec("name"), new FieldSpec("symbol"), new FieldSpec("initialHolderAddress"), new FieldSpec("initialHolderAmount") ], "Create a fixed cap asset with default denomination."))
    async createFixedCapAsset(name: string, symbol: string, ...args) {
        let user = this._getActiveUser()
        if (!user) {
            return
        }

        let holderInfos = []

        if (0 != args.length % 2) {
            console.error("Unexpected number of holder arguments")
            return
        }

        while (args.length > 0) {
            let addr = args.shift()
            let amt = args.shift()
            holderInfos.push({address: addr, amount: amt})
        }

        let res = await App.ava.XChain().createFixedCapAsset(user.username, user.password, name, symbol, 0, holderInfos)
        App.pendingTxService.add(res)
    }

    @command(new CommandSpec([new FieldSpec("name"), new FieldSpec("symbol"), new FieldSpec("minterAddresses"), new FieldSpec("minterThreshold")], "Create a variable set asset. For a minter set, separate multiple minter addresses with comma."))
    async createVariableCapAsset(name: string, symbol: string, ...args) {
        let user = this._getActiveUser()
        if (!user) {
            return
        }

        let minterSets = []

        if (0 != args.length % 2) {
            console.error("Unexpected number of minterset arguments")
            return
        }

        while (args.length > 0) {
            let addrRaw = args.shift()
            let addresses = StringUtility.splitTokens(addrRaw)
            let threshold = args.shift()
            minterSets.push({ minters: addresses, threshold: threshold })
        }

        let res = await App.ava.XChain().createVariableCapAsset(user.username, user.password, name, symbol, 0, minterSets)
        console.log("Created Asset ID:", res)
        // App.pendingTxService.add(res)
    }

    @command(new CommandSpec([new FieldSpec("amount"), new FieldSpec("assetId"), new FieldSpec("toAddress"), new FieldSpec("minters")], "Mint more of a variable supply asset. This creates an unsigned transaction."))
    async mint(amount: number, assetId:string, toAddress:string, ...minters) {
        let user = this._getActiveUser()
        if (!user) {
            return
        }

        let res = await App.ava.XChain().mint(user.username, user.password, amount, assetId, toAddress, minters)
        console.log("Submitted transaction: " + res)
        App.pendingTxService.add(res)
    }


    @command(new CommandSpec([new FieldSpec("dest"), new FieldSpec("sourceChain", "P")], "Import AVAX from a source chain."))
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

        console.log("Addresses for keystore user: " + user.username)
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

        // console.log("Addresses for keystore: " + user.username)
        if (!res || !res.length) {
            console.log("None found")
            return
        }
        
        for (let address of res) {
            await this.getAllBalances(address)
            console.log()
        }
    }

    @command(new CommandSpec([new FieldSpec("txId")], "Returns the specified transaction."))
    async getTx(txid) {
        let res = await App.ava.XChain().getTx(txid)
        console.log(res)
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

    @command(new CommandSpec([new FieldSpec("address"), new FieldSpec("asset", "AVAX")], "Get the balance of an asset in an account"))
    async getBalance(address:string, asset:string="AVAX") {
        let bal = await App.ava.XChain().getBalance(address, asset) as BN
        console.log(`Balance on ${address} for asset ${asset}:`, OutputPrinter.pprint(bal))
        // console.log(OutputPrinter.pprint(bal))
    }

    @command(new CommandSpec([new FieldSpec("address")], "Get the balance of all assets in an account"))
    async getAllBalances(address) {
        let bal = await App.ava.XChain().getAllBalances(address)
        // log.info("ddx bal", bal)

        // populate asset names
        for (let entry of bal) {
            if (entry["asset"] != AvaClient.NATIVE_ASSET) {
                entry["name"] = await App.avaClient.getAssetName(entry["asset"])
            }
        }

        console.log(`Address ${address}`)
        console.log(OutputPrinter.pprint(bal))
    }

    @command(new CommandSpec([new FieldSpec("fromAddress"), new FieldSpec("toAddress"), new FieldSpec("amount"), new FieldSpec("asset", "AVAX")], "Sends asset from an address managed by this node's keystore to a destination address"))
    async send(fromAddress:string, toAddress:string, amount:number, asset="AVAX") {
        // log.info("ddx", this)
        let user = this._getActiveUser()
        if (!user) {
            return
        }

        let res = await App.ava.XChain().send(user.username, user.password, asset, amount, toAddress, [fromAddress])
        // console.log(`Balance on ${address} for all assets`)
        console.log("submitted transaction...")
        console.log(res)
        App.pendingTxService.add(res.txID)
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

    @command(new CommandSpec([new FieldSpec("tx")], "Issue a transaction to the X-chain"))
    async issueTx(tx: string) {
        let txId = await App.ava.XChain().issueTx(tx)
        console.log("result txId: " + txId)
    }

    @command(new CommandSpec([new FieldSpec("addresses_comma_separated"), new FieldSpec("limit", DEFAULT_KEY), new FieldSpec("startIndex", DEFAULT_KEY)], "Gets the UTXOs that reference a given address. If sourceChain is specified, then it will retrieve the atomic UTXOs exported from that chain to the X Chain."))
    async getUTXOs(addressesRaw:string, limit?, startIndex?) {
        let addresses = StringUtility.splitTokens(addressesRaw, /,/)
        let res = await App.ava.XChain().getUTXOs(addresses, limit, startIndex)
        console.log(OutputPrinter.pprint(res))
    }
}

export enum CommandContext {
    Metrics = "metrics",
    Info = "info",
    Keystore = "keystore",
    AVM = "avm",
    Platform = "platform",
    Health = "health",
    Shell = "shell",
    Admin = "admin"
}

const META_COMMANDS = [
    "help",
    "exit"
]

export class CommandHandler {
    metricsHandler: MetricsCommandHandler
    infoHandler: InfoCommandHandler
    keystoreHandler: KeystoreCommandHandler
    avmHandler: AvmCommandHandler
    adminHandler: AdminCommandHandler
    platformHandler: PlatformCommandHandler
    healthHandler: HealthCommandHandler
    shellHandler: ShellCommandHandler
    
    activeContext: string

    constructor() {
        // Default Command Handlers
        this.metricsHandler = new MetricsCommandHandler()
        this.infoHandler = new InfoCommandHandler()
        this.keystoreHandler = new KeystoreCommandHandler()
        this.avmHandler = new AvmCommandHandler()
        this.platformHandler = new PlatformCommandHandler()
        this.healthHandler = new HealthCommandHandler()
        this.shellHandler = new ShellCommandHandler()
        this.adminHandler = new AdminCommandHandler()

        CommandRegistry.registerCommandHandler(CommandContext.Metrics, this.metricsHandler)
        CommandRegistry.registerCommandHandler(CommandContext.AVM, this.avmHandler)
        CommandRegistry.registerCommandHandler(CommandContext.Admin, this.adminHandler)
        CommandRegistry.registerCommandHandler(CommandContext.Keystore, this.keystoreHandler)
        CommandRegistry.registerCommandHandler(CommandContext.Info, this.infoHandler)
        CommandRegistry.registerCommandHandler(CommandContext.Platform, this.platformHandler)
        CommandRegistry.registerCommandHandler(CommandContext.Health, this.healthHandler)
        CommandRegistry.registerCommandHandler(CommandContext.Shell, this.shellHandler)

        // Register command models
        CommandRegistry.registerCommandModel(new AddValidatorCommand())
        CommandRegistry.registerCommandModel(new AddDelegatorCommand())

    }

    getTopLevelCommands() {
        let out = []
        for (let cmd of META_COMMANDS) {
            out.push(cmd)
        }

        for (let context in CommandRegistry.handlerMap) {
            out.push(context)
        }

        // log.info("tlc", out)
        out.sort()
        return out
    }

    getContextCommands(context) {
        let out = CommandRegistry.getContextCommands(context)

        for (let cmd of META_COMMANDS) {
            out.push(cmd)
        }

        out.sort()
        return out
    }

    printHelp(targetContext) {
        targetContext = targetContext || this.activeContext
        console.log("-------------------")
        console.log("SUPPORTED COMMANDS:")
        console.log("-------------------")

        let contexts = CommandRegistry.getAllContexts()

        for (let context of contexts) {
            if (targetContext && context != targetContext) {
                continue
            } else {
                console.log(context)
            }
            
            for (let model of CommandRegistry.getCommnadModels(context))
            {
                model.printUsage("    ")
            }

            let methods = CommandRegistry.contextMethodMap[context].slice()
            methods.sort()

            for (let method of methods) {
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
        return CommandRegistry.handlerMap[context]
    }

    getCommandSpec(context, method) {
        let commandId = `${context}_${method}`
        return CommandRegistry.commandSpecMap[commandId]
    }

    async handleCommand(cmd:string) {
        if (App.isPromptActive)
        {
            return
        }

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

        let method = params.shift()

        let commandModel = CommandRegistry.getCommandModel(context, method)
        if (commandModel) {
            if (commandModel.requireKeystore() && !App.avaClient.keystoreCache.getActiveUser()) {
                console.log("Missing user. Set active user with command: 'keystore login' or create user with 'keystore createUser'")
                return
            }

            await commandModel.promptAndRun()
            return
        }

        let handler = CommandRegistry.handlerMap[context]
        if (!handler) {
            // throw new CommandError("Unknown context: " + context, "not_found")
            console.log("Unknown context or command")
            return
        }
       
        let methodFn = handler[method]
        if (!methodFn) {
            // throw new CommandError(`Unknown method ${method} in context ${context}`, "not_found")
            console.log(`Unknown method ${method} in context ${context}`)
            return
        }

        if (!App.isConnected) {
            console.error("Node is disconnected")
            console.log(`shell connect [ip=127.0.0.1] [port=9650] [protocol=http] <networkId>`)
            return
        }
        
        let commandSpec = this.getCommandSpec(context, method)
        if (commandSpec && !commandSpec.validateInput(...params)) {
            console.log("Invalid Arguments")
            commandSpec.printUsage("Usage: ")
            return
        }

        for (let i=0; i<params.length; i++) {
            if (params[i] == DEFAULT_KEY) {
                params[i] = undefined
            }
        }

        try {
            await methodFn.call(handler, ...params)
        } catch (error) {
            log.error(error)
        }
    }

}
