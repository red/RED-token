pragma solidity ^0.4.18;

import "github.com/OpenZeppelin/zeppelin-solidity/contracts/math/SafeMath.sol";
import "github.com/OpenZeppelin/zeppelin-solidity/contracts/ownership/Ownable.sol";
import "./RCT-token.sol";

contract RCTCrowdfund is Ownable {
    
    using SafeMath for uint;

    address public tokenAddress;                           // Address of the deployed RCT token contract
    address public wallet;                                 // Address of secure wallet to receive crowdfund contributions

    uint256 public weiRaised = 0;
    uint256 public startsAt;                               // Crowdfund starting time (Epoch format)
    uint256 public endsAt;                                 // Crowdfund ending time (Epoch format)

    RCToken public token;                                  // Instance of the RCT token contract
    
/*----------------- Events -----------------*/

    event WalletAddressChanged(address _wallet);           // Triggered upon owner changing the wallet address
    event AmountRaised(address beneficiary, uint amountRaised); // Triggered upon crowdfund being finalized
    event TokenPurchase(address indexed purchaser, uint256 value, uint256 amount); // Triggered upon purchasing tokens

/*----------------- Modifiers -----------------*/

    modifier nonZeroAddress(address _to) {                 // Ensure an address is provided
        require(_to != 0x0);
        _;
    }

    modifier nonZeroValue() {                              // Ensure a non-zero value is passed
        require(msg.value > 0);
        _;
    }

    modifier crowdfundIsActive() {                         // Ensure the crowdfund is ongoing
        assert(now >= startsAt && now <= endsAt);
        _;
    }

    modifier notBeforeCrowdfundEnds(){                     // Ensure actions can only happen after crowdfund ends
        require(now >= endsAt);
        _;
    }


/*----------------- Crowdfunding API -----------------*/
    
    // -------------------------------------------------    
    // Contract's constructor
    // -------------------------------------------------
    function RCTCrowdfund(address _tokenAddress) {
        wallet       = 0x123;                             // ICO wallet address
        startsAt     = 1506873600;                        // Dec 11th 2017, 18:00, GMT+8
        endsAt       = 1515578400;                        // Jan 10th 2018, 18:00, GMT+8
        tokenAddress = _tokenAddress;                     // RCT token Address
        token        = RCToken(tokenAddress);
    }

    // -------------------------------------------------
    // Change main contribution wallet
    // -------------------------------------------------    
    function changeWalletAddress(address _wallet) onlyOwner {
        wallet = _wallet;
        WalletAddressChanged(_wallet);
    }

    // -------------------------------------------------
    // Function to buy RCT. One can also buy RCT by calling this function directly and send 
    // it to another destination.
    // -------------------------------------------------
    function buyTokens(address _to) crowdfundIsActive nonZeroAddress(_to) nonZeroValue payable {
        uint256 weiAmount = msg.value;
        uint256 tokens;
        uint price = 1000;
        
        if (token.isPreSaleStage()) price = 1100;          // 10% discount for pre-sale
        tokens = weiAmount * price;
        weiRaised = weiRaised.add(weiAmount);
        wallet.transfer(weiAmount);
        if (!token.transferFromCrowdfund(_to, tokens)) revert();
        TokenPurchase(_to, weiAmount, tokens);
    }
    
    // -------------------------------------------------
    // Function to close the crowdfund. Any unsold RCT will go back to the foundation.
    // -------------------------------------------------
    function closeCrowdfund() external notBeforeCrowdfundEnds onlyOwner returns (bool success) {
        AmountRaised(wallet, weiRaised);
        token.finalizeCrowdfund();
        return true;
    }

/*----------------- Entry point -----------------*/

    // -------------------------------------------------
    // To contribute, send a value transaction to the crowdfund address.
    // Please include at least 100000 gas.
    // -------------------------------------------------
    function () payable {
        buyTokens(msg.sender);
    }
}