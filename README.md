# Allowlist
The core contracts for Allowlist. 

Allowlist is a smart contract based token transfer protection implementation. It only allows high value (> 0.1% balance) transfers to trusted addresses. An address is marked as trusted by sending a low value (<= 0.1% balance) transfer. The main reason for this design is the many cases of lost funds by sending to the wrong address, one type being the address poisoning attack. The split between high and low value allows the sender to verify receival directly with the receiver of the funds before transfering the high value amount.

For example a transfer of funds to an exchange. 
1. send the low value amount through Allowlist.sol. 
2. verify receival on the exchange page. 
3. after verification send the high value amount to the address. 
The high value transaction only succeeds to trusted addresses. When copying the address from an address poisoning attack the high value transaction will fail and protect the sender.

## Dependencies
Hardhat v3 and Halmos

## Test

## Unit & fuzz test (hardhat)
run: npx hardhat test

## Unit test coverage
run: npx hardhat test --coverage

## Formal test (halmos)
run: cd test_halmos
run: ln -s ../contracts contracts
run: ln -s ../node_modules node_modules
run: halmos 

## Gas
run: npx hardhat test --gas-stats

║ remove          │ 22660           │ 22830   │ 22830  │ 23000 │ 2      ║
║ send            │ 46600           │ 64948   │ 64948  │ 83296 │ 2      ║
║ send_eth        │ 36860           │ 46702   │ 46702  │ 56544 │ 2      ║
