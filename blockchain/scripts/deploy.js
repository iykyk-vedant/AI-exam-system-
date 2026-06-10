const hre = require("hardhat");

async function main() {
  console.log("Starting deployment of CredentialRegistry...");

  // Get the contract factory
  const CredentialRegistry = await hre.ethers.getContractFactory("CredentialRegistry");
  
  // Deploy the contract
  const registry = await CredentialRegistry.deploy();

  // Wait for the deployment transaction to be mined
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log("==================================================");
  console.log("CredentialRegistry contract successfully deployed!");
  console.log("Contract Address:", address);
  console.log("==================================================");
  console.log("\nINSTRUCTIONS:");
  console.log(`1. Copy this deployed address: ${address}`);
  console.log("2. Paste it in your backend .env file as: CONTRACT_ADDRESS=" + address);
  console.log("3. To verify contract deployment run:");
  console.log(`   npx hardhat verify --network amoy ${address}`);
  console.log("==================================================\n");
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
