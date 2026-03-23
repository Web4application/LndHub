import { networks } from 'bitcoinjs-lib'
import * as utils from './btc'

const fromHex = (hex) => Buffer.from(hex, 'hex')

describe('BTC Utils - Full Production Test Suite', () => {
  const validAddresses = [
    '1CsYGw3DbpiscVE1LdoCNYp22wukFuRZmN',
    '3QX3B2UqEiQ8kZPwAoySuzFCLawH8GbRe7',
    'bc1qud8x3munrjf70t6l9dd5dt5dygnpq2vz3u8ksv',
    'bc1qwqdg6squsna38e46795at95yu9atm8azzmyvckulcckxswvvzej',
    'bc1p5cyxnuxmeuwuvkwfem96l7f4nl4x5ktptf8v3f'
  ]

  const invalidAddresses = [
    '1CsYGw3DbpiscVE1LdoCNYp22wukFuRZmM',
    '3QX3B2UqEiQ8kZPwAoySuzFCLawH8GbRe8',
    'bc1qud8x3munrjf70t6l9dd5dt5dygnpq2vz3u8ksw',
    'bc1qwqdg6squsna38e46795at95yu9atm8azzmyvckulcckxswvvzek'
  ]

  const scriptMapping = {
    '1Jx89A4TcLVUNwdfrGXv7w7WasJ3HDqQ28': fromHex('76a914c4e6fa17222f7ce3b2461fb4a73b26ac5255b04e88ac'),
    '3QX3B2UqEiQ8kZPwAoySuzFCLawH8GbRe7': fromHex('a914fa67c6cfa1803d0621d2eca35099b2ea38e9719f87'),
    'bc1qud8x3munrjf70t6l9dd5dt5dygnpq2vz3u8ksv': fromHex('0014e34e68ef931c93e7af5f2b5b46ae8d2226102982'),
    'bc1qwqdg6squsna38e46795at95yu9atm8azzmyvckulcckxswvvzej': fromHex('0020701a8d401c84fb13e6baf169d59684e17abd9fa216c8cc5b9fc63d622ff8c58d'),
    'bc1p5cyxnuxmeuwuvkwfem96l7f4nl4x5ktptf8v3f': fromHex('5120da4710964f7852695de2da025290e24af6d8c281de5a0b902b7135fd9fd74d21')
  }

  // =========================
  // Address & Script Tests
  // =========================
  describe('Address Validation & Scripts', () => {
    it('valid addresses pass', () => validAddresses.forEach(a => expect(utils.isValidBtcAddress(a, networks.bitcoin)).toBe(true)))
    it('invalid addresses fail', () => invalidAddresses.forEach(a => expect(utils.isValidBtcAddress(a, networks.bitcoin)).toBe(false)))
    it('scripts match', () => { for (const addr in scriptMapping) expect(utils.addressToScript(addr)).toEqual(scriptMapping[addr]) })
  })

  // =========================
  // Xpub, Fingerprint
  // =========================
  describe('Xpub & Fingerprint', () => {
    it('compresses key & computes fingerprint', () => {
      const pk = utils.compressPublicKey(Buffer.from('0407b481a081a3e297aaafc432141247aeb441ba948b3df1db07760e677ff5387a84eb0d7b00d858746d18d436d07d2e4759dfb848d3ff689b9142f0dfe5153352','hex'))
      expect(utils.fingerprint(pk)).toBe(3818823506)
    })
  })

  // =========================
  // Live Blockchain & Trace
  // =========================
  describe('Live Blockchain & Trace', () => {
    const liveAddress = 'bc1qwqdg6squsna38e46795at95yu9atm8azzmyvckulcckxswvvzej'

    it('fetches live info', async () => {
      const info = await utils.getAddressInfo(liveAddress)
      expect(info).toHaveProperty('balance')
      expect(info).toHaveProperty('totalReceived')
    })

    it('fetches recent txs', async () => {
      const txs = await utils.getAddressTxs(liveAddress)
      expect(Array.isArray(txs)).toBe(true)
    })

    it('traces funds (depth=2) with memoization', async () => {
      const results = await utils.traceFunds(liveAddress, 2)
      expect(Array.isArray(results)).toBe(true)
      results.forEach(r => expect(r).toHaveProperty('toAddress'))
    })
  })
})
