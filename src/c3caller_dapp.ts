import { AccountId, call, LookupMap, near, NearPromise } from "near-sdk-js"
import { hexToBytes, bytesToHex, stringToHex } from "web3-utils"

interface C3Executable {
  function_name: string,
  parameter_types: string[]
}

const ZERO = BigInt(0)
const THIRTY_TGAS = BigInt("30000000000000")

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

  context(): NearPromise {
    const c3context_promise = NearPromise.new(this.c3caller)
      .functionCall("get_context", JSON.stringify({}), ZERO, THIRTY_TGAS)

    return c3context_promise
  }

  calculate_selector(signature: string): string {
    const sig_hex = stringToHex(signature)
    const sig_bytes = hexToBytes(sig_hex)
    const sig_hashed = near.keccak256(sig_bytes)
    const hashed_signature_hex = bytesToHex(sig_hashed)
    const selector = hashed_signature_hex.slice(0, 10) // 8-byte selector
    return selector
  }

  @call({})
  register_c3_executable(signature: string) {
    const selector = this.calculate_selector(signature)
    const function_name = signature.slice(0, signature.indexOf("("))
    const parameter_types = (selector.match(/\((.*?)\)/)[1]).split(",")
    this.selector_data.set(selector, { function_name, parameter_types })
  }
}