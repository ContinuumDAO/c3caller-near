import { AccountId, LookupMap, near, NearPromise } from "near-sdk-js"

interface C3Executable {
  function_name: string,
  parameter_types: string[]
}

const ZERO = BigInt(0)
const TGAS_30 = BigInt("30000000000000")
const TGAS_100 = BigInt("100000000000000")
const TGAS_MAX = BigInt("300000000000000")
const NO_ARGS = JSON.stringify({})

export class C3CallerDapp {
  c3caller: AccountId = ""
  dapp_id: string = ""

  sol_signature: LookupMap<string> = new LookupMap<string>("sol_signature")
  selector_data: LookupMap<C3Executable> = new LookupMap<C3Executable>("selector_data")

  c3call(
    { to, to_chain_id, data, extra }:
    { to: string, to_chain_id: string, data: string, extra?: string }
  ): NearPromise {
    if (!extra) extra = ""

    const dapp_id = this.dapp_id
    const c3caller = this.c3caller

    const c3call_data = {
      dapp_id,
      caller: near.currentAccountId(),
      to,
      to_chain_id,
      data,
      extra
    }

    /// call to c3caller contract - this will create the c3call event that will be transmitted cross-chain
    const c3call_promise = NearPromise.new(c3caller)
      .functionCall("c3call", JSON.stringify(c3call_data), ZERO, TGAS_100)
    /// once the c3call has been made, call back with the result
    /// if it failed, this gives the dapp an opportunity to revert any changes made to state
    const c3call_callback = NearPromise.new(near.currentAccountId())
      .functionCall("c3call_callback", JSON.stringify({}), ZERO, TGAS_30)
    
    return c3call_promise.then(c3call_callback).asReturn()
  }

  c3broadcast(
    { to, to_chain_ids, data }:
      { to: string[], to_chain_ids: string[], data: string }
  ): NearPromise {
    const dapp_id = this.dapp_id

    const c3broadcast_data = {
      dapp_id,
      caller: near.currentAccountId(),
      to,
      to_chain_ids,
      data
    }

    const c3broadcast_promise = NearPromise.new(this.c3caller)
      .functionCall("c3broadcast", JSON.stringify(c3broadcast_data), ZERO, TGAS_MAX)
    const c3broadcast_callback = NearPromise.new(near.currentAccountId())
      .functionCall("c3broadcast_callback", JSON.stringify({}), ZERO, TGAS_30)

    return c3broadcast_promise.then(c3broadcast_callback).asReturn()
  }

  context(): NearPromise {
    const c3context_promise = NearPromise.new(this.c3caller)
      .functionCall("get_context", NO_ARGS, ZERO, TGAS_30)

    return c3context_promise
  }
}