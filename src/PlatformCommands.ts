import { CommandModel } from "./CommandModel"
import { FieldSpec } from "./CommandHandler"

import { App } from "./App"

export class AddValidatorCommand extends CommandModel {
    static NODE_ID_FIELD = "nodeId"
    static START_TIME_FIELD = "startTime"
    static END_TIME_FIELD = "endTime"
    static STAKE_AMOUNT_FIELD = "stakeAmount"
    static REWARD_ADDRESS_FIELD = "rewardAddress"
    static FROM_FIELD = "from"
    static DELEGATE_FEE_FIELD = "delegateFeeRate"

    constructor() {
        super()
        this.fields.push(new FieldSpec(AddValidatorCommand.NODE_ID_FIELD, App.avaClient.nodeId, "Node ID"))
        this.fields.push(new FieldSpec(AddValidatorCommand.START_TIME_FIELD, null, "Start Time"))
        this.fields.push(new FieldSpec(AddValidatorCommand.END_TIME_FIELD, null,"End Time"))
        this.fields.push(new FieldSpec(AddValidatorCommand.STAKE_AMOUNT_FIELD, null, "Stake Amount"))
        this.fields.push(new FieldSpec(AddValidatorCommand.REWARD_ADDRESS_FIELD, null, "Reward Address"))
        this.fields.push(new FieldSpec(AddValidatorCommand.DELEGATE_FEE_FIELD, null, "Delegate Fee Rate"))
        // this.fields.push(new FieldSpec(AddValidatorCommand.FROM_FIELD, null, "Addresses that you want to use for this operation separated by space. If omitted, uses any of your addresses as needed."))
    }

    async run() {
        let user = App.getActiveUser()
        let txId = await App.ava.PChain().addValidator(
            user.username,
            user.password,
            this.getString(AddValidatorCommand.NODE_ID_FIELD),
            this.getDate(AddValidatorCommand.START_TIME_FIELD),
            this.getDate(AddValidatorCommand.END_TIME_FIELD),
            this.getBN(AddValidatorCommand.STAKE_AMOUNT_FIELD),
            this.getString(AddValidatorCommand.REWARD_ADDRESS_FIELD),
            this.getBN(AddValidatorCommand.DELEGATE_FEE_FIELD))

        console.log("transactionId", txId)
    }

    getName() {
        return "addValidator"
    }

    getContext() {
        return "platform"
    }

    getHelp() {
        return "Add a validator to the Primary Network"
    }

    requireKeystore() {
        return true
    }
}