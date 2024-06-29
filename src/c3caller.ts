// Find all our documentation at https://docs.near.org
import { NearBindgen, near, call, view, AccountId, initialize } from 'near-sdk-js';

class C3Context {
    swap_id: string;
    from_chain_id: string;
    source_tx: string;
}

@NearBindgen({})
class C3Caller {
    context: C3Context = { swap_id: "", from_chain_id: "", source_tx: "" }
    uuid_keeper: AccountId = ""

    @initialize({ privateFunction: true })
    init({ swap_id_keeper }: { swap_id_keeper: AccountId }) {
        // TODO: set the governor contract address here to sender
        this.uuid_keeper = swap_id_keeper
    }
}


// EVENTS

/*
LogC3Call
    uint256 indexed dappID,
    bytes32 indexed uuid,
    address caller,
    string toChainID,
    string to,
    bytes data,
    bytes extra
*/

/*
LogFallbackCall
    uint256 indexed dappID,
    bytes32 indexed uuid,
    string to,
    bytes data,
    bytes reasons
*/

/*
LogExecCall
    uint256 indexed dappID,
    address indexed to,
    bytes32 indexed uuid,
    string fromChainID,
    string sourceTx,
    bytes data,
    bool success,
    bytes reason
*/

/*
LogExecFallback
    uint256 indexed dappID,
    address indexed to,
    bytes32 indexed uuid,
    string fromChainID,
    string sourceTx,
    bytes data,
    bytes reason
*/
