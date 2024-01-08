// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/utils/math/Math.sol';

import './interfaces/GnosisSafe.sol';
import './interfaces/AddressResolver.sol';

// PerpsV2RiskControlModule is a module, which is able to set MMV to zero for a specific market by an endorsed address
//
// @see: https://sips.synthetix.io/sips/sip-2048/
contract PerpsV2RiskControlModule is Ownable {
  using Math for uint256;

  address public constant SNX_PDAO_MULTISIG_ADDRESS = 0x6cd3f878852769e04A723A5f66CA7DD4d9E38A6C;
  address public constant SNX_ADDRESS_RESOLVER = 0x95A6a3f44a70172E7d50a9e28c85Dfd712756B8C;

  address public endorsed;

  GnosisSafe private _pDAOSafe;
  AddressResolver private _addressResolver;

  bool public isPaused;

  constructor(address _owner, address _endorsed) {
    // Do not call Ownable constructor which sets the owner to the msg.sender and set it to _owner.
    _transferOwnership(_owner);

    // contracts
    _addressResolver = AddressResolver(SNX_ADDRESS_RESOLVER);
    _pDAOSafe = GnosisSafe(SNX_PDAO_MULTISIG_ADDRESS);

    // endorsed
    endorsed = _endorsed;

    // start as not paused
    isPaused = false;
  }

  // --- External/Public --- //

  // @dev set MMV to zero on the corresponding market.
  function coverRisk(bytes32 markeKey) external returns (bool success) {
    require(!isPaused, 'Module paused');
    require(msg.sender == endorsed, 'Not endorsed');

    success = _executeSafeTransaction(markeKey);
  }

  // @dev sets the paused state
  function setPaused(bool _isPaused) external onlyOwner {
    isPaused = _isPaused;
  }

  // @dev sets the paused state
  function setEndorsed(address _endorsed) external onlyOwner {
    endorsed = _endorsed;
  }

  // --- Internal --- //

  function _executeSafeTransaction(bytes32 markeKey) internal returns (bool success) {
    bytes memory payload = abi.encodeWithSignature(
      'setMaxMarketValue(bytes32,uint256)',
      markeKey,
      0
    );
    address marketSettingsAddress = _addressResolver.requireAndGetAddress(
      'PerpsV2MarketSettings',
      'Missing Perpsv2MarketSettings address'
    );

    success = _pDAOSafe.execTransactionFromModule(
      marketSettingsAddress,
      0,
      payload,
      Enum.Operation.Call
    );
    uint256 _lastParamterUpdatedAtTime = block.timestamp;

    if (success) {
      emit ReduceMMVDone(markeKey, _lastParamterUpdatedAtTime);
    } else {
      emit ReduceMMVFailed(markeKey, _lastParamterUpdatedAtTime);
    }
  }

  // --- Events --- //

  event ReduceMMVDone(bytes32 markeKey, uint256 paramterUpdatedAtTime);
  event ReduceMMVFailed(bytes32 markeKey, uint256 paramterUpdateAttemptedAtTime);
}
