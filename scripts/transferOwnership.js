const hre = require('hardhat');
const ethers = hre.ethers;

const { SNX_PDAO_MULTISIG_ADDRESS, MODULE_ADDRESS } = require('./utils/constants.js');

require('dotenv').config();

async function main() {
  const [owner] = await ethers.getSigners();

  console.log('Deployer Account address:', owner.address);
  console.log('Deployer Account balance:', ethers.utils.formatEther(await owner.getBalance()));

  const gnosisModule = await ethers.getContractAt('PerpsV2RiskControlModule', MODULE_ADDRESS);

  console.log('Module Address:', gnosisModule.address);
  console.log('Module Owner:', await gnosisModule.owner());

  console.log('PDAO SAFE Address:', SNX_PDAO_MULTISIG_ADDRESS);

  await (await gnosisModule.transferOwnership(SNX_PDAO_MULTISIG_ADDRESS)).wait();
  console.log('Module New Owner:', await gnosisModule.owner());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
