export class OutputPrinter {
    static pprint(o) {
        return JSON.stringify(o, null, 4)
    }
}