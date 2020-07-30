import * as avalanche from "avalanche";
import BN from 'bn.js';
import { Buffer } from 'buffer/'
import { log } from "./AppLog";
import { AppRuntime } from "./AppRuntime";
import { AvaClient, AvaKeystoreUser } from "./AvaClient";
import { CommandHandler } from "./CommandHandler";
import { AvaKeystoreCache } from "./AvaKeystoreCache";
import { PendingTxService } from "./PendingTxService";

const AVA_KEYSTORE_USERNAME_ENV = "AVA_KEYSTORE_USERNAME"
const AVA_KEYSTORE_PASSWORD_ENV = "AVA_KEYSTORE_PASSWORD"

export class App {
    static ava: avalanche.Avalanche
    static avaClient: AvaClient
    static commandHandler: CommandHandler
    static pendingTxService = new PendingTxService()

    static async init() {
        if (this.ava) {
            return
        }

        this.ava = new avalanche.Avalanche("127.0.0.1", 9650, "http")
        this.avaClient = new AvaClient(this.ava)
        await this.avaClient.init()

        this.commandHandler = new CommandHandler()

        let envUser = process.env[AVA_KEYSTORE_USERNAME_ENV]
        let envPass = process.env[AVA_KEYSTORE_PASSWORD_ENV]

        if (envUser) {
            if (!envPass) {
                log.warn("Ignoring AVA_KEYSTORE_USERNAME because missing password")
            } else {
                log.info("Setting active user from environment")
                let au = new AvaKeystoreUser(envUser, envPass)
                this.avaClient.keystoreCache.addUser(au, true)
            }
        }

        this.pendingTxService.start()
    }
}