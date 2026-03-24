import express from 'express'
import cors from 'cors'
import btcUtils from './btc.js'

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
