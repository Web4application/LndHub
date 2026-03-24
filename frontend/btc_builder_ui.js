document.getElementById('buildSignBtn').onclick = async () => {
  const utxos = JSON.parse(document.getElementById('utxos').value)
  const outputs = JSON.parse(document.getElementById('outputs').value)
  const changeAddress = document.getElementById('changeAddress').value
  const feeRate = parseInt(document.getElementById('feeRate').value)
  const privateKeys = JSON.parse(document.getElementById('privateKeys').value)

  // Build PSBT
  const psbtResp = await fetch('http://localhost:3000/api/buildTx', {
    method: 'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ utxos, outputs, changeAddress, feeRate })
  }).then(r=>r.json())

  // Sign PSBT
  const signedResp = await fetch('http://localhost:3000/api/signTx', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ psbtBase64: psbtResp.psbt, privateKeys })
  }).then(r=>r.json())

  document.getElementById('txResult').textContent = signedResp.txHex
}
