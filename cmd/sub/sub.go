package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/nats-io/nats.go"
	"github.com/nayukidayo/tjg/internal/bulk"
	"github.com/nayukidayo/tjg/internal/forward"
	"github.com/nayukidayo/tjg/internal/spa"
	"github.com/nayukidayo/tjg/pkg/env"
)

func main() {
	url := env.GetStr("NATS_URL", "nats://nayukidayo@127.0.0.1:4222")
	nc, err := nats.Connect(url)
	if err != nil {
		log.Fatalln(err)
	}

	go spa.Server(nc)
	bn := bulk.New()
	nc.Subscribe("tjg.*", func(m *nats.Msg) {
		go forward.Send(m.Data)
		bn.Write(m.Data)
	})

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
	<-sig

	nc.Drain()
	bn.Flush()
	os.Exit(0)
}
