import { FieldSpec } from "./CommandHandler";
import { App } from "./App";
import { BN } from "bn.js"
import { log } from "./AppLog";
import * as fs from 'fs';
import * as path from 'path';
import { JsonFile } from "./JsonFile";

export enum CommandSpecParamType {
    String = "string"
}

export class CommandParamSpec {
    name:string
    desc:string
    type:string
    optional:boolean
    hidden = false

    constructor(data) {
        Object.assign(this, data)
    }

    sanitize(v) {
        return v
    }

    get isUsername() {
        return this.name == "username"
    }

    get isPassword() {
        return this.name == "password"
    }
}

export class CommandSpecManager {    
    static async loadSpecs() {
        let specs = []
        const specDir = path.resolve(__dirname, 'specs')
        for (let context of fs.readdirSync(specDir)) {
            let contextDir = specDir + path.sep + context
            for (let specFile of fs.readdirSync(contextDir)) {
                let specFilePath = contextDir + path.sep + specFile
                let jf = new JsonFile(specFilePath)
                let data = await jf.read()
                let spec = new CommandSpec2(context, data)
                specs.push(spec)
            }
        }

        return specs
    }
}

export class CommandSpec2 {
    name:string
    desc:string
    params: CommandParamSpec[] = []
    useKeystore = false

    constructor(public context, data) {
        Object.assign(this, data)

        this.params = []
        for (let param of data.params) {
            let s = new CommandParamSpec(param)
            if (param.name == "username" || param.name == "password") {
                this.useKeystore = true
                s.hidden = true
                s.optional = true
            }
        
            this.params.push(s)
        }
    }

    get requiredParameterCount() {
        let o = 0
        for (let p of this.params) {
            if (!p.optional) {
                o++
            }
        }

        return o
    }

    validateInput(rawValues) {
        if (rawValues.length < this.requiredParameterCount) {
            console.error("Insufficient number of parameters")
            return null
        }

        let user = App.avaClient.keystoreCache.getActiveUser()

        let sanitizedInput = []
        for (let i=0; i<this.params.length; i++) {
            let param = this.params[i]

            if (param.isUsername) {
                sanitizedInput.push(user.username)
            } else if (param.isPassword) {
                sanitizedInput.push(user.password)
            }
            else if (rawValues[i]) {
                let sanitized = param.sanitize(rawValues[i])
                if (!sanitized) {
                    return null
                }

                sanitizedInput.push(sanitized)
            } else {
                sanitizedInput.push(undefined)
            }
        }

        return sanitizedInput
    }

    getApiEndpoint() {
        if (this.context == "avm") {
            return App.ava.XChain()
        } else if (this.context == "platform") {
            return App.ava.PChain()
        }
    }

    async run(params) {        
        let data = this.validateInput(params)
        if (!data) {            
            this.printUsage()
        }

        // log.info("ddx sanitized", this.name, data)

        let ep = this.getApiEndpoint()
        let res = await ep[this.name](...data)
        console.log(res)
    }

    requireKeystore() {
        return this.useKeystore
    }

    get visibleParams() {
        let out = []
        for (let p of this.params) {
            if (p.hidden) {
                continue
            }
            out.push(p)
        }

        return out
    }

    printUsage(prefix = "") {
        let out = `${this.name}`
        let fieldNames = []

        for (let field of this.visibleParams) {
            if (field.optional) {
                fieldNames.push(`(${field.name})`)
            } else {
                fieldNames.push(`<${field.name}>`)
            }            
        }

        if (fieldNames.length) {
            out += " " + fieldNames.join(" ")
        }

        console.log(`${prefix}${out}`)
        console.log(`${prefix}- ${this.desc}`)
        
        for (let p of this.visibleParams) {
            console.log(`${prefix}${prefix}${p.desc}`)
        }

        console.log()
    }
}
