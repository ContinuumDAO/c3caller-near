import { AccountId, LookupMap, near, view, NearPromise, PromiseIndex, assert } from "near-sdk-js"
import { C3Result } from "../c3caller"

interface C3Executable {
  function_name: string,
  parameter_types: string[]
}

const ZERO = BigInt(0)
const TGAS_DEFAULT = BigInt("30000000000000")
const TGAS_C3CALL = BigInt("150000000000000")
const NO_ARGS = JSON.stringify({})

export class C3CallerDApp {
  c3caller: AccountId = ""
  dapp_id: string = ""

  // sol_signature: LookupMap<string> = new LookupMap<string>("sol_signature")
  // selector_data: LookupMap<C3Executable> = new LookupMap<C3Executable>("selector_data")

  only_c3caller() {
    const caller: AccountId = near.predecessorAccountId()
    assert(caller === this.c3caller, "C3CallerDApp: Only C3Caller")
  }

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
      .functionCall("c3call", JSON.stringify(c3call_data), ZERO, TGAS_C3CALL)
    /// once the c3call has been made, call back with the result
    /// if it failed, this gives the dapp an opportunity to revert any changes made to state
    const c3call_callback = NearPromise.new(near.currentAccountId())
      .functionCall("c3call_callback", JSON.stringify({}), ZERO, TGAS_DEFAULT)
    
    return c3call_promise.then(c3call_callback).asReturn()
  }

  c3broadcast(
    { to, to_chain_ids, data }:
      { to: string[], to_chain_ids: string[], data: string }
  ): NearPromise {
    const c3caller = this.c3caller
    const dapp_id = this.dapp_id

    const c3broadcast_data = {
      dapp_id,
      caller: near.currentAccountId(),
      to,
      to_chain_ids,
      data
    }

    /// call to c3caller contract - this will create the c3call events that will be transmitted cross-chain
    const c3broadcast_promise = NearPromise.new(c3caller)
      .functionCall("c3broadcast", JSON.stringify(c3broadcast_data), ZERO, TGAS_C3CALL)
    /// once the c3broadcast has been made, call back with the result
    /// if it failed, this gives the dapp an opportunity to revert any changes made to state
    const c3broadcast_callback = NearPromise.new(near.currentAccountId())
      .functionCall("c3broadcast_callback", JSON.stringify({}), ZERO, TGAS_DEFAULT)

    return c3broadcast_promise.then(c3broadcast_callback).asReturn()
  }

  c3_result(): { success: boolean, result: C3Result } {
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

  @view({})
  get_c3caller(): AccountId {
    return this.c3caller
  }

  @view({})
  get_dapp_id(): string {
    return this.dapp_id
  }

  @view({})
  context(): NearPromise {
    const c3context_promise = NearPromise.new(this.c3caller)
      .functionCall("get_context", NO_ARGS, ZERO, TGAS_DEFAULT)

    return c3context_promise
  }
}
