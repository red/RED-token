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
        RENtoken,
        RENCrowdfund
    } = Object.assign.apply({}, Object.values(solcOutput.contracts))

    const deploy = async (Contract, ...arguments) => {
        const contractDefaultOptions = {from: DEPLOYER, gas: 3000000}
        return new web3.eth.Contract(Contract.abi, contractDefaultOptions)
            .deploy({data: Contract.evm.bytecode.object, arguments})
            .send()
    }

    const ren = await deploy(RENtoken, TEAM, FOUNDATION, BIZ)
    const renCrowdfund = await deploy(RENCrowdfund, ren.options.address)

    await send(ren, DEPLOYER, 'setCrowdfundAddress', renCrowdfund.options.address)
    // starts the ICO from now on, ends in 20 seconds, unlocks redteam token in 30 seconds
    await send(renCrowdfund, DEPLOYER, 'setICOPeriod', Date.now() / 1000)
    await send(renCrowdfund, DEPLOYER, 'changeWalletAddress', WALLET)
    await send(renCrowdfund, DEPLOYER, 'openCrowdfund')

    return {ren, renCrowdfund}
}

module.exports = {
    base
}
