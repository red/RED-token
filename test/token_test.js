const {expect} = require('./helpers.js')

const Web3 = require('web3')
const {BN, toBN} = require('web3-utils')

const Ganache = require("ganache-core")
const truffleMnemonic = 'candy maple cake sugar pudding cream honey rich smooth crumble sweet treat'

const fs = require('fs')
const load = (path) => fs.readFileSync(require.resolve(path), 'utf-8')

describe('RCT', function () {
    let provider, web3, snaps
    let RCTABI, RCTBytecode
    let accounts, DEPLOYER, INVESTOR, token

    before(async function () {
        // Initialize an empty, in-memory blockchain
        provider = Ganache.provider({mnemonic: truffleMnemonic})

        // Instantiate clients to the in-memory blockchain
        web3 = new Web3(provider)

        // Prepare chain snapshotting
        web3.extend({
            property: 'evm',
            methods: [{
                name: 'snapshot',
                call: 'evm_snapshot',
                params: 0,
                outputFormatter: web3.utils.hexToNumber
            }, {
                name: 'revert',
                call: 'evm_revert',
                params: 1,
                inputFormatter: [web3.utils.numberToHex]
            }]
        })
        snaps = []

        // Provide synchronous access to test accounts
        accounts = await web3.eth.getAccounts()
        DEPLOYER = accounts[0]
        INVESTOR = accounts[1]

        // Deploy token contract
        try {
            RCTABI = JSON.parse(load('../out/RCToken.abi'))
            RCTBytecode = load('../out/RCToken.bin')
        } catch (e) {
            console.log('No contracts found in the out/ folder', e)
            return this.skip()
        }
        const RCT = new web3.eth.Contract(RCTABI)
        token = await RCT.deploy({data: RCTBytecode})
            .send({from: DEPLOYER, gas: 3000000})
    })

    beforeEach(async () => {
        snaps.push(await web3.evm.snapshot())
    })

    afterEach(async () => {
        await web3.evm.revert(snaps.pop())
    })

    it('is deployed', async () => {
        let symbol = (await token.methods.symbol().call())
        expect(symbol).equal('RCT')
    })
})
