const {
    expect,
    assertContractThrows,
    expectBalance,
    toBN,
    solcJSON,
    ganacheWeb3,
    ZERO_ADDR,
    logAccounts,
    send
} = require('./helpers')
const solcInput = require('../solc-input.json')
const deploy = require('./deploy')

describe('Contract', function () {
    let provider, web3, snaps
    let accounts, DEPLOYER, INVESTOR, rct, rctCrowdfund

    before(async () => {
        // Instantiate clients to an empty in-memory blockchain
        web3 = ganacheWeb3(provider)
        snaps = []

        // Provide synchronous access to test accounts
        ;[
            DEPLOYER,
            INVESTOR
        ] = accounts = await web3.eth.getAccounts()

        // Deploy contracts
        ;({rct, rctCrowdfund} = await deploy.base(web3, solcJSON(solcInput), DEPLOYER))
    })

    beforeEach(async () => {
        snaps.push(await web3.evm.snapshot())
    })

    afterEach(async () => {
        await web3.evm.revert(snaps.pop())
    })

    describe('RCT', () => {
        it('is deployed', async () => {
            let symbol = (await rct.methods.symbol().call())
            expect(symbol).equal('RCT')
        })
    })

    describe('RCTCrowdfund', () => {
        it('is deployed', async () => {
            let token = (await rctCrowdfund.methods.RCT().call())
            expect(token).equal(rct.options.address)
        })

        it('can open sale', async () => {
            await send(rctCrowdfund, DEPLOYER, 'openCrowdfund')
            expect(await rct.methods.isPreSaleStage().call()).equal(true)
        })
    })
})
