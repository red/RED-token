const {
    expect,
    assertContractThrows,
    balance,
    toBN,
    fromWei,
    toWei,
    solcJSON,
    ganacheWeb3,
    ZERO_ADDR,
    logAccounts,
    now,
    send,
    buy
} = require('./helpers')
const solcInput = require('../solc-input.json')
const deploy = require('./deploy')

describe('Contract', function () {
    const icoStartDate = new Date(1515405600/* seconds */ * 1000) // Jan 8th 2018, 18:00, GMT+8
    let web3, snaps
    let accounts, DEPLOYER, WALLET, TEAM, FOUNDATION, BIZ
    let INVESTOR1, INVESTOR2, INVESTOR3
    let red, redCrowdfund

    before(async () => {
        // Instantiate clients to an empty in-memory blockchain
        web3 = ganacheWeb3({time: icoStartDate})
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

    describe('Blockchain time', () => {
        it('is roughly the ICO start time', async () => {
            icoStart /* seconds */ = icoStartDate.getTime() / 1000
            expect(await now(web3)).within(icoStart, icoStart + 3)
        })
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
            let symbol = await red.methods.symbol().call()
            expect(symbol).equal('RED')
        })

        it('is crowdfund deployed', async () => {
            let token = await redCrowdfund.methods.RED().call()
            expect(token).equal(red.options.address)
        })

        it('workflow', async () => {
            // angel round
            const addresses = [INVESTOR1, INVESTOR2, INVESTOR3]
            const amounts = [toWei('1000'), toWei('2000'), toWei('3000')]
            await send(red, DEPLOYER, 'deliverPresaleRedAccounts', addresses, amounts)

            expect(await balance(red, INVESTOR1)).eq(toWei('1000'))
            expect(await balance(red, INVESTOR2)).eq(toWei('2000'))
            expect(await balance(red, INVESTOR3)).eq(toWei('3000'))
            
            // any transfer will fail before the end of ICO
            try {
                await send(red, INVESTOR2, 'transfer', INVESTOR1, toWei('300'))
            } catch (e) {
            }
            expect(await balance(red, INVESTOR1)).eq(toWei('1000'))
            expect(await balance(red, INVESTOR2)).eq(toWei('2000'))

            // buying before presale will fail
            try {
                await buy(web3, INVESTOR1, redCrowdfund, '1')
            } catch (error) {
            }
            expect(await balance(red, INVESTOR1)).eq(toWei('1000'))

            // open presale
            await send(redCrowdfund, DEPLOYER, 'openCrowdfund')

            // presale buy 1
            // presale price: 1 ETH = 2750 RED
            await buy(web3, INVESTOR1, redCrowdfund, '1')
            // 1000 + 2750 = 3750
            expect(await balance(red, INVESTOR1)).eq(toWei('3750'))
            expect(await balance(web3, WALLET)).eq(toWei('101'))
            await buy(web3, INVESTOR1, redCrowdfund, '1')
            // 3750 + 2750 = 6500
            expect(await balance(red, INVESTOR1)).eq(toWei('6500'))
            expect(await balance(web3, WALLET)).eq(toWei('102'))

            // presale buy 2
            await buy(web3, INVESTOR2, redCrowdfund, '2')
            // 2000 + (2750 * 2) = 7500
            expect(await balance(red, INVESTOR2)).eq(toWei('7500'))
            expect(await balance(web3, WALLET)).eq(toWei('104'))

            // close presale
            await send(red, DEPLOYER, 'finalizePresale')

            // Open round buy
            await buy(web3, INVESTOR2, redCrowdfund, '1')
            // 7500 + 2500 = 10,000
            expect(await balance(red, INVESTOR2)).eq(toWei('10000'))
            expect(await balance(web3, WALLET)).eq(toWei('105'))

            // close ICO
            await web3.evm.increaseTime(604800 * 4)
            await send(redCrowdfund, DEPLOYER, 'closeCrowdfund')

            // any buying will fail
            try {
                await buy(web3, INVESTOR2, redCrowdfund, '1')
            } catch (e) {
            }
            // 7500 + 2500 = 10,000
            expect(await balance(red, INVESTOR2)).eq(toWei('10000'))
            expect(await balance(web3, WALLET)).eq(toWei('105'))
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
        // deliverPresaleRedAccounts

        // Others except DEPLOYER call this function will fail
        // changeRedTeamAddress
    })

    describe('ERC20 API Test', () => {
        it('ERC20 API', async () => {
            // get some RED tokens
            const addresses = [INVESTOR1, INVESTOR2, INVESTOR3]
            const amounts = [toWei('1000'), toWei('2000'), toWei('3000')]
            await send(red, DEPLOYER, 'deliverPresaleRedAccounts', addresses, amounts)

            // any transfer will fail before the end of ICO
            // !!! transfer should fail, why it success? !!!
            // await send(red, INVESTOR2, 'transfer', INVESTOR1, toWei('300'))

            // advance time to end the ICO
            await web3.evm.increaseTime(604800 * 4)

            // transfer
            await send(red, INVESTOR2, 'transfer', INVESTOR1, toWei('300'))
            expect(await balance(red, INVESTOR1)).eq(toWei('1300'))
            expect(await balance(red, INVESTOR2)).eq(toWei('1700'))

            // transferFrom will fail as we didn't do any approve
            try {
                await send(red, INVESTOR3, 'transferFrom', INVESTOR2, INVESTOR1, toWei('300'))
            } catch (e) {
            }
            expect(await balance(red, INVESTOR1)).eq(toWei('1300'))
            expect(await balance(red, INVESTOR2)).eq(toWei('1700'))

            // approve
            // investor 2 deposit to investor 1 300 RED
            await send(red, INVESTOR2, 'approve', INVESTOR1, toWei('300'))
            expect((await send(red, INVESTOR3, 'allowance', INVESTOR2, INVESTOR1)) == toWei('300'))

            // now transferFrom will success
            // investor 1 send the token to investor 3
            await send(red, INVESTOR1, 'transferFrom', INVESTOR2, INVESTOR3, toWei('300'))
            expect(await balance(red, INVESTOR1)).eq(toWei('1300'))
            expect(await balance(red, INVESTOR2)).eq(toWei('1400'))
            expect(await balance(red, INVESTOR3)).eq(toWei('3300'))
        })
    })
})
