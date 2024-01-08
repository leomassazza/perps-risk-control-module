const { GNOSIS_SENTINEL_MODULES } = require('../utils/constants.js');

const moduleEnabled = async ({ owner, safeContract, gnosisModule }) => {
  return safeContract.connect(owner).isModuleEnabled(gnosisModule.address);
};

const enableModule = async ({ gnosisModule, safeContract, safeSigner, owner }) => {
  const moduleAddress = gnosisModule.address;
  if (!(await moduleEnabled({ owner, gnosisModule, safeContract }))) {
    await (await safeContract.connect(safeSigner).enableModule(moduleAddress)).wait();
  }
};

const disableModule = async ({ gnosisModule, safeContract, safeSigner, owner }) => {
  const moduleAddress = gnosisModule.address;
  if (await moduleEnabled({ owner, gnosisModule, safeContract })) {
    await (
      await safeContract.connect(safeSigner).disableModule(GNOSIS_SENTINEL_MODULES, moduleAddress)
    ).wait();
  }
};

module.exports = {
  moduleEnabled,
  enableModule,
  disableModule,
};
