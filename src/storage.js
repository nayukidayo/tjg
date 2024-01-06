import { MERGE_DELAY } from './env.js'

/**
 * @typedef {{type: "gps", device: string, gps: string, ts: number}} GPSData
 * @typedef {{type: "rfid", device: string, tags: {tag: string, rssi: number}[], ts: number}} RFIDData
 * @typedef {{device: string, gps: string, tags: {tag: string, rssi: number}[], ts: number}} MergedData
 */

class Storage {
  /** @type {Map<string, {si: any, data: GPSData}>} */
  #gps = new Map()

  /** @type {Map<string, RFIDData>}>} */
  #rfid = new Map()

  /** @type {(data: MergedData) => void} */
  #write = () => {}

  /**
   * @param {GPSData} data
   */
  #handleGPS = data => {
    // 等待后面
    const si = setTimeout(() => {
      if (this.#rfid.has(data.device)) {
        const item = this.#rfid.get(data.device)
        this.#write({ device: data.device, gps: data.gps, tags: item.tags, ts: Date.now() })
        this.#rfid.delete(data.device)
      } else {
        this.#write({ device: data.device, gps: data.gps, tags: [], ts: Date.now() })
      }
      this.#gps.delete(data.device)
    }, MERGE_DELAY)

    // 搜索前面
    if (this.#rfid.has(data.device)) {
      const item = this.#rfid.get(data.device)
      if (data.ts - item.ts <= MERGE_DELAY) {
        this.#write({ device: data.device, gps: data.gps, tags: item.tags, ts: Date.now() })
        clearTimeout(si)
      } else {
        this.#gps.set(data.device, { si, data })
      }
      this.#rfid.delete(data.device)
    } else {
      this.#gps.set(data.device, { si, data })
    }
  }

  /**
   * @param {RFIDData} data
   */
  #handleRFID = data => {
    if (this.#gps.has(data.device)) {
      const item = this.#gps.get(data.device)
      this.#write({ device: data.device, gps: item.data.gps, tags: data.tags, ts: Date.now() })
      clearTimeout(item.si)
      this.#gps.delete(data.device)
    } else {
      this.#rfid.set(data.device, data)
    }
  }

  /**
   * @param {(data: MergedData) => void} fn
   */
  set write(fn) {
    this.#write = fn
  }

  /**
   *
   * @param {GPSData | RFIDData} msg
   */
  merge = msg => {
    try {
      switch (msg.type) {
        case 'gps':
          this.#handleGPS(msg)
          break
        case 'rfid':
          this.#handleRFID(msg)
          break
      }
    } catch (err) {
      console.error(err)
    }
  }
}

export default new Storage()

// 1  2  3  4  5  6  7  8  9  10  11  12  13  14  15  16
//    -              -                        -
//       =              =
