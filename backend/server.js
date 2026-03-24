import btcUtils from './btc.js'
import express from 'express'
import cors from 'cors'
import { BtcTransactionBuilder, UTXO } from './btcBuilder'

const app = express()
app.use(cors())
app.use(express.json())

// Build & return PSBT
app.post('/api/buildTx', async (req, res) => {
  try {
    const { utxos, outputs, changeAddress, feeRate } = req.body
    const builder = new BtcTransactionBuilder()
    utxos.forEach((u: UTXO) => builder.addInput(u))
    outputs.forEach((o: {address:string,value:number}) => builder.addOutput(o.address, o.value))
    builder.setChangeAddress(changeAddress)
    if(feeRate) builder.setFeeRate(feeRate)
    const psbt = builder.build()
    res.json({ psbt: psbt.toBase64() })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Sign PSBT
app.post('/api/signTx', async (req, res) => {
  try {
    const { psbtBase64, privateKeys } = req.body
    const psbt = bitcoin.Psbt.fromBase64(psbtBase64)
    const builder = new BtcTransactionBuilder()
    const signed = builder.signAll(privateKeys)
    res.json({ txHex: signed.extractTransaction().toHex() })
  } catch(err:any){
    res.status(500).json({ error: err.message })
  }
})
const app = express()
app.use(cors())
app.use(express.json())

// Get BTC address info (balance, received, sent)
app.get('/api/address/:address', async (req, res) => {
  try {
    const data = await btcUtils.getAddressInfo(req.params.address)
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Trace outgoing transactions for an address
app.get('/api/trace/:address', async (req, res) => {
  const depth = parseInt(req.query.depth || '2')
  try {
    const trace = await btcUtils.traceFunds(req.params.address, depth)
    res.json(trace)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`BTC Explorer API running on port ${PORT}`))
