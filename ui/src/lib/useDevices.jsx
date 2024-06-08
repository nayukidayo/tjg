import { useEffect, useState } from 'react'
import dayjs from 'dayjs'

export default function useDevices() {
  const [devices, setDevices] = useState(items)

  useEffect(() => {
    const es = new EventSource('/api/data/live')
    es.onmessage = ({ data }) => {
      try {
        const obj = JSON.parse(data)
        setDevices(prev => merge(prev, obj))
      } catch (err) {
        console.log(err)
      }
    }
    return () => {
      es.close()
    }
  }, [])

  return devices
}

const items = [
  { id: '10', name: '01-340-01', code: '01', gps: {}, rfid: {} },
  { id: '0A', name: '01-340-02', code: '02', gps: {}, rfid: {} },
  { id: '03', name: '01-340-03', code: '03', gps: {}, rfid: {} },
  { id: '0D', name: '01-340-04', code: '04', gps: {}, rfid: {} },
  { id: '0E', name: '01-340-08', code: '08', gps: {}, rfid: {} },
  { id: '17', name: '01-340-09', code: '09', gps: {}, rfid: {} },
  { id: '04', name: '01-340-80', code: 'T01', gps: {}, rfid: {} },
  { id: '0C', name: '01-340-81', code: 'T02', gps: {}, rfid: {} },
  { id: '07', name: '01-340-82', code: 'T05', gps: {}, rfid: {} },
  { id: '12', name: '01-340-83', code: 'T06', gps: {}, rfid: {} },
  { id: '09', name: '01-340-84', code: 'T07', gps: {}, rfid: {} },
  { id: '11', name: '01-340-85', code: 'T08', gps: {}, rfid: {} },
  { id: '0B', name: '01-340-86', code: 'T09', gps: {}, rfid: {} },
  { id: '14', name: '01-340-87', code: 'T10', gps: {}, rfid: {} },
  { id: '13', name: '01-340-88', code: 'T11', gps: {}, rfid: {} },
  { id: '19', name: '01-340-89', code: 'T12', gps: {}, rfid: {} },
  { id: '0F', name: '02-340-01', code: '51', gps: {}, rfid: {} },
  { id: '05', name: '02-340-02', code: '52', gps: {}, rfid: {} },
  { id: '15', name: '02-340-03', code: '53', gps: {}, rfid: {} },
  { id: '02', name: '02-340-04', code: '54', gps: {}, rfid: {} },
  { id: '01', name: '02-340-05', code: '55', gps: {}, rfid: {} },
  { id: '08', name: '02-340-06', code: '56', gps: {}, rfid: {} },
  { id: '1A', name: '02-340-07', code: '57', gps: {}, rfid: {} },
]

function merge(prev, obj) {
  try {
    const arr = []
    for (let i = 0; i < prev.length; i++) {
      if (prev[i].id === obj.device) {
        const ts = dayjs(obj.ts).format('YYYY-MM-DD HH:mm:ss')
        if (obj.type === 'GPS') {
          prev[i].gps = obj.data
          prev[i].gps.ts = ts
        } else {
          prev[i].rfid.tags = shortTag(obj.data)
          prev[i].rfid.ts = ts
        }
      }
      arr.push(prev[i])
    }
    return arr
  } catch (_) {
    return prev
  }
}

function shortTag(data) {
  const arr = []
  for (let i = 0; i < 2; i++) {
    const v = data[i]
    if (v) {
      let c1 = v.tag.charAt(0)
      const c2 = v.tag.charAt(6)
      const c3 = v.tag.charAt(12)
      const c4 = v.tag.charAt(18)
      if (c1 === '0') c1 = ''
      arr.push({
        tag: `${c1}${c2}${c3}${c4}`.toUpperCase(),
        rssi: v.rssi,
      })
    }
  }
  return arr
}
