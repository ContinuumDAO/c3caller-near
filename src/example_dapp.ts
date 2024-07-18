import { AccountId, initialize, NearBindgen } from "near-sdk-js"
import { C3CallerDapp } from "./c3caller_dapp"


@NearBindgen({})
class ExampleDapp extends C3CallerDapp {

  @initialize({ privateFunction: true })
  init({ c3_caller, dapp_id }: { c3_caller: AccountId, dapp_id: bigint }) {
    this.c3caller = c3_caller
    this.dapp_id = dapp_id
  }
}