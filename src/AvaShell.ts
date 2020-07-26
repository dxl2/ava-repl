const repl = require('repl');
import * as avalanche from "avalanche";
import BN from 'bn.js';
import { Buffer } from 'buffer/'
import { App } from "./App";
import { CommandHandler } from "./CommandHandler";
import { log } from "./AppLog";
import { StringUtility } from "./StringUtility";

let replServer

export class AvaShell {
    static async evalHandler(cmd:string, context, filename, callback) {
        try {
            cmd = cmd.trim()
            if (!cmd) { 
                callback(null, null)
                return
            }

            log.info("eval", cmd)
            let res = await App.commandHandler.handleCommand(cmd)
            // log.info("res", res)
            callback(null, res)
        } catch(error) {
            log.error(error)
            // TODO: split unrecoverable errors
            // return callback(new repl.Recoverable(error))
            if (error.message) {
                // console.log(error.message)
                // callback(null, null)
                callback(null, `Error: ${error.message}`)
            } else {
                callback(null, `Unexpected error`)
            }
        }
    }

    static formatOutput(output) {
        if (output == null) {
            return ""
        }

        return output;
    }

    static completer(line) {        
        let params = StringUtility.splitTokens(line)
        if (!params.length) {
            return
        }

        // log.info("in completer", params, params[0])
        if (!App.commandHandler.context) {
            if (params.length == 1) {
                return this.getCompletions(params[0], App.commandHandler.getTopLevelCommands())
            }            
        }
    }

    static getCompletions(needle:string, haystack:string[]) {
        // log.info("getCompl", needle, haystack)
        let matches = haystack.filter((c) => c.startsWith(needle))

        return [matches, needle]
    }
}

async function main() {
    await App.init()
    console.log("****************************************")
    console.log("AVA shell initialized.")
    console.log("Node ID: " + App.avaClient.nodeId)
    console.log("****************************************")
    
    const options = { 
        useColors: true, 
        prompt: 'ava> ', 
        eval: AvaShell.evalHandler.bind(AvaShell), 
        writer: AvaShell.formatOutput.bind(AvaShell),
        completer: AvaShell.completer.bind(AvaShell)
    }
    replServer = repl.start(options);
}

main()

// replServer.defineCommand('info nodeid', {
//     help: 'Say hello',
//     action(name) {
//         this.clearBufferedCommand();
//         console.log(`Hello, ${name}!`);
//         this.displayPrompt();
//     }
// });

// replServer.defineCommand('info bee', {
//     help: 'Say hello2',
//     action(name) {
//         this.clearBufferedCommand();
//         console.log(`Hello2, ${name}!`);
//         this.displayPrompt();
//     }
// });

// replServer.defineCommand('saybye', function saybye() {
//     console.log('Goodbye!');
//     this.close();
// });
