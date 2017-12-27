const {send} = require('./helpers')

const base = async (web3, solcOutput, accounts) => {
    let DEPLOYER, WALLET, TEAM, FOUNDATION, BIZ, INVESTOR
    ;[
        DEPLOYER,
        WALLET,
        TEAM,
        FOUNDATION,
        BIZ,
        INVESTOR
    ] = accounts

    const {
        RCToken,
        RCTCrowdfund
    } = Object.assign.apply({}, Object.values(solcOutput.contracts))

    const deploy = async (Contract, ...arguments) => {
        const contractDefaultOptions = {from: DEPLOYER, gas: 3000000}
        return new web3.eth.Contract(Contract.abi, contractDefaultOptions)
            .deploy({data: Contract.evm.bytecode.object, arguments})
            .send()
    }

    const rct = await deploy(RCToken, TEAM, FOUNDATION, BIZ)
    const rctCrowdfund = await deploy(RCTCrowdfund, rct.options.address)

    await send(rct, DEPLOYER, 'setCrowdfundAddress', rctCrowdfund.options.address)
    // starts the ICO from now on, ends in 20 seconds, unlocks redteam token in 30 seconds
    await send(rctCrowdfund, DEPLOYER, 'setICOPeriod', Date.now() / 1000)
    await send(rctCrowdfund, DEPLOYER, 'changeWalletAddress', WALLET)
    await send(rctCrowdfund, DEPLOYER, 'openCrowdfund')

    return {rct, rctCrowdfund}
}

module.exports = {
    base
}
