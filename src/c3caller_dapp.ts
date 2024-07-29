import { AccountId, call, LookupMap, near, NearPromise, PromiseIndex } from "near-sdk-js"
import { decodeParameters } from "web3-eth-abi"
import { hexToBytes, bytesToHex, stringToHex } from "web3-utils"

interface C3Executable {
  function_name: string,
  parameter_types: string[]
}

const ZERO = BigInt(0)
const THIRTY_TGAS = BigInt("30000000000000")
const NO_ARGS = JSON.stringify({})

export class C3CallerDapp {
  c3caller: AccountId = ""
  dapp_id: bigint = ZERO

  sol_signature: LookupMap<string> = new LookupMap<string>("sol_signature")
  selector_data: LookupMap<C3Executable> = new LookupMap<C3Executable>("selector_data")

  c3call(
    { to, to_chain_id, data, extra }:
      { to: string, to_chain_id: string, data: string, extra?: string }
  ): NearPromise {
    if (!extra) extra = ""

    const c3call_data = {
      dapp_id: this.dapp_id,
      caller: near.currentAccountId(),
      to,
      to_chain_id,
      data
    }

    const c3call_promise = NearPromise.new(this.c3caller)
      .functionCall("c3call", JSON.stringify(c3call_data), ZERO, THIRTY_TGAS)

    return c3call_promise
  }

  c3broadcast(
    { to, to_chain_ids, data }:
      { to: string[], to_chain_ids: string[], data: string }
  ): NearPromise {
    const c3broadcast_data = {
      dapp_id: this.dapp_id,
      caller: near.currentAccountId(),
      to,
      to_chain_ids,
      data
    }

    const c3broadcast_promise = NearPromise.new(this.c3caller)
      .functionCall("c3broadcast", JSON.stringify(c3broadcast_data), ZERO, THIRTY_TGAS)

    return c3broadcast_promise
  }

  @call({})
  c3_dapp_call({ data }: { data: string }) {
    const selector = data.slice(2, 12)
    const { function_name, parameter_types } = this.selector_data.get(selector)
    const decoded_calldata = decodeParameters(parameter_types, data)
    const arg_array = []
    for(let i = 0; i < decoded_calldata.__length__; i++) {
      arg_array.push(decoded_calldata[i])
    }

    const c3_dapp_call_promise = NearPromise.new(near.currentAccountId())
      .functionCall(function_name, JSON.stringify([...arg_array]), ZERO, THIRTY_TGAS)
    const c3_result_promise = NearPromise.new(near.currentAccountId())
      .functionCall("c3_result", NO_ARGS, ZERO, THIRTY_TGAS)
    
    // we must take the success and result of this function and pass it to the c3caller
    return c3_dapp_call_promise.then(c3_result_promise).asReturn()
  }

  context(): NearPromise {
    const c3context_promise = NearPromise.new(this.c3caller)
      .functionCall("get_context", NO_ARGS, ZERO, THIRTY_TGAS)

    return c3context_promise
  }
}