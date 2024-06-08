import { Card, Text, Group, Badge, Button, Stack } from '@mantine/core'
import cs from './LiveCard.module.css'

export default function LiveCard(props) {
  return (
    <Card withBorder shadow="sm" radius="md" className={cs.c}>
      <Card.Section withBorder p="md">
        <Group justify="space-between">
          <Stack gap="xs">
            <Text fz="md" fw="bold" c="gray.7">
              拖头 {props.name}
            </Text>
            <Group>
              <Text fz="xs" c="dimmed">
                编号 {props.code}
              </Text>
              <Text fz="xs" c="dimmed">
                读写器 {props.id}
              </Text>
            </Group>
          </Stack>
          <Button variant="outline" size="xs" onClick={props.onOpen}>
            历史数据
          </Button>
        </Group>
      </Card.Section>

      <Card.Section withBorder p="md">
        <div className={cs.t}>
          <span>GPS</span>
          <span>{props.gps.ts ? `更新时间 ${props.gps.ts}` : ''}</span>
        </div>
        <div className={`${cs.d} ${cs.g}`}>
          <Badge variant="default" c="gray.7">
            状态
          </Badge>
          <span>{props.gps.status}</span>
          <Badge variant="default" c="gray.7">
            纬度
          </Badge>
          <span>
            {props.gps.lat}
            {props.gps.latDir}
          </span>
          <Badge variant="default" c="gray.7">
            速度
          </Badge>
          <span>{props.gps.speed}</span>
          <Badge variant="default" c="gray.7">
            经度
          </Badge>
          <span>
            {props.gps.lon}
            {props.gps.lonDir}
          </span>
          <Badge variant="default" c="gray.7">
            航向
          </Badge>
          <span>{props.gps.track}</span>
          <Badge variant="default" c="gray.7">
            时间
          </Badge>
          <span>{props.gps.time}</span>
          <Badge variant="default" c="gray.7">
            日期
          </Badge>
          <span>{props.gps.date}</span>
        </div>
      </Card.Section>

      <Card.Section withBorder p="md">
        <div className={cs.t}>
          <span>RFID</span>
          <span>{props.rfid.ts ? `更新时间 ${props.rfid.ts}` : ''}</span>
        </div>
        <div className={`${cs.d} ${cs.g}`}>
          <Badge variant="default" c="gray.7">
            标签1
          </Badge>
          <span>{props.rfid.tags?.at(0)?.tag}</span>
          <Badge variant="default" c="gray.7">
            信号1
          </Badge>
          <span>{props.rfid.tags?.at(0)?.rssi}</span>
          <Badge variant="default" c="gray.7">
            标签2
          </Badge>
          <span>{props.rfid.tags?.at(1)?.tag}</span>
          <Badge variant="default" c="gray.7">
            信号2
          </Badge>
          <span>{props.rfid.tags?.at(1)?.rssi}</span>
        </div>
      </Card.Section>
    </Card>
  )
}
