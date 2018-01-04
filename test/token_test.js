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
    let ren, renCrowdfund

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
        ;({ren, renCrowdfund} = await deploy.base(web3, solcJSON(solcInput), accounts))
    })

    beforeEach(async () => {
        snaps.push(await web3.evm.snapshot())
    })

    afterEach(async () => {
        await web3.evm.revert(snaps.pop())
    })

    describe('REN', () => {
        it('is deployed', async () => {
            let symbol = (await ren.methods.symbol().call())
            expect(symbol).equal('REN')
        })
    })

    describe('RENCrowdfund presale', () => {
        it('is deployed', async () => {
            let token = (await renCrowdfund.methods.REN().call())
            expect(token).equal(ren.options.address)
        })

        it('presale is started', async () => {
            expect(await ren.methods.isPreSaleStage().call()).equal(true)
        })

        it('presale buy', async () => {
            await buy(web3, INVESTOR, renCrowdfund, '1')
            expect(await expectBalance(ren, INVESTOR, toWei('1100')))
            expect(await web3.eth.getBalance(WALLET)).eq(toWei('101'))
        })
    })
})
