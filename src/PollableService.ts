export abstract class PollableService {
    constructor(public label: string, public timeoutSeconds: number) {
    }

    abstract async handleUpdate()

    async start(initialDelaySeconds = 0) {
        this.schedule(initialDelaySeconds)
    }

    async update() {
        try {
            return await this.handleUpdate()
        }
        catch (error) {
            console.error(error)
        } finally {
            this.schedule()
        }
    }

    schedule(delaySeconds?) {
        delaySeconds = delaySeconds || this.timeoutSeconds
        delaySeconds *= 1000
        setTimeout(async () => {
            await this.update()
        }, delaySeconds);
    }
}