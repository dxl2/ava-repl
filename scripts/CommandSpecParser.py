# -*- coding: utf-8 -*-

import re, json

S = '''
/**
     * Creates a new blockchain.
     *
     * @param username The username of the Keystore user that controls the new account
     * @param password The password of the Keystore user that controls the new account
     * @param subnetID Optional. Either a {@link https://github.com/feross/buffer|Buffer} or an cb58 serialized string for the SubnetID or its alias.
     * @param vmID The ID of the Virtual Machine the blockchain runs. Can also be an alias of the Virtual Machine.
     * @param FXIDs The ids of the FXs the VM is running.
     * @param name A human-readable name for the new blockchain
     * @param genesis The base 58 (with checksum) representation of the genesis state of the new blockchain. Virtual Machines should have a static API method named buildGenesis that can be used to generate genesisData.
     *
     * @returns Promise for the unsigned transaction to create this blockchain. Must be signed by a sufficient number of the Subnet’s control keys and by the account paying the transaction fee.
     */
    createBlockchain: (username: string, password: string, subnetID: Buffer | string, vmID: string, fxIDs: Array<number>, name: string, genesis: string) => Promise<string>;
'''

class TypeParser(object):
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
    out = TypeParser().parseFunction(S)
    s = json.dumps(out, indent=4)
    with open("/tmp/test.json", "w") as f:
        f.write(s)

if __name__ == "__main__":
    main()            