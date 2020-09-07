export class StringUtility {
    static splitTokens(s:string) {
        let parts = s.trim().split(/\s+/)
        let out = []

        // Remove quotes in case they're pasted in from JSON output
        for (let part of parts) {
            if (part.length > 2 && part[0] == "\"" && part[part.length - 1]=="\"") {
                part = part.slice(1, -1)
            }
            out.push(part)
        }

        return out
    }
}