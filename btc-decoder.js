const bitcoin = require('bitcoinjs-lib');
const classify = require('bitcoinjs-lib/src/classify');
const bitcoin = require('bitcoinjs-lib');
const axios = require('axios');

const MEMPOOL_API = 'https://mempool.space/api';

// 🔍 Get address info
async function getAddressInfo(address) {
  const { data } = await axios.get(`${MEMPOOL_API}/address/${address}`);
  return {
    address,
    balance: (data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum) / 1e8,
    totalReceived: data.chain_stats.funded_txo_sum / 1e8,
    totalSent: data.chain_stats.spent_txo_sum / 1e8,
    txCount: data.chain_stats.tx_count,
  };
}

// 🔍 Get transactions for address
async function getAddressTxs(address) {
  const { data } = await axios.get(`${MEMPOOL_API}/address/${address}/txs`);
  return data;
}

// 🔍 Decode raw tx (your upgraded decoder)
function decodeRawHex(rawTx) {
  const tx = bitcoin.Transaction.fromHex(rawTx);

  return {
    txid: tx.getId(),
    size: tx.byteLength(),
    inputs: tx.ins.map((i) => ({
      txid: Buffer.from(i.hash).reverse().toString('hex'),
      vout: i.index,
    })),
    outputs: tx.outs.map((o) => ({
      value: o.value / 1e8,
      script: bitcoin.script.toASM(o.script),
    })),
  };
}

module.exports = {
  getAddressInfo,
  getAddressTxs,
  decodeRawHex,
};
const decodeFormat = (tx) => ({
  txid: tx.getId(),
  version: tx.version,
  locktime: tx.locktime,
});

const decodeInput = function (tx) {
  const result = [];
  tx.ins.forEach(function (input, n) {
    result.push({
      txid: input.hash.reverse().toString('hex'),
      n: input.index,
      script: bitcoin.script.toASM(input.script),
      sequence: input.sequence,
    });
  });
  return result;
};

const decodeOutput = function (tx, network) {
  const format = function (out, n, network) {
    const vout = {
      satoshi: out.value,
      value: (1e-8 * out.value).toFixed(8),
      n: n,
      scriptPubKey: {
        asm: bitcoin.script.toASM(out.script),
        hex: out.script.toString('hex'),
        type: classify.output(out.script),
        addresses: [],
      },
    };
    switch (vout.scriptPubKey.type) {
      case 'pubkeyhash':
      case 'scripthash':
        vout.scriptPubKey.addresses.push(bitcoin.address.fromOutputScript(out.script, network));
        break;
      case 'witnesspubkeyhash':
      case 'witnessscripthash':
        const data = bitcoin.script.decompile(out.script)[1];
        vout.scriptPubKey.addresses.push(bitcoin.address.toBech32(data, 0, network.bech32));
        break;
    }
    return vout;
  };

  const result = [];
  tx.outs.forEach(function (out, n) {
    result.push(format(out, n, network));
  });
  return result;
};

class TxDecoder {
  constructor(rawTx, network = bitcoin.networks.bitcoin) {
    this.tx = bitcoin.Transaction.fromHex(rawTx);
    this.format = decodeFormat(this.tx);
    this.inputs = decodeInput(this.tx);
    this.outputs = decodeOutput(this.tx, network);
  }

  decode() {
    const result = {};
    const self = this;
    Object.keys(self.format).forEach(function (key) {
      result[key] = self.format[key];
    });
    result.outputs = self.outputs;
    result.inputs = self.inputs;
    return result;
  }
}

module.exports.decodeRawHex = (rawTx, network = bitcoin.networks.bitcoin) => {
  return new TxDecoder(rawTx, network).decode();
};
