export class StringUtility {
    static splitTokens(s:string) {
        return s.trim().split(/\s+/)
    }
}