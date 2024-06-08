package gps

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"reflect"
	"strconv"
	"strings"
	"time"

	"github.com/nats-io/nats.go"
	"github.com/nayukidayo/tjg/pkg/env"
)

type config struct {
	addr   string
	maxBuf int
	nc     *nats.Conn

	head []byte
	foot []byte

	gprmc    []byte
	gpfid    []byte
	asterisk []byte
	comma    []byte
}

func newConfig(nc *nats.Conn) *config {
	return &config{
		addr:   env.GetStr("GPS_ADDR", ":54328"),
		maxBuf: env.GetInt("GPS_MAX_BUF", 512),
		nc:     nc,

		head: []byte("$"),
		foot: []byte("\r\n"),

		gprmc:    []byte("$GPRMC"),
		gpfid:    []byte("$GPFID"),
		asterisk: []byte("*"),
		comma:    []byte(","),
	}
}

func (c *config) pub(rs *Result) {
	data, err := json.Marshal(rs)
	if err != nil {
		log.Println(err)
		return
	}
	c.nc.Publish("tjg.gps", data)
}

type parser struct {
	conf   *config
	buf    []byte
	device string
}

func newParser(conf *config) *parser {
	return &parser{
		conf: conf,
		buf:  make([]byte, 0, conf.maxBuf),
	}
}

func (p *parser) transform(chunk []byte) {
	data := append(p.buf, chunk...)
	hd := bytes.Index(data, p.conf.head)
	for hd != -1 {
		ft := bytes.Index(data, p.conf.foot)
		if ft == -1 {
			break
		}
		p.filter(data[hd:ft])
		data = data[ft+len(p.conf.foot):]
		hd = bytes.Index(data, p.conf.head)
	}
	if len(data) > p.conf.maxBuf {
		p.buf = make([]byte, 0, p.conf.maxBuf)
	} else {
		p.buf = data
	}
}

func (p *parser) filter(chunk []byte) {
	if p.device == "" && bytes.HasPrefix(chunk, p.conf.gpfid) {
		p.device = strings.ToUpper(string(bytes.Split(chunk, p.conf.comma)[1]))
		return
	}
	if bytes.HasPrefix(chunk, p.conf.gprmc) && p.check(chunk) {
		rs := new(Result)
		rs.Type = "GPS"
		rs.Device = p.device
		rs.TS = time.Now().UnixMilli()
		if data, err := p.decode(chunk); err == nil {
			rs.Data = data
			p.conf.pub(rs)
		}
	}
}

func (p *parser) check(chunk []byte) bool {
	pos := bytes.LastIndex(chunk, p.conf.asterisk)
	end, err := strconv.ParseInt(string(chunk[pos+1:]), 16, 16)
	if err != nil {
		return false
	}
	sum := 0
	for i := 1; i < pos; i++ {
		sum ^= int(chunk[i])
	}
	return sum == int(end)
}

func (p *parser) decode(chunk []byte) (gps GPS, err error) {
	defer func() {
		if r := recover(); r != nil {
			err = fmt.Errorf("%v", r)
		}
	}()
	b := bytes.Split(chunk[:bytes.LastIndex(chunk, p.conf.asterisk)], p.conf.comma)
	t := reflect.ValueOf(&gps).Elem()
	for i := 0; i < t.NumField(); i++ {
		t.Field(i).Set(reflect.ValueOf(string(b[i+1])))
	}
	return
}

type Result struct {
	Type   string `json:"type"`
	Device string `json:"device"`
	Data   GPS    `json:"data"`
	TS     int64  `json:"ts"`
}

type GPS struct {
	Time   string `json:"time"`
	Status string `json:"status"`
	Lat    string `json:"lat"`
	LatDir string `json:"latDir"`
	Lon    string `json:"lon"`
	LonDir string `json:"lonDir"`
	Speed  string `json:"speed"`
	Track  string `json:"track"`
	Date   string `json:"date"`
	Mag    string `json:"mag"`
	MagDir string `json:"magDir"`
}

func Server(nc *nats.Conn) {
	conf := newConfig(nc)
	ln, err := net.Listen("tcp", conf.addr)
	if err != nil {
		log.Fatalln(err)
	}
	defer ln.Close()
	log.Println("GPS", ln.Addr().String())
	for {
		conn, err := ln.Accept()
		if err != nil {
			log.Fatalln(err)
		}
		go handleConn(conn, conf)
	}
}

func handleConn(conn net.Conn, conf *config) {
	defer conn.Close()
	parser := newParser(conf)
	lth := parser.conf.maxBuf >> 2
	for {
		chunk := make([]byte, lth)
		n, err := conn.Read(chunk)
		if err != nil {
			return
		}
		if n > 0 {
			parser.transform(chunk[:n])
		}
	}
}

// 数据协议
// 244750524d432c3038313833362c412c333735312e36352c532c31343530372e33362c452c3030302e302c3336302e302c3133303939382c3031312e332c452a36320d0a2447504649442c30380d0a
//
// $GPRMC,081836,A,3751.65,S,14507.36,E,000.0,360.0,130998,011.3,E*62
// $GPFID,08
//

// $GPRMC,hhmmss.ss,A,llll.ll,a,yyyyy.yy,a,x.x,x.x,ddmmyy,x.x,a*hh
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

// $GPRMC,225446,A,4916.45,N,12311.12,W,000.5,054.7,191194,020.3,E*68
//     225446       Time of fix 22:54:46 UTC
//     A            Navigation receiver warning A = OK, V = warning
//     4916.45,N    Latitude 49 deg. 16.45 min North
//     12311.12,W   Longitude 123 deg. 11.12 min West
//     000.5        Speed over ground, Knots
//     054.7        Course Made Good, True
//     191194       Date of fix  19 November 1994
//     020.3,E      Magnetic variation 20.3 deg East
//     *68          mandatory checksum
