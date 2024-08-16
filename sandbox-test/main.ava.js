import anyTest from 'ava'
import { NEAR, Worker } from 'near-workspaces'
import { setDefaultResultOrder } from 'dns'
setDefaultResultOrder('ipv4first') // temp fix for node >v17

/**
 *  @typedef {import('near-workspaces').NearAccount} NearAccount
 *  @type {import('ava').TestFn<{worker: Worker, accounts: Record<string, NearAccount>}>}
 */
const test = anyTest

test.beforeEach(async t => {
  // Create sandbox
  const worker = t.context.worker = await Worker.init()

  // Deploy contract
  const root = worker.rootAccount
  const c3caller = await root.createSubAccount("c3caller", { initialBalance: NEAR.parse("10 N").toString() })

  // Get wasm file path from package.json test script in folder above
  await c3caller.deploy(
    process.argv[2],
  )

  await c3caller.call(c3caller, "init", {})

  // Save state for test runs, it is unique for each test
  t.context.worker = worker
  t.context.accounts = { root, c3caller }
})

test.afterEach.always(async (t) => {
  await t.context.worker.tearDown().catch((error) => {
    console.log('Failed to stop the Sandbox:', error)
  })
})

// test('changes the greeting', async (t) => {
//   const { root, contract } = t.context.accounts
//   await root.call(contract, 'set_greeting', { greeting: 'Howdy' })
//   const greeting = await contract.view('get_greeting', {})
//   t.is(greeting, 'Howdy')
// })


// 1). Test c3_gov_client

test("check that the gov address was initialized", async (t) => {
  const { c3caller } = t.context.accounts
  const init_gov = await c3caller.view("get_gov", {})
  t.is(init_gov, c3caller.accountId)
})

test("run c3call successfully", async (t) => {})