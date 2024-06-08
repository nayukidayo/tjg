import { useState } from 'react'
import { Text, Loader, Select, Table, Pagination, Group } from '@mantine/core'
import { DateTimePicker } from '@mantine/dates'
import useHistory from '../lib/useHistory.jsx'
import dayjs from 'dayjs'

export default function History({ device }) {
  const maxDate = new Date()
  const minDate = dayjs().add(-1, 'M').toDate()

  const [startDate, setStartDate] = useState(dayjs().add(-5, 'm').toDate())
  const [endDate, setEndDate] = useState(maxDate)

  const { data, loading, type, setType, setStart, setEnd, from, setFrom, total, size } =
    useHistory(device)

  const rows = data.map((v, i) => {
    if (type === 'GPS') {
      return (
        <Table.Tr key={i}>
          <Table.Td>{dayjs(v.ts).format('YYYY-MM-DD HH:mm:ss')}</Table.Td>
          <Table.Td>{v.data_status}</Table.Td>
          <Table.Td>{`${v.data_lat}${v.data_latdir}`}</Table.Td>
          <Table.Td>{`${v.data_lon}${v.data_londir}`}</Table.Td>
          <Table.Td>{v.data_speed}</Table.Td>
          <Table.Td>{v.data_track}</Table.Td>
          <Table.Td>{v.data_date}</Table.Td>
          <Table.Td>{v.data_time}</Table.Td>
        </Table.Tr>
      )
    } else {
      return (
        <Table.Tr key={i}>
          <Table.Td>{dayjs(v.ts).format('YYYY-MM-DD HH:mm:ss')}</Table.Td>
          <Table.Td>{v.data}</Table.Td>
        </Table.Tr>
      )
    }
  })

  return (
    <>
      <Group>
        <Group gap="xs">
          <Text>数据类型</Text>
          <Select
            w={100}
            checkIconPosition="right"
            data={['GPS', 'RFID']}
            comboboxProps={{ shadow: 'md' }}
            value={type}
            onChange={v => {
              setType(v)
              setFrom(0)
            }}
          />
        </Group>
        <Group gap="xs">
          <Text>开始时间</Text>
          <DateTimePicker
            w={160}
            valueFormat="YYYY-MM-DD HH:mm"
            minDate={minDate}
            maxDate={maxDate}
            value={startDate}
            onChange={setStartDate}
            popoverProps={{
              shadow: 'md',
              onClose: () => {
                setStart(dayjs(startDate).valueOf() * 1000)
                setFrom(0)
              },
            }}
          />
        </Group>
        <Group gap="xs">
          <Text>结束时间</Text>
          <DateTimePicker
            w={160}
            valueFormat="YYYY-MM-DD HH:mm"
            minDate={minDate}
            maxDate={maxDate}
            value={endDate}
            onChange={setEndDate}
            popoverProps={{
              shadow: 'md',
              onClose: () => {
                setEnd(dayjs(endDate).valueOf() * 1000)
                setFrom(0)
              },
            }}
          />
        </Group>
        {loading && <Loader size="xs" />}
        <Pagination
          ml="auto"
          total={Math.ceil(total / size)}
          value={Math.floor((from + size) / size)}
          onChange={v => setFrom(v * size - size)}
        />
      </Group>
      <Table my="md">
        <Table.Thead>
          {type === 'GPS' ? (
            <Table.Tr c="gray.7">
              <Table.Th>采集时间</Table.Th>
              <Table.Th>状态</Table.Th>
              <Table.Th>纬度</Table.Th>
              <Table.Th>经度</Table.Th>
              <Table.Th>速度</Table.Th>
              <Table.Th>航向</Table.Th>
              <Table.Th>日期</Table.Th>
              <Table.Th>时间</Table.Th>
            </Table.Tr>
          ) : (
            <Table.Tr c="gray.7">
              <Table.Th>采集时间</Table.Th>
              <Table.Th>标签(tag) 信号(rssi)</Table.Th>
            </Table.Tr>
          )}
        </Table.Thead>
        <Table.Tbody>
          {rows.length > 0 ? (
            rows
          ) : (
            <Table.Tr>
              <Table.Td colSpan={99}>
                <Text ta="center" mt="lg" c="dimmed">
                  没有找到数据
                </Text>
              </Table.Td>
            </Table.Tr>
          )}
        </Table.Tbody>
      </Table>
    </>
  )
}
