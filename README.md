# Allowlist
Allowlist is a smart contract based token transfer protection implementation. It limits high value (> 0.1% balance) transfers to trusted addresses and sending a low value (<= 0.1% balance) transfer marks an address as trusted. The split between high and low value allows the sender to verify receival directly with the receiver of the funds before transfering the high value amount. 

## Example
For example a transfer of funds to an exchange: 
1. send the low value amount through Allowlist.sol. 
2. verify receival on the exchange page. 
3. after verification send the high value amount to the address.

The high value transaction only succeeds to trusted addresses. In the case of copying the address from an address poisoning attack the high value transaction will fail and protect the sender.

## Dependencies
[Hardhat v3](https://hardhat.org/docs/getting-started)

```npm install --save-dev hardhat```

[Halmos](https://github.com/a16z/halmos?tab=readme-ov-file)

```uv tool install --python 3.12 halmos```

[Slither](https://github.com/crytic/slither)

```uv tool install slither-analyzer```

## Test

### Unit & fuzz test (hardhat)
```npx hardhat test```

### Unit test coverage
```npx hardhat test --coverage```

### Formal test (halmos)
```
cd test_halmos
ln -s ../contracts contracts
ln -s ../node_modules node_modules
halmos
```

### Static analyses (slither)
``` slither . --foundry-compile-all```

## Gas
```npx hardhat test --gas-stats```

| Function  | Gas     |  
| --------- | ------- |
| remove    | ~22830  |
| send      | ~64948  |
| send_eth  | ~46702  |

An ETH transfer is 21k gas and a ERC20 transfer ~50k/65k gas. Resulting in allowlist ETH transfers costing 2x a regular transfer and allowlist token transfers costing the same as a regular token transfer (exlusing the token apparoval of ~45k gas). 
