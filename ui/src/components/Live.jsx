import { Drawer } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { useDeviceContext } from '../lib/context.jsx'
import useDevices from '../lib/useDevices.jsx'
import LiveCard from './LiveCard.jsx'
import History from './History.jsx'
import cs from './Live.module.css'

export default function Live() {
  const [opened, { open, close }] = useDisclosure(false)
  const { device, setDevice } = useDeviceContext()
  const devices = useDevices()

  const handleOpen = item => {
    setDevice(item)
    open()
  }

  return (
    <div className={cs.q}>
      {devices.map(v => (
        <LiveCard key={v.id} onOpen={() => handleOpen(v)} {...v} />
      ))}
      <Drawer
        opened={opened}
        onClose={close}
        title={`拖头 ${device?.name} 历史数据`}
        position="bottom"
        size="80%"
        classNames={{ title: cs.t }}
      >
        <History device={device} />
      </Drawer>
    </div>
  )
}
