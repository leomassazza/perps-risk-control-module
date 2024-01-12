// Sources flattened with hardhat v2.19.4 https://hardhat.org

// SPDX-License-Identifier: MIT

// File @openzeppelin/contracts/utils/Context.sol@v4.9.5

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v4.9.4) (utils/Context.sol)

pragma solidity ^0.8.0;

/**
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }

    function _contextSuffixLength() internal view virtual returns (uint256) {
        return 0;
    }
}


// File @openzeppelin/contracts/access/Ownable.sol@v4.9.5

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v4.9.0) (access/Ownable.sol)

pragma solidity ^0.8.0;

/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * By default, the owner account will be the one that deploys the contract. This
 * can later be changed with {transferOwnership}.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be applied to your functions to restrict their use to
 * the owner.
 */
abstract contract Ownable is Context {
    address private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the deployer as the initial owner.
     */
    constructor() {
        _transferOwnership(_msgSender());
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if the sender is not the owner.
     */
    function _checkOwner() internal view virtual {
        require(owner() == _msgSender(), "Ownable: caller is not the owner");
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby disabling any functionality that is only available to the owner.
     */
    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        _transferOwnership(newOwner);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Internal function without access restriction.
     */
    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}


// File contracts/interfaces/Enum.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.17;

/// @title Enum - Collection of enums
/// @author Richard Meissner - <richard@gnosis.pm>
interface Enum {
  enum Operation {
    Call,
    DelegateCall
  }
}


// File contracts/interfaces/GnosisSafe.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.17;

interface GnosisSafe {
  /// @dev Allows a Module to execute a Safe transaction without any further confirmations.
  /// @param to Destination address of module transaction.
  /// @param value Ether value of module transaction.
  /// @param data Data payload of module transaction.
  /// @param operation Operation type of module transaction.
  function execTransactionFromModule(
    address to,
    uint256 value,
    bytes calldata data,
    Enum.Operation operation
  ) external returns (bool success);
}


// File contracts/interfaces/AddressResolver.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.17;

interface AddressResolver {
  function requireAndGetAddress(
    bytes32 name,
    string calldata reason
  ) external view returns (address);
}


// File contracts/PerpsV2RiskControlModule.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.17;


// PerpsV2RiskControlModule is a module, which is able to set MMV to zero for a specific market by an endorsedAccount address
//
// @see: https://sips.synthetix.io/sips/sip-2048/
contract PerpsV2RiskControlModule is Ownable {
  address public constant SNX_PDAO_MULTISIG_ADDRESS = 0x6cd3f878852769e04A723A5f66CA7DD4d9E38A6C;
  address public constant SNX_ADDRESS_RESOLVER = 0x95A6a3f44a70172E7d50a9e28c85Dfd712756B8C;

  GnosisSafe private _pDAOSafe;
  AddressResolver private _addressResolver;

  bool public isPaused;
  address public endorsedAccount;
  mapping(bytes32 => bool) public covered;

  constructor(address _owner, address _endorsedAccount) {
    // Do not call Ownable constructor which sets the owner to the msg.sender and set it to _owner.
    _transferOwnership(_owner);

    // contracts
    _addressResolver = AddressResolver(SNX_ADDRESS_RESOLVER);
    _pDAOSafe = GnosisSafe(SNX_PDAO_MULTISIG_ADDRESS);

    // endorsedAccount
    endorsedAccount = _endorsedAccount;

    // start as paused
    isPaused = true;
  }

  // --- External/Public --- //

  // @dev set MMV to zero on the corresponding market.
  function coverRisk(bytes32 marketKey) external returns (bool success) {
    require(!isPaused, 'Module paused');
    require(msg.sender == endorsedAccount, 'Not endorsed');
    require(covered[marketKey], 'Market not covered');

    success = _executeSafeTransaction(marketKey);
  }

  // @dev sets the paused state
  function setPaused(bool _isPaused) external onlyOwner {
    isPaused = _isPaused;
  }

  // @dev sets the endorsed account
  function setEndorsedAccount(address _endorsedAccount) external onlyOwner {
    endorsedAccount = _endorsedAccount;
  }

  // @dev sets the covarege for a market key
  function setCoverage(bytes32 marketKey, bool isCovered) external onlyOwner {
    covered[marketKey] = isCovered;
  }

  // --- Internal --- //

  function _executeSafeTransaction(bytes32 marketKey) internal returns (bool success) {
    bytes memory payload = abi.encodeWithSignature(
      'setMaxMarketValue(bytes32,uint256)',
      marketKey,
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
      emit ReduceMMVDone(marketKey, _lastParamterUpdatedAtTime);
    } else {
      emit ReduceMMVFailed(marketKey, _lastParamterUpdatedAtTime);
    }
  }

  // --- Events --- //

  event ReduceMMVDone(bytes32 marketKey, uint256 paramterUpdatedAtTime);
  event ReduceMMVFailed(bytes32 marketKey, uint256 paramterUpdateAttemptedAtTime);
}
