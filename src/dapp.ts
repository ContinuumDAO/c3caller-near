import { near, AccountId, call, view, initialize, NearBindgen, NearPromise, PromiseIndex } from "near-sdk-js"
import { encodeFunctionCall } from "web3-eth-abi"
import { C3CallerDApp } from "./c3caller_dapp"
import { C3Result } from "../c3caller"


@NearBindgen({})
class DApp extends C3CallerDApp {

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

  @call({})
  transfer_out_evms(
    { recipient, amount }:
    { recipient: string, amount: string }
  ): NearPromise {
    const to = [
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      "0xcccccccccccccccccccccccccccccccccccccccc"
    ] // target addresses on target chains (EVM address)

    const to_chain_ids = [
      "1",
      "56",
      "250"
    ] // Ethereum, BSC Smartchain, Fantom

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

    return this.c3broadcast({ to, to_chain_ids, data }).asReturn()
  }

  @call({ privateFunction: true })
  c3call_callback() {
    const { success, result } = c3_result()

    if (success) {
      // overall call passed
      if (result.success) {
        // overall call passed, c3call passed
        near.log(JSON.stringify(result))
      } else {
        // overall call passed, c3call failed
        near.log(JSON.stringify(result))
      }
    } else {
      // overall call failed, c3call subsequently failed
      near.log(`Unknown error occurred.`)
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
}


const c3_result = (): { success: boolean, result: C3Result } => {
  let success: boolean, result: C3Result

  try {
    success = true
    result = JSON.parse(near.promiseResult(0 as PromiseIndex)) // this only passes if the call succeeded
  } catch (err) {
    success = false
    result = undefined
  }

  return { success, result }
}