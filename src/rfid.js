import { Transform, Writable } from 'node:stream'
import { createServer } from 'node:net'
import { pipeline } from 'node:stream'
import { Buffer } from 'node:buffer'
import { RFID_PORT, RFID_DELAY } from './env.js'

class Parser extends Transform {
  constructor(opt) {
    super(opt)

    this.delimiter = Buffer.from('4354', 'hex')
    this.overhead = 4
    this.lengthOffset = 2
    this.lengthBytes = 2

    this.buf = Buffer.alloc(0)
    this.maxBufLen = 1024
  }

  /**
   * @param {Buffer} chunk
   * @param {string} _
   * @param {Function} cb
   */
  _transform(chunk, _, cb) {
    let data = Buffer.concat([this.buf, chunk])
    let pos = data.indexOf(this.delimiter)

    while (pos !== -1) {
      if (data.length < pos + this.lengthOffset + this.lengthBytes) break

      const len = data.readUIntBE(pos + this.lengthOffset, this.lengthBytes)
      const total = pos + len + this.overhead
      if (data.length < total) break

      this.push(data.subarray(pos, total))
      data = data.subarray(total)
      pos = data.indexOf(this.delimiter)
    }

    if (data.length > this.maxBufLen) {
      this.buf = Buffer.alloc(0)
    } else {
      this.buf = data
    }

    cb()
  }

  _flush(cb) {
    this.push(this.buf)
    this.buf = Buffer.alloc(0)
    cb()
  }
}

class Filter extends Transform {
  constructor(opt) {
    super(opt)

    this.code = 0x45
    this.codeOffset = 5
  }

  /**
   * @param {Buffer} chunk
   * @param {string} _
   * @param {Function} cb
   */
  _transform(chunk, _, cb) {
    if (chunk[this.codeOffset] === this.code && this.#check(chunk)) {
      this.push(chunk)
    }
    cb()
  }

  /**
   * @param {Buffer} buf
   */
  #check(buf) {
    let sum = 0
    const len = buf.length - 1
    for (let i = 0; i < len; i++) {
      sum += buf[i]
    }
    sum = 256 - (sum % 256)
    return sum === buf[len]
  }
}

class Deserializer extends Writable {
  constructor(opt) {
    super(opt)

    this.deviceOffset = 4
    this.tagNumOffset = 14

    this.callback = () => {}
    this.timer = setTimeout(() => this.callback(), RFID_DELAY)
    this.timer.unref()

    /** @type {{type: "rfid", device: string, tags: {tag: string, rssi: number}[], ts: number}} */
    this.data = { type: 'rfid', device: '', tags: [], ts: 0 }
  }

  /**
   * @param {Buffer} chunk
   * @param {string} _
   * @param {Function} cb
   */
  _write(chunk, _, cb) {
    this.timer.refresh()
    this.callback = () => {
      this.data.device = chunk[this.deviceOffset].toString(16).padStart(2, '0')
      this.data.ts = Date.now()
      process.send(this.data)
      this.data = { type: 'rfid', device: '', tags: [], ts: 0 }
    }

    const tags = this.#bytesToTags(chunk)
    this.data.tags.push(...tags)

    cb()
  }

  /**
   * @param {Buffer} chunk
   */
  #bytesToTags(chunk) {
    const tags = []
    let start = this.tagNumOffset + 1

    for (let i = 0; i < chunk[this.tagNumOffset]; i++) {
      const end = start + chunk[start]
      const tag = chunk.subarray(start + 3, end)
      tags.push({ tag: tag.toString('hex'), rssi: chunk[end] })
      start = end + 1
    }

    return tags
  }
}

const server = createServer(c => {
  const p = new Parser()
  const f = new Filter()
  const d = new Deserializer()
  pipeline(c, p, f, d, err => {
    if (!err) return
    if (err.code === 'ECONNRESET') return
    console.error(err)
  })
})

server.on('error', err => {
  console.error(err)
  process.exit(0)
})

server.listen(RFID_PORT, () => {
  console.log('[RFID]', server.address())
})

// 数据协议
// 4354001c084501c18323121455ae010f010100112233445566778899aabbbe3d
// 4354002c084501c18323121455ae020f010100112233445566778899aabb040f0101e280116060000217299f4b39fa43
//
// 4354 001c 08 45 01 c18323121455ae 01 0f 01 01 00112233445566778899aabb be 3d
//
// 4354 头
// 001c 长度
// 08 地址
// 45 响应码
// 01
// c18323121455ae 设备序列号
// 01 标签总数
// len type ant tag                      rssi
// 0f  01   01  00112233445566778899aabb be
// 3d 校验码
