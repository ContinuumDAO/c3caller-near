import { AccountId, LookupMap, Vector } from "near-sdk-js"

export class C3GovClient {
  gov: AccountId = ""
  pending_gov: AccountId = ""

  is_operator: LookupMap<boolean> = new LookupMap<boolean>("is_operator")

  operators: Vector<AccountId> = new Vector("operators")
}