package rfid

import (
	"bytes"
	"encoding/binary"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"strings"
	"sync"
	"time"

	"github.com/nats-io/nats.go"
	"github.com/nayukidayo/tjg/pkg/env"
)

// 最大可解析长度
const MAX_ARR_LEN = 512

func Server(nc *nats.Conn) {
	l, err := net.Listen("tcp", env.GetStr("RFID_ADDR", ":54329"))
	if err != nil {
		log.Fatalln(err)
	}
	defer l.Close()

	log.Println("RFID", l.Addr().String())

	p := newParser()
	for {
		c, err := l.Accept()
		if err != nil {
			log.Fatalln(err)
		}
		go p.transform(c, nc)
	}
}

type parser struct {
	// 起始字节
	hd []byte
	// 长度偏移量
	lo int
	// 长度字节数
	lb int
}

func newParser() *parser {
	return &parser{
		hd: []byte{0x43, 0x54},
		lo: 2,
		lb: 2,
	}
}

func (p *parser) transform(c net.Conn, nc *nats.Conn) {
	defer c.Close()
	st := newStore(nc)

	var arr [MAX_ARR_LEN]byte
	buf := arr[:0]

	chunk := make([]byte, MAX_ARR_LEN>>2)
	for {
		n, err := c.Read(chunk)
		if err != nil {
			return
		}
		s := 0
		for n > s {
			if n > s+cap(buf)-len(buf) {
				buf = append(arr[:0], buf...)
			}
			m := min(n, s+cap(buf)-len(buf))
			buf = p.find(append(buf, chunk[s:m]...), st)
			s = m
		}
	}
}

func (p *parser) find(buf []byte, st *store) []byte {
	h := bytes.Index(buf, p.hd)
	for h != -1 {
		buf = buf[h:]
		k := p.lo + p.lb
		if len(buf) < k {
			break
		}
		t := k + int(binary.BigEndian.Uint16(buf[p.lo:k]))
		if t > MAX_ARR_LEN {
			buf = buf[1:]
			h = bytes.Index(buf, p.hd)
			continue
		}
		if len(buf) < t {
			break
		}
		if p.check(buf[:t]) {
			if id, tags, err := p.decode(buf[:t]); err == nil {
				st.add(id, tags)
			}
			buf = buf[t:]
		} else {
			buf = buf[1:]
		}
		h = bytes.Index(buf, p.hd)
	}
	if h == -1 && len(buf) > len(p.hd) {
		buf = buf[len(buf)-len(p.hd):]
	}
	return buf
}

func (p *parser) check(data []byte) bool {
	if len(data) > 5 && data[5] == 0x45 {
		sum := 0
		lth := len(data) - 1
		for i := 0; i < lth; i++ {
			sum += int(data[i])
		}
		sum = 256 - (sum % 256)
		return sum == int(data[lth])
	}
	return false
}

func (p *parser) decode(data []byte) (id string, tags []Tags, err error) {
	defer func() {
		if r := recover(); r != nil {
			err = fmt.Errorf("%v", r)
		}
	}()
	id = strings.ToUpper(hex.EncodeToString(data[4:5]))
	num := int(data[14])
	tags = make([]Tags, 0, num)
	start := 15
	for i := 0; i < num; i++ {
		end := start + int(data[start])
		tags = append(tags, Tags{
			Tag:  hex.EncodeToString(data[start+3 : end]),
			Rssi: int(data[end]),
		})
		start = end + 1
	}
	return id, tags, nil
}

type store struct {
	mu   sync.Mutex
	tt   *time.Timer
	ms   time.Duration
	id   string
	tags []Tags
	nc   *nats.Conn
}

func newStore(nc *nats.Conn) *store {
	return &store{
		ms: time.Millisecond * 500,
		nc: nc,
	}
}

func (s *store) add(id string, tags []Tags) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.tt != nil {
		s.tt.Stop()
	}

	s.tt = time.AfterFunc(s.ms, s.pub)

	s.id = id
	s.tags = append(s.tags, tags...)
}

func (s *store) pub() {
	s.mu.Lock()
	defer s.mu.Unlock()

	if len(s.tags) > 0 {
		rs := Result{
			Type:   "RFID",
			Device: s.id,
			Data:   s.tags,
			TS:     time.Now().UnixMilli(),
		}
		if b, err := json.Marshal(rs); err == nil {
			s.nc.Publish("tjg.rfid", b)
		}
	}

	s.id = ""
	s.tags = make([]Tags, 0)
}

type Result struct {
	Type   string `json:"type"`
	Device string `json:"device"`
	Data   []Tags `json:"data"`
	TS     int64  `json:"ts"`
}

type Tags struct {
	Tag  string `json:"tag"`
	Rssi int    `json:"rssi"`
}

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
