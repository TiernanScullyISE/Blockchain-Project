// scripts/deploy.js
const { ethers } = require("hardhat");

async function main() {
  // Get the contract factory
  const TicketToken = await ethers.getContractFactory("TicketToken");

  // Set deployment parameters
  const name = "TiernanTicketToken";
  const symbol = "TTT";
  const decimals = 0;  // Changed to 0 for whole tickets
  const initialSupply = 1000;
  const ticketPrice = ethers.parseEther("0.01"); // 0.01 ETH per ticket
  const [deployer] = await ethers.getSigners();
  
  // Use the specified vendor address
  const vendor = "0x7Ce9561B0A5448e5b5BDDE3588E67FA861F4a18F";

  console.log("Deploying contract with the account:", deployer.address);
  console.log("Setting vendor address to:", vendor);
  console.log("Initial supply of tickets:", initialSupply, "(to be held by the contract itself)");
  
  const ticketToken = await TicketToken.deploy(name, symbol, decimals, initialSupply, ticketPrice, vendor);
  // Wait until the contract is deployed
  await ticketToken.waitForDeployment();

  console.log("TiernanTicketToken deployed to:", ticketToken.target);
  console.log("Update your frontend to use this new contract address!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error during deployment:", error);
    process.exit(1);
  });
