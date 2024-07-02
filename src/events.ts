import { AccountId } from "near-sdk-js"

// OPTION A - NFT Events

interface NftMintLog {
    owner_id: string,
    token_ids: string[],
    memo?: string
}

interface NftBurnLog {
    owner_id: string,
    authorized_id?: string,
    token_ids: string[],
    memo?: string
}

interface NftTransferLog {
    authorized_id?: string,
    old_owner_id: string,
    new_owner_id: string,
    token_ids: string[],
    memo?: string
}

interface NftContractMetadataUpdateLog {
    memo?: string
}

interface NftEventLogData {
    standard: "nep171",
    version: "1.1.0",
    event: "nft_mint" | "nft_burn" | "nft_transfer" | "contract_metadata_update",
    data: NftMintLog[] | NftTransferLog[] | NftBurnLog[] | NftContractMetadataUpdateLog[],
}

const nftEventLogData = {
    EVENT_JSON: {
        "standard": "nep171",
        "version": "1.1.0",
        "event": "contract_metadata_update",
        "data": [
            {
                "memo": "" // <- here is the serialized, abi encoded data of whatever the event is
            }
        ]
    }
}


// OPTION B - C3Caller Native Events

interface LogC3Call {           // event LogC3Call {
    dappID: BigInt,             //     uint256 indexed dappID,
    uuid: string,               //     bytes32 indexed uuid,
    caller: AccountId,          //     address caller,
    toChainID: string,          //     string toChainID,
    to: string,                 //     string to,
    data: string,               //     bytes data,
    extra: string               //     bytes extra
}                               // }

interface LogFallbackCall {     // event LogFallbackCall {
    dappID: BigInt,             //     uint256 indexed dappID,
    uuid: string,               //     bytes32 indexed uuid,
    to: string,                 //     string to,
    data: string,               //     bytes data,
    reasons: string             //     bytes reasons
}                               // }

interface LogExecCall {         // event LogExecCall {
    dappID: BigInt,             //     uint256 indexed dappID,
    to: string,                 //     address indexed to,
    uuid: string,               //     bytes32 indexed uuid,
    fromChainID: string,        //     string fromChainID,
    sourceTx: string,           //     string sourceTx,
    data: string,               //     bytes data,
    success: boolean,           //     bool success,
    reason: string              //     bytes reason
}                               // }

interface LogExecFallback {     // event LogExecFallback {
    dappID: BigInt,             //     uint256 indexed dappID,
    to: string,                 //     address indexed to,
    uuid: string,               //     bytes32 indexed uuid,
    fromChainID: string,        //     string fromChainID,
    sourceTx: string,           //     string sourceTx,
    data: string,               //     bytes data,
    reason: string              //     bytes reason
}                               // }

interface C3CallerEventLogData {
    standard: "c3caller",
    version: "1.0.0",
    event: "c3_call" | "fallback_call" | "exec_call" | "exec_fallback",
    data: LogC3Call[] | LogFallbackCall[] | LogExecCall[] | LogExecFallback[]
}

// C3Call called from NEAR to another chain
const c3CallEventLogData = {
    EVENT_JSON: {
        "standard": "c3caller",
        "version": "1.0.0",
        "event": "c3_call",
        "data": [
            {
                "dappID": 0,
                "uuid": "0xabcd",
                "caller": "user.near",
                "toChainID": "1",
                "to": "0xabcd",
                "data": "0xabcd",
                "extra": "0xabcd"
            }
        ]
    }
}

// C3Call received on NEAR, failed execution, falling back
const fallbackCallEventLogData = {
    EVENT_JSON: {
        "standard": "c3caller",
        "version": "1.0.0",
        "event": "fallback_call",
        "data": [
            {
                "dappID": 0,
                "uuid": "0xabcd",
                "to": "contract_fallback.near",
                "data": "0xabcd",
                "reasons": "0xabcd"
            }
        ]
    }
}

// C3Call received on NEAR for execution
const execCallEventLogData = {
    EVENT_JSON: {
        "standard": "c3caller",
        "version": "1.0.0",
        "event": "exec_call",
        "data": [
            {
                "dappID": 0,
                "to": "contract.near",
                "uuid": "0xabcd",
                "fromChainID": "1",
                "sourceTx": "0xabcd",
                "data": "0xabcd",
                "success": "true",
                "reason": "0xabcd"
            }
        ]
    }
}

// C3Call received on NEAR, failed execution, fallback complete
const execFallbackEventLogData = {
    EVENT_JSON: {
        "standard": "c3caller",
        "version": "1.0.0",
        "event": "exec_fallback",
        "data": [
            {
                "dappID": 0,
                "to": "contract.near",
                "uuid": "0xabcd",
                "fromChainID": "1",
                "sourceTx": "0xabcd",
                "data": "0xabcd",
                "reason": "0xabcd"
            }
        ]
    }
}