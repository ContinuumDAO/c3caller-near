import { near, PromiseIndex } from "near-sdk-js"

export const c3call_promise_result = (): { result: string, success: boolean } => {
  let result, success

  try {
    result = near.promiseResult(0 as PromiseIndex)
    success = true
  } catch {
    result = undefined
    success = false
  }

  return { result, success }
}

export const c3broadcast_promise_result = (index: number): { result: string, success: boolean } => {
  let result, success

  try {
    result = near.promiseResult(index)
    success = true
  } catch {
    result = undefined
    success = false
  }

  return { result, success }
}