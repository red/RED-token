pragma solidity ^0.4.18;

import "../node_modules/zeppelin-solidity/contracts/math/SafeMath.sol";
import "../node_modules/zeppelin-solidity/contracts/ownership/Ownable.sol";
import "../node_modules/zeppelin-solidity/contracts/token/ERC20.sol";

contract REDToken is ERC20, Ownable {

    using SafeMath for uint;

/*----------------- Token Information -----------------*/

    string public constant name = "Red Community Token";
    string public constant symbol = "RED";

    uint8 public decimals = 18;                            // (ERC20 API) Decimal precision, factor is 1e18

    mapping (address => uint256) angels;                   // Angels accounts table (during locking period only)
    mapping (address => uint256) accounts;                 // User's accounts table
    mapping (address => mapping (address => uint256)) allowed; // User's allowances table

/*----------------- ICO Information -----------------*/

    uint256 public angelSupply;                            // Angels sale supply
    uint256 public earlyBirdsSupply;                       // Early birds supply
    uint256 public publicSupply;                           // Open round supply
    uint256 public foundationSupply;                       // Red Foundation/Community supply
    uint256 public redTeamSupply;                          // Red team supply
    uint256 public marketingSupply;                        // Marketing & strategic supply

    uint256 public angelAmountRemaining;                   // Amount of private angels tokens remaining at a given time
    uint256 public earlyBirdsAmountRemaining;              // Amount of early birds tokens remaining at a given time
    uint256 public icoStartsAt;                            // Crowdsale ending timestamp
    uint256 public icoEndsAt;                              // Crowdsale ending timestamp
    uint256 public redTeamLockingPeriod;                   // Locking period for Red team's supply

    address public crowdfundAddress;                       // Crowdfunding contract address
    address public redTeamAddress;                         // Red team address
    address public foundationAddress;                      // Foundation address
    address public marketingAddress;                       // Private equity address

    enum icoStages {
        Ready,                                             // Initial state on contract's creation
        EarlyBirds,                                        // Early birds state
        PublicSale,                                        // Public crowdsale state
        Done                                               // Ending state after ICO
    }
    icoStages stage;                                       // Crowdfunding current state

/*----------------- Events -----------------*/

    event EarlyBirdsFinalized(uint tokensRemaining);       // Event called when early birds round is done
    event CrowdfundFinalized(uint tokensRemaining);        // Event called when crowdfund is done

/*----------------- Modifiers -----------------*/

    modifier nonZeroAddress(address _to) {                 // Ensures an address is provided
        require(_to != 0x0);
        _;
    }

    modifier nonZeroAmount(uint _amount) {                 // Ensures a non-zero amount
        require(_amount > 0);
        _;
    }

    modifier nonZeroValue() {                              // Ensures a non-zero value is passed
        require(msg.value > 0);
        _;
    }

    modifier notBeforeCrowdfundStarts(){                   // Ensures actions can only happen after crowdfund ends
        require((now >= icoStartsAt) && (now < icoEndsAt));
        _;
    }

    modifier notBeforeCrowdfundEnds(){                     // Ensures actions can only happen after crowdfund ends
        require(now >= icoEndsAt);
        _;
    }

    modifier checkRedTeamLockingPeriod() {                 // Ensures locking period is over
        require(now >= redTeamLockingPeriod);
        _;
    }

    modifier onlyCrowdfund() {                             // Ensures only crowdfund can call the function
        require(msg.sender == crowdfundAddress);
        _;
    }

/*----------------- ERC20 API -----------------*/

    // -------------------------------------------------
    // Transfers amount to address
    // -------------------------------------------------
    function transfer(address _to, uint256 _amount) public notBeforeCrowdfundEnds returns (bool success) {
        require(balanceOf(msg.sender) >= _amount);
        addToBalance(_to, _amount);
        decrementBalance(msg.sender, _amount);
        Transfer(msg.sender, _to, _amount);
        return true;
    }

    // -------------------------------------------------
    // Transfers from one address to another (need allowance to be called first)
    // -------------------------------------------------
    function transferFrom(address _from, address _to, uint256 _amount) public notBeforeCrowdfundEnds returns (bool success) {
        require(allowance(_from, msg.sender) >= _amount);
        decrementBalance(_from, _amount);
        addToBalance(_to, _amount);
        allowed[_from][msg.sender] = allowed[_from][msg.sender].sub(_amount);
        Transfer(_from, _to, _amount);
        return true;
    }

    // -------------------------------------------------
    // Approves another address a certain amount of RED
    // -------------------------------------------------
    function approve(address _spender, uint256 _value) public returns (bool success) {
        require((_value == 0) || (allowance(msg.sender, _spender) == 0));
        allowed[msg.sender][_spender] = _value;
        Approval(msg.sender, _spender, _value);
        return true;
    }

    // -------------------------------------------------
    // Gets an address's RED allowance
    // -------------------------------------------------
    function allowance(address _owner, address _spender) public constant returns (uint256 remaining) {
        return allowed[_owner][_spender];
    }

    // -------------------------------------------------
    // Gets the RED balance of any address
    // -------------------------------------------------
    function balanceOf(address _owner) public constant returns (uint256 balance) {
        return accounts[_owner] + angels[_owner];
    }


/*----------------- Token API -----------------*/

    // -------------------------------------------------
    // Contract's constructor
    // -------------------------------------------------
    function REDToken() public {
        totalSupply         = 200000000 * 1e18;             // 100% - 200 million total RED with 18 decimals

        angelSupply         =  20000000 * 1e18;             //  10% -  20 million RED for private angels sale
        earlyBirdsSupply    =  48000000 * 1e18;             //  24% -  48 million RED for early-bird sale
        publicSupply        =  12000000 * 1e18;             //   6% -  12 million RED for the public crowdsale
        redTeamSupply       =  30000000 * 1e18;             //  15% -  30 million RED for Red team
        foundationSupply    =  70000000 * 1e18;             //  35% -  70 million RED for foundation/incentivising efforts
        marketingSupply     =  20000000 * 1e18;             //  10% -  20 million RED for covering marketing and strategic expenses

        angelAmountRemaining = angelSupply;                 // Decreased over the course of the private angel sale
        earlyBirdsAmountRemaining = earlyBirdsSupply;       // Decreased over the course of the early birds sale
        redTeamAddress       = 0x31aa507c140E012d0DcAf041d482e04F36323B03;       // Red Team address
        foundationAddress    = 0x93e3AF42939C163Ee4146F63646Fb4C286CDbFeC;       // Foundation/Community address
        marketingAddress     = 0x0;                         // Marketing/Strategic address

        icoStartsAt          = 1515405600;                  // Jan 8th 2018, 18:00, GMT+8
        icoEndsAt            = 1517824800;                  // Feb 5th 2018, 18:00, GMT+8
        angelLockingPeriod   = icoEndsAt.add(90 days);      //  3 months locking period
        redTeamLockingPeriod = icoEndsAt.add(365 days);     // 12 months locking period

        addToBalance(foundationAddress, foundationSupply);
        //addToBalance(marketingAddress, marketingSupply);

        stage = icoStages.Ready;                            // Initializes state
    }

    // -------------------------------------------------
    // Opens early birds sale
    // -------------------------------------------------
    function startCrowdfund() external onlyCrowdfund notBeforeCrowdfundStarts returns(bool) {
        require(stage == icoStages.Ready);
        stage = icoStages.EarlyBirds;
        return true;
    }

    // -------------------------------------------------
    // Returns TRUE if early birds round is currently going on
    // -------------------------------------------------
    function isEarlyBirdsStage() external view returns(bool) {
        return (stage == icoStages.EarlyBirds);
    }

    // -------------------------------------------------
    // Sets the crowdfund address, can only be done once
    // -------------------------------------------------
    function setCrowdfundAddress(address _crowdfundAddress) external onlyOwner nonZeroAddress(_crowdfundAddress) {
        require(crowdfundAddress == 0x0);
        crowdfundAddress = _crowdfundAddress;
        addToBalance(crowdfundAddress, earlyBirdsAmountRemaining + publicSupply);
    }

    // -------------------------------------------------
    // Function for the Crowdfund to transfer tokens
    // -------------------------------------------------
    function transferFromCrowdfund(address _to, uint256 _amount) external onlyCrowdfund nonZeroAmount(_amount) nonZeroAddress(_to) returns (bool success) {
        require(balanceOf(crowdfundAddress) >= _amount);
        decrementBalance(crowdfundAddress, _amount);
        addToBalance(_to, _amount);
        Transfer(0x0, _to, _amount);
        return true;
    }

    // -------------------------------------------------
    // Releases Red team supply after locking period is passed
    // -------------------------------------------------
    function releaseRedTeamTokens() external checkRedTeamLockingPeriod onlyOwner returns(bool success) {
        require(redTeamSupply > 0);
        addToBalance(redTeamAddress, redTeamSupply);
        Transfer(0x0, redTeamAddress, redTeamSupply);
        redTeamSupply = 0;
        return true;
    }

    // -------------------------------------------------
    // Finalizes early birds round. If some RED are left, let them overflow to the crowdfund
    // -------------------------------------------------
    function finalizeEarlyBirds() external onlyOwner returns (bool success) {
        require(stage == icoStages.EarlyBirds);
        uint256 amount = earlyBirdsAmountRemaining;
        if (amount != 0) {
            earlyBirdsAmountRemaining = 0;
            addToBalance(crowdfundAddress, amount);
        }
        stage = icoStages.PublicSale;
        EarlyBirdsFinalized(amount);                       // event log
        return true;
    }

    // -------------------------------------------------
    // Finalizes crowdfund. If there are leftover RED, let them overflow to foundation
    // -------------------------------------------------
    function finalizeCrowdfund() external onlyCrowdfund {
        require(stage == icoStages.PublicSale);
        uint256 amount = balanceOf(crowdfundAddress);
        if (amount > 0) {
            accounts[crowdfundAddress] = 0;
            addToBalance(foundationAddress, amount);
            Transfer(crowdfundAddress, foundationAddress, amount);
        }
        stage = icoStages.Done;
        CrowdfundFinalized(amount);                        // event log
    }

    // -------------------------------------------------
    // Changes Red Team wallet
    // -------------------------------------------------
    function changeRedTeamAddress(address _wallet) external onlyOwner {
        redTeamAddress = _wallet;
    }

    function changeMarketingAddress(address _wallet) external onlyOwner {
        marketingAddress = _wallet;
    }

    // -------------------------------------------------
    // Function to reserve RED to private angels investors (initially locked)
    // -------------------------------------------------
    function deliverAngelsREDAccounts(address[] _batchOfAddresses, uint[] _amountOfRED) external onlyOwner returns (bool success) {
        for (uint256 i = 0; i < _batchOfAddresses.length; i++) {
            deliverAngelsREDBalance(_batchOfAddresses[i], _amountOfRED[i]);
        }
        return true;
    }

    // -------------------------------------------------
    // Function to unlock 20% RED to private angels investors
    // -------------------------------------------------
    function partialUnlockAngelsAccounts(address[] _batchOfAddresses) external onlyOwner returns (bool success) {
        uint256 amount;
        for (uint256 i = 0; i < _batchOfAddresses.length; i++) {
            amount = angels[_accountHolder].mul(20).div(100);
            angels[_accountHolder] = angels[_accountHolder].sub(amount);
            addToBalance(_accountHolder, amount);
        }
        return true;
    }

    // -------------------------------------------------
    // Function to unlock all remaining RED to private angels investors (after 3 months)
    // -------------------------------------------------
    function fullUnlockAngelsAccounts(address[] _batchOfAddresses) external onlyOwner returns (bool success) {
        uint256 amount;
        for (uint256 i = 0; i < _batchOfAddresses.length; i++) {
            amount = angels[_accountHolder];
            angels[_accountHolder] = 0;
            addToBalance(_accountHolder, amount);
        }
        return true;
    }

/*----------------- Helper functions -----------------*/

    // -------------------------------------------------
    // If one address has contributed more than once,
    // the contributions will be aggregated
    // -------------------------------------------------
    function deliverAngelsREDBalance(address _accountHolder, uint _amountOfBoughtRED) internal onlyOwner {
        require(angelAmountRemaining > 0);
        angels[_accountHolder] = angels[_accountHolder].add(_amountOfBoughtRED);
        Transfer(0x0, _accountHolder, _amountOfBoughtRED);
        angelAmountRemaining = angelAmountRemaining.sub(_amountOfBoughtRED);
    }

    // -------------------------------------------------
    // Adds to balance
    // -------------------------------------------------
    function addToBalance(address _address, uint _amount) internal {
        accounts[_address] = accounts[_address].add(_amount);
    }

    // -------------------------------------------------
    // Removes from balance
    // -------------------------------------------------
    function decrementBalance(address _address, uint _amount) internal {
        accounts[_address] = accounts[_address].sub(_amount);
    }

/*-------------- For testing ------------------------*/
/*-------------- For testing ------------------------*/
/*------ Remove Those functions before deploying on mainnet ---------*/
/*-------------- For testing ------------------------*/
/*-------------- For testing ------------------------*/
    function changeFoundationAddress(address _wallet) public onlyOwner {
        foundationAddress = _wallet;
    }
}

