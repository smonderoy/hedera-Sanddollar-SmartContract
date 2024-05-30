import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import 'dotenv/config';

console.log(process.env.TESTNET_ENDPOINT);
const config: HardhatUserConfig = {
  solidity: "0.8.24",
  // defaultNetwork: "testnet",
  networks: {
    testnet: {
      // HashIO testnet endpoint from the TESTNET_ENDPOINT variable in the .env file
      url: process.env.TESTNET_ENDPOINT,
      // Your ECDSA account private key pulled from the .env file
      accounts: [process.env.TESTNET_OPERATOR_PRIVATE_KEY!],
    },

    /**
     * Uncomment the following to add a mainnet network configuration
     */
    //   mainnet: {
    //     // HashIO mainnet endpoint from the MAINNET_ENDPOINT variable in the .env file
    //     url: process.env.MAINNET_ENDPOINT,
    //     // Your ECDSA account private key pulled from the .env file
    //     accounts: [process.env.MAINNET_OPERATOR_PRIVATE_KEY],
    // },

    /**
     * Uncomment the following to add a previewnet network configuration
     */
    //   previewnet: {
    //     // HashIO previewnet endpoint from the PREVIEWNET_ENDPOINT variable in the .env file
    //     url: process.env.PREVIEWNET_ENDPOINT,
    //     // Your ECDSA account private key pulled from the .env file
    //     accounts: [process.env.PREVIEWNET_OPERATOR_PRIVATE_KEY],
    // },
  },
};

export default config;
