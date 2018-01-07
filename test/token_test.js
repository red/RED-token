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
    let INVESTOR1, INVESTOR2, INVESTOR3, ANGEL1, ANGEL2
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
            INVESTOR3,
            ANGEL1,
            ANGEL2
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
            const angelsAddr = [ANGEL1, ANGEL2]
            const amounts = [1000, 2000]
            await send(red, DEPLOYER, 'deliverAngelsREDAccounts', angelsAddr, amounts)      
            expect(await balance(red, ANGEL1)).eq(toWei('1000'))
            expect(await balance(red, ANGEL2)).eq(toWei('2000'))  

            // buying before early bird round will fail
            try {
                await buy(web3, INVESTOR1, redCrowdfund, '1')
            } catch (error) {
            }
            expect(await balance(red, INVESTOR1)).eq(toWei('0'))

            // open early bird round
            await send(redCrowdfund, DEPLOYER, 'openCrowdfund')

            // add white list
            const whitelist = [INVESTOR1, INVESTOR2]
            await send(redCrowdfund, DEPLOYER, 'whitelistAccounts', whitelist)

            // investors who are not in white list cannot buy
            try {
                await buy(web3, INVESTOR3, redCrowdfund, '1')
            } catch (e) {}
            expect(await balance(red, INVESTOR3)).eq(toWei('0'))

            // early bird round buy 1
            // early bird round price: 1 ETH = 2750 RED
            await buy(web3, INVESTOR1, redCrowdfund, '1')
            // 2750
            expect(await balance(red, INVESTOR1)).eq(toWei('2750'))
            expect(await balance(web3, WALLET)).eq(toWei('101'))
            await buy(web3, INVESTOR1, redCrowdfund, '1')
            // 2750 + 2750 = 5500
            expect(await balance(red, INVESTOR1)).eq(toWei('5500'))
            expect(await balance(web3, WALLET)).eq(toWei('102'))

            // early bird round buy 2
            await buy(web3, INVESTOR2, redCrowdfund, '2')
            // 2750 * 2 = 5500
            expect(await balance(red, INVESTOR2)).eq(toWei('5500'))
            expect(await balance(web3, WALLET)).eq(toWei('104'))

            // add white list
            const whitelist2 = [INVESTOR3]
            await send(redCrowdfund, DEPLOYER, 'whitelistAccounts', whitelist2)

            // early bird round buy 3
            await buy(web3, INVESTOR3, redCrowdfund, '1')
            // 2750
            expect(await balance(red, INVESTOR3)).eq(toWei('2750'))
            expect(await balance(web3, WALLET)).eq(toWei('105'))

            // close early bird round
            await send(red, DEPLOYER, 'finalizeEarlyBirds')

            // Open round buy
            await buy(web3, INVESTOR2, redCrowdfund, '1')
            // 5500 + 2500 = 10,000
            expect(await balance(red, INVESTOR2)).eq(toWei('8000'))
            expect(await balance(web3, WALLET)).eq(toWei('106'))

            // any transfer will fail before the end of ICO
            try {
                await send(red, ANGEL2, 'transfer', ANGEL1, toWei('300'))
            } catch (e) {
            }
            expect(await balance(red, ANGEL1)).eq(toWei('1000'))
            expect(await balance(red, ANGEL2)).eq(toWei('2000'))

            // close ICO
            await web3.evm.increaseTime(604800 * 4)         // 4 weeks
            await send(redCrowdfund, DEPLOYER, 'closeCrowdfund')

            // any buying will fail
            try {
                await buy(web3, INVESTOR2, redCrowdfund, '1')
            } catch (e) {
            }
            expect(await balance(red, INVESTOR2)).eq(toWei('8000'))
            expect(await balance(web3, WALLET)).eq(toWei('106'))

            await send(red, INVESTOR2, 'transfer', INVESTOR1, toWei('300'))
            expect(await balance(red, INVESTOR1)).eq(toWei('5800'))
            expect(await balance(red, INVESTOR2)).eq(toWei('7700'))

            // transaction by angel is locked
            try {
                await send(red, ANGEL2, 'transfer', ANGEL1, toWei('300'))
            } catch (e) {
            }
            expect(await balance(red, ANGEL1)).eq(toWei('1000'))
            expect(await balance(red, ANGEL2)).eq(toWei('2000'))

            // unlock 20% RED to angels
            await send(red, DEPLOYER, 'partialUnlockAngelsAccounts', angelsAddr)
            // now angels can transfer some REDs
            await send(red, ANGEL1, 'transfer', ANGEL2, toWei('200'))
            expect(await balance(red, ANGEL1)).eq(toWei('800'))
            expect(await balance(red, ANGEL2)).eq(toWei('2200'))

            // angel 1 unlocked: 1000 * 20% = 200
            // he already transfered all his REDs to angel2
            // try to unlock all angels's tokens will fail
            try {
                await send(red, DEPLOYER, 'fullUnlockAngelsAccounts', angelsAddr)
            } catch (e) {}

            // the following transfer will fail
            try {
                await send(red, ANGEL1, 'transfer', ANGEL2, toWei('1'))
            } catch (e) {}
            expect(await balance(red, ANGEL1)).eq(toWei('800'))
            expect(await balance(red, ANGEL2)).eq(toWei('2200'))

            // unlock all angels tokens
            await web3.evm.increaseTime(86400 * 90)         // 90 days
            await send(red, DEPLOYER, 'fullUnlockAngelsAccounts', angelsAddr)
            // now they can do the tranfer
            await send(red, ANGEL1, 'transfer', ANGEL2, toWei('800'))
            expect(await balance(red, ANGEL1)).eq(toWei('0'))
            expect(await balance(red, ANGEL2)).eq(toWei('3000'))

            expect(await balance(red, TEAM)).eq(toWei('0'))
            
            // release Red Team token
            await web3.evm.increaseTime(86400 * 275)         // andvance 275 days
            await send(red, DEPLOYER, 'releaseRedTeamTokens')
            expect(await balance(red, TEAM)).eq(toWei('30000000'))            
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
        it('After ICO test ERC20 API', async () => {
            // get some RED tokens
            const addresses = [INVESTOR1, INVESTOR2, INVESTOR3]
            const amounts = [1300, 1700, 3000]
            await send(red, DEPLOYER, 'deliverAngelsREDAccounts', addresses, amounts)

            // transfer
            //await send(red, INVESTOR2, 'transfer', INVESTOR1, toWei('300'))
            //expect(await balance(red, INVESTOR1)).eq(toWei('1000'))
            //expect(await balance(red, INVESTOR2)).eq(toWei('2000'))

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
            //await send(red, INVESTOR1, 'transferFrom', INVESTOR2, INVESTOR3, toWei('300'))
            //expect(await balance(red, INVESTOR1)).eq(toWei('1300'))
            //expect(await balance(red, INVESTOR2)).eq(toWei('1400'))
            //expect(await balance(red, INVESTOR3)).eq(toWei('3300'))
        })
    })
})
