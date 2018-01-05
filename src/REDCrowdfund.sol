pragma solidity ^0.4.18;

import "../node_modules/zeppelin-solidity/contracts/math/SafeMath.sol";
import "../node_modules/zeppelin-solidity/contracts/ownership/Ownable.sol";
import "./REDToken.sol";

contract REDCrowdfund is Ownable {

    using SafeMath for uint;

    bool public isOpen = false;                           // Is the crowd fund open?
    address public tokenAddress;                          // Address of the deployed RED token contract
    address public wallet;                                // Address of secure wallet to receive crowdfund contributions

    uint256 public weiRaised = 0;
    uint256 public startsAt;                              // Crowdfund starting time (Epoch format)
    uint256 public endsAt;                                // Crowdfund ending time (Epoch format)

    REDToken public RED;                                  // Instance of the RED token contract

/*----------------- Events -----------------*/

    event WalletAddressChanged(address _wallet);           // Triggered upon owner changing the wallet address
    event AmountRaised(address beneficiary, uint amountRaised); // Triggered upon crowdfund being finalized
    event TokenPurchase(address indexed purchaser, uint256 value, uint256 amount); // Triggered upon purchasing tokens

/*----------------- Modifiers -----------------*/

    modifier nonZeroAddress(address _to) {                 // Ensures an address is provided
        require(_to != 0x0);
        _;
    }

    modifier nonZeroValue() {                              // Ensures a non-zero value is passed
        require(msg.value > 0);
        _;
    }

    modifier crowdfundIsActive() {                         // Ensures the crowdfund is ongoing
        require(isOpen && now >= startsAt && now <= endsAt);
        _;
    }

    modifier notBeforeCrowdfundEnds(){                     // Ensures actions can only happen after crowdfund ends
        require(now >= endsAt);
        _;
    }


/*----------------- Crowdfunding API -----------------*/

    // -------------------------------------------------
    // Contract's constructor
    // -------------------------------------------------
    function REDCrowdfund(address _tokenAddress) public {
        wallet       = 0x123;                              // ICO wallet address
        startsAt     = 1515405600;                         // Jan 8th 2018, 18:00, GMT+8
        endsAt       = 1517479200;                         // Feb 1th 2018, 18:00, GMT+8
        tokenAddress = _tokenAddress;                      // RED token Address
        RED          = REDToken(tokenAddress);
    }

    // -------------------------------------------------
    // Changes main contribution wallet
    // -------------------------------------------------
    function changeWalletAddress(address _wallet) public onlyOwner {
        wallet = _wallet;
        WalletAddressChanged(_wallet);
    }

    // -------------------------------------------------
    // Opens the crowdfunding
    // -------------------------------------------------
    function openCrowdfund() external onlyOwner returns (bool success) {
        isOpen = true;
        RED.startCrowdfund();
        return true;
    }

    // -------------------------------------------------
    // Function to buy RED. One can also buy RED by calling this function directly and send
    // it to another destination.
    // -------------------------------------------------
    function buyTokens(address _to) public crowdfundIsActive nonZeroAddress(_to) nonZeroValue payable {
        uint256 weiAmount = msg.value;
        uint256 tokens;
        uint price = 2500;

        if (RED.isPreSaleStage()) {price = 2750;}           // 10% discount for pre-sale
        tokens = weiAmount * price;
        weiRaised = weiRaised.add(weiAmount);
        wallet.transfer(weiAmount);
        if (!RED.transferFromCrowdfund(_to, tokens)) {revert();}
        TokenPurchase(_to, weiAmount, tokens);
    }

    // -------------------------------------------------
    // Closes the crowdfunding. Any unsold RED will go back to the foundation.
    // -------------------------------------------------
    function closeCrowdfund() external notBeforeCrowdfundEnds onlyOwner returns (bool success) {
        AmountRaised(wallet, weiRaised);
        RED.finalizeCrowdfund();
        isOpen = false;
        return true;
    }

/*----------------- Entry point -----------------*/

    // -------------------------------------------------
    // To contribute, send a value transaction to the crowdfund address.
    // Please include at least 100000 gas.
    // -------------------------------------------------
    function () public payable {
        buyTokens(msg.sender);
    }
}
