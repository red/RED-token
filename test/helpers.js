const {Assertion} = require('chai')
const {BN} = require('web3-utils')

Assertion.addMethod('eq', function (N) {
    this.assert(new BN(this._obj).eq(new BN(N)),
        'expected #{act} to equal #{exp}',
        'expected #{act} NOT to equal #{exp}',
        N, this._obj)
})

module.exports = {
    expect: require('chai').expect
}
