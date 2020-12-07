import * as path from 'path';

export class AppPath {
    static BIN_DIR = path.resolve(__dirname, "..", "bin")
    static EXE_PATH = path.resolve(__dirname, "..", "build", "AvaShell.js")
}