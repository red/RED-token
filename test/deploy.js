const base = async (web3, solcOutput, DEPLOYER) => {
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

    const rct = await deploy(RCToken)
    const rctCrowdfund = await deploy(RCTCrowdfund, rct.options.address)

    return {rct, rctCrowdfund}
}

module.exports = {
    base
}
