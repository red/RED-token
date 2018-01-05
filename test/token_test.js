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
    let accounts, DEPLOYER, WALLET, TEAM, FOUNDATION, BIZ
    let INVESTOR1, INVESTOR2, INVESTOR3
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
            INVESTOR1,
            INVESTOR2,
            INVESTOR3
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

    describe('Workflow Test', () => {
        it('is token deployed', async () => {
            let symbol = (await ren.methods.symbol().call())
            expect(symbol).equal('REN')
        })
        it('is crowdfund deployed', async () => {
            let token = (await renCrowdfund.methods.REN().call())
            expect(token).equal(ren.options.address)
        })
        it('workflow', async () => {
            // angel round
            let addresses = [INVESTOR1, INVESTOR2, INVESTOR3]
            let amounts = [toWei('1000'), toWei('2000'), toWei('3000')]
            let success = (await send(ren, DEPLOYER, 'deliverPresaleRENaccounts',addresses, amounts))
            expect(await expectBalance(ren, INVESTOR1, toWei('1000')))
            expect(await expectBalance(ren, INVESTOR2, toWei('2000')))
            expect(await expectBalance(ren, INVESTOR3, toWei('3000')))

            // buying before presale will fail
            //try {
            //    await buy(web3, INVESTOR1, renCrowdfund, '1')
            //} catch (error) {}
            //await expectBalance(ren, INVESTOR1, toWei('1000'))

            // open presale
			await send(renCrowdfund, DEPLOYER, 'openCrowdfund')

            // presale buy 1
            await buy(web3, INVESTOR1, renCrowdfund, '1')
            expect(await expectBalance(ren, INVESTOR1, toWei('3750')))
            expect(await web3.eth.getBalance(WALLET)).eq(toWei('101'))
            await buy(web3, INVESTOR1, renCrowdfund, '1')
            expect(await expectBalance(ren, INVESTOR1, toWei('6500')))
            expect(await web3.eth.getBalance(WALLET)).eq(toWei('102')) 

            // presale buy 2
            await buy(web3, INVESTOR2, renCrowdfund, '2')
            expect(await expectBalance(ren, INVESTOR2, toWei('7500')))
            expect(await web3.eth.getBalance(WALLET)).eq(toWei('104'))
        })
    })

    describe('Security Test', () => {
        it('is token deployed', async () => {
            let symbol = (await ren.methods.symbol().call())
            expect(symbol).equal('REN')
        })
    })

    describe('ERC20 API Test', () => {
        it('is token deployed', async () => {
            let symbol = (await ren.methods.symbol().call())
            expect(symbol).equal('REN')
        })
    })
})
