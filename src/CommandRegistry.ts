import { CommandSpec, commandsMetadata } from "./CommandHandler";

export class CommandRegistry
{
    static handlerMap = {}
    static commandSpecMap: { [key: string]: CommandSpec } = {}
    static contextMethodMap: { [key: string]: string[] } = {}

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
}