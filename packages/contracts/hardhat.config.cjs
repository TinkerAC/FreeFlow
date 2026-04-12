require('@nomicfoundation/hardhat-ethers');

const fs = require('fs');
const path = require('path');

function loadEnvFromRepoRoot() {
  const envPath = path.resolve(__dirname, '../../.env');

  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();

    if (!key || process.env[key] !== undefined) {
      continue;
    }

    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith('\'') && value.endsWith('\''))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function createNetwork(url) {
  if (!url) {
    return undefined;
  }

  return {
    url,
    accounts: [PRIVATE_KEY],
  };
}

loadEnvFromRepoRoot();

const PRIVATE_KEY = process.env.POLYGON_PRIVATE_KEY ||
  '0000000000000000000000000000000000000000000000000000000000000000';
const DEFAULT_SEPOLIA_RPC_URL = 'https://ethereum-sepolia-rpc.publicnode.com';

const networks = {};
const sepolia = createNetwork(process.env.SEPOLIA_RPC_URL || DEFAULT_SEPOLIA_RPC_URL);

if (sepolia) {
  networks.sepolia = sepolia;
}


/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: '0.8.26',
    settings: {
      evmVersion: 'cancun',
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks,
};
