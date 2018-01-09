const MAINNET_RED_ADDR = '0x76960dccd5a1fe799f7c29be9f19ceb4627aeb2f'

const L = console.log
const $ = (sel) => document.querySelector(sel)
const {toBN, fromWei, toWei} = web3

const call = async (contract, methodName, ...params) =>{
    const method = contract.methods[methodName]
    if (method instanceof Function) {
        return method(...params).call()
    } else{
        throw new Error(`${contract.options.name}.${methodName} is undefined`)
    }
}

async function fetchJSON(url) {
    return fetch(url, {headers: new Headers({'Content-Type': 'application/json'})})
}

class App {
    get red() {
        return this._red
    }

    get redCrowdfund() {
        return this._redCrowdfund
    }

    constructor(Web3, provider) {
        L('Constructing app...')
        this.web3 = new Web3(provider)
        L('Web3 version:', this.web3.version)
    }

    async loadContract(jsonInterfaceUrl, ...[addressOverride]) {
        const {address, jsonInterface} = await (await fetchJSON(jsonInterfaceUrl)).json()
        return new this.web3.eth.Contract(jsonInterface, addressOverride || address)
    }

    async loadContracts() {
        this._red = await this.loadContract('REDToken.json'/*, MAINNET_RED_ADDR*/)
        this._redCrowdfund = await this.loadContract('REDCrowdfund.json')
    }

    async weiBalance(address) {
        return this.web3.eth.getBalance(address)
    }

    async logSymbol() {
        try {
            // If the token symbol is `bytes32` it can be converted to string like this:
            //   const sym = this.web3.utils.hexToUtf8(await this.red.methods.symbol().call())
            const sym = await call(this.red, 'symbol')
            L('Token symbol:', sym)
            return sym
        } catch (e) {
            console.error(e)
        }
    }
}
