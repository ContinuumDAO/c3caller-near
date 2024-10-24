import { near, AccountId, call, view, initialize, NearBindgen, NearPromise, LookupMap, assert } from "near-sdk-js"
import { encodeFunctionCall } from "web3-eth-abi"
import { C3CallerDApp } from "./c3caller_dapp"


@NearBindgen({})
class DApp extends C3CallerDApp {

  balance: LookupMap<bigint> = new LookupMap<bigint>("balance")

  @initialize({ privateFunction: true })
  init({ c3caller, dapp_id }: { c3caller: AccountId, dapp_id: string }) {
    this.c3caller = c3caller
    this.dapp_id = dapp_id

    this._mint({ account: near.signerAccountId(), amount: "10000000000000000000" }) // 2 ether
  }

  // internal
  _mint({ account, amount }: { account: AccountId, amount: string }) {
    const amount_n = BigInt(amount)
    const prev_bal = this.get_balance({ account })
    const new_bal = prev_bal + amount_n
    this.balance.set(account, new_bal)
  }

  // internal
  _burn({ account, amount }: { account: AccountId, amount: string }) {
    const amount_n = BigInt(amount)
    const prev_bal = this.get_balance({ account })
    assert(amount_n <= prev_bal, "C3CallerDApp: Insufficient balance")
    const new_bal = prev_bal - amount_n
    this.balance.set(account, new_bal)
  }

  @call({})
  mint({ account, amount }: { account: AccountId, amount: string }) {
    super.only_c3caller()
    this._mint({ account, amount })
  }

  @call({})
  burn({ account, amount }: { account: AccountId, amount: string }) {
    super.only_c3caller()
    this._burn({ account, amount })
  }

  @view({})
  get_balance({ account }: { account: AccountId }): bigint {
    const bal = this.balance.get(account)
    if (bal == null) return BigInt("0")
    else return bal
  }

  @call({})
  transfer_out_evm(
    { account, amount, to, to_chain_ids }:
    { account: string, amount: string, to: string[], to_chain_ids: string[] }
  ): NearPromise {
    // ABI function fragment for `function mint(address account, uint256 amount)`
    const abi_mint_fragment = { name: "mint", type: "function", inputs: [
      { type: "address", name: "account" },
      { type: "uint256", name: "amount" }
    ]}

    // Parses the calldata into EVM-executable data
    const data = encodeFunctionCall(abi_mint_fragment, [account, amount])

    const extra = ""

    let c3_promise: NearPromise

    const target_chain_count = BigInt(to_chain_ids.length)
    this._burn({ account: near.signerAccountId(), amount: (BigInt(amount) * target_chain_count).toString() })

    if (to_chain_ids.length === 1) {
      c3_promise = this.c3call({ to: to[0], to_chain_id: to_chain_ids[0], data, extra })
    } else {
      c3_promise = this.c3broadcast({ to, to_chain_ids, data })
    }

    return c3_promise.asReturn()
  }

  @call({ privateFunction: true })
  c3call_callback() {
    const { success, result } = super.c3_result()

    if (success) {
      // overall call passed
      if (result.success) {
        // overall call passed, c3call passed
        near.log(JSON.stringify(result))
      } else {
        // overall call passed, c3call failed
        near.log(JSON.stringify(result))
      }
    } else {
      // overall call failed, c3call subsequently failed
      near.log(`Unknown error occurred.`)
    }
  }

  @call({ privateFunction: true })
  c3broadcast_callback() {
    const { success, result } = super.c3_result()

    if (success) {
      if (result.success) {
        near.log(JSON.stringify(result))
      } else {
        near.log(JSON.stringify(result))
      }
    } else {
      near.log(`Unknown error occured.`)
    }
  }

  @view({})
  is_vaild_sender(): boolean {
    return true // validate sender
  }
}

