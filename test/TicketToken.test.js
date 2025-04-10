const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TicketToken", function () {
  let TicketToken;
  let ticketToken;
  let owner;
  let vendor;
  let buyer1;
  let buyer2;
  let ticketPrice;
  
  beforeEach(async function () {  
    // Get signers (accounts)
    [owner, vendor, buyer1, buyer2] = await ethers.getSigners();
    
    // Deploy the contract before each test
    TicketToken = await ethers.getContractFactory("TicketToken");
    ticketPrice = ethers.parseEther("0.01"); // 0.01 ETH per ticket
    
    ticketToken = await TicketToken.deploy(
      "TiernanTicketToken", // name
      "TTT",                // symbol
      18,                   // decimals
      1000,                 // initialSupply
      ticketPrice,          // ticketPrice
      vendor.address        // vendor address
    );
    
    await ticketToken.waitForDeployment();
  });

  // Test contract deployment and basic properties
  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await ticketToken.balanceOf(owner.address)).to.equal(
        ethers.parseUnits("1000", 18) // 1000 tokens with 18 decimals
      );
    });

    it("Should set the correct token properties", async function () {
      expect(await ticketToken.name()).to.equal("TiernanTicketToken");
      expect(await ticketToken.symbol()).to.equal("TTT");
      expect(await ticketToken.decimals()).to.equal(18);
      expect(await ticketToken.ticketPrice()).to.equal(ticketPrice);
    });

    it("Should set the right vendor", async function () {
      expect(await ticketToken.vendor()).to.equal(vendor.address);
    });
  });

  // Test buying tickets
  describe("Buying Tickets", function () {
    it("Should allow buying a ticket with sufficient ETH", async function () {
      const initialBuyerBalance = await ticketToken.balanceOf(buyer1.address);
      const initialVendorEthBalance = await ethers.provider.getBalance(vendor.address);
      
      // Buy a ticket
      const tx = await ticketToken.connect(buyer1).buyTicket({ value: ticketPrice });
      const receipt = await tx.wait();
      
      // Check events
      const buyerTicketBalanceAfter = await ticketToken.balanceOf(buyer1.address);
      const vendorEthBalanceAfter = await ethers.provider.getBalance(vendor.address);
      
      expect(buyerTicketBalanceAfter - initialBuyerBalance).to.equal(1);
      expect(vendorEthBalanceAfter - initialVendorEthBalance).to.equal(ticketPrice);
      
      // Verify event was emitted
      const events = receipt.logs.filter(log => {
        try {
          const parsedLog = ticketToken.interface.parseLog(log);
          return parsedLog && parsedLog.name === 'TicketPurchased';
        } catch (e) {
          return false;
        }
      });
      
      expect(events.length).to.be.greaterThan(0);
    });

    it("Should reject buying a ticket with insufficient ETH", async function () {
      const insufficientAmount = ticketPrice / 2n;
      
      await expect(
        ticketToken.connect(buyer1).buyTicket({ value: insufficientAmount })
      ).to.be.revertedWith("Insufficient ETH sent for ticket.");
    });

    it("Should forward ETH to vendor upon ticket purchase", async function () {
      const beforeBalance = await ethers.provider.getBalance(vendor.address);
      
      // Buy a ticket with extra ETH
      const purchaseAmount = ticketPrice * 2n;
      await ticketToken.connect(buyer1).buyTicket({ value: purchaseAmount });
      
      const afterBalance = await ethers.provider.getBalance(vendor.address);
      expect(afterBalance - beforeBalance).to.equal(purchaseAmount);
    });
  });

  // Test transferring tickets
  describe("Transferring Tickets", function () {
    beforeEach(async function () {
      // Buyer purchases a ticket first
      await ticketToken.connect(buyer1).buyTicket({ value: ticketPrice });
    });

    it("Should allow transferring tickets back to vendor", async function () {
      const initialBuyerBalance = await ticketToken.balanceOf(buyer1.address);
      const initialVendorBalance = await ticketToken.balanceOf(vendor.address);
      
      // Transfer ticket back to vendor
      await ticketToken.connect(buyer1).transfer(vendor.address, 1);
      
      const finalBuyerBalance = await ticketToken.balanceOf(buyer1.address);
      const finalVendorBalance = await ticketToken.balanceOf(vendor.address);
      
      expect(initialBuyerBalance - finalBuyerBalance).to.equal(1);
      expect(finalVendorBalance - initialVendorBalance).to.equal(1);
    });

    it("Should prevent transferring tickets to non-vendor addresses", async function () {
      await expect(
        ticketToken.connect(buyer1).transfer(buyer2.address, 1)
      ).to.be.revertedWith("Tickets can only be returned to the vendor.");
    });

    it("Should prevent transferring more tickets than owned", async function () {
      await expect(
        ticketToken.connect(buyer1).transfer(vendor.address, 2)
      ).to.be.revertedWith("Insufficient ticket balance.");
    });
  });

  // Test edge cases and special functions
  describe("Special Functions", function () {
    it("Should allow vendor to withdraw any ETH stuck in the contract", async function () {
      // Force send some ETH to the contract
      await owner.sendTransaction({
        to: await ticketToken.getAddress(),
        value: ethers.parseEther("1.0")
      });
      
      const initialVendorBalance = await ethers.provider.getBalance(vendor.address);
      
      // Vendor withdraws stuck ETH
      await ticketToken.connect(vendor).withdraw();
      
      const finalVendorBalance = await ethers.provider.getBalance(vendor.address);
      
      // Should be greater (not exact due to gas costs)
      expect(finalVendorBalance).to.be.greaterThan(initialVendorBalance);
    });

    it("Should prevent non-vendor from withdrawing ETH", async function () {
      await expect(
        ticketToken.connect(buyer1).withdraw()
      ).to.be.revertedWith("Only vendor can withdraw");
    });
  });

  // Test buying multiple tickets
  describe("Multiple Tickets", function () {
    it("Should correctly handle multiple buyers purchasing tickets", async function () {
      // First buyer purchases a ticket
      await ticketToken.connect(buyer1).buyTicket({ value: ticketPrice });
      
      // Second buyer purchases a ticket
      await ticketToken.connect(buyer2).buyTicket({ value: ticketPrice });
      
      expect(await ticketToken.balanceOf(buyer1.address)).to.equal(1);
      expect(await ticketToken.balanceOf(buyer2.address)).to.equal(1);
    });

    it("Should allow a single buyer to purchase multiple tickets", async function () {
      // Buy first ticket
      await ticketToken.connect(buyer1).buyTicket({ value: ticketPrice });
      
      // Buy second ticket
      await ticketToken.connect(buyer1).buyTicket({ value: ticketPrice });
      
      expect(await ticketToken.balanceOf(buyer1.address)).to.equal(2);
    });
  });

  // Test vendor interaction
  describe("Vendor Interactions", function () {
    it("Should allow vendor to hold tickets", async function () {
      // Owner transfers some tickets to vendor
      await ticketToken.connect(owner).transfer(vendor.address, 10);
      
      expect(await ticketToken.balanceOf(vendor.address)).to.equal(10);
    });
  });
}); 