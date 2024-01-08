require('dotenv').config();
require('@nomicfoundation/hardhat-toolbox');

module.exports = {
  solidity: '0.8.17',
  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
  },
  defaultNetwork: 'local',
  networks: {
    local: {
      url: 'http://127.0.0.1:8545/',
    },
    'mainnet-ovm': {
      url: process.env.PROVIDER_URL || 'http://localhost:8545',
      chainId: 10,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    tenderly: {
      url: process.env.PROVIDER_URL_FORK || 'http://localhost:8545',
      chainId: 10,
    },
  },
};
