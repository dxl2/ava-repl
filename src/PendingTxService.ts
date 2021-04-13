import { PollableService } from "./PollableService";
import * as moment from 'moment';
import { App } from "./App";
import { log } from "./AppLog";

const EXPIRATION_TIMEOUT_SECONDS = 60
const MAX_PENDING_TX = 10

class PendingTx {    
    ts
    state

    constructor(public id: string, public expireTime) {
        this.ts = moment()
    }

    get isExpired() {
        return moment() > this.expireTime 
    }
}

export enum PendingTxState {
    Processing = "Processing",
    Accepted = "Accepted"
}

export class PendingTxService extends PollableService {
    pendingTxs:PendingTx[] = []
    cb:Function

    constructor() {
        super("PendingTxService", 3)
    }

    setCallback(cb) {
        this.cb = cb
    }

    async handleUpdate() { 
        for (let tx of this.pendingTxs) {            
            if (tx.isExpired) {
                continue
            }

            if (tx.state && tx.state != PendingTxState.Processing) {
                continue
            }

            tx.state = await App.ava.XChain().getTxStatus(tx.id)

            if (tx.state == PendingTxState.Accepted) {
                if (this.cb) {
                    this.cb(tx.id)
                }
            }
        }
    }

    list() {
        let out:PendingTx[] = []
        for (let ptx of this.pendingTxs) {
            out.push(ptx)
        }

        out.reverse()
        return out
    }

    add(txid:string) {
        this.pendingTxs.push(new PendingTx(txid, moment().add(EXPIRATION_TIMEOUT_SECONDS, "seconds")))

        if (this.pendingTxs.length > MAX_PENDING_TX) {
            this.pendingTxs.unshift()
        }
    }
}