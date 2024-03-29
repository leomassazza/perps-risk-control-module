const hre = require('hardhat');
const ethers = hre.ethers;

const {
  PERPS_V2_MARKET_SETTINGS,
  SNX_PDAO_MULTISIG_ADDRESS,
  L2_RELAY_OWNER,
} = require('../utils/constants.js');

const safeABI = require('../abi/safe.json');
const perpsV2MarketSettingsABI = require('../abi/perpsV2MarketSettings.json');

const { impersonateAccount } = require('../utils/helpers.js');

const impersonateSigners = async (provider, safeContract) => {
  const signersAdresses = await safeContract.getOwners();
  const impersonatedSigners = [];
  for (const signerAddress of signersAdresses) {
    impersonatedSigners.push(await impersonateAccount(signerAddress, provider, ethers));
  }
  const safeSigner = await impersonateAccount(safeContract.address, provider, ethers);
  const l2RelaySigner = await impersonateAccount(L2_RELAY_OWNER, provider, ethers);

  return { impersonatedSigners, safeSigner, l2RelaySigner };
};

const getContracts = async (owner, moduleConfig, moduleAddress = undefined) => {
  const safeContract = new ethers.Contract(SNX_PDAO_MULTISIG_ADDRESS, safeABI, owner);
  const perpsV2MarketSettings = new ethers.Contract(
    PERPS_V2_MARKET_SETTINGS,
    perpsV2MarketSettingsABI,
    owner
  );

  let gnosisModule;

  if (moduleAddress) {
    const moduleArtifact = hre.artifacts.readArtifact(
      'contracts/PerpsV2RiskControlModule.sol:PerpsV2RiskControlModule'
    );
    gnosisModule = new ethers.Contract(moduleAddress, moduleArtifact.abi, owner);
  } else {
    // deploy one instance
    const GnosisModule = await hre.ethers.getContractFactory('PerpsV2RiskControlModule', owner);
    gnosisModule = await GnosisModule.deploy(owner.address, owner.address);
    await gnosisModule.deployed();
  }

  return {
    safeContract,
    perpsV2MarketSettings,
    gnosisModule,
  };
};

const fixSettingsOwner = async ({ safeSigner, l2RelaySigner, perpsV2MarketSettings }) => {
  const owner = await perpsV2MarketSettings.owner();
  if (owner === safeSigner.address) {
    // do nothing;
    return;
  }

  await (
    await perpsV2MarketSettings.connect(l2RelaySigner).nominateNewOwner(safeSigner.address)
  ).wait();
  await (await perpsV2MarketSettings.connect(safeSigner).acceptOwnership()).wait();
};

module.exports = {
  impersonateSigners,
  getContracts,
  fixSettingsOwner,
};
