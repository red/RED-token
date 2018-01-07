const {Assertion, expect} = chai = require('chai')
const Web3 = require('web3')
const {BN, toBN, padLeft, fromWei, toWei} = require('web3-utils')
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

async function expectAsyncThrow(fn, regExp, message) {
    let f = () => {
    };
    try {
        await fn();
    } catch (e) {
        f = () => {
            throw e
        };
    } finally {
        expect(f).to.throw(regExp, message);
    }
}

async function expectNoAsyncThrow(fn, regExp, message) {
    let f = () => {
    };
    try {
        await fn();

    } catch (e) {
        f = () => {
            throw e
        }
    } finally {
        expect(f).to.not.throw(regExp, message);
    }
}

async function expectThrow(fn) {
    return await expectAsyncThrow(fn, /invalid opcode|VM Exception/, 'Contract call should fail')
}

async function balance(web3_or_eip20, account) {
    const eip20 = web3_or_eip20.methods
    const eth = web3_or_eip20.eth
    if (eip20) {
        return eip20.balanceOf(account).call()
    } else if (eth) {
        return eth.getBalance(account)
    } else {
        throw new Error('Expected a web3 client or an EIP20 web3 contract instead of', web3_or_eip20)
    }
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

const ganacheWeb3 = (opts) => {
    const truffleMnemonic = 'candy maple cake sugar pudding cream honey rich smooth crumble sweet treat'
    const provider = Ganache.provider(Object.assign(opts, {mnemonic: truffleMnemonic}))
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

const now = async (web3) => (await web3.eth.getBlock('latest')).timestamp

const send = async (contract, sender, methodName, ...params) => {
    const method = contract.methods[methodName]
    if (method instanceof Function) {
        return method(...params).send({from: sender})
    } else{
        throw new Error(`${contract.options.name}.${methodName} is undefined`)
    }
}

// Call options are assumed to be defaults
// although {from: sender} might be useful when calling
// methods which are intended to be transacted
const call = async (contract, methodName, ...params) =>{
    const method = contract.methods[methodName]
    if (method instanceof Function) {
        return method(...params).call()
    } else{
        throw new Error(`${contract.options.name}.${methodName} is undefined`)
    }
}

const buy = async (web3, buyer, seller, eth) =>
    web3.eth.sendTransaction({
        from: buyer,
        to: seller.options.address,
        value: toWei(eth, 'ether')
    })

module.exports = {
    expect,
    expectAsyncThrow,
    expectNoAsyncThrow,
    expectThrow,
    balance,
    ZERO_ADDR: padLeft(0x0, 40),
    BN,
    toBN,
    fromWei,
    toWei,
    solcJSON,
    ganacheWeb3,
    logAccounts,
    now,
    send,
    call,
    buy
}
