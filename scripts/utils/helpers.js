async function takeSnapshot(provider) {
  const snapshotId = await provider.send('evm_snapshot', []);

  await mineBlock(provider);

  return snapshotId;
}

async function restoreSnapshot(snapshotId, provider) {
  await provider.send('evm_revert', [snapshotId]);

  await mineBlock(provider);
}

async function setBalance(accAddress, provider) {
  await provider.request({
    method: 'hardhat_setBalance',
    params: [accAddress, '0x10000000000000000000000'],
  });
}

async function impersonateAccount(accAddress, provider, ethers) {
  await provider.request({
    method: 'hardhat_impersonateAccount',
    params: [accAddress],
  });

  await setBalance(accAddress, provider);

  return ethers.getSigner(accAddress);
}

async function fastForward(seconds, provider) {
  await provider.send('evm_increaseTime', [seconds]);

  await mineBlock(provider);
}

async function fastForwardTo(time, provider) {
  const now = await getTime(provider);

  if (time < now) {
    throw new Error('Cannot fast forward to a past date.');
  }

  await fastForward(time - now, provider);
}

async function getTime(provider) {
  const block = await provider.getBlock('latest');

  return block.timestamp;
}

async function getBlock(provider) {
  const block = await provider.getBlock();

  return block.number;
}

async function advanceBlock(provider) {
  await mineBlock(provider);
}

async function mineBlock(provider) {
  await provider.send('evm_mine');
}

async function assertRevert(tx, expectedMessage) {
  let error;

  try {
    await (await tx).wait();
  } catch (err) {
    error = err;
  }

  if (!error) {
    throw new Error('Transaction was expected to revert, but it did not');
  } else if (expectedMessage) {
    const receivedMessage = error.toString();

    if (!receivedMessage.includes(expectedMessage)) {
      // ----------------------------------------------------------------------------
      // TODO: Remove this check once the following issue is solved in hardhat:
      // https://github.com/nomiclabs/hardhat/issues/1996
      // Basically, the first time tests are run, the revert reason is not parsed,
      // but the second time it is parsed just fine;
      if (
        receivedMessage.includes('reverted with an unrecognized custom error') ||
        receivedMessage.includes('revert with unrecognized return data or custom error') ||
        receivedMessage.includes('reverted without a reason string')
      ) {
        console.warn(
          `WARNING: assert-revert was unable to parse revert reason. The reason will be ignored in this test: ${receivedMessage}`
        );
        return;
      }
      // ----------------------------------------------------------------------------

      throw new Error(
        `Transaction was expected to revert with "${expectedMessage}", but reverted with "${receivedMessage}"`
      );
    }
  }
}

module.exports = {
  takeSnapshot,
  restoreSnapshot,
  setBalance,
  impersonateAccount,
  fastForward,
  fastForwardTo,
  getTime,
  getBlock,
  advanceBlock,
  mineBlock,
  assertRevert,
};
