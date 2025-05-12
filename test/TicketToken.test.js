const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TicketToken", function () {
  let TicketToken;
  let ticketToken;
  let owner; // Deployer
  let vendor;
  let buyer1;
  let buyer2;
  let ticketPrice;
  let contractAddress;
  const initialSupplyCount = 1000; // Number of tokens, not wei

  beforeEach(async function () {
    // Get signers (accounts)
    [owner, vendor, buyer1, buyer2] = await ethers.getSigners();

    // Deploy the contract before each test
    TicketToken = await ethers.getContractFactory("TicketToken");
    ticketPrice = ethers.parseEther("0.01"); // 0.01 ETH per ticket

    ticketToken = await TicketToken.deploy(
      "TiernanTicketToken", // name
      "TTT",                // symbol
      0,                    // decimals - Set to 0 for ticket counts
      initialSupplyCount,   // initialSupply (number of tickets)
      ticketPrice,          // ticketPrice
      vendor.address        // vendor address
    );

    await ticketToken.waitForDeployment();
    contractAddress = await ticketToken.getAddress();
  });

  // Test contract deployment and basic properties
  describe("Deployment", function () {
    it("Should assign the initial supply to the contract address", async function () {
      expect(await ticketToken.balanceOf(contractAddress)).to.equal(initialSupplyCount);
    });

    it("Should set the deployer's balance to 0", async function () {
      expect(await ticketToken.balanceOf(owner.address)).to.equal(0);
    });

    it("Should set the correct token properties", async function () {
      expect(await ticketToken.name()).to.equal("TiernanTicketToken");
      expect(await ticketToken.symbol()).to.equal("TTT");
      expect(await ticketToken.decimals()).to.equal(0); // Check decimals
      expect(await ticketToken.ticketPrice()).to.equal(ticketPrice);
      // Check total supply (conceptually total created)
      expect(await ticketToken.totalSupply()).to.equal(initialSupplyCount);
    });

    it("Should set the right vendor", async function () {
      expect(await ticketToken.vendor()).to.equal(vendor.address);
    });
  });

  // Test buying tickets
  describe("Buying Tickets", function () {
    it("Should allow buying a single ticket with sufficient ETH", async function () {
      const numTickets = 1;
      const totalCost = ticketPrice * BigInt(numTickets);
      const initialContractBalance = await ticketToken.balanceOf(contractAddress);
      const initialBuyerBalance = await ticketToken.balanceOf(buyer1.address);
      const initialVendorEthBalance = await ethers.provider.getBalance(vendor.address);

      // Buy tickets
      const tx = await ticketToken.connect(buyer1).buyTicket(numTickets, { value: totalCost });
      const receipt = await tx.wait();

      // Check balances
      const finalContractBalance = await ticketToken.balanceOf(contractAddress);
      const finalBuyerBalance = await ticketToken.balanceOf(buyer1.address);
      const finalVendorEthBalance = await ethers.provider.getBalance(vendor.address);

      expect(initialContractBalance - finalContractBalance).to.equal(numTickets);
      expect(finalBuyerBalance - initialBuyerBalance).to.equal(numTickets);
      expect(finalVendorEthBalance - initialVendorEthBalance).to.equal(totalCost);

      // Verify events (Transfer from contract, TicketPurchased)
      // Find Transfer event from contract to buyer
       await expect(tx)
         .to.emit(ticketToken, "Transfer")
         .withArgs(contractAddress, buyer1.address, numTickets);
      // Find TicketPurchased event
       await expect(tx)
         .to.emit(ticketToken, "TicketPurchased")
         .withArgs(buyer1.address, numTickets, totalCost); // Check ETH value sent
    });

     it("Should allow buying multiple tickets with sufficient ETH", async function () {
      const numTickets = 5;
      const totalCost = ticketPrice * BigInt(numTickets);
      const initialContractBalance = await ticketToken.balanceOf(contractAddress);
      const initialBuyerBalance = await ticketToken.balanceOf(buyer1.address);

      await ticketToken.connect(buyer1).buyTicket(numTickets, { value: totalCost });

      const finalContractBalance = await ticketToken.balanceOf(contractAddress);
      const finalBuyerBalance = await ticketToken.balanceOf(buyer1.address);

      expect(initialContractBalance - finalContractBalance).to.equal(numTickets);
      expect(finalBuyerBalance - initialBuyerBalance).to.equal(numTickets);
    });

    it("Should reject buying tickets with insufficient ETH", async function () {
      const numTickets = 2;
      const insufficientAmount = ticketPrice; // Enough for 1, not 2

      await expect(
        ticketToken.connect(buyer1).buyTicket(numTickets, { value: insufficientAmount })
      ).to.be.revertedWith("Insufficient ETH sent for the requested number of tickets.");
    });

     it("Should reject buying zero tickets", async function () {
      await expect(
        ticketToken.connect(buyer1).buyTicket(0, { value: ticketPrice })
      ).to.be.revertedWith("Must purchase at least one ticket.");
    });

    it("Should reject buying more tickets than available in contract supply", async function () {
        const numTickets = initialSupplyCount + 1;
        const totalCost = ticketPrice * BigInt(numTickets);

        await expect(
            ticketToken.connect(buyer1).buyTicket(numTickets, { value: totalCost })
        ).to.be.revertedWith("Not enough tickets available in contract supply.");
    });

    it("Should forward correct ETH to vendor even if more is sent", async function () {
      const numTickets = 1;
      const sentAmount = ticketPrice * 2n; // Send double the required ETH
      const beforeBalance = await ethers.provider.getBalance(vendor.address);

      await ticketToken.connect(buyer1).buyTicket(numTickets, { value: sentAmount });

      const afterBalance = await ethers.provider.getBalance(vendor.address);
      // Vendor should receive the full sent amount
      expect(afterBalance - beforeBalance).to.equal(sentAmount);
    });
  });

  // Test transferring tickets
  describe("Transferring Tickets", function () {
    const numTicketsToBuy = 3;
    beforeEach(async function () {
      // Buyer purchases tickets first
      const totalCost = ticketPrice * BigInt(numTicketsToBuy);
      await ticketToken.connect(buyer1).buyTicket(numTicketsToBuy, { value: totalCost });
    });

    it("Should allow transferring tickets back to vendor", async function () {
      const transferAmount = 2;
      const initialBuyerBalance = await ticketToken.balanceOf(buyer1.address);
      const initialVendorBalance = await ticketToken.balanceOf(vendor.address);

      // Transfer ticket back to vendor
      await ticketToken.connect(buyer1).transfer(vendor.address, transferAmount);

      const finalBuyerBalance = await ticketToken.balanceOf(buyer1.address);
      const finalVendorBalance = await ticketToken.balanceOf(vendor.address);

      expect(initialBuyerBalance - finalBuyerBalance).to.equal(transferAmount);
      expect(finalVendorBalance - initialVendorBalance).to.equal(transferAmount);
    });

    it("Should prevent transferring tickets to non-vendor addresses", async function () {
      await expect(
        ticketToken.connect(buyer1).transfer(buyer2.address, 1)
      ).to.be.revertedWith("Tickets can only be returned to the vendor.");
    });

    it("Should prevent transferring more tickets than owned", async function () {
      const transferAmount = numTicketsToBuy + 1;
      await expect(
        ticketToken.connect(buyer1).transfer(vendor.address, transferAmount)
      ).to.be.revertedWith("Insufficient ticket balance.");
    });
  });

  // Test edge cases and special functions
  describe("Special Functions", function () {
    it("Should allow vendor to withdraw any ETH in the contract", async function () {
        // Send ETH via buyTicket
        const numTickets = 1;
        const cost = ticketPrice * BigInt(numTickets);
        await ticketToken.connect(buyer1).buyTicket(numTickets, { value: cost });

        // Check contract balance before withdraw
        const contractEthBalanceBefore = await ethers.provider.getBalance(contractAddress);
        expect(contractEthBalanceBefore).to.equal(0); // ETH should be forwarded immediately

        // Manually send ETH to test withdraw (e.g., if forwarding failed somehow or direct send)
         await owner.sendTransaction({
           to: contractAddress,
           value: ethers.parseEther("0.5")
         });
         const contractEthBalanceAfterSend = await ethers.provider.getBalance(contractAddress);
         expect(contractEthBalanceAfterSend).to.equal(ethers.parseEther("0.5"));


        const initialVendorBalance = await ethers.provider.getBalance(vendor.address);

        // Vendor withdraws stuck ETH
        const tx = await ticketToken.connect(vendor).withdraw();
        const receipt = await tx.wait();
        const gasUsed = receipt.gasUsed * receipt.gasPrice; // Calculate gas cost

        const finalVendorBalance = await ethers.provider.getBalance(vendor.address);
        const finalContractBalance = await ethers.provider.getBalance(contractAddress);

        // Vendor balance should increase by the withdrawn amount minus gas cost
        expect(finalVendorBalance).to.equal(initialVendorBalance + contractEthBalanceAfterSend - gasUsed);
        // Contract balance should be zero after withdrawal
        expect(finalContractBalance).to.equal(0);
    });


    it("Should prevent non-vendor from withdrawing ETH", async function () {
      // Send some ETH to the contract for testing
       await owner.sendTransaction({
           to: contractAddress,
           value: ethers.parseEther("0.1")
         });
      await expect(
        ticketToken.connect(buyer1).withdraw()
      ).to.be.revertedWith("Only vendor can withdraw");
    });
  });

  // Test buying multiple tickets (already covered in Buying Tickets section)

  // Test vendor interaction
  describe("Vendor Interactions", function () {
    it("Should allow vendor to receive tickets via transfer", async function () {
       // Buyer gets tickets
       const numTickets = 10;
       const cost = ticketPrice * BigInt(numTickets);
       await ticketToken.connect(buyer1).buyTicket(numTickets, { value: cost });
       // Buyer transfers to vendor
       await ticketToken.connect(buyer1).transfer(vendor.address, numTickets);

       expect(await ticketToken.balanceOf(vendor.address)).to.equal(numTickets);
    });
  });
}); 