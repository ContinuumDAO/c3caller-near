import anyTest from "ava"
import { NEAR, Worker } from "near-workspaces"
import { setDefaultResultOrder } from "dns"; setDefaultResultOrder("ipv4first") // temp fix for node >v17

/**
 *  @typedef {import("near-workspaces").NearAccount} NearAccount
 *  @type {import("ava").TestFn<{worker: Worker, accounts: Record<string, NearAccount>}>}
 */
const test = anyTest

// const TGAS_DEFAULT = BigInt("30000000000000") // 30_000_000_000_000 (thirty teragas)
const TGAS_MAX = BigInt("300000000000000") // 300_000_000_000_000 (max gas - 300 teragas)

const NEAR_CHAIN_IDS = {
  mainnet: "1443836397965971376462",
  testnet: "1443836397966089081684"
}

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

  await c3caller.call(c3caller, "add_operator", { op: dapp.accountId }, { gas: TGAS_MAX })

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

test("initializes balance", async (t) => {
  const { dapp } = t.context.accounts
  const balance = await dapp.view("get_balance", {account: dapp.accountId})
  t.is(balance, "10000000000000000000")
})

test("registers new sig as executable", async (t) => {
  const { root, c3caller } = t.context.accounts
  const signature = "mint(string,uint256)"
  const { selector, executable } = await root.call(c3caller, "register_c3executable", { signature  }, { gas: TGAS_MAX })
  const executable_json = JSON.stringify(executable)
  const executable_expected_json = JSON.stringify({
    function_name: "mint",
    parameter_types: [
      "string",
      "uint256"
    ]
  })

  t.is(selector, "0x056b01ce") // mint(string,uint256)
  t.is(executable_json, executable_expected_json)
})

test("doesn't register existing sig as executable", async (t) => {
  const { root, c3caller } = t.context.accounts
  const signature = "mint(string,uint256)"
  const { selector } = await root.call(c3caller, "register_c3executable", { signature }, { gas: TGAS_MAX }) // it is now registered
  await root.call(c3caller, "register_c3executable", { signature }, { gas: TGAS_MAX }) // the above call should take less gas.

  t.is(selector, "0x056b01ce")
})

test("test c3call", async (t) => {
  const { dapp } = t.context.accounts
  const transfer_out_data = {
    account: "0x1111111111111111111111111111111111111111",
    amount: "1000000000000000000",
    to: ["0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"],
    to_chain_ids: ["1"]
  }

  await dapp.call(dapp, "transfer_out_evm", transfer_out_data, { gas: TGAS_MAX })
  t.pass()
})

test("test_c3broadcast", async (t) => {
  const { dapp } = t.context.accounts
  const transfer_out_data = {
    account: "0x1111111111111111111111111111111111111111",
    amount: "1000000000000000000",
    to: [
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      "0xcccccccccccccccccccccccccccccccccccccccc"
    ],
    to_chain_ids: ["1", "56", "250"]
  }

  await dapp.call(dapp, "transfer_out_evm", transfer_out_data, { gas: TGAS_MAX })
  t.pass()
})

test("test execute", async (t) => {
  const { dapp, c3caller } = t.context.accounts

  const incoming_c3_message = {
    // created on src chain
    uuid: "0x5a624c211e76b5659bc047a931e4930990b48dd45af1bad8b0e1ee1ecf31d4d7",

    // C3CallerDApp on NEAR
    to: "dapp.test.near",

    // from Ethereum
    from_chain_id: "1",

    // Transaction on Ethereum
    source_tx: "0xabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcd",

    // Fallback address on Ethereum
    fallback_to: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",

    // Data to execute on NEAR
    data: 
      "0x056b01ce" +
      "0000000000000000000000000000000000000000000000000000000000000040" +
      "0000000000000000000000000000000000000000000000000de0b6b3a7640000" +
      "000000000000000000000000000000000000000000000000000000000000000e" +
      "646170702e746573742e6e656172000000000000000000000000000000000000"
  }

  const execution_data = {
    // DApp ID of C3CallerDApp on Ethereum & NEAR
    dapp_id: "1",

    // Calling address on Ethereum (C3CallerDApp)
    caller: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",

    // C3Call data from source chain
    message: incoming_c3_message
  }

  const signature = "mint(string,uint256)"

  const { selector, executable } = await c3caller.call(c3caller, "register_c3executable", { signature }, { gas: TGAS_MAX })
  // selector: 0x056b01ce
  // executable: { function_name: "mint", parameter_types: [ "string", "uint256" ] }

  const balance_before = BigInt(await dapp.view("get_balance", {account: dapp.accountId}))

  await c3caller.call(c3caller, "execute", execution_data, { gas: TGAS_MAX })

  const balance_after = BigInt(await dapp.view("get_balance", {account: dapp.accountId}))

  t.is(balance_after, balance_before + 1000000000000000000n)
})