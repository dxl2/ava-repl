import Avalanche from "avalanche";
import { log } from "./AppLog";
import { AvaKeystoreCache } from "./AvaKeystoreCache";

export class AvaKeystoreUser {
    constructor(public username:string, public password:string=null) {}
}


export class AvaClient {
    static NATIVE_ASSET = "AVAX"
    nodeId:string
    networkName:string
    keystoreCache = new AvaKeystoreCache()
    activeAddress: string

    constructor(public ava: Avalanche) {        
    }

    async init() {
        this.nodeId = await this.ava.Info().getNodeID()
        this.networkName = await this.ava.Info().getNetworkName()
    }

    setActiveAddress(addr: string) {
        this.activeAddress = addr
    }

    async getAssetName(assetId:string) {
        try {
            let res = await this.ava.XChain().getAssetDescription(assetId)
            return res.name
        } catch (error) {
            log.error(error)
            return null
        }
    }
}