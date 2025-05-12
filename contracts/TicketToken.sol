// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/*
    TicketToken is an ERC-20 based ticket system.
    
    Roles:
      - Contract Deployer: Deploys the contract and receives ETH from ticket sales.
      - Vendor: Is the only address that can receive returned ticket tokens.
      - Attendee: Buys tickets by sending ETH; receives ticket tokens from the contract's supply. They can later return it (transfer token) to the vendor.
      
    Behavior:
      - buyTicket(uint256 _amount): When an attendee sends ETH (minimum of _amount * ticketPrice) to buy tickets,
          the contract transfers _amount ticket tokens from its own supply to the sender and forwards the received ETH to the deployer.
      - transfer(): The standard ERC-20 transfer is overridden so that tokens can only be transferred
          if the recipient is the vendor.
*/

contract TicketToken {
    // Token parameters
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply; // Note: This still represents the total ever created, not current circulating supply outside the contract
    
    // Vendor receives returned tickets
    address payable public vendor;
    // Deployer receives ETH from ticket sales
    address payable public deployer;
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
        // Total supply remains the same concept (total tokens created)
        totalSupply = _initialSupply * (10 ** uint256(decimals));
        // Assign the initial supply to the contract's address
        balanceOf[address(this)] = totalSupply;
        ticketPrice = _ticketPrice;
        vendor = payable(_vendor);
        deployer = payable(msg.sender); // Save the deployer address
        // Emit the initial transfer event to show tokens moving to the contract
        emit Transfer(address(0), address(this), totalSupply);
    }
    
    /**
     * @notice Allows users to buy a specified number of tickets.
     * @param _amount The number of tickets to purchase.
     * @return success Boolean indicating if the purchase was successful.
     */
    function buyTicket(uint256 _amount) external payable returns (bool success) {
        require(_amount > 0, "Must purchase at least one ticket.");
        uint256 totalCost = _amount * ticketPrice;
        require(msg.value >= totalCost, "Insufficient ETH sent for the requested number of tickets.");
        require(balanceOf[address(this)] >= _amount, "Not enough tickets available in contract supply.");
        
        // Transfer tokens from contract supply to the buyer
        balanceOf[address(this)] -= _amount;
        balanceOf[msg.sender] += _amount;
        
        // Emit standard Transfer event for token movement
        emit Transfer(address(this), msg.sender, _amount);
        // Emit custom event for purchase details
        emit TicketPurchased(msg.sender, _amount, msg.value);
        
        // Forward ETH to deployer instead of vendor
        (bool sent, ) = deployer.call{value: msg.value}("");
        require(sent, "Failed to forward ETH to deployer");
        
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
        (bool sent, ) = vendor.call{value: address(this).balance}("");
        require(sent, "ETH withdrawal failed");
    }

    // This function allows the contract to receive ETH (e.g., for the withdraw test)
    receive() external payable {}
}
