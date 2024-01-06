import process from 'node:process'
import http from 'node:http'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'
import Router from 'find-my-way'
import { API_PORT } from './env.js'

const cache = new Map()

const url = new URL('../data/data.db', import.meta.url)
const db = new Database(fileURLToPath(url), { readonly: true })

db.pragma('journal_mode = WAL')

const stmt = db.prepare(
  'SELECT data FROM history WHERE device=? AND ts BETWEEN ? AND ? ORDER BY ts ASC'
)

const router = Router()

router.on('GET', '/api/device', deviceList)
router.on('GET', '/api/device/:id', deviceView)
router.on('GET', '/api/device/:id/history', historyView)

function deviceList(_, res) {
  const result = []
  for (const item of cache.values()) {
    result.push(item)
  }
  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json; charset=UTF-8')
  res.end(JSON.stringify(result))
}

function deviceView(_, res, param) {
  const result = cache.get(param.id)
  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json; charset=UTF-8')
  res.end(JSON.stringify(result))
}

function historyView(_, res, param, store, query) {
  const start = Number(query.start) || 0
  const end = Number(query.end) || Date.now()

  if (start > end || end - start > 60 * 60 * 1000) {
    res.statusCode = 400
    res.end()
    return
  }

  const data = stmt.all(param.id, start, end)
  const items = data.map(v => v.data).join(',')
  const result = '[' + items + ']'

  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json; charset=UTF-8')
  res.end(result)
}

const server = http.createServer((req, res) => {
  router.lookup(req, res, err => {
    if (!err) return
    console.error(err)
    res.statusCode = 500
    res.end()
  })
})

server.on('error', err => {
  console.error(err)
  process.exit(0)
})

server.listen(API_PORT, () => {
  console.log('[API]', server.address())
})

process.on('message', msg => cache.set(msg.device, msg))
process.on('exit', () => db.close())
