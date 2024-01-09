const hre = require('hardhat');
const ethers = hre.ethers;

const { MODULE_ADDRESS } = require('./utils/constants.js');

const { takeSnapshot, restoreSnapshot } = require('./utils/helpers.js');

const {
  impersonateSigners,
  getContracts,
  fixSettingsOwner,
} = require('./testActions/contractsAndUsers.js');
const {
  logCheck,
  verifyAndShowParams,
  attemptToControlRisk,
} = require('./testActions/riskControlModule.js');
const { checkOwnership } = require('./testActions/ownership.js');
const { moduleEnabled, enableModule, disableModule } = require('./testActions/moduleEnable.js');

const marketKey = 'sBTCPERP';

async function main() {
  const provider = hre.network.provider;
  const snapshotId = await takeSnapshot(provider);
  const moduleConfig = {
    owner: '',
    endorsed: '',
    isPaused: false,
  };

  try {
    console.log('Simulate PerpsV2 Risk Control Module');
    console.log('-------------------------');
    console.log();

    // get contracts and impersonate users
    const [owner, user1, user2] = await ethers.getSigners();
    moduleConfig.owner = owner.address;
    moduleConfig.endorsed = owner.address;

    const { safeContract, gnosisModule, perpsV2MarketSettings } = await getContracts(
      owner,
      moduleConfig,
      MODULE_ADDRESS
    );

    const impersonatedSigners = await impersonateSigners(provider, safeContract);

    // ensure settings is updateable by L2 safe
    await fixSettingsOwner({
      perpsV2MarketSettings,
      safeSigner: impersonatedSigners.safeSigner,
      l2RelaySigner: impersonatedSigners.l2RelaySigner,
    });

    // check initial params
    await verifyAndShowParams({
      safeContract,
      gnosisModule,
      perpsV2MarketSettings,
      moduleConfig: { ...moduleConfig, isPaused: true },
      marketKey,
      moduleOwner: owner,
    });
    console.log('-------------------------');
    console.log();

    // check ownership
    await checkOwnership({
      gnosisModule,
      owner,
      user1,
    });
    console.log('-------------------------');
    console.log();

    // verify module is not enabled
    logCheck(
      'Module not enabled',
      false,
      await moduleEnabled({ owner, safeContract, gnosisModule })
    );
    console.log('-------------------------');
    console.log();

    // attempt to modify fee. Should fail
    logCheck(
      'Attempt to control risk. Should fail - paused',
      false,
      await attemptToControlRisk({
        gnosisModule,
        shouldFail: false,
        shouldFailPaused: true,
        owner,
        user: user1,
        marketKey,
      })
    );
    console.log('-------------------------');
    console.log();

    // unpause module
    await (await gnosisModule.connect(owner).setPaused(false)).wait();

    // Set endorsed

    await (await gnosisModule.connect(owner).setEndorsed(user1.address)).wait();
    // attempt to modify fee. Should fail
    logCheck(
      'Attempt to control risk. Should fail',
      false,
      await attemptToControlRisk({
        gnosisModule,
        shouldFail: true,
        owner,
        user: user1,
        marketKey,
      })
    );
    console.log('-------------------------');
    console.log();

    // enable module
    await enableModule({
      owner,
      safeContract,
      gnosisModule,
      safeSigner: impersonatedSigners.safeSigner,
    });
    logCheck('Module enabled', true, await moduleEnabled({ owner, safeContract, gnosisModule }));

    console.log('-------------------------');
    console.log();
    logCheck(
      'Attempt to control risk. Should fail - not endorsed',
      false,
      await attemptToControlRisk({
        gnosisModule,
        shouldFail: false,
        shouldFailEndorsed: true,
        owner,
        user: user2,
        marketKey,
      })
    );

    console.log('-------------------------');
    console.log();

    // attempt to modify fee. Should work
    logCheck(
      'Attempt to control risk. Should succeed',
      true,
      await attemptToControlRisk({
        gnosisModule,
        owner,
        user: user1,
        marketKey,
        perpsV2MarketSettings,
      })
    );
    await verifyAndShowParams({
      safeContract,
      gnosisModule,
      perpsV2MarketSettings,
      moduleConfig: { ...moduleConfig, endorsed: user1.address },
      moduleEnabled: true,
      marketKey,
      moduleOwner: owner,
    });
    console.log('-------------------------');
    console.log();

    // disable module
    console.log('------------------------- DISABLING MODULE -------------------------');
    await disableModule({
      owner,
      safeContract,
      gnosisModule,
      safeSigner: impersonatedSigners.safeSigner,
    });
    logCheck('Module enabled', false, await moduleEnabled({ owner, safeContract, gnosisModule }));
    console.log('-------------------------');
    console.log();

    // attempt to modify fee again. Should fail
    logCheck(
      'Attempt to control risk. Should fail',
      false,
      await attemptToControlRisk({
        gnosisModule,
        owner,
        user: user1,
        marketKey,
        perpsV2MarketSettings,

        shouldFail: true,
      })
    );
    console.log('-------------------------');
    console.log();
  } catch (e) {
    console.log('!!!!!!!!!!!!!!');
    console.log('!!! FAILED !!!');
    console.log('!!!!!!!!!!!!!!');
    console.log(e);
  }

  await restoreSnapshot(snapshotId, provider);
}
// -------------------------------
// INTERNALS
// -------------------------------

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
