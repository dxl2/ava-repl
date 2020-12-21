
import { AppRuntime } from "./AppRuntime";
import { CommandPromptHandler, CommandPrompt, CommandPromptQuestion } from "./CommandPrompt";
import { App } from "./App";
import { CommandRegistry } from "./CommandRegistry";
import { log } from "./AppLog";
import * as path from 'path';
import * as fs from 'fs';
import { AppPath } from "./AppPath";
import { CommandContext } from "./CommandHandler";

async function main() {
    await App.init(true)

    let contexts = CommandRegistry.getAllContexts()
    log.info(contexts)

    let out = []
    out.push(`ALL_CONTEXT="${contexts.join(" ")}"`)
    out.push("")
    out.push(`declare -A COMMAND_MAP`)    

    for (let context of contexts) {
        let cmds = CommandRegistry.getContextCommands(context)
        out.push(`COMMAND_MAP[${context}]="${cmds.join(" ")}"`)
    }

    let tout = out.join("\n")

    let outPath = AppPath.BIN_DIR + path.sep + "arepl_bash_complete_data.sh"
    fs.writeFileSync(outPath, tout)
}

main()

process.on('unhandledRejection', async (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
    await AppRuntime.sleep(600 * 1000)
});