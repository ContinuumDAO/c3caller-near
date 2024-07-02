# c3caller-near

## Events Model

### Option A: NEAR NFT Events

All events get emitted as a NEAR NFT event, as per standard NEP-171.

This means any relayer can pick up the emitted events and interpret them as an NFT metadata update.

Pros: Any NEAR event indexer can pick the events up without needing to know a special interface that is exclusive to C3Caller, because they already listen for NEP-171 event emissions.

Cons: The data must be serialized into a single string (see `memo` field below) and abi-encoded in such a way that allows indexers to read which C3Caller event it is.

```javascript
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
```

### Option B: Native C3Caller Events

Events get emitted under a new events standard, `c3caller`.

In order to be transmitted cross-chain, events would have to be picked up by specialized indexers.

Pros: Each event gets its own data structure and is easier to read by humans and also easier to decode for the indexer.

Cons: Instead of using existing indexers, specialized indexers would have to query for the new event standard `c3caller`, meaning existing indexers could not read the events unless they know how they are defined.

```javascript
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
```