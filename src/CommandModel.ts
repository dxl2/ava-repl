import { FieldSpec } from "./CommandHandler";
import { App } from "./App";
import { BN } from "bn.js"
import { log } from "./AppLog";
import { CommandPromptQuestion, CommandPrompt } from "./CommandPrompt";

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

    getCommandPrompt() {
        let out = new CommandPrompt()
        for (let field of this.fields) {
            out.adduestion(new CommandPromptQuestion(field.helpText, field.name, field.defaultValue))
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
            if (!App.promptHandler) {
                console.error("Missing prompt handler")
                return
            }

            App.isPromptActive = true
            let p = this.getCommandPrompt()
            await App.promptHandler.prompt(p)

            this.fieldValueMap = p.getAnswerMap()
            log.info("fieldValueMap", this.fieldValueMap)
            return true
        }
        finally {
            App.isPromptActive = false
        }
    }

    async promptAndRun()
    {
        let shouldContinue = await this.promptValues()
        if (!shouldContinue)
        {
            return
        }
        
        try {
            await this.run()
        } catch (error) {
            log.error(error)
        }
    }
}
