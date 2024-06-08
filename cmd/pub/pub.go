package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/nats-io/nats.go"
	"github.com/nayukidayo/tjg/internal/gps"
	"github.com/nayukidayo/tjg/internal/rfid"
	"github.com/nayukidayo/tjg/pkg/env"
)

func main() {
	url := env.GetStr("NATS_URL", "nats://nayukidayo@127.0.0.1:4222")
	nc, err := nats.Connect(url)
	if err != nil {
		log.Fatalln(err)
	}

	go gps.Server(nc)
	go rfid.Server(nc)

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
	<-sig

	nc.Drain()
	os.Exit(0)
}
