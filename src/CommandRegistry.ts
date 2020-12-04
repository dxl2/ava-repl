import { CommandSpec, commandsMetadata } from "./CommandHandler";
import { CommandModel } from "./CommandModel";
import { CommandSpec2 } from "./CommandSpec";

export class CommandHelp
{
    constructor(public nameUsage:string, public desc:string) {

    }
}

export class CommandRegistry
{
    static handlerMap = {}
    static commandSpecLegacyMap: { [key: string]: CommandSpec } = {}
    static contextMethodMap: { [key: string]: string[] } = {}

    static contextModelsMap: { [key: string]: CommandModel[] } = {}
    static contextModelNameMap: { [key: string]: { [key: string]: CommandModel }} = {}

    static contextSpecMap: { [key: string]: CommandSpec2[] } = {}
    static contextSpecNameMap: { [key: string]: { [key: string]: CommandSpec2 }} = {}

    static registerCommandHandler(contextName:string, handler)
    {
        this.handlerMap[contextName] = handler

        this.contextMethodMap[contextName] = []

        for (var m in handler) {
            // log.info("ddx", m)
            if (m.startsWith("_")) {
                continue
            }

            this.contextMethodMap[contextName].push(m)
        }

        this.addCommandSpec(handler, contextName)
    }

    static addCommandSpec(obj, context: string) {
        let map = Reflect.getMetadata(commandsMetadata, obj)
        for (let commandName in map) {
            map[commandName].name = commandName
            map[commandName].context = context
            this.commandSpecLegacyMap[map[commandName].id] = map[commandName]
        }
    }

    static registerCommandModel(model: CommandModel)
    {
        let context = model.getContext()

        if (!this.contextModelsMap[context])
        {
            this.contextModelsMap[context] = []
        }

        this.contextModelsMap[context].push(model)

        if (!this.contextModelNameMap[context]) {
            this.contextModelNameMap[context] = {}
        }

        this.contextModelNameMap[context][model.getName()] = model
    }

    static getCommandModel(context:string, name:string)
    {
        if (!this.contextModelNameMap[context]) {
            return
        }

        return this.contextModelNameMap[context][name]
    }

    static registerCommandSpec(spec: CommandSpec2) {        
        let context = spec.context

        if (!this.contextSpecMap[context]) {
            this.contextSpecMap[context] = []
        }

        this.contextSpecMap[context].push(spec)

        if (!this.contextSpecNameMap[context]) {
            this.contextSpecNameMap[context] = {}
        }

        this.contextSpecNameMap[context][spec.name] = spec
        // console.error("register spec", spec, this.contextSpecMap, this.contextSpecNameMap)
    }

    static getCommandSpec(context: string, name: string) {
        if (!this.contextSpecNameMap[context]) {
            return
        }

        return this.contextSpecNameMap[context][name]
    }

    static getContextCommands(context) {
        let out = []
        for (let name in this.contextSpecNameMap[context]) {
            out.push(name)
        }

        for (let name in this.contextModelNameMap[context])
        {
            out.push(name)
        }

        for (let cmd of CommandRegistry.contextMethodMap[context] || []) {
            out.push(cmd)
        }

        return out
    }

    static getAllContexts()
    {
        let s = new Set<string>()
        for (let c of Object.keys(CommandRegistry.contextMethodMap))
        {
            s.add(c)
        }

        for (let c of Object.keys(CommandRegistry.contextSpecMap))
        {
            s.add(c)
        }


        let contexts = Array.from(s)
        contexts.sort()
        return contexts
    }

    static getCommandSpecLegacy(context, method) {
        let commandId = `${context}_${method}`
        return CommandRegistry.commandSpecLegacyMap[commandId]
    }

    static getCommandModels(context)
    {
        return this.contextModelsMap[context] || []
    }

    static getCommandSpecs(context) {
        return this.contextSpecMap[context] || []
    }
}