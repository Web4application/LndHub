const graphDiv = d3.select('#graph')
const tooltip = d3.select('#tooltip')
const expanded = new Set()

const getEdgeColor = (amount) => {
  if (amount < 0.01) return '#d4e6f1'
  if (amount < 0.1) return '#7fb3d5'
  if (amount < 1) return '#2874a6'
  return '#1b4f72'
}

async function fetchAddressInfo(address) {
  const resp = await fetch(`http://localhost:3000/api/address/${address}`)
  return resp.json()
}

async function fetchTrace(address, depth) {
  const resp = await fetch(`http://localhost:3000/api/trace/${address}?depth=${depth}`)
  return resp.json()
}

async function expandNode(address, depth) {
  if (expanded.has(address)) return
  expanded.add(address)

  try {
    const info = await fetchAddressInfo(address)
    const txs = await fetchTrace(address, depth)
    
    let dot = `digraph BTCTrace { node [shape=ellipse];\n`
    dot += `"${address}" [label="${address}\\nBalance: ${info.balance} BTC\\nReceived: ${info.totalReceived} BTC\\nSent: ${info.totalSent} BTC"];\n`
    
    txs.forEach(t => {
      const color = getEdgeColor(t.amount)
      dot += `"${t.fromAddress}" -> "${t.toAddress}" [label="${t.amount} BTC", color="${color}"];\n`
    })
    dot += '}'

    graphDiv.html('')
    graphDiv.graphviz().renderDot(dot).on('end', attachNodeEvents)
  } catch(err) {
    graphDiv.text(`Error: ${err.message}`)
    console.error(err)
  }
}

function attachNodeEvents() {
  d3.selectAll('g.node')
    .on('click', async function() {
      const address = d3.select(this).select('title').text()
      const depth = parseInt(document.getElementById('depth').value)
      await expandNode(address, depth)
    })
    .on('mouseover', function(event) {
      const address = d3.select(this).select('title').text()
      tooltip.style('display', 'block').html(address)
    })
    .on('mousemove', function(event) {
      tooltip.style('left', (event.pageX+10)+'px').style('top', (event.pageY+10)+'px')
    })
    .on('mouseout', () => tooltip.style('display', 'none'))
}

document.getElementById('traceBtn').addEventListener('click', async () => {
  const address = document.getElementById('btcAddress').value.trim()
  const depth = parseInt(document.getElementById('depth').value)
  if(!address) return alert('Enter BTC address')
  expanded.clear()
  await expandNode(address, depth)
})
