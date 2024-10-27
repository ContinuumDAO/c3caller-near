import { AccountId, LookupMap, assert, view, call, near } from "near-sdk-js"
import { hexToBytes, bytesToHex } from "web3-utils"
import { encodeParameters } from "web3-eth-abi"
import { C3GovClient } from "./c3_gov_client"

export class C3UUIDKeeper extends C3GovClient {
  admin: AccountId = ""

  completed_swapin: LookupMap<boolean> = new LookupMap<boolean>("completed_swapin")
  uuid_2_nonce: LookupMap<number> = new LookupMap<number>("uuid_2_nonce")

  current_nonce: number = 0

  @view({})
  only_operator() {
    super.only_operator()
  }

  @call({})
  auto_increase_swapout_nonce() {
    this.current_nonce = this.current_nonce + 1
  }

  check_completion(uuid: string) {
    assert(!this.completed_swapin.get(uuid), "C3SwapIDKeeper: uuid is completed")
  }

  @view({})
  calc_uuid(
    { sender, dapp_id, to, to_chain_id, nonce, data }:
    {
      sender: AccountId,
      dapp_id: string,
      to: string,
      to_chain_id: string,
      nonce: string,
      data: string
    }
  ): string {
    const parameter_types = [ "string", "string", "string", "uint256", "address", "string", "uint256", "bytes" ]
    const parameter_values = [
      near.currentAccountId(),  // string
      sender,                   // string
      "NEAR",                   // string
      dapp_id,                  // uint256
      to,                       // address
      to_chain_id,              // string
      nonce,                    // uint256
      data                      // bytes
    ]

    const uuid_encoded_hex = encodeParameters(parameter_types, parameter_values)
    const uuid_encoded_bytes = hexToBytes(uuid_encoded_hex)
    const uuid_hashed_bytes = near.keccak256(uuid_encoded_bytes)
    return bytesToHex(uuid_hashed_bytes)
  }

  @view({})
  is_uuid_exist({ uuid }: { uuid: string }): boolean {
    return this.uuid_2_nonce.get(uuid) !== null
  }

  @view({})
  is_completed({ uuid }: { uuid: string }): boolean {
    return this.completed_swapin.get(uuid)
  }

  @call({})
  revoke_swapin({ uuid }: { uuid: string }) {
    assert(near.signerAccountId() == this.gov, "C3SwapIDKeeper: only governance")
    this.completed_swapin.set(uuid, false)
  }

  register_uuid({ uuid }: { uuid: string }) {
    this.only_operator()
    this.check_completion(uuid)
    this.completed_swapin.set(uuid, true)
  }

  gen_uuid(
    { dapp_id, to, to_chain_id, data }:
    { dapp_id: string, to: string, to_chain_id: string, data: string }
  ): string {
    /// @todo remove - this is called by c3caller only
    // this.only_operator()
    this.auto_increase_swapout_nonce()
    const uuid = this.calc_uuid({
      sender: near.signerAccountId(),
      dapp_id,
      to,
      to_chain_id,
      nonce: String(this.current_nonce),
      data
    })
    assert(!this.is_uuid_exist({ uuid }), "uuid already exist")
    this.uuid_2_nonce.set(uuid, this.current_nonce)
    return uuid
  }

  @view({}) // only used for outgoing calls
  calc_caller_uuid(
    { from, dapp_id, to, to_chain_id, data }:
    { from: AccountId, dapp_id: string, to: string, to_chain_id: string, data: string }
  ): string {
    const nonce_incremented = String(this.current_nonce + 1)
    return this.calc_uuid({
      sender: from,
      dapp_id,
      to,
      to_chain_id,
      nonce: nonce_incremented,
      data
    })
  }
}