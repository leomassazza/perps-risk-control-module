// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

interface AddressResolver {
  function requireAndGetAddress(
    bytes32 name,
    string calldata reason
  ) external view returns (address);
}
