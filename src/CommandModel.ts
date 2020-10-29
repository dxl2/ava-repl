import { FieldSpec } from "./CommandHandler";
import { App } from "./App";
import { BN } from "bn.js"
const { prompt } = require('enquirer');
import { log } from "./AppLog";

export abstract class CommandModel {
    fields: FieldSpec[] = []
    fieldValueMap: {[key:string]: string} = {}

    abstract async run()
    abstract getContext()
    abstract getHelp()
    abstract getName()

    requireKeystore() {
        return false
    }

    getString(key) {
        return this.fieldValueMap[key]
    }

    getBN(key) {
        return new BN(this.fieldValueMap[key])
    }

    getDate(key) {
        if (!this.fieldValueMap[key]) {
            return new Date()
        }

        return new Date(+this.fieldValueMap[key] * 1000)
    }

    getEnquirerPrompt() {
        let out = []
        for (let field of this.fields) {
            out.push({
                type: 'input',
                name: field.name,
                message: field.helpText,
                initial: field.defaultValue
            })
        }

        return out
    }

    printUsage(prefix = "") {
        let out = `${this.getName()}`
        let fieldStrs = []

        for (let field of this.fields) {
            fieldStrs.push(field.toHelpString)
        }

        if (fieldStrs.length) {
            out += " " + fieldStrs.join(" ")
        }

        console.log(`${prefix}${out}`)
        console.log(`${prefix}- ${this.getHelp()}`)
        console.log()
    }

    async promptValues() {
        try {
            App.isPromptingEnquirer = true
            let eps = this.getEnquirerPrompt()
            let valueMap = {}
            for (let ep of eps) {
                let resp = await prompt(ep)
                Object.assign(valueMap, resp)
                // process.stdin.resume()
            }
            this.fieldValueMap = valueMap
            // log.info("fieldValueMap", this.fieldValueMap)
            return true
        }
        catch (error)
        {
            // user cancelled
            return null
        }
        finally {
            process.stdin.resume()
            App.isPromptingEnquirer = false
        }
    }

    async promptAndRun()
    {
        let shouldContinue = await this.promptValues()
        if (!shouldContinue)
        {
            return
        }
        
        await this.run()
    }
}
