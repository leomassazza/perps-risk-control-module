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
  marketKey,
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
  const fetchedModuleConfig = await checkParams({ gnosisModule, moduleConfig });

  logCheck(`  PerpsV2 ${marketKey} MMV`, formatEther(expectedMMV), formatEther(fetchedMMV));
  logCheck('  Module Enabled', moduleEnabled, fetchedModuleEnabled);

  return {
    moduleEnabled: fetchedModuleEnabled,
    moduleOwner: fetchedModuleOwner,
    moduleConfig: fetchedModuleConfig,
    maxMarketValue: fetchedMMV,
  };
};

const checkParams = async ({ gnosisModule, moduleConfig }) => {
  const fetchedModuleConfig = {
    isPaused: await gnosisModule.isPaused(),
    endorsed: await gnosisModule.endorsed(),
    owner: await gnosisModule.owner(),
  };
  console.log('  Parameters');
  logCheck('    owner', moduleConfig.owner, fetchedModuleConfig.owner);
  logCheck('    endorsed', moduleConfig.endorsed, fetchedModuleConfig.endorsed);
  logCheck('    isPaused', moduleConfig.isPaused, fetchedModuleConfig.isPaused);

  return fetchedModuleConfig;
};

const attemptToControlRisk = async ({
  gnosisModule,
  owner,
  user,
  perpsV2MarketSettings,
  shouldFail,
  shouldFailEndorsed = false,
  marketKey,
}) => {
  const marketKeyBytes = formatBytes32String(marketKey);
  let succeeded = true;
  if (shouldFail) {
    await assertRevert(gnosisModule.connect(user).coverRisk(marketKeyBytes), 'GS104');
    succeeded = false;
  } else if (shouldFailEndorsed) {
    await assertRevert(gnosisModule.connect(user).coverRisk(marketKeyBytes), 'Not endorsed');
    succeeded = false;
  } else {
    const previousValue = await perpsV2MarketSettings.maxMarketValue(marketKeyBytes);
    logCheck('  Previous MMV', formatEther(previousValue), formatEther(previousValue));
    await (await gnosisModule.connect(user).coverRisk(marketKeyBytes)).wait();
    const currentValue = await perpsV2MarketSettings.maxMarketValue(marketKeyBytes);
    logCheck('  New MMV', formatEther(0), formatEther(currentValue));
  }
  return succeeded;
};

module.exports = {
  logCheck,
  checkParams,
  verifyAndShowParams,
  attemptToControlRisk,
};
