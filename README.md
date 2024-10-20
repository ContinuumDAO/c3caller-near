# c3caller-near

## Communication with the Continuum Network - Events Model

Events get emitted under a new events standard, `c3caller`.

In order to be transmitted cross-chain, events would have to be picked up by specialized indexers.

Pros: Each event gets its own data structure and is easier to read by humans and also easier to decode for the indexer.

Cons: Instead of using existing indexers, specialized indexers would have to query for the new event standard `c3caller`, meaning existing indexers could not read the events unless they know how they are defined.

### C3Call called from NEAR to another chain

```json
{
  EVENT_JSON: {
    "standard": "c3caller",
    "version": "1.0.0",
    "event": "c3_call",
    "data": [
      {
    	  "dappID": "1",
    	  "uuid": "0x3427e9b7e3cd8c8c0a78e6d4a88b139e6e62e154298f64e4b37faff9585a289d",
    	  "caller": "dapp.test.near",
    	  "toChainID": "1",
    	  "to": "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    	  "data": "0xa9059cbb00000000000000000000000011111111111111111111111111111111111111110000000000000000000000000000000000000000000000000de0b6b3a7640000",
    	  "extra": ""
      }
    ]
  }
}
```

### C3Broadcast called from NEAR other chains

```json
{
  EVENT_JSON: {
		"standard": "c3caller",
		"version": "1.0.0",
		"event": "c3_call",
		"data": [
			{
				"dappID": "1",
			    "uuid": "0x3427e9b7e3cd8c8c0a78e6d4a88b139e6e62e154298f64e4b37faff9585a289d",
				"caller": "dapp.test.near",
				"toChainID": "1",
				"to": "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
			    "data": "0xa9059cbb00000000000000000000000011111111111111111111111111111111111111110000000000000000000000000000000000000000000000000de0b6b3a7640000",
				"extra": ""
			},
			{
				"dappID": "1",
			    "uuid": "0x21b1379a4cb28f8dad85ee42fa3798a2d6b059c4f639981e1617be02d84b6b2e",
				"caller": "dapp.test.near",
				"toChainID": "56",
				"to": "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
			    "data": "0xa9059cbb00000000000000000000000011111111111111111111111111111111111111110000000000000000000000000000000000000000000000000de0b6b3a7640000",
				"extra": ""
			},
			{
				"dappID": "1",
			    "uuid": "0x037d02cf9d601b7c623ac88e4a9213e3cb01cd219e90d07a669227ef1394e6e9",
				"caller": "dapp.test.near",
				"toChainID": "250",
				"to": "0xdddddddddddddddddddddddddddddddddddddddd",
			    "data": "0xa9059cbb00000000000000000000000011111111111111111111111111111111111111110000000000000000000000000000000000000000000000000de0b6b3a7640000",
				"extra": ""
			}
		]
	}
}
```

```javascript
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