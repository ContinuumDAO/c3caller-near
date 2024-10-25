import { NearBindgen, near, call, view, AccountId, initialize, assert, NearPromise, LookupMap, PromiseIndex } from "near-sdk-js"

import { bytesToHex, hexToBytes, stringToHex } from "web3-utils"
import { decodeParameters } from "web3-eth-abi"

import { C3UUIDKeeper } from "./c3_uuid_keeper"
import { C3CallerEventLogData, C3Context, C3NEARMessage, C3Executable, C3Result } from "../c3caller"

const ZERO = BigInt(0)
const NO_ARGS = JSON.stringify({})
const TGAS_DEFAULT = BigInt("30000000000000")
const TGAS_MAX = BigInt("300000000000000")
const TGAS_100 = BigInt("100000000000000")


@NearBindgen({ requireInit: true })
class C3Caller extends C3UUIDKeeper {
  context: C3Context = { swap_id: "", from_chain_id: "", source_tx: "" }
  paused: boolean = false

  completed_swapin: LookupMap<boolean> = new LookupMap<boolean>("completed_swapin")
  exec_context: LookupMap<C3Context> = new LookupMap<C3Context>("exec_context")
  fallback_context: LookupMap<C3Context> = new LookupMap<C3Context>("fallback_context")
  selector_data: LookupMap<C3Executable> = new LookupMap<C3Executable>("selector_data")

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
    { dapp_id: string, caller: AccountId, to: string, to_chain_id: string, data: string, extra: string }
  ): C3Result {
    try {
      assert(!this.paused, "C3Caller: paused")
      assert(dapp_id !== "0", "C3Caller: empty dappID")
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

      const c3call_log_json = JSON.stringify({ EVENT_JSON: c3call_log })
      near.log(c3call_log_json)

      return {
        success: true,
        message: `C3Call successful.`,
        uuid
      }
    } catch (err) {
      return {
        success: false,
        message: `C3Call unsuccessful: ${ err.message }`
      }
    }
  }

  @call({})
  c3broadcast(
    { dapp_id, caller, to, to_chain_ids, data }:
    { dapp_id: string, caller: AccountId, to: string[], to_chain_ids: string[], data: string }
  ): C3Result {
    try {
      assert(!this.paused, "C3Caller: paused")
      assert(dapp_id !== "0", "C3Caller: empty dappID")
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
      near.log(c3call_log_json)

      return {
        success: true,
        message: "C3Broadcast successful.",
        uuid: c3call_log_data.map(c3 => c3.uuid)
      }
    } catch (err) {
      return {
        success: false,
        message: `C3Broadcast unsuccessful: ${ err.message }`
      }
    }
  }


  ///////////////////////////////////////////////////////////////
  ///////////////////// EXECUTE: ENTRYPOINT /////////////////////
  ///////////////////////////////////////////////////////////////
  @call({})
  execute(
    { dapp_id, tx_sender, message }:
    { dapp_id: string, tx_sender: string, message: C3NEARMessage }
  ): NearPromise {
    try {
      this.only_operator()
      assert(!this.paused, "C3Caller: paused")
      assert(message.data.length > 0, "C3Caller: empty calldata")
      assert(!this.is_completed({ uuid: message.uuid }), "C3Caller: already completed")

      const check_valid_sender = NearPromise.new(message.to)
        .functionCall("is_vaild_sender", JSON.stringify({ tx_sender }), ZERO, TGAS_DEFAULT)
        // return boolean
      const check_dapp_id = NearPromise.new(message.to)
        .functionCall("get_dapp_id", NO_ARGS, ZERO, TGAS_DEFAULT)
        // return string
      const next = NearPromise.new(near.currentAccountId())
        .functionCall("execute_validated", JSON.stringify({ dapp_id, message }), ZERO, TGAS_100)

      return check_dapp_id.and(check_valid_sender).then(next).asReturn()
    } catch (err) {
      this.execution_error(dapp_id, message, err.message)
    }
  }

  ///////////////////////////////////////////////////////////////
  ////////////////////// EXECUTE: VALIDATE //////////////////////
  ///////////////////////////////////////////////////////////////
  @call({ privateFunction: true })
  execute_validated(
    { dapp_id, message }:
    { dapp_id: string, message: C3NEARMessage }
  ) {
  // ): NearPromise {
    try {
      // const check_valid_sender = near.promiseResult(0 as PromiseIndex)
      const check_dapp_id = JSON.parse(near.promiseResult(0 as PromiseIndex))
      const check_valid_sender = JSON.parse(near.promiseResult(1 as PromiseIndex))

      assert(check_valid_sender, "C3Caller: txSender invalid")
      assert(check_dapp_id === dapp_id, "C3Caller: dappID dismatch")

      const context: C3Context = {
        swap_id: message.uuid,
        from_chain_id: message.from_chain_id,
        source_tx: message.source_tx
      }
      this.exec_context.set(message.uuid, context)

      const selector = message.data.slice(0, 10) // 0xabcd1234
      const selector_data = this.selector_data.get(selector)

      assert(selector_data !== null, `C3Caller: No function data for 0x${selector}.`)

      const { function_name, parameter_types } = selector_data
      // const function_name = selector_data.function_name

      // throw new Error(`Stored data: ${ parameter_types }, ${message.data}`)

      const decoded_calldata = decodeParameters(parameter_types, message.data.slice(10))
  
      const arg_array = []
      for(let i = 0; i < decoded_calldata.__length__; i++) {
        arg_array.push(decoded_calldata[i])
      }

      // arbitrary function call on NEAR (must be registered in this contract)
      const exec_call = NearPromise.new(message.to)
        .functionCall(function_name, JSON.stringify([...arg_array]), ZERO, TGAS_100)
      const result_callback = NearPromise.new(near.currentAccountId())
        .functionCall("execute_callback", JSON.stringify({ dapp_id, message }), ZERO, TGAS_100)

      return exec_call.then(result_callback).asReturn()
    } catch (err) {
      this.execution_error(dapp_id, message, err.message)
    }
  }

  ///////////////////////////////////////////////////////////////
  //////////////////////// EXECUTE: CALL ////////////////////////
  ///////////////////////////////////////////////////////////////
  @call({ privateFunction: true })
  execute_callback(
    { dapp_id, message }:
    { dapp_id: string, message: C3NEARMessage }
  ): C3Result {
    try {
      /// @todo do we remove this?
      this.exec_context.set(message.uuid, { swap_id: "", from_chain_id: "", source_tx: "" })
      const { success, result }: { success: boolean, result: string } = promiseResult()
      const resultParsed = JSON.parse(result)

      if (success && resultParsed == true) {
        this.register_uuid({ uuid: message.uuid })
        return { success: true, message: `C3 execution successful.`, uuid: message.uuid }
      } else {
        throw new Error(result)
      }
    } catch (err) {
      return this.execution_error(dapp_id, message, err.message)
    }
  }

  execution_error(dapp_id: string, message: C3NEARMessage, error: string): C3Result {
    const fallback_call_log: C3CallerEventLogData = {
      standard: "c3caller",
      version: "1.0.0",
      event: "fallback_call",
      data: [
        {
          dappID: dapp_id.toString(),
          uuid: message.uuid,
          to: message.fallback_to,
          data: message.data,
          reasons: error
        }
      ]
    }

    const fallback_call_log_json = JSON.stringify({ EVENT_JSON: fallback_call_log })
    near.log(fallback_call_log_json)

    return {
      success: false,
      message: `C3 execution failed, falling back to chain ${message.from_chain_id}.`,
      uuid: message.uuid
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
      .functionCall("is_vaild_sender", JSON.stringify({ tx_sender }), ZERO, TGAS_DEFAULT)
    const check_dapp_id = NearPromise.new(message.to)
      .functionCall("dapp_id", NO_ARGS, ZERO, TGAS_DEFAULT)
    const next = NearPromise.new(near.currentAccountId())
      .functionCall("c3_fallback_validated", JSON.stringify({ dapp_id, message }), ZERO, TGAS_DEFAULT)

    check_valid_sender.and(check_dapp_id).then(next).asReturn()
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

    const target: AccountId = message.to // original exec message.fallback_to

    const selector = message.data.slice(2, 10)
    const { function_name, parameter_types } = this.selector_data.get(selector)

    const decoded_calldata = decodeParameters(parameter_types, message.data)

    const arg_array = []
    for(let i = 0; i < decoded_calldata.__length__; i++) {
      arg_array.push(decoded_calldata[i])
    }

    // arbitrary function call on NEAR (must be registered in this contract)

    /// @bug here we call fallback_to with the data originally intended to be executed on dest chain
    ///      we actually want to call fallback_to:c3Fallback(message, function_name, arg_array)
    const fallback_call = NearPromise.new(target)
      .functionCall(function_name, JSON.stringify([...arg_array]), ZERO, TGAS_DEFAULT)
    const result_callback = NearPromise.new(near.currentAccountId())
      .functionCall("c3_fallback_callback", JSON.stringify({ dapp_id, message }), ZERO, TGAS_DEFAULT)
    
    return fallback_call.then(result_callback).asReturn()
  }

  ///////////////////////////////////////////////////////////////
  /////////////////////// C3FALLBACK: CALL //////////////////////
  ///////////////////////////////////////////////////////////////
  @call({ privateFunction: true })
  c3_fallback_callback({ dapp_id, message }: { dapp_id: bigint, message: C3NEARMessage }) {
    /// @todo do we remove this?
    this.fallback_context.set(message.uuid, { swap_id: "", from_chain_id: "", source_tx: "" })
    const { result }: { result: string } = JSON.parse(near.promiseResult(0 as PromiseIndex))

    this.register_uuid({ uuid: message.uuid })

    const exec_fallback_log: C3CallerEventLogData = {
      standard: "c3caller",
      version: "1.0.0",
      event: "exec_fallback",
      data: [
        {
          dappID: dapp_id.toString(),
          to: message.to,
          uuid: message.uuid,
          fromChainID: message.from_chain_id,
          sourceTx: message.source_tx,
          data: message.data,
          reason: result // return value from c3Fallback (dev designed)
        }
      ]
    }

    const exec_fallback_log_json = JSON.stringify({ EVENT_JSON: exec_fallback_log })
    near.log(exec_fallback_log_json)
  }

  @call({})
  register_c3executable({ signature }: { signature: string }): { selector: string, executable: C3Executable } {
    const selector = this.calculate_selector(signature)
    const existing_selector_data = this.selector_data.get(selector)
    if (existing_selector_data !== null) return { selector, executable: existing_selector_data }
    const function_name = signature.slice(0, signature.indexOf("("))
    const parameter_types = (signature.match(/\((.*?)\)/)[1]).split(",")
    const executable = { function_name, parameter_types }
    this.selector_data.set(selector, executable)
    return { selector, executable }
  }

  @view({})
  get_selector({ signature }: { signature: string }) {
    return this.calculate_selector(signature)
  }

  @view({})
  get_selector_data({ selector }: { selector: string }): C3Executable {
    return this.selector_data.get(selector)
  }

  @view({})
  get_gov(): AccountId {
    return this.gov
  }

  @view({})
  get_context({ uuid }: { uuid: string }): C3Context {
    return this.exec_context.get(uuid)
  }

  calculate_selector(signature: string): string {
    const sig_hex = stringToHex(signature)
    const sig_bytes = hexToBytes(sig_hex)
    const sig_hashed = near.keccak256(sig_bytes)
    const hashed_signature_hex = bytesToHex(sig_hashed)
    return hashed_signature_hex.slice(0, 10) // 4-byte selector
  }

  @call({})
  gen_uuid(args: { dapp_id: string, to: string, to_chain_id: string, data: string }): string {
    return super.gen_uuid(args)
  }

  @call({})
  add_operator({ op }: { op: AccountId }) {
    super.add_operator({ op })
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