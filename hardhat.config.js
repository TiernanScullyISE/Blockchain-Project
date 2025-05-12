require("@nomicfoundation/hardhat-toolbox");
require('dotenv').config();
require("solidity-coverage");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  networks: {
    // Development network (local)
    hardhat: {
      chainId: 31337
    },
    
    // Holesky testnet - UPDATED to use Ankr
    holesky: {
      url: "https://rpc.ankr.com/eth_holesky",
      accounts: [process.env.PRIVATE_KEY]
    }
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: 'USD',
  },
};
