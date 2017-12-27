const {
    expect,
    assertContractThrows,
    expectBalance,
    toBN,
    toWei,
    solcJSON,
    ganacheWeb3,
    ZERO_ADDR,
    logAccounts,
    send,
    buy
} = require('./helpers')
const solcInput = require('../solc-input.json')
const deploy = require('./deploy')

describe('Contract', function () {
    let provider, web3, snaps
    let accounts, DEPLOYER, WALLET, TEAM, FOUNDATION, BIZ, INVESTOR
    let rct, rctCrowdfund

    before(async () => {
        // Instantiate clients to an empty in-memory blockchain
        web3 = ganacheWeb3(provider)
        snaps = []

        // Provide synchronous access to test accounts
        ;[
            DEPLOYER,
            WALLET,
            TEAM,
            FOUNDATION,
            BIZ,
            INVESTOR
        ] = accounts = await web3.eth.getAccounts()

        // Deploy contracts
        ;({rct, rctCrowdfund} = await deploy.base(web3, solcJSON(solcInput), accounts))
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

    describe('RCTCrowdfund presale', () => {
        it('is deployed', async () => {
            let token = (await rctCrowdfund.methods.RCT().call())
            expect(token).equal(rct.options.address)
        })

        it('presale is started', async () => {
            expect(await rct.methods.isPreSaleStage().call()).equal(true)
        })

        it('presale buy', async () => {
            await buy(web3, INVESTOR, rctCrowdfund, '1')
            expect(await expectBalance(rct, INVESTOR, toWei('1100')))
            expect(await web3.eth.getBalance(WALLET)).eq(toWei('101'))
        })
    })
})
