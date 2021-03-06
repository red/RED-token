const {
    expect,
    expectAsyncThrow,
    expectNoAsyncThrow,
    expectThrow,
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
    call,
    buy
} = require('./helpers')
const solcInput = require('../solc-input.json')
const deploy = require('./deploy')

describe('Contract', function () {
    const earlyBirdsSupply = toWei('48000000', 'ether')
    const icoStartDate = new Date(1515405600/* seconds */ * 1000) // Jan 8th 2018, 18:00, GMT+8
    let web3, snaps
    let accounts, DEPLOYER, WALLET, TEAM, BIZ
    let INVESTOR1, INVESTOR2, INVESTOR3, ANGEL1, ANGEL2
    let FOUNDATION
    let red, redCrowdfund

    before(async () => {
        // Instantiate clients to an empty in-memory blockchain
        web3 = ganacheWeb3({time: icoStartDate, total_accounts: 20})
        snaps = []

        // Provide synchronous access to test accounts
        ;[
            DEPLOYER,
            WALLET,
            TEAM,
            BIZ,
            INVESTOR1,
            INVESTOR2,
            INVESTOR3,
            ANGEL1,
            ANGEL2,
            SOME_RANDOM_GUY,
            SOME_RANDOM_ADDRESS
        ] = accounts = await web3.eth.getAccounts()

        // Deploy contracts
        ;({red, redCrowdfund} = await deploy.base(web3, solcJSON(solcInput), accounts))
        FOUNDATION = await call(red, 'foundationAddress')
    })

    beforeEach(async () => {
        snaps.push(await web3.evm.snapshot())
    })

    afterEach(async () => {
        await web3.evm.revert(snaps.pop())
    })

    describe('Crowfund', () => {
        it('deployment does NOT cost more than 100 USD for the deployer', async () => {
            // Source: https://coinmarketcap.com/currencies/ethereum/
            USD_PER_ETH = toBN(1068)
            const initial = toWei(toBN(100 /* ether */))
            const current = await balance(web3, DEPLOYER)
            const spent = initial.sub(toBN(current))
            const deploymentCost = (fromWei(spent)) * USD_PER_ETH
            console.log(`        (deployment cost: ${deploymentCost} USD)`)
            expect(deploymentCost).to.be.below(100 /* USD */)
        })

        it('contract is deployed', async () => {
            expect(await call(redCrowdfund, 'RED')).equal(red.options.address)
        })

        it('RED token is deployed', async () => {
            expect(await call(red, 'symbol')).equal('RED')
        })

        it('blockchain time is roughly the ICO start time', async () => {
            icoStart /* seconds */ = icoStartDate.getTime() / 1000
            expect(await now(web3)).within(icoStart, icoStart + 3)
        })

        it('wallet can be changed by DEPLOYER', async () => {
            await expectNoAsyncThrow(async () =>
                await send(redCrowdfund, DEPLOYER, 'changeWalletAddress', SOME_RANDOM_ADDRESS))
            expect(await call(redCrowdfund, 'wallet')).eq(SOME_RANDOM_ADDRESS)
        })

        it('wallet can NOT be changed by other than the DEPLOYER', async () => {
            const NOT_THE_DEPLOYER = SOME_RANDOM_GUY
            await expectThrow(async () =>
                send(redCrowdfund, NOT_THE_DEPLOYER, 'changeWalletAddress', SOME_RANDOM_ADDRESS))
        })

        describe('angel investments', () => {
            it('can be accepted by the DEPLOYER in any phase', async () => {
                const angelsAddr = [ANGEL1, ANGEL2]
                const amounts = [toWei('1000'), toWei('2000')]

                await send(red, DEPLOYER, 'deliverAngelsREDAccounts', angelsAddr, amounts)
                expect(await balance(red, ANGEL1)).eq(toWei('1000'))
                expect(await balance(red, ANGEL2)).eq(toWei('2000'))

                send(redCrowdfund, DEPLOYER, 'openCrowdfund')

                await send(red, DEPLOYER, 'deliverAngelsREDAccounts', angelsAddr, amounts)
                expect(await balance(red, ANGEL1)).eq(toWei('2000'))
                expect(await balance(red, ANGEL2)).eq(toWei('4000'))
                expect(await call(red, 'angelAmountRemaining')).eq(toWei('19994000'))
            })
        })

        describe('early bird round', () => {
            describe('when closed', () => {
                it('anyone can see it being closed', async () => {
                    expect(await call(red, 'isEarlyBirdsStage')).to.be.false
                })

                it('can be opened by DEPLOYER', async () => {
                    await expectNoAsyncThrow(async () =>
                        send(redCrowdfund, DEPLOYER, 'openCrowdfund'))
                    expect(await call(red, 'isEarlyBirdsStage')).to.be.true
                })

                it('can NOT be opened by other than the DEPLOYER', async () => {
                    await expectThrow(async () =>
                        send(redCrowdfund, SOME_RANDOM_GUY, 'openCrowdfund'))
                })

                it('supply is zero', async () => {
                    expect(await balance(red, redCrowdfund.options.address)).eq(toWei('0'))
                })

                it('prohibits external investment', async () => {
                    await expectThrow(async () =>
                        buy(web3, INVESTOR1, redCrowdfund, '1'))
                    expect(await balance(red, INVESTOR1)).eq(toWei('0'))
                })
            })

            describe('when opened', () => {
                beforeEach(async () => {
                    await send(redCrowdfund, DEPLOYER, 'openCrowdfund')
                })

                it(`supply is ${fromWei(earlyBirdsSupply, 'ether')} RED`, async () => {
                    expect(await balance(red, redCrowdfund.options.address)).eq(earlyBirdsSupply)
                })
            })
        })
    })

    describe('Workflow Test', () => {
        it('workflow', async () => {
            // angel round
            const angelsAddr = [ANGEL1, ANGEL2]
            const amounts = [toWei('1000'), toWei('2000')]
            await send(red, DEPLOYER, 'deliverAngelsREDAccounts', angelsAddr, amounts)
            expect(await balance(red, ANGEL1)).eq(toWei('1000'))
            expect(await balance(red, ANGEL2)).eq(toWei('2000'))

            // open early bird round
            await send(redCrowdfund, DEPLOYER, 'openCrowdfund')

            await expectThrow(async () =>
                send(red, INVESTOR3, 'deliverAngelsREDAccounts', angelsAddr, amounts))
            expect(await balance(red, ANGEL1)).eq(toWei('1000'))
            expect(await balance(red, ANGEL2)).eq(toWei('2000'))

            // angels buying
            await send(red, DEPLOYER, 'deliverAngelsREDAccounts', angelsAddr, amounts)
            expect(await balance(red, ANGEL1)).eq(toWei('2000'))
            expect(await balance(red, ANGEL2)).eq(toWei('4000'))
            expect(await call(red, 'angelAmountRemaining')).eq(toWei('19994000'))

            // add white list
            const whitelist = [INVESTOR1, INVESTOR2]
            await send(redCrowdfund, DEPLOYER, 'whitelistAccounts', whitelist)

            // investors who are not in white list cannot buy
            await expectThrow(async () =>
                buy(web3, INVESTOR3, redCrowdfund, '1'))
            expect(await balance(red, INVESTOR3)).eq(toWei('0'))

            // early bird round buy 1
            // early bird round price: 1 ETH = 2750 RED
            await buy(web3, INVESTOR1, redCrowdfund, '0.5')
            await buy(web3, INVESTOR1, redCrowdfund, '0.5')
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

            // release marketing supply
            await send(red, DEPLOYER, 'releaseMarketingTokens')
            expect(await balance(red, BIZ)).eq(toWei('20000000'))

            // close early bird round, will add public supply
            await send(red, DEPLOYER, 'finalizeEarlyBirds')
            expect(await balance(red, redCrowdfund.options.address)).eq(toWei('59986250'))

            const whitelist3 = [ANGEL1]
            await send(redCrowdfund, DEPLOYER, 'whitelistAccounts', whitelist3)

            // angel buy in open round
            await buy(web3, ANGEL1, redCrowdfund, '1')
            // 2000 + 2500 = 6500
            expect(await balance(red, ANGEL1)).eq(toWei('4500'))
            expect(await balance(web3, WALLET)).eq(toWei('106'))

            // Open round buy
            await buy(web3, INVESTOR2, redCrowdfund, '1')
            // 5500 + 2500 = 10,000
            expect(await balance(red, INVESTOR2)).eq(toWei('8000'))
            expect(await balance(web3, WALLET)).eq(toWei('107'))

            // any transfer will fail before the end of ICO
            // fail case 1: angels
            await expectThrow(async () =>
                send(red, ANGEL2, 'transfer', ANGEL1, toWei('300')))
            expect(await balance(red, ANGEL1)).eq(toWei('4500'))
            expect(await balance(red, ANGEL2)).eq(toWei('4000'))

            // fail case 2: investors
            await expectThrow(async () =>
                send(red, INVESTOR2, 'transfer', INVESTOR1, toWei('300')))
            expect(await balance(red, INVESTOR1)).eq(toWei('5500'))
            expect(await balance(red, INVESTOR2)).eq(toWei('8000'))

            await expectThrow(async () =>
                send(redCrowdfund, DEPLOYER, 'closeCrowdfund'))
            expect(await call(redCrowdfund, 'isOpen')).equal(true)

            // close ICO
            await web3.evm.increaseTime(604800 * 4)         // 4 weeks

            // !!! Others except DEPLOYER call closeCrowdfund will fail !!!
            await expectThrow(async () =>
                send(redCrowdfund, INVESTOR2, 'closeCrowdfund'))
            expect(await call(redCrowdfund, 'isOpen')).equal(true)

            await send(redCrowdfund, DEPLOYER, 'closeCrowdfund')
            expect(await call(redCrowdfund, 'isOpen')).equal(false)

            // check balance of the foundation
            expect(await balance(red, FOUNDATION)).eq(toWei('129981250'))

            // any buying will fail
            await expectThrow(async () =>
                buy(web3, INVESTOR2, redCrowdfund, '1'))
            expect(await balance(red, INVESTOR2)).eq(toWei('8000'))
            expect(await balance(web3, WALLET)).eq(toWei('107'))

            // investors except angels can trade now
            await send(red, INVESTOR2, 'transfer', INVESTOR1, toWei('300'))
            expect(await balance(red, INVESTOR1)).eq(toWei('5800'))
            expect(await balance(red, INVESTOR2)).eq(toWei('7700'))

            //transferFrom will fail as we didn't do any approve
            await expectThrow(async () =>
                send(red, INVESTOR3, 'transferFrom', INVESTOR2, INVESTOR1, toWei('300')))
            expect(await balance(red, INVESTOR1)).eq(toWei('5800'))
            expect(await balance(red, INVESTOR2)).eq(toWei('7700'))

            // approve
            // investor 2 deposit to investor 1 300 RED
            await send(red, INVESTOR2, 'approve', INVESTOR1, toWei('300'))
            expect(await call(red, 'allowance', INVESTOR2, INVESTOR1)).eq(toWei('300'))

            // now transferFrom will success
            // investor 1 send the token to investor 3
            await send(red, INVESTOR1, 'transferFrom', INVESTOR2, INVESTOR3, toWei('300'))
            expect(await balance(red, INVESTOR1)).eq(toWei('5800'))
            expect(await balance(red, INVESTOR2)).eq(toWei('7400'))
            expect(await balance(red, INVESTOR3)).eq(toWei('3050'))

            // transaction by angel is locked
            await expectThrow(async () =>
                send(red, ANGEL2, 'transfer', ANGEL1, toWei('300')))
            expect(await balance(red, ANGEL1)).eq(toWei('4500'))
            expect(await balance(red, ANGEL2)).eq(toWei('4000'))

            // unlock 20% RED to angels
            await send(red, DEPLOYER, 'partialUnlockAngelsAccounts', angelsAddr)
            expect(await balance(red, ANGEL1)).eq(toWei('4500'))
            expect(await balance(red, ANGEL2)).eq(toWei('4000'))
            // now angels can transfer some REDs
            await send(red, ANGEL1, 'transfer', ANGEL2, toWei('200'))
            expect(await balance(red, ANGEL1)).eq(toWei('4300'))
            expect(await balance(red, ANGEL2)).eq(toWei('4200'))

            // full unlock will fail
            await expectThrow(async () =>
                send(red, DEPLOYER, 'fullUnlockAngelsAccounts', angelsAddr))

            await send(red, ANGEL1, 'transfer', ANGEL2, toWei('1'))
            expect(await balance(red, ANGEL1)).eq(toWei('4299'))
            expect(await balance(red, ANGEL2)).eq(toWei('4201'))

            // unlock all angels tokens
            await web3.evm.increaseTime(86400 * 90)         // 90 days
            await send(red, DEPLOYER, 'fullUnlockAngelsAccounts', angelsAddr)
            expect(await balance(red, ANGEL1)).eq(toWei('4299'))
            expect(await balance(red, ANGEL2)).eq(toWei('4201'))

            // now they can do the tranfer
            await send(red, ANGEL1, 'transfer', ANGEL2, toWei('800'))
            expect(await balance(red, ANGEL1)).eq(toWei('3499'))
            expect(await balance(red, ANGEL2)).eq(toWei('5001'))

            expect(await balance(red, TEAM)).eq(toWei('0'))

            // release Red Team token
            await web3.evm.increaseTime(86400 * 275)         // andvance 275 days
            await send(red, DEPLOYER, 'releaseRedTeamTokens')
            expect(await balance(red, TEAM)).eq(toWei('30000000'))
        })
    })
})
