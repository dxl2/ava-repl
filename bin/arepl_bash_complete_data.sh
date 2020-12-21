ALL_CONTEXT="admin auth avm contract health info keystore metrics platform shell"

declare -A COMMAND_MAP
COMMAND_MAP[admin]="alias aliasChain lockProfile memoryProfile startCPUProfiler stopCPUProfiler"
COMMAND_MAP[auth]="changePassword newToken revokeToken"
COMMAND_MAP[avm]="buildGenesis exportKey importKey getAssetDescription createFixedCapAsset createVariableCapAsset mint importAVAX exportAVAX listAddresses listBalances getTx createAddress getBalance getAllBalances send getTxStatus listTxs issueTx getUTXOs"
COMMAND_MAP[contract]="export exportAVAX exportKey getAVAXAssetID getAssetDescription getBlockchainAlias getBlockchainID getDefaultTxFee getTxFee getUTXOs import importAVAX importKey issueTx refreshBlockchainID setAVAXAssetID setBlockchainAlias"
COMMAND_MAP[health]="getLiveness"
COMMAND_MAP[info]="getNodeId getTxFee getNetworkId getNetworkName getNodeVersion peers getBlockchainID isBootstrapped"
COMMAND_MAP[keystore]="listUsers createUser deleteUser exportUser importUser login setUser"
COMMAND_MAP[metrics]="show"
COMMAND_MAP[platform]="addDelegator addSubnetValidator addValidator createBlockchain getTx getCurrentSupply getHeight getBlockchains getStake getMinStake getStakingAssetID getBlockchainStatus validates validatedBy sampleValidators createAddress listAddresses listBalances getBalance createSubnet getSubnets getTxStatus importAVAX exportAVAX issueTx getPendingValidators getCurrentValidators isCurrentValidator exportKey importKey"
COMMAND_MAP[shell]="connect"