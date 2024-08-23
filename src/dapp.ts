import { AccountId, call, initialize, NearBindgen, NearPromise } from "near-sdk-js"
import { encodeFunctionCall } from "web3-eth-abi"
import { C3CallerDapp } from "./c3caller_dapp"


@NearBindgen({})
class Dapp extends C3CallerDapp {

  @initialize({ privateFunction: true })
  init({ c3_caller, dapp_id }: { c3_caller: AccountId, dapp_id: bigint }) {
    this.c3caller = c3_caller
    this.dapp_id = dapp_id
  }

  @call({})
  transfer_out_evm(
    { recipient, amount }:
    { recipient: string, amount: bigint }
  ): NearPromise {
    const to = "0x0123456789012345678901234567890123456789" // target address on target chain (EVM address)
    const to_chain_id = "1" // Ethereum
    // const data = encodeFunctionCall(
    //   "transfer(address,uint256)",
    //   [recipient, amount]
    // ) // calldata (selector + calldata)
    const data = "0x00"
    const extra = ""

    return this.c3call({ to, to_chain_id, data, extra })
  }
}