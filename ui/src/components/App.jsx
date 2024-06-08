import { createTheme, MantineProvider } from '@mantine/core'
import { DatesProvider } from '@mantine/dates'
import { DeviceProvider } from '../lib/context.jsx'
import Live from './Live.jsx'
import 'dayjs/locale/zh-cn'

const theme = createTheme({
  fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
  headings: { fontFamily: 'Arial, "Microsoft YaHei", sans-serif' },
})

export default function App() {
  return (
    <MantineProvider theme={theme}>
      <DatesProvider settings={{ locale: 'zh-cn' }}>
        <DeviceProvider>
          <Live />
        </DeviceProvider>
      </DatesProvider>
    </MantineProvider>
  )
}
