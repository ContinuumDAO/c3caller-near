// import web3_validator_1 from "web3-validator"


// Web3 Utils

/**
 * @example hexToBytes('cafe0123') // Uint8Array.from([0xca, 0xfe, 0x01, 0x23])
 */
function hexToBytes(hex) {
    if (typeof hex !== 'string')
        throw new Error('hex string expected, got ' + typeof hex);
    const hl = hex.length;
    const al = hl / 2;
    if (hl % 2)
        throw new Error('padded hex string expected, got unpadded hex of length ' + hl);
    const array = new Uint8Array(al);
    for (let ai = 0, hi = 0; ai < al; ai++, hi += 2) {
        const n1 = asciiToBase16(hex.charCodeAt(hi));
        const n2 = asciiToBase16(hex.charCodeAt(hi + 1));
        if (n1 === undefined || n2 === undefined) {
            const char = hex[hi] + hex[hi + 1];
            throw new Error('hex string expected, got non-hex character "' + char + '" at index ' + hi);
        }
        array[ai] = n1 * 16 + n2;
    }
    return array;
}

function abytes(item) {
    if (!isBytes(item))
        throw new Error('Uint8Array expected');
}
// Array where index 0xf0 (240) is mapped to string 'f0'
const hexes = /* @__PURE__ */ Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'));
/**
 * @example bytesToHex(Uint8Array.from([0xca, 0xfe, 0x01, 0x23])) // 'cafe0123'
 */
function bytesToHex(bytes) {
    abytes(bytes);
    // pre-caching improves the speed 6x
    let hex = '';
    for (let i = 0; i < bytes.length; i++) {
        hex += hexes[bytes[i]];
    }
    return hex;
}

/**
 * Should be called to get hex representation (prefixed by 0x) of utf8 string
 * @param str - Utf8 string to be converted
 * @returns - The hex representation of the input string
 *
 * @example
 * ```ts
 * console.log(utf8ToHex('web3.js'));
 * > "0x776562332e6a73"
 * ```
 *
 */
export const utf8ToHex = (str) => {
    validator.validate(['string'], [str]);
    // To be compatible with 1.x trim null character
    // eslint-disable-next-line no-control-regex
    let strWithoutNullCharacter = str.replace(/^(?:\u0000)/, '');
    // eslint-disable-next-line no-control-regex
    strWithoutNullCharacter = strWithoutNullCharacter.replace(/(?:\u0000)$/, '');
    return bytesToHex(new TextEncoder().encode(strWithoutNullCharacter));
};

const stringToHex = utf8ToHex




// Web3 ETH ABI

/**
 * Encodes a parameter based on its type to its ABI representation.
 * @param abi - An array of {@link AbiInput}. See [Solidity's documentation](https://solidity.readthedocs.io/en/v0.5.3/abi-spec.html#json) for more details.
 * @param params - The actual parameters to encode.
 * @returns - The ABI encoded parameters
 * @example
 * ```ts
 * const res = web3.eth.abi.encodeParameters(
 *    ["uint256", "string"],
 *    ["2345675643", "Hello!%"]
 *  );
 *
 *  console.log(res);
 *  > 0x000000000000000000000000000000000000000000000000000000008bd02b7b0000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000748656c6c6f212500000000000000000000000000000000000000000000000000
 * ```
 */
function encodeParameters(abi, params) {
    if ((abi === null || abi === void 0 ? void 0 : abi.length) !== params.length) {
        throw new web3_errors_1.AbiError('Invalid number of values received for given ABI', {
            expected: abi === null || abi === void 0 ? void 0 : abi.length,
            received: params.length,
        });
    }
    const abiParams = (0, utils_js_1.toAbiParams)(abi);
    return web3_validator_1.utils.uint8ArrayToHexString((0, index_js_1.encodeTuple)({ type: 'tuple', name: '', components: abiParams }, params).encoded);
}

function decodeParameters(abis, bytes, _loose) {
    const abiParams = (0, utils_js_1.toAbiParams)(abis);
    const bytesArray = web3_validator_1.utils.hexToUint8Array(bytes);
    return (0, tuple_js_1.decodeTuple)({ type: 'tuple', name: '', components: abiParams }, bytesArray).result;
}

export { hexToBytes, bytesToHex, stringToHex, encodeParameters, decodeParameters }