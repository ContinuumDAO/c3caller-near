// Find all our documentation at https://docs.near.org
import { NearBindgen, near, call, view, AccountId, initialize, assert, NearPromise, LookupMap } from "near-sdk-js"
import { log } from "near-sdk-js/lib/api"
import { C3GovClient } from "./c3_gov_client"
import { C3CallerEventLogData } from "./events"
import { c3call_promise_result, c3broadcast_promise_result } from "./utils"

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

interface C3NEARMessage {
  uuid: string,
  to: AccountId,
  from_chain_id: string,
  source_tx: string,
  fallback_to: AccountId,
  data: string
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
  c3_data: LookupMap<CallbackData[]> = new LookupMap<CallbackData[]>("c3broadcast_data")

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

    const callback_data: CallbackData = { dapp_id, caller, to_chain_id, to, data, extra }
    this.c3_data.set(callback_id.toString(), [ callback_data ])
    const callback_id_json = JSON.stringify({ callback_id })

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

  @call({ privateFunction: true }) // does this function have to interpret the arguments as JSON or a number??
  c3call_callback({ callback_id }: { callback_id: number }): boolean {
    const { result, success } = c3call_promise_result()

    if(success) {
      // we don't yet know how result is formatted
      // until then, using parse to silence the error message
      const uuid: string = JSON.parse(result)
      const resutl: CallbackData[] = this.c3_data.get(callback_id.toString())
      const {
        dapp_id,
        caller,
        to_chain_id,
        to,
        data,
        extra
      } = resutl[0]

      const c3call_log: C3CallerEventLogData = {
        standard: "c3caller",
        version: "1.0.0",
        event: "c3_call",
        data: [
          {
            dappID: dapp_id,
            uuid,
            caller,
            toChainID: to_chain_id,
            to,
            data,
            extra
          }
        ]
      }

      const c3call_log_json = JSON.stringify(c3call_log)

      log(c3call_log_json)

      assert(this.c3_data.remove(callback_id.toString()), "C3Caller: callback data does not exist")

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
  ): NearPromise {
    assert(!this.paused, "C3Caller: paused")
    assert(dapp_id !== ZERO, "C3Caller: empty dappID")
    assert(to.length > 0, "C3Caller: empty to")
    assert(to_chain_ids.length > 0, "C3Caller: empty toChainID")
    assert(data.length > 0, "C3Caller: empty calldata")
    assert(to.length === to_chain_ids.length, "C3Caller: tochains length dismatch")

    let callback_data_list: CallbackData[] = []
    let uuid_promises: NearPromise[] = []

    // declare the ID for the callback data
    const callback_id = this.c3_nonce

    // loop through each request, create a promise that generates a UUID
    for(let i = 0; i < to.length; i++) {
      const uuid_args = { dapp_id, to: to[i], to_chain_id: to_chain_ids[i], data }
      const uuid_args_json = JSON.stringify(uuid_args)
      const callback_data: CallbackData = { dapp_id, caller, to_chain_id: to_chain_ids[i], to: to[i], data, extra: "" }
      callback_data_list.push(callback_data)
      const c3broadcast_promise = NearPromise.new(this.uuid_keeper).functionCall("gen_uuid", uuid_args_json, ZERO, THIRTY_TGAS)
      uuid_promises.push(c3broadcast_promise)
    }

    // join each broadcast promise together, eg promise0.and(promise1).and(promise2)
    let parallel_promise: NearPromise = uuid_promises[0]
    for(let i = 1; i < uuid_promises.length; i++) {
      parallel_promise = parallel_promise.and(uuid_promises[i])
    }

    const callback_args = JSON.stringify({ callback_id })

    // attach a callback to the chain of promises
    const promise_with_callback = parallel_promise.then(
      NearPromise.new(near.currentAccountId())
      .functionCall("c3broadcast_callback", callback_args, ZERO, THIRTY_TGAS)
    )

    // store the request data in this contract to be used in the callback
    this.c3_data.set(callback_id.toString(), callback_data_list)
    this.c3_nonce++

    return promise_with_callback
  }

  @call({ privateFunction: true })
  c3broadcast_callback(
    { callback_id }:
    { callback_id: number }
  ): boolean {
    const callback_data_list: CallbackData[] = this.c3_data.get(callback_id.toString())

    // loop through each gen UUID call and if successful emit a c3call event
    for(let i = 0; i < callback_data_list.length; i++) {
      const { result, success } = c3broadcast_promise_result(i)
      const uuid: string = JSON.parse(result)
      if(success) {
        // we don't yet know how result is formatted
        // until then, using parse to silence the error message
        const { dapp_id, caller, to_chain_id, to, data, extra } = callback_data_list[i]

        const c3call_log: C3CallerEventLogData = {
          standard: "c3caller",
          version: "1.0.0",
          event: "c3_call",
          data: [
            {
              dappID: dapp_id,
              uuid,
              caller,
              toChainID: to_chain_id,
              to,
              data,
              extra: ""
            }
          ]
        }

        const c3call_log_json = JSON.stringify(c3call_log)
        log(c3call_log_json)
      } else {
        near.log(`C3Broadcast unsuccessful`)
        return false
      }
    }

    assert(this.c3_data.remove(callback_id.toString()), "C3Caller: callback data does not exist")

    near.log(`C3Broadcast successful`)
    return true
  }

  @call({})
  execute(
    { dapp_id, tx_sender, message }:
    { dapp_id: bigint, tx_sender: AccountId, message: C3NEARMessage }
  ) {
    this.only_operator()
    assert(!this.paused, "C3Caller: paused")
    assert(message.data.length > 0, "C3Caller: empty calldata")
    // validate sender here by calling is_vaild_sender on message.to
    // check that the given dapp ID == dapp ID on message.to
    // check that the UUID is not already complete on uuid_keeper

    // set the context to the context of the message
    this.context = { swap_id: message.uuid, from_chain_id: message.from_chain_id, source_tx: message.source_tx }

    // CALL TARGET OF C3CALL ON NEAR
    
    this.context = { swap_id: "", from_chain_id: "", source_tx: "" }

    // emit exec call event

    // success -> register success in uuid_keeper
    // fail    -> emit fallback call event
  }

  @call({})
  c3_fallback(
    { dapp_id, tx_sender, message }:
    { dapp_id: bigint, tx_sender: AccountId, message: C3NEARMessage }
  ) {
    this.only_operator()
    assert(!this.paused, "C3Caller: paused")
    // check that the UUID is not already complete on uuid_keeper
    // validate sender here by calling is_vaild_sender on message.to
    // check that the given dapp ID == dapp ID on message.to

    this.context = { swap_id: message.uuid, from_chain_id: message.from_chain_id, source_tx: message.source_tx }

    // CALL TARGET OF C3FALLBACK ON NEAR

    this.context = { swap_id: "", from_chain_id: "", source_tx: "" }

    // register success in uuid_keeper
    // emit fallback exec event
  }
}
