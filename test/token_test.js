const {
    expect,
    assertContractThrows,
    expectBalance,
    balance,
    toBN,
    fromWei,
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
    let web3, snaps
    let accounts, DEPLOYER, WALLET, TEAM, FOUNDATION, BIZ
    let INVESTOR1, INVESTOR2, INVESTOR3
    let red, redCrowdfund

    before(async () => {
        // Instantiate clients to an empty in-memory blockchain
        web3 = ganacheWeb3()
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
        ;({red, redCrowdfund} = await deploy.base(web3, solcJSON(solcInput), accounts))
    })

    beforeEach(async () => {
        snaps.push(await web3.evm.snapshot())
    })

    afterEach(async () => {
        await web3.evm.revert(snaps.pop())
    })

    describe('Angel round', () => {
        it('does NOT cost more than 100 USD for the deployer', async () => {
            // Source: https://coinmarketcap.com/currencies/ethereum/
            USD_PER_ETH = toBN(1068)
            const initial = toWei(toBN(100))
            const current = await balance(web3, DEPLOYER)
            const spent = initial.sub(toBN(current))
            const deploymentCost = (fromWei(spent)) * USD_PER_ETH
            console.log('      Deployment cost:', deploymentCost)
            expect(deploymentCost).to.be.below(100)
        })
    })

    describe('Workflow Test', () => {
        it('is token deployed', async () => {
            let symbol = (await red.methods.symbol().call())
            expect(symbol).equal('RED')
        })
        it('is crowdfund deployed', async () => {
            let token = (await redCrowdfund.methods.RED().call())
            expect(token).equal(red.options.address)
        })
        it('workflow', async () => {
            // starts the ICO from now on
            let startsAt = await redCrowdfund.methods.startsAt().call()
            //let curredtTime = web3.eth.getBlock(web3.eth.blockNumber).timestamp;
            web3.evm.increaseTime(604800)   // 1 week

            // angel round
            let addresses = [INVESTOR1, INVESTOR2, INVESTOR3]
            let amounts = [toWei('1000'), toWei('2000'), toWei('3000')]
            let success = (await send(red, DEPLOYER, 'deliverPresaleRedaccounts', addresses, amounts))
            expect(await expectBalance(red, INVESTOR1, toWei('1000')))
            expect(await expectBalance(red, INVESTOR2, toWei('2000')))
            expect(await expectBalance(red, INVESTOR3, toWei('3000')))

            // buying before presale will fail
            try {
                await buy(web3, INVESTOR1, redCrowdfund, '1')
            } catch (error) {
            }
            await expectBalance(red, INVESTOR1, toWei('1000'))

            // open presale
            await send(redCrowdfund, DEPLOYER, 'openCrowdfund')

            // presale buy 1
            // presale price: 1 ETH = 2750 red
            await buy(web3, INVESTOR1, redCrowdfund, '1')
            // 1000 + 2750 = 3750
            expect(await expectBalance(red, INVESTOR1, toWei('3750')))
            expect(await web3.eth.getBalance(WALLET)).eq(toWei('101'))
            await buy(web3, INVESTOR1, redCrowdfund, '1')
            // 3750 + 2750 = 6500
            expect(await expectBalance(red, INVESTOR1, toWei('6500')))
            expect(await web3.eth.getBalance(WALLET)).eq(toWei('102'))

            // presale buy 2
            await buy(web3, INVESTOR2, redCrowdfund, '2')
            // 2000 + (2750 * 2) = 7500
            expect(await expectBalance(red, INVESTOR2, toWei('7500')))
            expect(await web3.eth.getBalance(WALLET)).eq(toWei('104'))

            // close presale
            await send(red, DEPLOYER, 'finalizePresale')

            // Open round buy
            await buy(web3, INVESTOR2, redCrowdfund, '1')
            // 7500 + 2500 = 10,000
            expect(await expectBalance(red, INVESTOR2, toWei('10000')))
            expect(await web3.eth.getBalance(WALLET)).eq(toWei('105'))

            // close ICO
            await web3.evm.increaseTime(604800 * 4)
            await send(redCrowdfund, DEPLOYER, 'closeCrowdfund')

            // any buying will fail
            try {
                await buy(web3, INVESTOR2, redCrowdfund, '1')
            } catch (e) {
            }
            // 7500 + 2500 = 10,000
            expect(await expectBalance(red, INVESTOR2, toWei('10000')))
            expect(await web3.eth.getBalance(WALLET)).eq(toWei('105'))
        })
    })

    describe('Security Test', () => {
        it('is token deployed', async () => {
            let symbol = (await red.methods.symbol().call())
            expect(symbol).equal('RED')
        })

        /* -- Crowd Fund Contract -- */
        // Others except DEPLOYER call this function will fail
        // changeWalletAddress

        // Others except DEPLOYER call this function will fail
        // openCrowdfund

        // Others except DEPLOYER call this function will fail
        // closeCrowdfund

        /* -- Token Contract -- */
        // Others except CrowdFund contract call this function will fail
        // startCrowdfund

        // Others except CrowdFund contract call this function will fail
        // transferFromCrowdfund

        // Others except CrowdFund contract call this function will fail
        // finalizeCrowdfund

        // Others except DEPLOYER call this function will fail
        // setCrowdfundAddress

        // Others except DEPLOYER call this function will fail
        // releaseRedTeamTokens

        // Others except DEPLOYER call this function will fail
        // finalizePresale

        // Others except DEPLOYER call this function will fail
        // deliverPresaleredaccounts

        // Others except DEPLOYER call this function will fail
        // changeRedTeamAddress
    })

    describe('ERC20 API Test', () => {
        it('is token deployed', async () => {
            let symbol = (await red.methods.symbol().call())
            expect(symbol).equal('RED')
        })

        // transfer

        // transferFrom

        // approve

        // allowance

        // balanceOf
    })
})
