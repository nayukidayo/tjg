import { useCallback, useEffect, useState } from 'react'
import dayjs from 'dayjs'

export default function useDevices(device) {
  const [type, setType] = useState('GPS')
  const [start, setStart] = useState(dayjs().add(-5, 'm').valueOf() * 1000)
  const [end, setEnd] = useState(Date.now() * 1000)

  const [total, setTotal] = useState(0)
  const [from, setFrom] = useState(0)
  const [size, setSize] = useState(20)

  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)

  const fh = useCallback(() => {
    return fetchHistory({ device: device.id, type, start, end, from, size })
  }, [device.id, type, start, end, from, size])

  useEffect(() => {
    setLoading(true)
    fh()
      .then(hd => {
        setData(hd.hits)
        setTotal(hd.total)
        setFrom(hd.from)
        setSize(hd.size)
      })
      .catch(err => {
        console.log(err)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [fh])

  return { data, loading, type, setType, setStart, setEnd, from, setFrom, total, size }
}

async function fetchHistory(query) {
  const res = await fetch('/api/data/history', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query),
  })
  if (!res.ok) return new Error(res.statusText)
  return res.json()
}
