import { before, describe, it } from "node:test"
import { expect } from "chai" 
import hre from "hardhat"

import { readContract, writeContract } from "viem/actions";
import { PublicClient, WalletClient, Abi, parseEther } from "viem";
import WETH9 from "./WETH9.json"

const { viem: hhViem } = (await hre.network.connect()) as any
const publicClient = await hhViem.getPublicClient()
const [walletClient, account2] = await hhViem.getWalletClients()

/**
 * Typed contract instance read/write
 */
function createTypedContract<TAbi extends Abi>({
  address,
  abi,
  publicClient,
  walletClient,
}: {
  address: `0x${string}`;
  abi: TAbi;
  publicClient: PublicClient;
  walletClient?: WalletClient;
}) {
  const contract: any = { address };
  for (const fn of abi) {
    if (fn.type !== "function") continue;

    const isView = fn.stateMutability === "view" || fn.stateMutability === "pure";
    
    contract[fn.name] = async (...input: any[]) => {
      const last = input[input.length - 1];
      const hasOverrides =
        typeof last === "object" &&
        last !== null &&
        ("value" in last || "account" in last);

      const args = hasOverrides ? input.slice(0, -1) : input;
      const overrides = hasOverrides ? last : undefined;

      if (isView) {
        return readContract(publicClient, {
          address,
          abi,
          functionName: fn.name as any,
          args: args as any[],
        } as any);
      }

      if (!walletClient)
        throw new Error(`walletClient required for ${fn.name}`);

      return writeContract(walletClient, {
        address,
        abi,
        functionName: fn.name as any,
        args: args as any[],
        ...overrides, 
      } as any);
    };
  }

  return contract as {
    address: `0x${string}`;
  } & {
    [K in TAbi[number] & { type: "function"; name: string } as K["name"]]: (
      ...args: any[]
    ) => Promise<any>;
  };
}

/**
 * Allowlist test scripts
 */
let weth: any
let allowlist: any
describe("Allowlist", async function () {
  before(async() => {
    allowlist = await hhViem.deployContract("Allowlist")
    const weth_abi = WETH9.abi as Abi
    const weth_bytecode = WETH9.bytecode as `0x${string}`
    const weth_hash = await walletClient.sendTransaction({ data: weth_bytecode })
    const weth_receipt = await publicClient.waitForTransactionReceipt({ hash: weth_hash })
    const weth_address = weth_receipt.contractAddress!;
    weth = createTypedContract({
      address: weth_address!,
      abi: weth_abi,
      publicClient,
      walletClient,
    })
  })
    //ETH transfers
    it('Should fail transfer ETH > 0.1% balance - non trusted address', async function () { 
      const trusted_before = await allowlist.read.allowed_eth([walletClient.account.address, account2.account.address])
      expect(trusted_before).to.equal(0n)
      const balance_before_1 = await publicClient.getBalance({ address: walletClient.account.address })
      const amount = balance_before_1 / 2n
      await hhViem.assertions.revertWith(
        allowlist.write.send_eth([account2.account.address], {value: amount}),
        "send_eth: not approved"
      )
    })
    it('Should transfer ETH <= 0.1% balance - non trusted address', async function () { 
      const trusted_before = await allowlist.read.allowed_eth([walletClient.account.address, account2.account.address])
      expect(trusted_before).to.equal(0n)
      const percentage = await allowlist.read.percentage()
      const balance_before_1 = await publicClient.getBalance({ address: walletClient.account.address })
      const balance_before_2 = await publicClient.getBalance({ address: account2.account.address })
      //divide 2 for safety gascost
      const amount = (balance_before_1 * BigInt(percentage) / 10n**6n) / 2n
      await allowlist.write.send_eth([account2.account.address], {value: amount})
      const balance_after_2 = await publicClient.getBalance({ address: account2.account.address })
      expect(amount).to.equal(BigInt(balance_after_2 - balance_before_2))
      const trusted_after = await allowlist.read.allowed_eth([walletClient.account.address, account2.account.address])
      expect(trusted_after).to.not.equal(0n)
    })
    it('Should transfer ETH > 0.1% balance - trusted address ', async function () { 
      const trusted_before = await allowlist.read.allowed_eth([walletClient.account.address, account2.account.address])
      expect(trusted_before).to.not.equal(0n)
      //50% of balance 
      const balance_before_1 = await publicClient.getBalance({ address: walletClient.account.address })
      const balance_before_2 = await publicClient.getBalance({ address: account2.account.address })
      const amount = balance_before_1 / 2n
      await allowlist.write.send_eth([account2.account.address], {value: amount})
      const balance_after_2 = await publicClient.getBalance({ address: account2.account.address })
      expect(amount).to.equal(BigInt(balance_after_2 - balance_before_2))
      const trusted_after = await allowlist.read.allowed_eth([walletClient.account.address, account2.account.address])
      expect(trusted_after).to.not.equal(0n)
    })
    //Token transfers
    it('Should fail transfer Token > 0.1% balance - non trusted address', async function () { 
      const amount = parseEther('1')
      await weth.deposit({value: amount})
      let weth_balance_after_1 = await weth.balanceOf(walletClient.account.address)
      expect(weth_balance_after_1).to.equal(amount)
      await hhViem.assertions.revertWith(
        allowlist.write.send([weth.address, account2.account.address, amount/2n]),
        "send: not approved"
      )
    })
    it('Should transfer Token <= 0.1% balance - non trusted address', async function () { 
      const trusted_before = await allowlist.read.allowed([walletClient.account.address, account2.account.address, weth.address])
      expect(trusted_before).to.equal(0n)
      const percentage = await allowlist.read.percentage()
      //divide 2 for safety gascost 
      const balance_before_2 = await weth.balanceOf(account2.account.address)
      const amount = (parseEther('1') * BigInt(percentage) / 10n**6n) / 2n
      //approve allowlist contract weth transfer
      await weth.approve(allowlist.address, amount) 
      await allowlist.write.send([weth.address, account2.account.address, amount])
      const balance_after_2 = await weth.balanceOf(account2.account.address)
      expect(amount).to.equal(BigInt(balance_after_2 - balance_before_2))
      const trusted_after = await allowlist.read.allowed([walletClient.account.address, account2.account.address, weth.address])
      expect(trusted_after).to.not.equal(0n)
    })
    it('Should transfer Token > 0.1% balance - trusted address ', async function () { 
      const trusted_before = await allowlist.read.allowed([walletClient.account.address, account2.account.address, weth.address])
      expect(trusted_before).to.not.equal(0n)
      //50% of balance 
      const balance_before_2 = await weth.balanceOf(account2.account.address)
      const amount = parseEther('1') / 2n
      //approve allowlist contract weth transfer
      await weth.approve(allowlist.address, amount) 
      await allowlist.write.send([weth.address, account2.account.address, amount])
      const balance_after_2 = await weth.balanceOf(account2.account.address)
      expect(amount).to.equal(BigInt(balance_after_2 - balance_before_2))
      const trusted_after = await allowlist.read.allowed([walletClient.account.address, account2.account.address, weth.address])
      expect(trusted_after).to.not.equal(0n)
    })
    //Remove trusted address
    it('Should remove address from trusted eth address book', async function () { 
      const trusted_before = await allowlist.read.allowed_eth([walletClient.account.address, account2.account.address])
      expect(trusted_before).to.not.equal(0n)
      await allowlist.write.remove([account2.account.address, "0x0000000000000000000000000000000000000000"])
      const trusted_after = await allowlist.read.allowed_eth([walletClient.account.address, account2.account.address])
      expect(trusted_after).to.equal(0n)
    })
    it('Should remove address from trusted token address book', async function () { 
      const trusted_before = await allowlist.read.allowed([walletClient.account.address, account2.account.address, weth.address])
      expect(trusted_before).to.not.equal(0n)
      await allowlist.write.remove([account2.account.address, weth.address])
      const trusted_after = await allowlist.read.allowed([walletClient.account.address, account2.account.address, weth.address])
      expect(trusted_after).to.equal(0n)
    })

})