import Avalanche from "avalanche";
import { log } from "./AppLog";
import { AvaKeystoreCache } from "./AvaKeystoreCache";

export class AvaKeystoreUser {
    constructor(public username:string, public password:string=null) {}
}


export class AvaClient {
    nodeId:string
    keystoreCache = new AvaKeystoreCache()
    activeAddress: string

    constructor(public ava: Avalanche) {        
    }

    async init() {
        this.nodeId = await this.ava.Info().getNodeID()
    }

    setActiveAddress(addr: string) {
        this.activeAddress = addr
    }
}