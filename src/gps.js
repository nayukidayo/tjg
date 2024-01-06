import { Transform, Writable } from 'node:stream'
import { createServer } from 'node:net'
import { pipeline } from 'node:stream'
import { Buffer } from 'node:buffer'
import { GPS_PORT, GPS_DELAY } from './env.js'

class Parser extends Transform {
  constructor(opt) {
    super(opt)

    this.header = Buffer.from('$')
    this.footer = Buffer.from('0d0a', 'hex')

    this.buf = Buffer.alloc(0)
    this.maxBufLen = 256
  }

  /**
   * @param {Buffer} chunk
   * @param {string} _
   * @param {Function} cb
   */
  _transform(chunk, _, cb) {
    let data = Buffer.concat([this.buf, chunk])
    let header = data.indexOf(this.header)

    while (header !== -1) {
      const footer = data.indexOf(this.footer, header)
      if (footer === -1) break

      this.push(data.subarray(header, footer))
      data = data.subarray(footer + this.footer.length)
      header = data.indexOf(this.header)
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

    this.GPRMC = Buffer.from('$GPRMC')
    this.GPFID = Buffer.from('$GPFID')
    this.asterisk = Buffer.from('*')
  }

  /**
   * @param {Buffer} chunk
   * @param {string} _
   * @param {Function} cb
   */
  _transform(chunk, _, cb) {
    if (!chunk.indexOf(this.GPRMC) ? this.#check(chunk) : !chunk.indexOf(this.GPFID)) {
      this.push(chunk)
    }
    cb()
  }

  /**
   * @param {Buffer} buf
   */
  #check(buf) {
    const pos = buf.lastIndexOf(this.asterisk)
    const end = parseInt(buf.subarray(pos + 1).toString(), 16)
    let sum = 0
    for (let i = 1; i < pos; i++) {
      sum ^= buf[i]
    }
    return sum === end
  }
}

class Deserializer extends Writable {
  constructor(opt) {
    super(opt)

    this.timer
    this.delay = GPS_DELAY

    /** @type {{type: "gps", device: string, gps: string, ts: number}} */
    this.data = { type: 'gps', device: '', gps: '', ts: 0 }
  }

  /**
   * @param {Buffer} chunk
   * @param {string} _
   * @param {Function} cb
   */
  _write(chunk, _, cb) {
    clearTimeout(this.timer)

    this.timer = setTimeout(() => {
      this.data.ts = Date.now()
      process.send(this.data)
      this.data = { type: 'gps', device: '', gps: '', ts: 0 }
    }, this.delay)

    const str = chunk.toString()
    switch (str.substring(0, 6)) {
      case '$GPRMC':
        this.data.gps = str
        break
      case '$GPFID':
        this.data.device = str.split(',')[1]
        break
    }

    cb()
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

server.listen(GPS_PORT, () => {
  console.log('[GPS]', server.address())
})

// GPRMC 最小定位信息
// 数据详解：$GPRMC,<1>,<2>,<3>,<4>,<5>,<6>,<7>,<8>,<9>,<10>,<11>,<12>*hh
// <1> UTC 时间，hhmmss(时分秒)格式
// <2> 定位状态，A=有效定位，V=无效定位
// <3>纬度ddmm.mmmm(度分)格式(前面的0也将被传输)
// <4> 纬度半球N(北半球)或S(南半球)
// <5>经度dddmm.mmmm(度分)格式(前面的0也将被传输)
// <6> 经度半球E(东经)或W(西经)
// <7>地面速率(000.0~999.9节，前面的0也将被传输)
// <8>地面航向(000.0~359.9度，以真北为参考基准，前面的0也将被传输)
// <9> UTC 日期，ddmmyy(日月年)格式
// <10>磁偏角(000.0~180.0度，前面的0也将被传输)
// <11> 磁偏角方向，E(东)或W(西)
// <12>模式指示(仅NMEA01833.00版本输出，A=自主定位，D=差分，E=估算，N=数据无效)

// 解析内容：
// 1.时间，这个是格林威治时间，是世界时间（UTC），我们需要把它转换成北京时间（BTC），BTC和UTC差了8个小时，要在这个时间基础上加8个小时。
// 2. 定位状态，在接收到有效数据前，这个位是‘V’，后面的数据都为空，接到有效数据后，这个位是‘A’，后面才开始有数据。
// 3. 纬度，我们需要把它转换成度分秒的格式，计算方法：如接收到的纬度是：4546.40891
// 4546.40891/100=45.4640891可以直接读出45度, 4546.40891–45*100=46.40891, 可以直接读出46分
// 46.40891–46 =0.40891*60=24.5346读出24秒, 所以纬度是：45度46分24秒。
// 4. 南北纬，这个位有两种值‘N’（北纬）和‘S’（南纬）
// 5. 经度的计算方法和纬度的计算方法一样
// 6. 东西经，这个位有两种值‘E’（东经）和‘W’（西经）
// 7.速率，这个速率值是海里/时，单位是节，要把它转换成千米/时，根据：1海里=1.85公里，把得到的速率乘以1.85。
// 8. 航向，指的是偏离正北的角度
// 9. 日期，这个日期是准确的，不需要转换

// $GPRMC
// Recommended minimum specific GPS/Transit data

// eg1. $GPRMC,081836,A,3751.65,S,14507.36,E,000.0,360.0,130998,011.3,E*62
// eg2. $GPRMC,225446,A,4916.45,N,12311.12,W,000.5,054.7,191194,020.3,E*68

//            225446       Time of fix 22:54:46 UTC
//            A            Navigation receiver warning A = OK, V = warning
//            4916.45,N    Latitude 49 deg. 16.45 min North
//            12311.12,W   Longitude 123 deg. 11.12 min West
//            000.5        Speed over ground, Knots
//            054.7        Course Made Good, True
//            191194       Date of fix  19 November 1994
//            020.3,E      Magnetic variation 20.3 deg East
//            *68          mandatory checksum

// eg3. $GPRMC,220516,A,5133.82,N,00042.24,W,173.8,231.8,130694,004.2,W*70
//               1    2    3    4    5     6    7    8      9     10  11 12

//       1   220516     Time Stamp
//       2   A          validity - A-ok, V-invalid
//       3   5133.82    current Latitude
//       4   N          North/South
//       5   00042.24   current Longitude
//       6   W          East/West
//       7   173.8      Speed in knots
//       8   231.8      True course
//       9   130694     Date Stamp
//       10  004.2      Variation
//       11  W          East/West
//       12  *70        checksum

// eg4. $GPRMC,hhmmss.ss,A,llll.ll,a,yyyyy.yy,a,x.x,x.x,ddmmyy,x.x,a*hh
// 1    = UTC of position fix
// 2    = Data status (V=navigation receiver warning)
// 3    = Latitude of fix
// 4    = N or S
// 5    = Longitude of fix
// 6    = E or W
// 7    = Speed over ground in knots
// 8    = Track made good in degrees True
// 9    = UT date
// 10   = Magnetic variation degrees (Easterly var. subtracts from true course)
// 11   = E or W
// 12   = Checksum
