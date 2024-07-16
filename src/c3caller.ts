// Find all our documentation at https://docs.near.org
import { NearBindgen, near, call, view, AccountId, initialize, assert, NearPromise, LookupMap, PromiseIndex } from "near-sdk-js"
import { log } from "near-sdk-js/lib/api"
import { encodeParameters, decodeParameters } from "web3-eth-abi"
import { C3UUIDKeeper } from "./c3_uuid_keeper"
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

interface C3NEARMessage {
  uuid: string,
  to: AccountId,
  from_chain_id: string,
  source_tx: string,
  fallback_to: AccountId,
  data: string
}

interface ExecutedMessage {
  message: C3NEARMessage,
  dapp_id: bigint
}

const ZERO = BigInt(0)
const NO_ARGS = JSON.stringify({})
const THIRTY_TGAS = BigInt("30000000000000")

@NearBindgen({})
class C3Caller extends C3UUIDKeeper {
  context: C3Context = { swap_id: "", from_chain_id: "", source_tx: "" }
  paused: boolean = false

  completed_swapin: LookupMap<boolean> = new LookupMap<boolean>("completed_swapin")
  uuid_2_nonce: LookupMap<bigint> = new LookupMap<bigint>("uuid_2_nonce")
  exec_context: LookupMap<C3Context> = new LookupMap<C3Context>("exec_context")
  fallback_context: LookupMap<C3Context> = new LookupMap<C3Context>("fallback_context")
  message_data: LookupMap<ExecutedMessage> = new LookupMap<ExecutedMessage>("message_data")

  current_nonce: bigint = ZERO

  @initialize({ privateFunction: true })
  init() {
    this.init_gov({ gov: near.predecessorAccountId() })
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
  ) {
    assert(!this.paused, "C3Caller: paused")
    assert(dapp_id !== ZERO, "C3Caller: empty dappID")
    assert(to.length > 0, "C3Caller: empty to")
    assert(to_chain_id.length > 0, "C3Caller: empty toChainID")
    assert(data.length > 0, "C3Caller: empty calldata")

    const uuid = this.gen_uuid({ dapp_id, to, to_chain_id, data })

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

    const c3call_log_json = JSON.stringify({ EVENT_LOG: c3call_log })
    log(c3call_log_json)
    near.log(`C3Call successful`)
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
    assert(to.length === to_chain_ids.length, "C3Caller: tochains length dismatch")

    const c3call_log_data = []

    for(let i = 0; i < to.length; i++) {
      const uuid_args = { dapp_id, to: to[i], to_chain_id: to_chain_ids[i], data }
      const uuid = this.gen_uuid(uuid_args)

      c3call_log_data.push({
        dappID: dapp_id,
        uuid,
        caller,
        toChainID: to_chain_ids[i],
        to: to[i],
        data,
        extra: ""
      })
    }

    const c3call_log: C3CallerEventLogData = {
      standard: "c3caller",
      version: "1.0.0",
      event: "c3_call",
      data: c3call_log_data
    }

    const c3call_log_json = JSON.stringify({ EVENT_JSON: c3call_log })
    log(c3call_log_json)

    near.log(`C3Broadcast successful`)
  }


  ///////////////////////////////////////////////////////////////
  ///////////////////// EXECUTE: ENTRYPOINT /////////////////////
  ///////////////////////////////////////////////////////////////
  @call({})
  execute(
    { dapp_id, tx_sender, message }:
    { dapp_id: bigint, tx_sender: AccountId, message: C3NEARMessage }
  ) {
    this.only_operator()
    assert(!this.paused, "C3Caller: paused")
    assert(message.data.length > 0, "C3Caller: empty calldata")
    assert(!this.is_completed({ uuid: message.uuid }), "C3Caller: already completed")

    const check_valid_sender = NearPromise.new(message.to)
      .functionCall("is_vaild_sender", JSON.stringify({ tx_sender }), ZERO, THIRTY_TGAS)
    const check_dapp_id = NearPromise.new(message.to)
      .functionCall("dapp_id", NO_ARGS, ZERO, THIRTY_TGAS)
    const next = NearPromise.new(near.currentAccountId())
      .functionCall("execute_validated", JSON.stringify({ dapp_id, message }), ZERO, THIRTY_TGAS)

    return check_dapp_id.and(check_valid_sender).then(next).asReturn()
  }

  ///////////////////////////////////////////////////////////////
  ////////////////////// EXECUTE: VALIDATE //////////////////////
  ///////////////////////////////////////////////////////////////
  @call({ privateFunction: true })
  execute_validated(
    { dapp_id, message }:
    { dapp_id: bigint, message: C3NEARMessage }
  ) {
    const check_valid_sender = near.promiseResult(0 as PromiseIndex)
    const check_dapp_id = BigInt(near.promiseResult(1 as PromiseIndex))

    assert(check_valid_sender == "true", "C3Caller: txSender invalid")
    assert(check_dapp_id == dapp_id, "C3Caller: dappID dismatch")

    const context: C3Context = { swap_id: message.uuid, from_chain_id: message.from_chain_id, source_tx: message.source_tx }
    this.exec_context.set(message.uuid, context)

    const exec_call = NearPromise.new(message.to)
      .functionCall("c3exec", JSON.stringify({ data: message.data }), ZERO, THIRTY_TGAS)
    const result_callback = NearPromise.new(near.currentAccountId())
      .functionCall("execute_callback", JSON.stringify({ dapp_id, message }), ZERO, THIRTY_TGAS)

    return exec_call.then(result_callback).asReturn()
  }

  ///////////////////////////////////////////////////////////////
  //////////////////////// EXECUTE: CALL ////////////////////////
  ///////////////////////////////////////////////////////////////
  @call({ privateFunction: true })
  execute_callback(
    { dapp_id, message }:
    { dapp_id: bigint, message: C3NEARMessage }
  ) {
    this.exec_context.set(message.uuid, { swap_id: "", from_chain_id: "", source_tx: "" })
    const { success, result }: { success: boolean, result: string} = JSON.parse(near.promiseResult(0 as PromiseIndex))

    if (success) {
      this.register_uuid({ uuid: message.uuid })
    } else {
      const fallback_call_log: C3CallerEventLogData = {
        standard: "c3caller",
        version: "1.0.0",
        event: "fallback_call",
        data: [
          {
            dappID: dapp_id,
            uuid: message.uuid,
            to: message.fallback_to,
            data: message.data,
            reasons: result
          }
        ]
      }

      const fallback_call_log_json = JSON.stringify({ EVENT_JSON: fallback_call_log })
      log(fallback_call_log_json)
    }
  }


  ///////////////////////////////////////////////////////////////
  //////////////////// C3FALLBACK: ENTRYPOINT ///////////////////
  ///////////////////////////////////////////////////////////////
  @call({})
  c3_fallback(
    { dapp_id, tx_sender, message }:
    { dapp_id: bigint, tx_sender: AccountId, message: C3NEARMessage }
  ) {
    this.only_operator()
    assert(!this.paused, "C3Caller: paused")
    assert(message.data.length > 0, "C3Caller: empty calldata")
    assert(!this.is_completed({ uuid: message.uuid }), "C3Caller: already completed")

    const check_valid_sender = NearPromise.new(message.to)
      .functionCall("is_vaild_sender", JSON.stringify({ tx_sender }), ZERO, THIRTY_TGAS)
    const check_dapp_id = NearPromise.new(message.to)
      .functionCall("dapp_id", NO_ARGS, ZERO, THIRTY_TGAS)
    const next = NearPromise.new(near.currentAccountId())
      .functionCall("c3_fallback_validated", JSON.stringify({ dapp_id, message }), ZERO, THIRTY_TGAS)

    const fallback_call = NearPromise.new(message.to)
      .functionCall("c3fallback", JSON.stringify({ data: message.data }), ZERO, THIRTY_TGAS)
    const result_callback = NearPromise.new(near.currentAccountId())
      .functionCall("c3_fallback_callback", JSON.stringify({ dapp_id, message }), ZERO, THIRTY_TGAS)

    return fallback_call.then(result_callback).asReturn()
  }

  ///////////////////////////////////////////////////////////////
  ////////////////////// C3FALLBACK: VALIDATE ///////////////////
  ///////////////////////////////////////////////////////////////
  @call({ privateFunction: true })
  c3_fallback_validated(
    { dapp_id, message }:
    { dapp_id: bigint, message: C3NEARMessage }
  ) {
    const check_valid_sender = near.promiseResult(0 as PromiseIndex)
    const check_dapp_id = BigInt(near.promiseResult(1 as PromiseIndex))

    assert(check_valid_sender == "true", "C3Caller: txSender invalid")
    assert(check_dapp_id == dapp_id, "C3Caller: dappID dismatch")
    
    const context: C3Context = { swap_id: message.uuid, from_chain_id: message.from_chain_id, source_tx: message.source_tx }
    this.fallback_context.set(message.uuid, context)

    const target: AccountId = message.to

    const fallback_call = NearPromise.new(message.to)
      .functionCall("c3fallback", JSON.stringify({ data: message.data }), ZERO, THIRTY_TGAS)
    const result_callback = NearPromise.new(near.currentAccountId())
      .functionCall("c3_fallback_callback", JSON.stringify({ dapp_id, message }), ZERO, THIRTY_TGAS)
    
    return fallback_call.then(result_callback).asReturn()
  }


  ///////////////////////////////////////////////////////////////
  /////////////////////// C3FALLBACK: CALL //////////////////////
  ///////////////////////////////////////////////////////////////
  @call({ privateFunction: true })
  c3_fallback_callback({ dapp_id, message }: { dapp_id: bigint, message: C3NEARMessage }) {
    this.fallback_context.set(message.uuid, { swap_id: "", from_chain_id: "", source_tx: "" })
    const { result }: { result: string } = JSON.parse(near.promiseResult(0 as PromiseIndex))

    this.register_uuid({ uuid: message.uuid })

    const exec_fallback_log: C3CallerEventLogData = {
      standard: "c3caller",
      version: "1.0.0",
      event: "exec_fallback",
      data: [
        {
          dappID: dapp_id,
          to: message.to,
          uuid: message.uuid,
          fromChainID: message.from_chain_id,
          sourceTx: message.source_tx,
          data: message.data,
          reason: result
        }
      ]
    }

    const exec_fallback_log_json = JSON.stringify({ EVENT_JSON: exec_fallback_log })
    log(exec_fallback_log_json)
  }

  @view({})
  get_context({ uuid }: { uuid: string }): C3Context {
    return this.exec_context.get(uuid)
  }
}