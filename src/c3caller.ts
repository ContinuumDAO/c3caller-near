// Find all our documentation at https://docs.near.org
import { NearBindgen, near, call, view, AccountId, initialize, assert } from "near-sdk-js"
import { log } from "near-sdk-js/lib/api"
import { C3CallerEventLogData } from "./events.js"

class C3Context {
  swap_id: string;
  from_chain_id: string;
  source_tx: string;
}

const ZERO = BigInt(0)

@NearBindgen({})
class C3Caller {
  context: C3Context = { swap_id: "", from_chain_id: "", source_tx: "" }
  uuid_keeper: AccountId = ""
  paused: boolean = false

  @initialize({ privateFunction: true })
  init({ swap_id_keeper }: { swap_id_keeper: AccountId }) {
    // TODO: set the governor contract address here to sender
    this.uuid_keeper = swap_id_keeper
  }

  @call({ privateFunction: true })
  pause() {
    // only operator
    this.paused = true
  }

  @call({ privateFunction: true })
  unpause() {
    // only operator
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

    // generate the uuid (external contract call)
    const uuid = "0xabcd"

    const c3call_log = {
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
    assert(data.length === to_chain_ids.length, "C3Caller: calldata length dismatch")

    // loop through to get each uuid, and emit a log for each one
  }
}
