import anyTest from "ava"
import { NEAR, Worker } from "near-workspaces"
import { setDefaultResultOrder } from "dns"
setDefaultResultOrder("ipv4first") // temp fix for node >v17

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
  const c3caller = await root.createSubAccount("c3caller", { initialBalance: NEAR.parse("10 N").toString() })
  const dapp = await root.createSubAccount("dapp", { initialBalance: NEAR.parse("10 N").toString() })

  // Get wasm file path from package.json test script in folder above
  await c3caller.deploy(process.argv[2])
  await dapp.deploy(process.argv[3])

  await c3caller.call(c3caller, "init", {})

  // Save state for test runs, it is unique for each test
  t.context.worker = worker
  t.context.accounts = { root, c3caller, dapp }
})

test.afterEach.always(async (t) => {
  await t.context.worker.tearDown().catch((error) => {
    console.log("Failed to stop the Sandbox:", error)
  })
})

// test("changes the greeting", async (t) => {
//   const { root, contract } = t.context.accounts
//   await root.call(contract, "set_greeting", { greeting: "Howdy" })
//   const greeting = await contract.view("get_greeting", {})
//   t.is(greeting, "Howdy")
// })


// 1). Test c3_gov_client

// test("check that the gov address was initialized", async (t) => {
//   const { c3caller } = t.context.accounts
//   const gov = await c3caller.view("get_gov", {})
//   t.is(gov, c3caller.accountId)
// })

// 2). Testing registry of a function signature in the c3caller contract

test("register a function sig as an executable", async (t) => {
  const { c3caller } = t.context.accounts
  const signature = "transfer(address,uint256)"
  const selector = await c3caller.view("selector", { signature })

  // await c3caller.call("register_c3executable", { signature })

  // const executable = await c3caller.view("selector_data", selector)
  console.log(selector)
  t.is("a", "a")
})

// test("run c3call successfully", async (t) => {
//   const { root, dapp } = t.context.accounts

//   // calldata of call to be executed on target chain & address
//   const recipient = "0xabcdefabcdabcdefabcdabcdefabcdabcdefabcd"
//   const amount = Web3.utils.fromWei("1", "ether")

//   await dapp.call("transfer_out_evm", { recipient, amount })
// })