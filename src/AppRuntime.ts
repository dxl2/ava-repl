export class AppRuntime {
    static async sleep(ms = 0) {
        return new Promise(r => setTimeout(r, ms));
    }
}