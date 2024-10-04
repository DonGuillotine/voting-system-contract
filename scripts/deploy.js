const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  const DecentralizedVoting = await hre.ethers.getContractFactory("DecentralizedVoting");
  const decentralizedVoting = await DecentralizedVoting.deploy();

  await decentralizedVoting.waitForDeployment();

  const contractAddress = await decentralizedVoting.getAddress();
  console.log("DecentralizedVoting deployed to:", contractAddress);

  console.log("Waiting for Etherscan to index the contract...");
  await new Promise(resolve => setTimeout(resolve, 60000));

  console.log("Verifying contract on Etherscan...");
  try {
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: [],
    });
    console.log("Contract verified on Etherscan");
  } catch (error) {
    console.error("Error verifying contract:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });