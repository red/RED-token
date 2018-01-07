const L = console.log

class App {
    get red() {
        return this._red
    }

    get redCrowdfund() {
        return this._redCrowdfund
    }

    constructor(Web3, currentProvider) {
        L('Constructing app...')
        this.web3 = new Web3(currentProvider)
        L('Web3 version:', this.web3.version)
        this.loadContracts()
    }

    async fetchJSON(url) {
        return fetch(url, {headers: new Headers({'Content-Type': 'application/json'})})
    }

    async loadContract(interfaceJsonUrl) {
        const {address, jsonInterface} = await (await this.fetchJSON(interfaceJsonUrl)).json()
        return new this.web3.eth.Contract(jsonInterface, address)
    }

    async loadContracts() {
        this._red = await this.loadContract('REDToken.json')
        this._redCrowdfund = await this.loadContract('REDCrowdfund.json')
        this.logSymbol()
    }

    async logSymbol() {
        try {
            // If the token symbol is `bytes32` it can be converted to string like this:
            //   const sym = this.web3.utils.hexToUtf8(await this.red.methods.symbol().call())
            const sym = await this.red.methods.symbol().call()
            L('Token symbol:', sym)
            return sym
        } catch (e) {
            console.error(e)
        }
    }
}
