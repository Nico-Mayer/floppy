# The rendezvous broker. Serves both modes: /ws (code-mailbox, quick share) and
# /fp (fingerprint routing, trusted devices). Build context is the repo root.
#
# Deploy on Railway (railway.json -> ./broker/Dockerfile). Railway builds from
# the repo root, so every COPY is repo-root-relative — do NOT set a service Root
# Directory. Railway injects $PORT and terminates TLS, so this serves plain ws
# and clients dial wss://.

FROM golang:1.26 AS build
WORKDIR /src
COPY broker/go.mod broker/go.sum ./
RUN go mod download
COPY broker/ ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /broker .

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /broker /broker
EXPOSE 8080
ENTRYPOINT ["/broker"]
