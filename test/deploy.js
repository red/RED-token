const {send} = require('./helpers')

const base = async (web3, solcOutput, accounts) => {
    const [
        DEPLOYER,
        WALLET,
        TEAM,
        FOUNDATION,
        BIZ,
        INVESTOR1,
        INVESTOR2,
        INVESTOR3
    ] = accounts

    // Merge all contracts across all files into one registry
    const contractRegistry = Object.assign(...Object.values(solcOutput.contracts))

    // Preserve contract names in compilation output
    Object.keys(contractRegistry)
        .forEach((name) => contractRegistry[name].NAME = name)

    const {
        REDToken,
        REDCrowdfund
    } = contractRegistry

    const deploy = async (Contract, ...arguments) => {
        const contractDefaultOptions = {
            from: DEPLOYER,
            gas: 4000000,
            name: Contract.NAME
        }
        return new web3.eth.Contract(Contract.abi, contractDefaultOptions)
            .deploy({data: Contract.evm.bytecode.object, arguments})
            .send()
            // FIXME https://github.com/ethereum/web3.js/issues/1253 workaround
            .then(contract => {
                contract.setProvider(web3.currentProvider)
                return contract
            })
    }

    const red = await deploy(REDToken)
    const redCrowdfund = await deploy(REDCrowdfund, red.options.address)

    await send(red, DEPLOYER, 'setCrowdfundAddress', redCrowdfund.options.address)
    await send(red, DEPLOYER, 'changeFoundationAddress', FOUNDATION)
    await send(red, DEPLOYER, 'changeMarketingAddress', BIZ)
    await send(red, DEPLOYER, 'changeRedTeamAddress', TEAM)
    await send(redCrowdfund, DEPLOYER, 'changeWalletAddress', WALLET)

    return {red, redCrowdfund}
}

module.exports = {
    base
}
