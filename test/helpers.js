const {Assertion, expect} = chai = require('chai')
const Web3 = require('web3')
const {BN, toBN, padLeft, toWei, fromWei} = require('web3-utils')
const Ganache = require("ganache-core")
const solc = require('solc')
const path = require('path')
const fs = require('fs')

chai.use(require('chai-subset'))

Assertion.addMethod('eq', function (N) {
    this.assert(toBN(this._obj).eq(toBN(N)),
        'expected #{act} to equal #{exp}',
        'expected #{act} NOT to equal #{exp}',
        N, this._obj)
})

async function assertThrowsAsync(fn, regExp, message) {
    let f = () => {
    };
    try {
        await fn();
    } catch (e) {
        f = () => {
            throw e
        };
    } finally {
        chai.assert.throws(f, regExp, message);
    }
}

async function assertContractThrows(fn, regExp, txt) {
    await assertThrowsAsync(fn, /invalid opcode|VM Exception/, 'Contract call should fail')
}

async function expectBalance(eip20, account, expectedBalance) {
    return expect(await eip20.methods.balanceOf(account).call())
        .eq(expectedBalance)
}

const readImport = (file) => {
    const fullPath = path.join(__dirname, '..', 'src', file)
    try {
        const contents = fs.readFileSync(fullPath, 'utf-8')
        return {contents: contents}
    } catch (e) {
        return {error: e}
    }
}

const solcJSON = (plan) => {
    const compiled = JSON.parse(solc.compileStandardWrapper(JSON.stringify(plan), readImport))
    if (compiled.errors) {
        const msg = ({formattedMessage}) => formattedMessage
        throw new Error('\n' + compiled.errors.map(msg).join('\n'))
    } else {
        return compiled
    }
}

const ganacheWeb3 = () => {
    const truffleMnemonic = 'candy maple cake sugar pudding cream honey rich smooth crumble sweet treat'
    const provider = Ganache.provider({mnemonic: truffleMnemonic})
    const web3 = new Web3(provider)

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
        }, {
            name: 'increaseTime',
            call: 'evm_increaseTime',
            params: 1
        }]
    })

    return web3
}

const logAccounts = (accounts) => {
    [
        DEPLOYER,
        WALLET,
        TEAM,
        FOUNDATION,
        BIZ,
        INVESTOR1,
        INVESTOR2,
        INVESTOR3
    ] = accounts
    console.log(`
            DEPLOYER:   ${DEPLOYER}
            INVESTOR:   ${INVESTOR}`)
}

const send = async (contract, sender, method, ...params) =>
    contract.methods[method](...params).send({from: sender})

const buy = async (web3, _from, _to, _value) =>
    web3.eth.sendTransaction({from: _from, to: _to.options.address, value: toWei(_value, 'ether')})

module.exports = {
    expect,
    assertContractThrows,
    expectBalance,
    ZERO_ADDR: padLeft(0x0, 40),
    BN,
    toBN,
    toWei,
    solcJSON,
    ganacheWeb3,
    logAccounts,
    send,
    buy
}
