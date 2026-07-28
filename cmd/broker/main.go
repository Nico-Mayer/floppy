// Command broker runs the trusted-device rendezvous relay. Desktop-first: it
// routes signed offers between connected devices and nothing more. Run locally
// for the first end-to-end test:
//
//	go run ./cmd/broker -addr :8080
package main

import (
	"flag"
	"log/slog"
	"net/http"

	"floppy/internal/broker"
)

func main() {
	addr := flag.String("addr", ":8080", "listen address")
	flag.Parse()

	srv := broker.New()
	mux := http.NewServeMux()
	mux.Handle("/ws", srv.Handler())

	slog.Info("broker: listening", "addr", *addr)
	if err := http.ListenAndServe(*addr, mux); err != nil {
		slog.Error("broker: server exited", "err", err)
	}
}
