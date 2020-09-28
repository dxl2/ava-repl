import * as fs from 'fs';

export class JsonFile {
    constructor(public path: string) { }

    writeObject(obj) {
        fs.writeFile(this.path, JSON.stringify(obj, null, 4), (err) => {
            if (err) throw err;
        });
    }

    read() {
        if (!fs.existsSync(this.path)) {
            return null
        }

        let raw = fs.readFileSync(this.path) as any
        return JSON.parse(raw)
    }
}