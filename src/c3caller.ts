// Find all our documentation at https://docs.near.org
import { NearBindgen, near, call, view, AccountId, initialize, assert, NearPromise, PromiseIndex, LookupMap } from "near-sdk-js"
import { log } from "near-sdk-js/lib/api"
import { C3GovClient } from "./c3_gov_client";
import { C3CallerEventLogData } from "./events"

interface C3Context {
  swap_id: string;
  from_chain_id: string;
  source_tx: string;
}

interface CallbackData {
  dapp_id: bigint,
  caller: AccountId,
  to_chain_id: string,
  to: string,
  data: string,
  extra: string
}

const ZERO = BigInt(0)
const NO_ARGS = JSON.stringify({})
const THIRTY_TGAS = BigInt("30000000000000")

@NearBindgen({})
class C3Caller extends C3GovClient {
  context: C3Context = { swap_id: "", from_chain_id: "", source_tx: "" }
  uuid_keeper: AccountId = ""
  paused: boolean = false

  c3_nonce: number = 0
  callback_data: LookupMap<CallbackData> = new LookupMap<CallbackData>("callback_data")

  promiseResult = (nonce: number): { result: string; success: boolean } => {
    let result, success

    try {
      result = near.promiseResult(nonce as PromiseIndex)
      success = true
    } catch {
      result = undefined
      success = false
    }

    return { result, success }
  }

  @initialize({ privateFunction: true })
  init({ swap_id_keeper }: { swap_id_keeper: AccountId }) {
    this.init_gov({ gov: near.predecessorAccountId() })
    this.uuid_keeper = swap_id_keeper
  }

  @call({ privateFunction: true })
  pause() {
    this.only_operator()
    this.paused = true
  }

  @call({ privateFunction: true })
  unpause() {
    this.only_operator()
    this.paused = false
  }

  @call({})
  c3call(
    { dapp_id, caller, to, to_chain_id, data, extra }:
    { dapp_id: bigint, caller: AccountId, to: string, to_chain_id: string, data: string, extra: string }
  ): NearPromise {
    assert(!this.paused, "C3Caller: paused")
    assert(dapp_id !== ZERO, "C3Caller: empty dappID")
    assert(to.length > 0, "C3Caller: empty to")
    assert(to_chain_id.length > 0, "C3Caller: empty toChainID")
    assert(data.length > 0, "C3Caller: empty calldata")

    const uuid_args = { dapp_id, to, to_chain_id, data }
    const uuid_args_json = JSON.stringify(uuid_args)

    const callback_id = this.c3_nonce
    const callback_id_json = JSON.stringify(callback_id)

    const callback_data: CallbackData = { dapp_id, caller, to_chain_id, to, data, extra }
    this.callback_data.set(callback_id.toString(), callback_data)

    const uuid_promise = (NearPromise.new(this.uuid_keeper)
      .functionCall("gen_uuid", uuid_args_json, ZERO, THIRTY_TGAS)
      .then(
        NearPromise.new(near.currentAccountId())
          .functionCall("c3call_callback", callback_id_json, ZERO, THIRTY_TGAS)
      )
    )

    this.c3_nonce++
    
    return uuid_promise.asReturn()
  }

  @call({ privateFunction: true })
  c3call_callback(callback_id: number): boolean {
    const { result, success } = this.promiseResult(callback_id)

    if(success) {
      // we don't yet know how result is formatted
      // until then, using parse to silence the error message
      const uuid: string = JSON.parse(result)
      const {
        dapp_id,
        caller,
        to_chain_id,
        to,
        data,
        extra
      }: CallbackData = this.callback_data.get(callback_id.toString())

      const c3call_log: C3CallerEventLogData = {
        standard: "c3caller",
        version: "1.0.0",
        event: "c3_call",
        data: [
          {
            dappID: dapp_id,
            uuid: uuid,
            caller: caller,
            toChainID: to_chain_id,
            to: to,
            data: data,
            extra: extra
          }
        ]
      }

      const c3call_log_json = JSON.stringify(c3call_log)

      log(c3call_log_json)

      assert(this.callback_data.remove(callback_id.toString()), "C3Caller: callback data does not exist")

      near.log(`C3Call successful`)
      return true
    } else {
      near.log(`C3Call unsuccessful`)
      return false
    }
  }

  @call({})
  c3broadcast(
    { dapp_id, caller, to, to_chain_ids, data }:
    { dapp_id: bigint, caller: AccountId, to: string[], to_chain_ids: string[], data: string }
  ) {
    assert(!this.paused, "C3Caller: paused")
    assert(dapp_id !== ZERO, "C3Caller: empty dappID")
    assert(to.length > 0, "C3Caller: empty to")
    assert(to_chain_ids.length > 0, "C3Caller: empty toChainID")
    assert(data.length > 0, "C3Caller: empty calldata")
    assert(data.length === to_chain_ids.length, "C3Caller: calldata length dismatch") // BUG

    // loop through to get each uuid, and emit a log for each one
    for(let i = 0; i < to.length; i++) {
      const uuid = "0xabcd"
      
      const c3call_log: C3CallerEventLogData = {
        standard: "c3caller",
        version: "1.0.0",
        event: "c3_call",
        data: [
          {
            dappID: dapp_id,
            uuid: uuid,
            caller: caller,
            toChainID: to_chain_ids[i],
            to: to[i],
            data: data,
            extra: ""
          }
        ]
      }

      const c3call_log_json = JSON.stringify(c3call_log)

      log(c3call_log_json)
    }
  }
}
