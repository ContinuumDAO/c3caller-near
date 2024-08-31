import { AccountId, LookupMap, LookupSet, near, assert, call, view } from "near-sdk-js"
import { C3CallerEventLogData } from "../c3caller"

export class C3GovClient {
  gov: AccountId = ""
  pending_gov: AccountId = ""

  is_operator: LookupMap<boolean> = new LookupMap<boolean>("is_operator")

  operators: LookupSet<AccountId> = new LookupSet("operators")

  only_gov = () => {
    assert(near.predecessorAccountId() == this.gov, "C3Gov: only Gov")
  }

  only_operator = () => {
    const caller: AccountId = near.predecessorAccountId()
    assert(caller == this.gov || this.operators.contains(caller), "C3Gov: only Operator")
  }

  @call({ privateFunction: true })
  init_gov({ gov }: { gov: AccountId }) {
    const current_gov = this.gov
    this.gov = gov

    const apply_gov_log: C3CallerEventLogData = {
      standard: "c3caller",
      version: "1.0.0",
      event: "apply_gov",
      data: [{ oldGov: current_gov, newGov: gov, timestamp: near.blockTimestamp().toString() }]
    }

    const apply_gov_json = JSON.stringify({ EVENT_JSON: apply_gov_log })
    near.log(apply_gov_json)
  }

  @call({})
  change_gov({ gov }: { gov: AccountId }) {
    this.only_gov()
    this.pending_gov = gov;

    const change_gov_log: C3CallerEventLogData = {
      standard: "c3caller",
      version: "1.0.0",
      event: "change_gov",
      data: [{ oldGov: this.gov, newGov: gov, timestamp: near.blockTimestamp().toString() }]
    }

    const change_gov_json = JSON.stringify(change_gov_log)

    near.log(change_gov_json)
  }

  @call({})
  apply_gov() {
    assert(this.pending_gov != "", "C3Gov: empty pendingGov")
    const old_gov: AccountId = this.gov
    const new_gov: AccountId = this.pending_gov
    this.gov = new_gov
    this.pending_gov = ""

    const apply_gov_log: C3CallerEventLogData = {
      standard: "c3caller",
      version: "1.0.0",
      event: "apply_gov",
      data: [{ oldGov: old_gov, newGov: new_gov, timestamp: near.blockTimestamp().toString() }]
    }

    const apply_gov_json = JSON.stringify(apply_gov_log)

    near.log(apply_gov_json)
  }

  @call({})
  add_operator({ op }: { op: AccountId }) {
    this.only_gov()
    assert(op.length > 0, "C3Caller: Operator is address(0)")
    assert(!this.is_operator.get(op), "C3Caller: Operator already exists")
    this.is_operator.set(op, true)
    this.operators.set(op)
  }

  @view({})
  get_all_operators(): LookupSet<AccountId> {
    return this.operators
  }

  @call({})
  revoke_operator({ op }: { op: AccountId }) {
    this.only_gov()
    assert(this.is_operator.get(op), "C3Caller: Operator not found")
    this.is_operator.set(op, false)
    this.operators.remove(op)
  }
}