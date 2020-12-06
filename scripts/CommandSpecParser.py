# -*- coding: utf-8 -*-

import re, json, os

S = '''
    /**
     * Creates a new authorization token that grants access to one or more API endpoints.
     *
     * @param password This node's authorization token password, set through the CLI when the node was launched.
     * @param endpoints A list of endpoints that will be accessible using the generated token. If there's an element that is "*", this token can reach any endpoint.
     *
     * @returns Returns a Promise<string> containing the authorization token.
     */
    newToken: (password: string, endpoints: Array<string>) => Promise<string>;
    /**
     * Revokes an authorization token, removing all of its rights to access endpoints.
     *
     * @param password This node's authorization token password, set through the CLI when the node was launched.
     * @param token An authorization token whose access should be revoked.
     *
     * @returns Returns a Promise<boolean> indicating if a token was successfully revoked.
     */
    revokeToken: (password: string, token: string) => Promise<boolean>;
    /**
     * Change this node's authorization token password. **Any authorization tokens created under an old password will become invalid.**
     *
     * @param oldPassword This node's authorization token password, set through the CLI when the node was launched.
     * @param newPassword A new password for this node's authorization token issuance.
     *
     * @returns Returns a Promise<boolean> indicating if the password was successfully changed.
     */
    changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
'''

class TypeParser(object):
    def __init__(self, ep):
        self.endpoint = ep

    def parseBlock(self, b):
        parts = b.split("/**")
        out = []
        for p in parts:
            p = p.strip()
            if not p: 
                continue

            f = self.parseFunction(p)
            # print f
            # print("---")
            out.append(f)

        return out


    def parseFunction(self, rawLines):
        commentLines = []
        lines = []

        for line in rawLines.split("\n"):            
            # remove comments

            isComment = re.search("^\s*/?\*+", line)

            line2 = re.sub("^\s*/?\*+\s*/?", "", line)
            line2 = line2.strip()

            if not line2:
                continue

            # print line
            # print line2
            # print "---"
            
            if isComment:
                commentLines.append(line2)
            else:
                lines.append(line2)

        params = []
        descLines = []
        retType = None

        seenMetaTags = False
        for line in commentLines:        
            tokens = line.split()
            # print(tokens)
            
            if tokens[0] == "@param":
                params.append(self.parseParamLine(tokens))
                continue
            elif tokens[0] == "@returns":
                continue
            
            if not seenMetaTags:
                descLines.append(line)
            
        
        desc = " ".join(descLines)
        # print(desc)

        # for param in params:
        #     print(param)

        
        out = {}
        out["desc"] = desc
        out["params"] = params

        self.parseDeclaration(out, lines)

        return out

    def parseDeclaration(self, out, lines):
        rawDec = " ".join(lines)

        regex = "(.+?): \((.+)\) => (.+)"
        res = re.search(regex, rawDec)        

        # parse parameters
        params = res.group(2)
        parts = params.split(",")
        typeList = []
        for part in parts:
            tokens = part.split(":")
            name = tokens[0].strip()
            t = tokens[1].strip()

            # If a param has more than 1 type, see if user inputtable type is supported.
            altTypes = map(lambda t : t.strip(), t.split("|"))
            # print("altTypes", altTypes)
            if len(altTypes) > 1:
                if not "string" in altTypes:
                    print("Unknown type: %s" % altTypes)
                    raise "Unknown types"
                t = "string"

            typeList.append(t)
        
        if len(typeList) != len(out["params"]):
            raise "param mismatch"
        
        for i in range(len(typeList)):
            out["params"][i]["type"] = typeList[i]        

        # print(res.groups())

        # name is function name
        out["name"] = res.group(1)

        # parse return type
        ret = res.group(3)
        m = re.match("Promise<(.+?)>", ret)
        if m:
            ret = m.group(1)
        
        out["return"] = ret


        # parts = rawDec.split("=>")

        # declPart = parts[0]
        # tokens = declPart.split(":")
        # for token in tokens:
        #     token = token.strip()
        #     token = re.sub("[\(\)]","", token)
        #     print token


        # retPart = parts[1]

    
    def parseParamLine(self, tokens):
        out = {}
        out["name"] = tokens[1]
        out["desc"] = " ".join(tokens[2:])
        return out



def main():
    EP = "auth"
    out = TypeParser(EP).parseBlock(S)

    currentDir = os.path.dirname(os.path.abspath(__file__))
    specDir = os.path.join(currentDir, "..", "specs", EP)
    if not os.path.exists(specDir):
        os.mkdir(specDir)

    for f in out:
        # print f
        specPath = os.path.join(specDir, f["name"] + ".json")
        print("output %s" % specPath)
        s = json.dumps(f, indent=4)
        with open(specPath, "w") as f:
            f.write(s)
        

if __name__ == "__main__":
    main()            