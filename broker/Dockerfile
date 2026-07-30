# The rendezvous broker. Serves both modes: /ws (code-mailbox, quick share) and
# /fp (fingerprint routing, trusted devices). Build context is this directory.
#
# Deploy on Railway (railway.json -> ./broker/Dockerfile, service root = broker):
# Railway injects $PORT and terminates TLS, so this serves plain ws and clients
# dial wss://.

FROM golang:1.26 AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /broker .

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /broker /broker
EXPOSE 8080
ENTRYPOINT ["/broker"]
