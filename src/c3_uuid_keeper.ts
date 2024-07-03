import { NearBindgen, AccountId, LookupMap, initialize, assert, view, call, near } from "near-sdk-js"
import { encodeParameters } from "web3-eth-abi"
import { hexToBytes, bytesToHex } from "web3-utils"
import { C3GovClient } from "./c3_gov_client.js"

const ZERO: bigint = BigInt(0)
const ONE: bigint = BigInt(1)

@NearBindgen({})
class C3UUIDKeeper extends C3GovClient {
  admin: AccountId = ""

  completed_swapin: LookupMap<boolean> = new LookupMap<boolean>("completed_swapin")
  uuid_2_nonce: LookupMap<bigint> = new LookupMap<bigint>("uuid_2_nonce")

  current_nonce: bigint = ZERO

  @initialize({ privateFunction: true })
  init() {
    // TODO: set the governor contract address here to sender
    this.gov = near.predecessorAccountId()
  }

  only_operator = () => {
    assert(near.predecessorAccountId() == this.gov, "C3SwapIDKeeper: only governance")
  }

  auto_increase_swapout_nonce = () => {
    this.current_nonce = this.current_nonce + ONE
  }

  check_completion = (uuid: string) => {
    assert(!this.completed_swapin.get(uuid), "C3SwapIDKeeper: uuid is completed")
  }

  calc_uuid = (
    sender: string,
    dapp_id: bigint,
    to: string,
    to_chain_id: string,
    nonce: bigint,
    data: string
  ): string => {
    const uuid_encoded_hex = encodeParameters(
      [ "string", "string", "string", "uint256", "address", "string", "uint256", "bytes" ],
      [ near.currentAccountId(), sender, "NEAR", dapp_id, to, to_chain_id, nonce, data ]
    )
    const uuid_encoded_bytes = hexToBytes(uuid_encoded_hex)
    const uuid_hashed_bytes = near.keccak256(uuid_encoded_bytes)
    return bytesToHex(uuid_hashed_bytes)
  }

  @view({})
  is_uuid_exist({ uuid }: { uuid: string }) {
    return this.uuid_2_nonce.get(uuid) !== ZERO
  }

  @view({})
  is_completed({ uuid }: { uuid: string }) {
    return this.completed_swapin.get(uuid)
  }

  @call({})
  revoke_swapin({ uuid }: { uuid: string }) {
    assert(near.signerAccountId() == this.gov, "C3SwapIDKeeper: only governance")
    this.completed_swapin.set(uuid, false)
  }

  @call({})
  register_uuid({ uuid }: { uuid: string }) {
    // TODO: make this function only operator
    this.check_completion(uuid)
    this.completed_swapin.set(uuid, true)
  }

  @call({}) // only used for outgoing c3calls
  gen_uuid(
    { dapp_id, to, to_chain_id, data }:
    { dapp_id: bigint, to: string, to_chain_id: string, data: string }
  ) {
    // TODO: make this function only operator
    this.auto_increase_swapout_nonce()
    const uuid = this.calc_uuid(
      near.signerAccountId(),
      dapp_id,
      to,
      to_chain_id,
      this.current_nonce,
      data
    )
    assert(!this.is_uuid_exist({ uuid }), "uuid already exist")
    this.uuid_2_nonce.set(uuid, this.current_nonce)
    return uuid
  }

  @view({}) // only used for outgoing calls
  calc_caller_uuid(
    { from, dapp_id, to, to_chain_id, data }:
    { from: AccountId, dapp_id: bigint, to: string, to_chain_id: string, data: string }
  ): string {
    const nonce = this.current_nonce + ONE
    return this.calc_uuid(
      from,
      dapp_id,
      to,
      to_chain_id,
      nonce,
      data
    )
  }
}