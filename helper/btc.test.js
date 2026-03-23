import * as btcUtils from './btc'
import { networks } from 'bitcoinjs-lib'

describe('BTC Utils', () => {
  const validAddresses = [
    '1CsYGw3DbpiscVE1LdoCNYp22wukFuRZmN',
    '3QX3B2UqEiQ8kZPwAoySuzFCLawH8GbRe7',
    'bc1qwqdg6squsna38e46795at95yu9atm8azzmyvckulcckxswvvzej'
  ]

  const invalidAddresses = [
    '1CsYGw3DbpiscVE1LdoCNYp22wukFuRZmM',
    '3QX3B2UqEiQ8kZPwAoySuzFCLawH8GbRe8',
    'bc1qwqdg6squsna38e46795at95yu9atm8azzmyvckulcckxswvvzek'
  ]

  it('validates BTC addresses correctly', () => {
    validAddresses.forEach(addr => {
      expect(btcUtils.isValidBtcAddress(addr, networks.bitcoin)).toBe(true)
    })
    invalidAddresses.forEach(addr => {
      expect(btcUtils.isValidBtcAddress(addr, networks.bitcoin)).toBe(false)
    })
  })

  it('parses private keys to correct addresses', () => {
    const wif = 'L2kurXbbcK6GDxK5hEvj9LeyLh5z7DAGpJjdY5nw7S98JWBXRoah'
    const keyPair = btcUtils.privateKeyStringToKey(wif, btcUtils.detectPrivateKeyFormat(wif))
    const addr = btcUtils.keyPairToAddress(keyPair)
    expect(addr).toMatch(/^1/) // starts with 1
  })

  it('decodes raw TX hex', () => {
    const rawTx = '0100000001abcdef...00000000' // use a real short TX for testing
    expect(() => btcUtils.decodeRawHex(rawTx)).not.toThrow()
  })

  it('traces funds and generates a graph', async () => {
    const startAddress = 'bc1qwqdg6squsna38e46795at95yu9atm8azzmyvckulcckxswvvzej'
    const dot = await btcUtils.traceAndGraph(startAddress, 1, false)
    expect(dot).toContain('digraph BTCTrace')
    expect(dot).toContain(startAddress)
  })
})
