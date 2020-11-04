export class CommandPromptQuestion {
    answer:string
    constructor(public question, public key, public defaultValue) {

    }
}

export class CommandPrompt {
    questions: CommandPromptQuestion[] = []

    addQuestion(q: CommandPromptQuestion) {
        this.questions.push(q)
    }

    getAnswerMap() {
        let out = {}

        for (let q of this.questions) {
            out[q.key] = q.answer
        }

        return out
    }
}

export interface CommandPromptHandler {
    prompt(prompt: CommandPrompt): Promise<boolean>
}