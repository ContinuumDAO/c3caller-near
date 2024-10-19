import { near, AccountId, call, view, initialize, NearBindgen, NearPromise, PromiseIndex } from "near-sdk-js"

import { encodeFunctionCall } from "web3-eth-abi"

import { C3CallerDapp } from "./c3caller_dapp"


@NearBindgen({})
class DApp extends C3CallerDapp {

  c3call_nonce: number = 0

  @initialize({ privateFunction: true })
  init({ c3caller, dapp_id }: { c3caller: AccountId, dapp_id: string }) {
    this.c3caller = c3caller
    this.dapp_id = dapp_id
  }

  // test only
  @call({ privateFunction: true })
  reinitialize({ c3caller, dapp_id }: { c3caller: AccountId, dapp_id: string }) {
    this.c3caller = c3caller
    this.dapp_id = dapp_id
  }

  @call({})
  transfer_out_evm(
    { recipient, amount }:
    { recipient: string, amount: string }
  ): NearPromise {
    const to = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" // target address on target chain (EVM address)
    const to_chain_id = "1" // Ethereum

    // ABI function fragment for `function transfer(address recipient, uint256 amount)`
    const abi_transfer_fragment = {
      name: "transfer",
      type: "function",
      inputs: [
        {
          type: "address",
          name: "recipient"
        },
        {
          type: "uint256",
          name: "amount"
        }
      ]
    }

    const data = encodeFunctionCall(
      abi_transfer_fragment,
      [recipient, amount]
    )

    const extra = ""

    return this.c3call({ to, to_chain_id, data, extra }).asReturn()
  }

  @call({ privateFunction: true })
  c3call_callback() {
    const { success } = promiseResult()
    if (success) {
      this.c3call_nonce = this.c3call_nonce + 1
      near.log(`C3Call successful.`)
    } else {
      near.log(`C3Call unsuccessful.`)
    }
  }

  @view({})
  get_c3caller(): AccountId {
    return this.c3caller
  }

  @view({})
  get_dapp_id(): string {
    return this.dapp_id
  }

  @view({})
  get_c3call_nonce(): number {
    return this.c3call_nonce
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