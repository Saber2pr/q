const { promisify } = require('util')
const { readFile, writeFile } = require('fs')
const { parse, join } = require('path')

const ReadFile = promisify(readFile)
const WriteFile = promisify(writeFile)

const calcWeight = q => q.ratio + q.score + q.hard

async function main() {
  const file = process.argv[2]
  const weeks = Number(process.argv[3] || 12)
  const str = (await ReadFile(file)).toString()
  const blocks = str.split('###').filter(s => s).map(s => s.split('\n'))

  const tokens = blocks.map(block => {
    const nameStr = block[0]
    const nameMeta = nameStr.split(' ')
    const ratio = Number(nameMeta.pop().replace('%', ''))
    const name = nameMeta[1]
    const items = block.slice(1)
    let score = 0
    return items.reduce((acc, item) => {
      if (!item) return acc
      if (/^\[.*\]$/.test(item)) {
        score = Number(item.replace(/\[|\]/g, ''))
        return acc
      }
      const hardTest = item.match(/\*/g)
      item = item.replace(/\`.*\`/, '')
      let hardIdx = hardTest ? hardTest.length : 0
      if (item.endsWith('y')) return acc
      return acc.concat({
        category: name,
        name: item.slice(3).trim(),
        ratio: ratio / 100,
        score,
        hard: hardIdx
      })
    }, [])
  }).flat().sort((a, b) => calcWeight(b) - calcWeight(a))

  const hardqs = []
  const easyqs = []
  tokens.forEach(q => {
    if (q.hard >= 3) {
      hardqs.push(q)
    } else {
      easyqs.push(q)
    }
  })

  const weekQMaxCount = Math.ceil((tokens.length / weeks) / 2)
  const ast = new Array(weeks).fill(0).reduce((acc, _, i) => {
    const todo = []

    while (todo.length < weekQMaxCount && tokens.length) {
      const hard = tokens.shift()
      const easy = tokens.pop()
      hard && todo.push(hard)
      easy && todo.push(easy)
    }
    return ({
      ...acc,
      [`第${i + 1}周`]: todo
    })
  }, {})

  const outputCode = Object.keys(ast).map(key => {
    const list = ast[key]
    return [
      `### ${key}`,
      ...list.map((item, i) => `${i + 1}. [${Number(item.score).toFixed(2)}*${item.ratio * 100}%] ${item.name} \`${'*'.repeat(item.hard)}\``)
    ].join('\n')
  }).join('\n\n')

  const output = `${parse(file).name}.todo.md`
  const outputPath = join(process.cwd(), output)
  await WriteFile(outputPath, outputCode)
}

main()