import bitcoin from 'bitcoinjs-lib'
import axios from 'axios'

export type UTXO = {
  txid: string
  vout: number
  value: number
  scriptPubKey?: string
  rawTx?: string
}

export type Output = {
  address: string
  value: number
}

export class BtcTransactionBuilder {
  private utxos: UTXO[] = []
  private outputs: Output[] = []
  private feeRate: number = 10
  private network: bitcoin.Network
  private changeAddress?: string

  constructor(network = bitcoin.networks.bitcoin) {
    this.network = network
  }

  addInput(utxo: UTXO) { this.utxos.push(utxo); return this }
  addOutput(address: string, value: number) { this.outputs.push({ address, value }); return this }
  setFeeRate(satsPerByte: number) { this.feeRate = satsPerByte; return this }
  setChangeAddress(address: string) { this.changeAddress = address; return this }

  estimateFee(): number {
    const txSize = this.utxos.length * 180 + (this.outputs.length + 1) * 34 + 10
    return txSize * this.feeRate
  }

  build(): bitcoin.Psbt {
    if (!this.changeAddress) throw new Error('Change address required')
    const psbt = new bitcoin.Psbt({ network: this.network })

    const totalInput = this.utxos.reduce((sum, u) => sum + u.value, 0)
    const totalOutput = this.outputs.reduce((sum, o) => sum + o.value, 0)
    const fee = this.estimateFee()
    const change = totalInput - totalOutput - fee
    if (change < 0) throw new Error('Insufficient funds')

    this.utxos.forEach(u => {
      psbt.addInput({
        hash: u.txid,
        index: u.vout,
        nonWitnessUtxo: u.rawTx ? Buffer.from(u.rawTx, 'hex') : undefined,
        witnessUtxo: u.rawTx ? undefined : { script: Buffer.from(u.scriptPubKey!, 'hex'), value: u.value },
      })
    })

    this.outputs.forEach(o => psbt.addOutput({ address: o.address, value: o.value }))
    if (change > 0) psbt.addOutput({ address: this.changeAddress!, value: change })

    return psbt
  }

  signAll(privateKeys: string[]): bitcoin.Psbt {
    const psbt = this.build()
    privateKeys.forEach(wif => {
      const key = bitcoin.ECPair.fromWIF(wif, this.network)
      psbt.signAllInputs(key)
    })
    psbt.validateSignaturesOfAllInputs()
    psbt.finalizeAllInputs()
    return psbt
  }

  async broadcast(psbt: bitcoin.Psbt, rpcUrl: string): Promise<string> {
    const txHex = psbt.extractTransaction().toHex()
    const resp = await axios.post(rpcUrl, {
      jsonrpc: '1.0',
      id: 'btc_tx',
      method: 'sendrawtransaction',
      params: [txHex],
    })
    return resp.data.result
  }
}
