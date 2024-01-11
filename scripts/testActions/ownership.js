const { assertRevert } = require('../utils/helpers.js');
const { logCheck, checkParams } = require('./riskControlModule.js');

const checkOwnership = async ({ gnosisModule, owner, user1 }) => {
  const initialParams = {
    isPaused: await gnosisModule.isPaused(),
    endorsed: await gnosisModule.endorsedAccount(),
    owner: await gnosisModule.owner(),
  };

  console.log('Verifying Ownership');
  logCheck('  Module owner', owner.address, await gnosisModule.owner());

  console.log(' Normal user cannot update params');
  await assertRevert(
    gnosisModule.connect(user1).setEndorsedAccount(owner.address),
    'Ownable: caller is not the owner'
  );

  console.log(' Normal user cannot update change ownership');
  await assertRevert(
    gnosisModule.connect(user1).transferOwnership(owner.address),
    'Ownable: caller is not the owner'
  );

  console.log(' Owner can update params');
  await (await gnosisModule.connect(owner).setEndorsedAccount(user1.address)).wait();
  await checkParams({ gnosisModule, moduleConfig: { ...initialParams, endorsed: user1.address } });

  console.log(' Owner can change ownership');
  await (await gnosisModule.connect(owner).transferOwnership(user1.address)).wait();
  logCheck('  Module owner', user1.address, await gnosisModule.owner());

  console.log(' New Owner can update params');
  await (await gnosisModule.connect(user1).setEndorsedAccount(owner.address)).wait();
  await checkParams({ gnosisModule, moduleConfig: { ...initialParams, owner: user1.address } });

  console.log(' New Owner can change ownership');
  await (await gnosisModule.connect(user1).transferOwnership(owner.address)).wait();
  logCheck('  Module owner', owner.address, await gnosisModule.owner());
};

module.exports = {
  checkOwnership,
};
