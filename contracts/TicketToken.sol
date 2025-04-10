// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/*
    TicketToken is an ERC-20 based ticket system.
    
    Roles:
      - Contract Deployer: Deploys the contract.
      - Vendor: Receives ETH when tickets are bought and is the only address that can receive returned ticket tokens.
      - Attendee: Buys a ticket by sending ETH; receives a ticket token. They can later return it (transfer token) to the vendor.
      
    Behavior:
      - buyTicket(): When an attendee sends ETH (minimum of ticketPrice) to buy a ticket,
          the contract mints 1 ticket token to the sender and forwards the received ETH to the vendor.
      - transfer(): The standard ERC-20 transfer is overridden so that tokens can only be transferred
          if the recipient is the vendor.
*/

contract TicketToken {
    // Token parameters
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;
    
    // Vendor receives ETH when a ticket is bought
    address payable public vendor;
    // Ticket price (in wei)
    uint256 public ticketPrice;
    
    // Mapping from address to token balance
    mapping(address => uint256) public balanceOf;
    
    // Standard ERC-20 Transfer event
    event Transfer(address indexed from, address indexed to, uint256 value);
    // Event to log a successful ticket purchase
    event TicketPurchased(address indexed buyer, uint256 tokenAmount, uint256 amountETH);

    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        uint256 _initialSupply,
        uint256 _ticketPrice,
        address _vendor
    ) {
        require(_vendor != address(0), "Vendor address cannot be zero.");
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        totalSupply = _initialSupply * (10 ** uint256(decimals));
        balanceOf[msg.sender] = totalSupply;
        ticketPrice = _ticketPrice;
        vendor = payable(_vendor);
    }
    
    // Simple buyTicket function that accepts ETH and forwards it to the vendor
    function buyTicket() external payable returns (bool success) {
        require(msg.value >= ticketPrice, "Insufficient ETH sent for ticket.");
        
        // Mint one ticket token to the buyer
        uint256 tokensToMint = 1;
        totalSupply += tokensToMint;
        balanceOf[msg.sender] += tokensToMint;
        
        emit Transfer(address(0), msg.sender, tokensToMint);
        emit TicketPurchased(msg.sender, tokensToMint, msg.value);
        
        // Forward ETH to vendor
        (bool sent, ) = vendor.call{value: msg.value}("");
        require(sent, "Failed to forward ETH to vendor");
        
        return true;
    }
    
    // Overridden transfer function so that tokens can only be transferred to the vendor
    function transfer(address _to, uint256 _value) public returns (bool success) {
        require(_to == vendor, "Tickets can only be returned to the vendor.");
        require(balanceOf[msg.sender] >= _value, "Insufficient ticket balance.");
        
        balanceOf[msg.sender] -= _value;
        balanceOf[_to] += _value;
        emit Transfer(msg.sender, _to, _value);
        
        return true;
    }
    
    // For debugging: Withdraw any funds stuck in the contract
    function withdraw() external {
        require(msg.sender == vendor, "Only vendor can withdraw");
        vendor.transfer(address(this).balance);
    }

    // This function allows the contract to receive ETH
    receive() external payable {}
}
