module.exports = function () {
    return {
        files: [
            'src/**/*.sol',
            'test/helpers.js',
            'test/deploy.js',
            'solc-input.json',
            'node_modules/zeppelin-solidity/contracts/**'
        ],

        tests: [
            'test/*_test.js'
        ],
        env: {
            type: 'node'
        },
        testFramework: 'mocha'
    }
}
