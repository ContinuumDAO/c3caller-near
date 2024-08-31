import { AccountId, LookupMap, near, NearPromise } from "near-sdk-js"

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

    // call to c3caller contract - this will create the c3call event that will be transmitted cross-chain
    const c3call_promise = NearPromise.new(this.c3caller)
      .functionCall("c3call", JSON.stringify(c3call_data), ZERO, THIRTY_TGAS)
    // once the c3call has been made, call back with the result
    // if it failed, this gives the dapp an opportunity to revert any changes made to state
    const c3call_callback = NearPromise.new(near.currentAccountId())
      .functionCall("c3call_callback", JSON.stringify({}), ZERO, THIRTY_TGAS)
    
    return c3call_promise.then(c3call_callback).asReturn()
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

  context(): NearPromise {
    const c3context_promise = NearPromise.new(this.c3caller)
      .functionCall("get_context", NO_ARGS, ZERO, THIRTY_TGAS)

    return c3context_promise
  }
}