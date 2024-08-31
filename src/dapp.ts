import { near, AccountId, call, initialize, NearBindgen, NearPromise, PromiseIndex } from "near-sdk-js"

/* WEB3 */
// import { encodeFunctionCall } from "web3-eth-abi"
/* MM */
import { encode } from "@metamask/abi-utils"

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

    // ABI function fragment for `function transfer(address recipient, uint256 amount)`
    // const abi_transfer_fragment = {
    //   name: "transfer",
    //   type: "function",
    //   inputs: [
    //     {
    //       type: "address",
    //       name: "recipient"
    //     },
    //     {
    //       type: "uint256",
    //       name: "amount"
    //     }
    //   ]
    // }

    // const data = encodeFunctionCall(
    //   abi_transfer_fragment,
    //   [recipient, amount]
    // )

    // const selector = ""
    const calldata = encode(["address", "uint256"], [recipient, amount])
    const data = ""
    const extra = ""

    return this.c3call({ to, to_chain_id, data, extra }).asReturn()
  }

  @call({ privateFunction: true })
  c3call_callback() {
    const { success } = promiseResult()
    if (success) {
      near.log("C3Call successful")
    } else {
      near.log("C3Call unsuccessful")
    }
  }
}


const promiseResult = (): { success: boolean, result: string } => {
  let success: boolean, result: string

  try {
    success = true
    result = near.promiseResult(0 as PromiseIndex)
  } catch {
    success = false
    result = undefined
  }

  return { success, result }
}