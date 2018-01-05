const {send} = require('./helpers')

const base = async (web3, solcOutput, accounts) => {
    let DEPLOYER, WALLET, TEAM, FOUNDATION, BIZ
    let INVESTOR1, INVESTOR2, INVESTOR3
    ;[
        DEPLOYER,
        WALLET,
        TEAM,
        FOUNDATION,
        BIZ,
        INVESTOR1,
        INVESTOR2,
        INVESTOR3
    ] = accounts

    const {
        RENToken,
        RENCrowdfund
    } = Object.assign.apply({}, Object.values(solcOutput.contracts))

    const deploy = async (Contract, ...arguments) => {
        const contractDefaultOptions = {from: DEPLOYER, gas: 3000000}
        return new web3.eth.Contract(Contract.abi, contractDefaultOptions)
            .deploy({data: Contract.evm.bytecode.object, arguments})
            .send()
    }

    const ren = await deploy(RENToken)
    const renCrowdfund = await deploy(RENCrowdfund, ren.options.address)

    await send(ren, DEPLOYER, 'setCrowdfundAddress', renCrowdfund.options.address)
    await send(ren, DEPLOYER, 'changeFoundationAddress', FOUNDATION)
    await send(ren, DEPLOYER, 'changePrivateEquityAddress', BIZ)
    await send(ren, DEPLOYER, 'changeRedTeamAddress', TEAM)
    // starts the ICO from now on, ends in 20 seconds, unlocks redteam token in 30 seconds
    await send(renCrowdfund, DEPLOYER, 'setICOPeriod', Date.now() / 1000)
    await send(renCrowdfund, DEPLOYER, 'changeWalletAddress', WALLET)

    return {ren, renCrowdfund}
}

module.exports = {
    base
}
