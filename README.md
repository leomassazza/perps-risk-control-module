# perps-risk-control-module

**Welcome to perps-risk-control-module!**

This repository houses the contracts needed to enable risk control module as proposed in [SIP-2048: MaxMarketValue Risk Control Module](https://sips.synthetix.io/sips/sip-2048/).

## Development

```bash
git clone git@github.com:leomassazza/perps-risk-control-module.git
cd ./perps-risk-control-module

# Install all dependencies.
yarn 

# Compile contracts via Hardhat
yarn run compile
```

## Test module

There's a script to verify the module functionality. In order to use it, fork optimism network with hardhat (i.e. in a Synthetix repo, `npm run fork:ovm`) and execute.

```bash
npx hardhat run ./scripts/ xxxx .js
```

## Implementation notes

xxxx TBD

