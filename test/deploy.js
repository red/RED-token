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
        RENToken,
        RENCrowdfund
    } = contractRegistry

    const deploy = async (Contract, ...arguments) => {
        const contractDefaultOptions = {
            from: DEPLOYER,
            gas: 3000000,
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

    const ren = await deploy(RENToken)
    const renCrowdfund = await deploy(RENCrowdfund, ren.options.address)

    await send(ren, DEPLOYER, 'setCrowdfundAddress', renCrowdfund.options.address)
    await send(ren, DEPLOYER, 'changeFoundationAddress', FOUNDATION)
    // await send(ren, DEPLOYER, 'changePrivateEquityAddress', BIZ)
    await send(ren, DEPLOYER, 'changeRedTeamAddress', TEAM)
    await send(renCrowdfund, DEPLOYER, 'changeWalletAddress', WALLET)

    return {ren, renCrowdfund}
}

module.exports = {
    base
}
