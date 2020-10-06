import { command, CommandSpec } from "./CommandHandler"
import { CommandRegistry } from "./CommandRegistry"

/*
 * Place your custom commands in this file.
 * This sample shows you how to add your own command to the REPL shell
 */
export class CustomSampleHandler {
    @command(new CommandSpec([], "Run sample extension"))
    async sample() {
        let t = new CommandSpec([], "Run sample extension")
        console.log("This is a sample custom command")
    }
}

CommandRegistry.registerCommandHandler("custom", new CustomSampleHandler())