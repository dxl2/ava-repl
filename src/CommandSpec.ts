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
                let spec = new CommandSpec(context, data)
                specs.push(spec)
            }
        }

        return specs
    }
}

export class CommandSpec {
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
            }
        
            this.params.push(s)
        }
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
