const { assertRevert } = require('../utils/helpers.js');
const hre = require('hardhat');
const formatEther = hre.ethers.utils.formatEther;
const formatBytes32String = hre.ethers.utils.formatBytes32String;
const { green, red, gray } = require('chalk');

const tickOrCross = pass => (pass ? green('✔') : red('✗'));
const logCheck = (message, expected, fetched) => {
  console.log(
    `${message}: ${tickOrCross(expected === fetched)} ` +
    gray(`(expected: ${expected} fetched: ${fetched})`)
  );

  if (expected !== fetched) {
    throw new Error(`${message} not passed. Expected: ${expected} Current: ${fetched}`);
  }
};

const verifyAndShowParams = async ({
  safeContract,
  gnosisModule,
  perpsV2MarketSettings,
  moduleConfig,
  moduleOwner,
  marketKey = 'fakeMarket',
  marketCovered = false,
  moduleEnabled = false,
  expectedMMV = undefined,
}) => {
  const fetchedModuleEnabled = await safeContract.isModuleEnabled(gnosisModule.address);
  const fetchedModuleOwner = await gnosisModule.owner();
  const marketKeyBytes = formatBytes32String(marketKey);
  const fetchedMMV = await perpsV2MarketSettings.maxMarketValue(marketKeyBytes);
  console.log('fetchedMMV', fetchedMMV.toString());

  if (expectedMMV === undefined) {
    expectedMMV = fetchedMMV;
  }

  console.log('Verifying initial values');
  logCheck('  Module owner', moduleOwner.address, fetchedModuleOwner);
  const fetchedModuleConfig = await checkParams({ gnosisModule, moduleConfig, marketKey, marketCovered });

  logCheck(`  PerpsV2 ${marketKey} MMV`, formatEther(expectedMMV), formatEther(fetchedMMV));
  logCheck('  Module Enabled', moduleEnabled, fetchedModuleEnabled);

  return {
    moduleEnabled: fetchedModuleEnabled,
    moduleOwner: fetchedModuleOwner,
    moduleConfig: fetchedModuleConfig,
    maxMarketValue: fetchedMMV,
  };
};

const checkParams = async ({ gnosisModule, moduleConfig, marketKey = 'fakeMarket', marketCovered = false }) => {
  const marketKeyBytes = formatBytes32String(marketKey);
  const fetchedModuleConfig = {
    isPaused: await gnosisModule.isPaused(),
    endorsed: await gnosisModule.endorsedAccount(),
    owner: await gnosisModule.owner(),
    marketCovered: await gnosisModule.covered(marketKeyBytes),
  };
  console.log('  Parameters');
  logCheck('    owner', moduleConfig.owner, fetchedModuleConfig.owner);
  logCheck('    endorsed', moduleConfig.endorsed, fetchedModuleConfig.endorsed);
  logCheck('    isPaused', moduleConfig.isPaused, fetchedModuleConfig.isPaused);
  logCheck('    marketCovered', marketCovered, fetchedModuleConfig.marketCovered);

  return fetchedModuleConfig;
};

const attemptToControlRisk = async ({
  gnosisModule,
  owner,
  user,
  perpsV2MarketSettings,
  shouldFailNotEnabled = false,
  shouldFailEndorsed = false,
  shouldFailPaused = false,
  shouldFailNotCovered = false,
  marketKey,
}) => {
  const marketKeyBytes = formatBytes32String(marketKey);

  if (shouldFailNotEnabled) {
    await assertRevert(gnosisModule.connect(user).coverRisk(marketKeyBytes), 'GS104');
    return false;
  }

  if (shouldFailEndorsed) {
    await assertRevert(gnosisModule.connect(user).coverRisk(marketKeyBytes), 'Not endorsed');
    return false;
  }

  if (shouldFailPaused) {
    await assertRevert(gnosisModule.connect(user).coverRisk(marketKeyBytes), 'Module paused');
    return false;
  }

  if (shouldFailNotCovered) {
    await assertRevert(gnosisModule.connect(user).coverRisk(marketKeyBytes), 'Market not covered');
    return false;
  }

  const previousValue = await perpsV2MarketSettings.maxMarketValue(marketKeyBytes);
  logCheck('  Previous MMV', formatEther(previousValue), formatEther(previousValue));
  await (await gnosisModule.connect(user).coverRisk(marketKeyBytes)).wait();
  const currentValue = await perpsV2MarketSettings.maxMarketValue(marketKeyBytes);
  logCheck('  New MMV', formatEther(0), formatEther(currentValue));

  return true;
};



module.exports = {
  logCheck,
  checkParams,
  verifyAndShowParams,
  attemptToControlRisk,
};
