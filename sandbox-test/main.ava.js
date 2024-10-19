import anyTest from "ava"
import { NEAR, Worker } from "near-workspaces"
import { setDefaultResultOrder } from "dns"; setDefaultResultOrder("ipv4first") // temp fix for node >v17

/**
 *  @typedef {import("near-workspaces").NearAccount} NearAccount
 *  @type {import("ava").TestFn<{worker: Worker, accounts: Record<string, NearAccount>}>}
 */
const test = anyTest

const ZERO = BigInt("0")
const TGAS_30 = BigInt("30000000000000") // 30_000_000_000_000 (thirty teragas)
const TGAS_MAX = BigInt("300000000000000") // 300_000_000_000_000 (max gas - 300 teragas)

test.beforeEach(async (t) => {
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
  await dapp.call(dapp, "init", { c3caller: c3caller.accountId, dapp_id: "1" })

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


test("gov address initializes", async (t) => {
  const { c3caller } = t.context.accounts
  const gov = await c3caller.view("get_gov", {})
  t.is(gov, c3caller.accountId)
})

test("registers new sig as executable", async (t) => {
  const { root, c3caller } = t.context.accounts
  const signature = "transfer(address,uint256)"
  const { selector, executable } = await root.call(c3caller, "register_c3executable", { signature  }, { gas: TGAS_MAX })
  const executable_json = JSON.stringify(executable)
  const executable_expected_json = JSON.stringify({
    function_name: "transfer",
    parameter_types: [
      "address",
      "uint256"
    ]
  })

  t.is(selector, "0xa9059cbb") // transfer(address,uint256)
  t.is(executable_json, executable_expected_json)
})

test("doesn't register existing sig as executable", async (t) => {
  const { root, c3caller } = t.context.accounts
  const signature = "transfer(address,uint256)"
  const { selector } = await root.call(c3caller, "register_c3executable", { signature }, { gas: TGAS_MAX }) // it is now registered
  await root.call(c3caller, "register_c3executable", { signature }, { gas: TGAS_MAX }) // the above call should take less gas.

  t.is(selector, "0xa9059cbb")
})

test("test c3call", async (t) => {
  const { c3caller, dapp } = t.context.accounts
  const transfer_data = {
    recipient: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    amount: "1000000000000000000"
  }

  await c3caller.call(dapp, "transfer_out_evm", transfer_data, { gas: TGAS_MAX })
  t.pass()
})