import * as avalanche from "avalanche";
import BN from 'bn.js';
import { Buffer } from 'buffer/'
import { log } from "./AppLog";
import { AppRuntime } from "./AppRuntime";
import { AvaClient, AvaKeystoreUser } from "./AvaClient";
import { CommandHandler } from "./CommandHandler";
import { AvaKeystoreCache } from "./AvaKeystoreCache";
import { PendingTxService } from "./PendingTxService";
import { CommandPromptHandler } from "./CommandPrompt";

const AVA_KEYSTORE_USERNAME_ENV = "AVA_KEYSTORE_USERNAME"
const AVA_KEYSTORE_PASSWORD_ENV = "AVA_KEYSTORE_PASSWORD"

export class App {
    static isConnected = false
    static ava: avalanche.Avalanche
    static avaClient: AvaClient
    static commandHandler: CommandHandler
    static pendingTxService = new PendingTxService()
    static isStandaloneMode = false
    static isPromptActive = false
    static promptHandler: CommandPromptHandler

    static async init(isStandalone=false) {
        if (this.ava) {
            return
        }

        this.isStandaloneMode = isStandalone

        await this.connectAvaNode()

        this.commandHandler = new CommandHandler()

        this.pendingTxService.start()
    }

    static printNodeInfo() {
        if (this.isStandaloneMode)
        {
            return
        }

        console.log("*************************************************")
        console.log("Avalanche Shell initialized.")
        console.log()

        if (!App.isConnected) {
            console.log("Disconnected")
        } else {
            console.log("Connected")
            console.log("Network Name: " + App.avaClient.networkName)
            console.log("Node ID: " + App.avaClient.nodeId)
            console.log(`Node Address: ${App.ava.getProtocol()}://${App.ava.getIP()}:${App.ava.getPort()}`)
        }

        console.log("*************************************************")
    }

    static async connectAvaNode(address: string="127.0.0.1", port:number=9650, protocol:string="http", networkId?) {
        try {            
            this.ava = new avalanche.Avalanche(address, port, protocol, networkId)
            this.avaClient = new AvaClient(this.ava)
            await this.avaClient.init()
            this.isConnected = true
            this.printNodeInfo()

            let envUser = process.env[AVA_KEYSTORE_USERNAME_ENV]
            let envPass = process.env[AVA_KEYSTORE_PASSWORD_ENV]

            if (envUser) {
                if (!envPass) {
                    log.warn("Ignoring AVA_KEYSTORE_USERNAME because missing password")
                } else {
                    if (!this.isStandaloneMode)
                    {
                        console.log("Setting active keystore username from environment: " + envUser)
                    }
                    
                    let au = new AvaKeystoreUser(envUser, envPass)
                    this.avaClient.keystoreCache.addUser(au, true)
                }
            }
        } catch (error) {
            console.error("Failed to connect to AVA node.", error.toString())
            this.isConnected = false
        }
    }

    static getActiveUser() {
        let user = App.avaClient.keystoreCache.getActiveUser()
        if (!user) {
            console.log("Missing user. Set active user with command: 'keystore login' or create user with 'keystore createUser'")
        }

        return user
    }
}