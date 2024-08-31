import anyTest from "ava"
import { NEAR, Worker } from "near-workspaces"
import { encode } from "@metamask/abi-utils"
import { bytesToHex } from "@metamask/utils"
import { setDefaultResultOrder } from "dns"; setDefaultResultOrder("ipv4first") // temp fix for node >v17

/**
 *  @typedef {import("near-workspaces").NearAccount} NearAccount
 *  @type {import("ava").TestFn<{worker: Worker, accounts: Record<string, NearAccount>}>}
 */
const test = anyTest

test.beforeEach(async t => {
  // Create sandbox
  const worker = t.context.worker = await Worker.init()

  // Deploy contracts
  const root = worker.rootAccount
  const c3caller = await root.createSubAccount("c3caller", { initialBalance: NEAR.parse("100000 N").toString() })
  const dapp = await root.createSubAccount("dapp", { initialBalance: NEAR.parse("100000 N").toString() })

  // Get wasm file path from package.json test script in folder above
  await c3caller.deploy(process.argv[2])
  await dapp.deploy(process.argv[3])

  await c3caller.call(c3caller, "init", {})
  await dapp.call(dapp, "init", { c3caller: c3caller.accountId, dapp_id: BigInt(1).toString() })

  // Save state for test runs, it is unique for each test
  t.context.accounts = {
    root,
    c3caller,
    dapp
  }
})

test.afterEach.always(async (t) => {
  await t.context.worker.tearDown().catch((error) => {
    console.log("Failed to stop the Sandbox:", error)
  })
})


// 1). Test c3_gov_client

// test("check that the gov address was initialized", async (t) => {
//   const { c3caller } = t.context.accounts
//   const gov = await c3caller.view("get_gov", {})
//   t.is(gov, c3caller.accountId)
// })

// 2). Testing registry of a function signature in the c3caller contract

// test("register a function sig as an executable", async (t) => {
//   const { root, c3caller } = t.context.accounts
//   const signature = "transfer(address,uint256)"
//   const selector = await c3caller.view("selector", { signature })

//   await root.call(c3caller, "register_c3executable", { signature, selector })

//   const executable_json = JSON.stringify(await c3caller.view("get_selector_data", { selector }))
//   const executable_expected_json = JSON.stringify({ function_name: "transfer", parameter_types: [ "address", "uint256" ] })
//   t.is(executable_json, executable_expected_json)
// })

// 3). Testing a C3Call event, having registered a function signature

// test("run c3call", async (t) => {
//   const { root, c3caller, dapp } = t.context.accounts

//   const signature = "transfer(address,uint256)"
//   const selector = await c3caller.view("selector", { signature })

//   await root.call(c3caller, "register_c3executable", { signature, selector })

//   // calldata of call to be executed on target chain & address
//   const recipient = "0xabcdefabcdabcdefabcdabcdefabcdabcdefabcd"
//   // const amount = Web3.utils.fromWei("1", "ether")
//   const amountWei = "1000000000000000000" // 1e18

//   // 1_000_000_000_000_000_000_000_000_000_000_000 1 sextillion TGas
//   const gas = "1000000000000000000000000000000000"
//   const res = await root.call(dapp, "transfer_out_evm", { recipient, amountWei }, gas)
//   console.log(res)

//   t.is("a", "a")
// })

test("MM utils", async (t) => {
  const parameter_types = ["address"]
  const parameter_values = ["0x0123456701234567012345670123456701234567"]
  const encoded = encode(parameter_types, parameter_values)
  console.log(encoded)
  const hashed = near.keccak256(encoded)
  console.log(hashed)
  const hashed_hex = bytesToHex(hashed)
  console.log(hashed_hex)
})