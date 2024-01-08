const hre = require('hardhat');
const ethers = hre.ethers;
require('dotenv').config();

async function main() {
  const [owner] = await ethers.getSigners();

  const moduleConfig = {};

  console.log('Deployer Account address:', owner.address);
  console.log('Deployer Account balance:', ethers.utils.formatEther(await owner.getBalance()));

  const GnosisModule = await hre.ethers.getContractFactory('PerpsV2RiskControlModule', owner);
  const gnosisModule = await GnosisModule.deploy(
    owner.address,
  );
  await gnosisModule.deployed();

  console.log('Module Address:', gnosisModule.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
