import { CommandSpec, commandsMetadata } from "./CommandHandler";
import { CommandModel } from "./CommandModel";

export class CommandHelp
{
    constructor(public nameUsage:string, public desc:string) {

    }
}

export class CommandRegistry
{
    static handlerMap = {}
    static commandSpecMap: { [key: string]: CommandSpec } = {}
    static contextMethodMap: { [key: string]: string[] } = {}

    static contextModelsMap: { [key: string]: CommandModel[] } = {}
    static contextModelNameMap: { [key: string]: { [key: string]: CommandModel }} = {}

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
            this.commandSpecMap[map[commandName].id] = map[commandName]
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

    static getContextCommands(context) {
        let out = []
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
        let contexts = Object.keys(CommandRegistry.contextMethodMap)
        contexts.sort()
        return contexts
    }

    static getCommandSpec(context, method) {
        let commandId = `${context}_${method}`
        return CommandRegistry.commandSpecMap[commandId]
    }

    static getCommnadModels(context)
    {
        return this.contextModelsMap[context] || []
    }
}