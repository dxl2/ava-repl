export class StringUtility {
    static splitTokens(s: string, sep = /\s+/) {
        let parts = s.trim().split(sep)
        let out:string[] = []

        // Keep quoted text together; remove quotes
        let glu = []
        for (let part of parts) {  
            if (part.length > 2 && part[0] == "\"" && part[part.length - 1]=="\"") {
                part = part.slice(1, -1)
                out.push(part)
            } 
            else if (part.endsWith("\"") || part == "\"") {
                if (part.length > 1) {
                    glu.push(part.slice(0, -1))                    
                }

                if (glu.length) {
                    out.push(glu.join(" "))
                    glu = []
                }                
            }
            else if (part.startsWith("\"")) {
                if (part.length > 1) {                    
                    glu.push(part.substring(1))
                }
            } else if (glu.length) {
                glu.push(part)
            } else {
                out.push(part)
            }
        }

        if (glu.length) {
            out.push(glu.join(" "))
        }

        return out
    }
}