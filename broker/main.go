package main

import (
	"log/slog"
	"net/http"
	"os"
)

func main() {
	// Precedence: an explicit full addr, then Railway's injected $PORT, then a
	// local dev default. Railway terminates TLS, so this serves plain ws/wss
	// upstream and clients dial wss://.
	addr := os.Getenv("FLOPPY_BROKER_ADDR")
	if addr == "" {
		if port := os.Getenv("PORT"); port != "" {
			addr = ":" + port
		} else {
			addr = ":8787"
		}
	}

	mux := http.NewServeMux()
	mux.Handle("/ws", New().Handler())        // code-mailbox mode (quick share)
	mux.Handle("/fp", NewFpServer().Handler()) // fingerprint routing (trusted devices)
	mux.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	slog.Info("broker: listening", "addr", addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		slog.Error("broker: server exited", "err", err)
		os.Exit(1)
	}
}
