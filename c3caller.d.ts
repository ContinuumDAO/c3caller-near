import { AccountId } from "near-sdk-js"
import { TextEncoder as _TextEncoder } from "node:util";

// OPTION A - NFT Events

// interface NftMintLog {
//     owner_id: string,
//     token_ids: string[],
//     memo?: string
// }

// interface NftBurnLog {
//     owner_id: string,
//     authorized_id?: string,
//     token_ids: string[],
//     memo?: string
// }

// interface NftTransferLog {
//     authorized_id?: string,
//     old_owner_id: string,
//     new_owner_id: string,
//     token_ids: string[],
//     memo?: string
// }

// interface NftContractMetadataUpdateLog {
//     memo?: string
// }

// interface NftEventLogData {
//     standard: "nep171",
//     version: "1.1.0",
//     event: "nft_mint" | "nft_burn" | "nft_transfer" | "contract_metadata_update",
//     data: NftMintLog[] | NftTransferLog[] | NftBurnLog[] | NftContractMetadataUpdateLog[],
// }

// const nftEventLogData = {
//     EVENT_JSON: {
//         "standard": "nep171",
//         "version": "1.1.0",
//         "event": "contract_metadata_update",
//         "data": [
//             {
//                 "memo": "" // <- here is the serialized, abi encoded data of whatever the event is
//             }
//         ]
//     }
// }


// OPTION B - C3Caller Native Events

interface LogC3Call {         // event LogC3Call {
  dappID: string,             //     uint256 indexed dappID,
  uuid: string,               //     bytes32 indexed uuid,
  caller: AccountId,          //     address caller,
  toChainID: string,          //     string toChainID,
  to: string,                 //     string to,
  data: string,               //     bytes data,
  extra: string               //     bytes extra
}                             // }

interface LogFallbackCall {   // event LogFallbackCall {
  dappID: string,             //     uint256 indexed dappID,
  uuid: string,               //     bytes32 indexed uuid,
  to: string,                 //     string to,
  data: string,               //     bytes data,
  reasons: string             //     bytes reasons
}                             // }

interface LogExecCall {       // event LogExecCall {
  dappID: string,             //     uint256 indexed dappID,
  to: string,                 //     address indexed to,
  uuid: string,               //     bytes32 indexed uuid,
  fromChainID: string,        //     string fromChainID,
  sourceTx: string,           //     string sourceTx,
  data: string,               //     bytes data,
  success: boolean,           //     bool success,
  reason: string              //     bytes reason
}                             // }

interface LogExecFallback {   // event LogExecFallback {
  dappID: string,             //     uint256 indexed dappID,
  to: string,                 //     address indexed to,
  uuid: string,               //     bytes32 indexed uuid,
  fromChainID: string,        //     string fromChainID,
  sourceTx: string,           //     string sourceTx,
  data: string,               //     bytes data,
  reason: string              //     bytes reason
}                             // }


interface Gov {
  oldGov: AccountId,
  newGov: AccountId,
  timestamp: string 
}

interface C3CallerEventLogData {
  standard: "c3caller",
  version: "1.0.0",
  event: "c3_call" | "fallback_call" | "exec_call" | "exec_fallback" | "change_gov" | "apply_gov",
  data: LogC3Call[] | LogFallbackCall[] | LogExecCall[] | LogExecFallback[] | Gov[]
}

// // C3Call called from NEAR to another chain
// const c3CallEventLogData = {
//     EVENT_JSON: {
//         "standard": "c3caller",
//         "version": "1.0.0",
//         "event": "c3_call",
//         "data": [
//             {
//                 "dappID": 0,
//                 "uuid": "0xabcd",
//                 "caller": "user.near",
//                 "toChainID": "1",
//                 "to": "0xabcd",
//                 "data": "0xabcd",
//                 "extra": "0xabcd"
//             }
//         ]
//     }
// }

// // C3Call received on NEAR, failed execution, falling back
// const fallbackCallEventLogData = {
//     EVENT_JSON: {
//         "standard": "c3caller",
//         "version": "1.0.0",
//         "event": "fallback_call",
//         "data": [
//             {
//                 "dappID": 0,
//                 "uuid": "0xabcd",
//                 "to": "contract_fallback.near",
//                 "data": "0xabcd",
//                 "reasons": "0xabcd"
//             }
//         ]
//     }
// }

// // C3Call received on NEAR for execution
// const execCallEventLogData = {
//     EVENT_JSON: {
//         "standard": "c3caller",
//         "version": "1.0.0",
//         "event": "exec_call",
//         "data": [
//             {
//                 "dappID": 0,
//                 "to": "contract.near",
//                 "uuid": "0xabcd",
//                 "fromChainID": "1",
//                 "sourceTx": "0xabcd",
//                 "data": "0xabcd",
//                 "success": "true",
//                 "reason": "0xabcd"
//             }
//         ]
//     }
// }

// // C3Call received on NEAR, failed execution, fallback complete
// const execFallbackEventLogData = {
//     EVENT_JSON: {
//         "standard": "c3caller",
//         "version": "1.0.0",
//         "event": "exec_fallback",
//         "data": [
//             {
//                 "dappID": 0,
//                 "to": "contract.near",
//                 "uuid": "0xabcd",
//                 "fromChainID": "1",
//                 "sourceTx": "0xabcd",
//                 "data": "0xabcd",
//                 "reason": "0xabcd"
//             }
//         ]
//     }
// }



interface C3Context {
  swap_id: string;
  from_chain_id: string;
  source_tx: string;
}

interface C3NEARMessage {
  uuid: string,
  to: AccountId,
  from_chain_id: string,
  source_tx: string,
  fallback_to: string,
  data: string
}

interface ExecutedMessage {
  message: C3NEARMessage,
  dapp_id: string
}

interface C3Executable {
  function_name: string,
  parameter_types: string[]
}

interface C3Result {
  success: boolean,
  message: string,
  uuid?: string | string[]
}


declare global {
  var TextEncoder: typeof _TextEncoder
}


export {
  LogC3Call,
  LogFallbackCall,
  LogExecCall,
  LogExecFallback,
  C3CallerEventLogData,
  C3Context,
  C3NEARMessage,
  ExecutedMessage,
  C3Executable,
  C3Result
}
