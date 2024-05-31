import { ethers } from "hardhat";

async function main() {
  // Get the contract factory
  const Vault = await ethers.getContractFactory("Vault");

  // Deploy the contract
  const vault = await Vault.deploy();

  // Wait for the contract to be deployed
  await vault.waitForDeployment();

  // Log the address of the deployed contract
  console.log("Vault deployed to:", vault.target);
}

// Execute the main function
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});