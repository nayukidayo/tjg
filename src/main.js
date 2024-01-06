import process from 'node:process'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'
import Fork from './fork.js'
import storage from './storage.js'
import { RETAIN } from './env.js'

mkdirSync(new URL('../data', import.meta.url), { recursive: true })
const url = new URL('../data/data.db', import.meta.url)
const db = new Database(fileURLToPath(url))

db.pragma('journal_mode = WAL')

db.prepare(
  `CREATE TABLE IF NOT EXISTS history (
    ts INTEGER NOT NULL,
    device TEXT NOT NULL,
    data TEXT NOT NULL
  )`
).run()

db.prepare('CREATE INDEX IF NOT EXISTS idx_ts ON history (ts ASC)').run()
db.prepare('CREATE INDEX IF NOT EXISTS idx_device ON history (device)').run()

const insertStmt = db.prepare('INSERT INTO history (ts,device,data) VALUES (?,?,?)')
const deleteStmt = db.prepare('DELETE FROM history WHERE ts<?')
const deleteInterval = 1 * 60 * 60 * 1000
const retainInterval = RETAIN * 24 * 60 * 60 * 1000

const gps = new Fork(new URL('./gps.js', import.meta.url))
gps.onmsg = storage.merge

const rfid = new Fork(new URL('./rfid.js', import.meta.url))
rfid.onmsg = storage.merge

const api = new Fork(new URL('./api.js', import.meta.url))
storage.write = data => {
  api.send(data)
  insertStmt.run(data.ts, data.device, JSON.stringify(data))
}

setInterval(() => deleteStmt.run(Date.now() - retainInterval), deleteInterval)

process.on('exit', () => {
  console.log()
  db.close()
})
process.on('SIGHUP', () => process.exit(128 + 1))
process.on('SIGINT', () => process.exit(128 + 2))
process.on('SIGTERM', () => process.exit(128 + 15))

/**
 * main.js
 *
 * db open
 * db create table
 * db create index
 *
 * fork gps
 * fork rfid
 * fork api
 *
 * process.on gps
 * process.on rfid
 *
 * data merge
 *
 * cache data
 * db write data
 *
 *
 * api.js
 * db open readonly
 * create router
 * db query
 *
 */
