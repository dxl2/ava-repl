import { AvaKeystoreUser } from "./AvaClient"
import { log } from "./AppLog"

export class AvaKeystoreCache {
    usernameMap: { [key: string]: AvaKeystoreUser } = {}
    activeUsername: string

    addUser(user: AvaKeystoreUser, setActive = false) {
        this.usernameMap[user.username] = user

        if (setActive || 1 == Object.keys(this.usernameMap).length) {
            this.activeUsername = user.username
        }
    }

    removeUser(username:string) {
        delete this.usernameMap[username]
        if (this.activeUsername == username) {
            this.activeUsername = null
        }
    }

    getUser(user: AvaKeystoreUser) {
        return this.usernameMap[user.username]
    }

    setActiveUser(username: string) {
        this.activeUsername = username
    }

    getActiveUser() {
        let out = this.usernameMap[this.activeUsername]
        if (!out) {
            // log.warn("Missing active user")
            return
        }

        return out
    }

    hasUser(username:string) {
        return this.usernameMap[username]
    }
}