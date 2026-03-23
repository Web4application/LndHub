import bitcoin from 'bitcoinjs-lib'
import classify from 'bitcoinjs-lib/src/classify'
import axios from 'axios'

const BLOCKSTREAM_API = 'https://blockstream.info/api'

// ------------------------
// Address & Script Utils
// ------------------------
export const isValidBtcAddress = (addr, network) => {
  try {
    bitcoin.address.toOutputScript(addr, network)
    return true
  } catch {
    return false
  }
}

export const addressToScript = (addr) => {
  return bitcoin.address.toOutputScript(addr)
}

// ------------------------
// Xpub / Fingerprint
// ------------------------
export const compressPublicKey = (pubKey) => bitcoin.ECPair.fromPublicKey(pubKey).publicKey

export const fingerprint = (pubKey) => {
  const hash160 = bitcoin.crypto.hash160(pubKey)
  return hash160.readUInt32BE(0)
}

export const getParentPath = (path) => path.split('/').slice(0, -1).join('/')

export const createXpubFromChildAndParent = (path, child, parent) => {
  const bip32 = bitcoin.bip32.fromPublicKey(Buffer.from(parent.publicKey, 'hex'), Buffer.from(parent.chainCode, 'hex'))
  return bip32.toBase58()
}

// ------------------------
// Private Key Parsing
// ------------------------
export const detectPrivateKeyFormat = (priv) => {
  if (/^[A-Za-z0-9+/=]{44}$/.test(priv)) return 'base64'
  if (/^[A-Fa-f0-9]{64}$/.test(priv)) return 'hex'
  if (/^[5KL][1-9A-HJ-NP-Za-km-z]{50,51}$/.test(priv)) return 'wif'
  throw new Error('Unknown private key format')
}

export const privateKeyStringToKey = (priv, format) => {
  switch (format) {
    case 'wif':
      return bitcoin.ECPair.fromWIF(priv)
    case 'hex':
      return bitcoin.ECPair.fromPrivateKey(Buffer.from(priv, 'hex'))
    case 'base64':
      return bitcoin.ECPair.fromPrivateKey(Buffer.from(priv, 'base64'))
  }
}

export const keyPairToAddress = (keyPair) => {
  const { address } = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey })
  return address
}

// ------------------------
// Transaction Decoding
// ------------------------
const decodeFormat = (tx) => ({
  txid: tx.getId(),
  version: tx.version,
  locktime: tx.locktime,
})

const decodeInput = (tx) =>
  tx.ins.map((input) => ({
    txid: Buffer.from(input.hash).reverse().toString('hex'),
    n: input.index,
    script: bitcoin.script.toASM(input.script),
    sequence: input.sequence,
  }))

const decodeOutput = (tx, network) =>
  tx.outs.map((out, n) => {
    const type = classify.output(out.script)
    const addresses = []
    if (['pubkeyhash', 'scripthash'].includes(type)) {
      addresses.push(bitcoin.address.fromOutputScript(out.script, network))
    } else if (['witnesspubkeyhash', 'witnessscripthash'].includes(type)) {
      const data = bitcoin.script.decompile(out.script)[1]
      addresses.push(bitcoin.address.toBech32(data, 0, network.bech32))
    }
    return {
      satoshi: out.value,
      value: (out.value / 1e8).toFixed(8),
      n,
      scriptPubKey: {
        asm: bitcoin.script.toASM(out.script),
        hex: out.script.toString('hex'),
        type,
        addresses,
      },
    }
  })

export const decodeRawHex = (rawTx, network = bitcoin.networks.bitcoin) => {
  const tx = bitcoin.Transaction.fromHex(rawTx)
  return {
    ...decodeFormat(tx),
    inputs: decodeInput(tx),
    outputs: decodeOutput(tx, network),
  }
}

// ------------------------
// Live Blockchain
// ------------------------
export const getAddressInfo = async (address) => {
  const { data } = await axios.get(`${BLOCKSTREAM_API}/address/${address}`)
  return {
    address,
    balance: (data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum) / 1e8,
    totalReceived: data.chain_stats.funded_txo_sum / 1e8,
    totalSent: data.chain_stats.spent_txo_sum / 1e8,
    txCount: data.chain_stats.tx_count,
  }
}

export const getAddressTxs = async (address) => {
  const { data } = await axios.get(`${BLOCKSTREAM_API}/address/${address}/txs`)
  return data
}

// ------------------------
// Trace Funds with Memoization
// ------------------------
export const traceFunds = async (address, depth = 3, visited = new Set()) => {
  if (depth === 0 || visited.has(address)) return []
  visited.add(address)

  try {
    const txs = await getAddressTxs(address)
    const results = []

    for (const tx of txs) {
      for (let i = 0; i < tx.vout.length; i++) {
        const out = tx.vout[i]
        if (!out || !out.scriptpubkey_address) continue
        if (out.scriptpubkey_address === address) continue

        results.push({
          txid: tx.txid,
          amount: out.value / 1e8,
          toAddress: out.scriptpubkey_address,
          vout: i,
        })

        const childResults = await traceFunds(out.scriptpubkey_address, depth - 1, visited)
        results.push(...childResults)
      }
    }
    return results
  } catch (err) {
    console.warn(`Trace failed for ${address}: ${err.message}`)
    return []
  }
}
// setup bitcoind rpc
const config = require('./config');
let jayson = require('jayson/promise');
let url = require('url');
if (config.bitcoind) {
  let rpc = url.parse(config.bitcoind.rpc);
  rpc.timeout = 15000;
  module.exports = jayson.client.http(rpc);
} else {
  module.exports = {};
}
