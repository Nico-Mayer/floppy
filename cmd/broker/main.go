// Command broker runs the trusted-device rendezvous relay. Desktop-first: it
// routes signed offers between connected devices and nothing more. Run locally
// for the first end-to-end test:
//
//	go run ./cmd/broker -addr :8080
//
// In a container/PaaS (e.g. Railway) it listens on $PORT automatically; the
// platform terminates TLS at its edge, so clients connect over wss://<host>/ws
// while the process itself serves plain ws.
package main

import (
	"flag"
	"log/slog"
	"net/http"
	"os"

	"floppy/internal/broker"
)

func main() {
	addr := flag.String("addr", "", "listen address; default :$PORT, or :8080")
	flag.Parse()

	listen := *addr
	if listen == "" {
		if port := os.Getenv("PORT"); port != "" {
			listen = ":" + port
		} else {
			listen = ":8080"
		}
	}

	srv := broker.New()
	mux := http.NewServeMux()
	mux.Handle("/ws", srv.Handler())
	// A plain GET on / lets platform health checks and humans confirm the
	// broker is up without speaking WebSocket.
	mux.HandleFunc("/", func(w http.ResponseWriter, _ *http.Request) {
		w.Write([]byte("floppy rendezvous broker ok\n"))
	})

	slog.Info("broker: listening", "addr", listen)
	if err := http.ListenAndServe(listen, mux); err != nil {
		slog.Error("broker: server exited", "err", err)
		os.Exit(1)
	}
}
