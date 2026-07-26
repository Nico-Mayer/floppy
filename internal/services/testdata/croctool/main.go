// croctool is a minimal croc peer used by the service tests to exercise real
// transfers against CrocService from a separate process (the way an actual
// peer would). Not part of the app build — testdata is invisible to the go
// tool.
//
// usage: croctool send <file>            prints "CODE:<phrase>", then sends
//
//	croctool recv <code> <destdir>  receives into destdir
package main

import (
	"fmt"
	"os"

	"github.com/schollz/croc/v10/src/croc"
	"github.com/schollz/croc/v10/src/models"
	"github.com/schollz/croc/v10/src/utils"
)

func options() croc.Options {
	return croc.Options{
		RelayAddress:     models.DEFAULT_RELAY,
		RelayAddress6:    models.DEFAULT_RELAY6,
		RelayPassword:    models.DEFAULT_PASSPHRASE,
		RelayPorts:       []string{"9009", "9010", "9011", "9012", "9013"},
		Curve:            "p256",
		HashAlgorithm:    "xxhash",
		MulticastAddress: "239.255.255.250",
		NoPrompt:         true,
		IgnoreStdin:      true,
		Overwrite:        true,
	}
}

func run() error {
	if len(os.Args) < 3 {
		return fmt.Errorf("usage: croctool send <file> | croctool recv <code> <destdir>")
	}
	switch os.Args[1] {
	case "send":
		opts := options()
		opts.IsSender = true
		opts.SharedSecret = utils.GetRandomName()
		// Lets tests slow the transfer down enough to observe progress.
		opts.ThrottleUpload = os.Getenv("CROC_THROTTLE")
		client, err := croc.New(opts)
		if err != nil {
			return err
		}
		fi, ef, tf, err := croc.GetFilesInfo([]string{os.Args[2]}, false, false, nil)
		if err != nil {
			return err
		}
		fmt.Println("CODE:" + opts.SharedSecret)
		if err := client.Send(fi, ef, tf); err != nil {
			return err
		}
		fmt.Println("SENDOK")
	case "recv":
		if len(os.Args) < 4 {
			return fmt.Errorf("recv needs <code> <destdir>")
		}
		if err := os.Chdir(os.Args[3]); err != nil {
			return err
		}
		opts := options()
		opts.IsSender = false
		opts.SharedSecret = os.Args[2]
		client, err := croc.New(opts)
		if err != nil {
			return err
		}
		if err := client.Receive(); err != nil {
			return err
		}
		fmt.Println("RECVOK")
	default:
		return fmt.Errorf("unknown mode %q", os.Args[1])
	}
	return nil
}

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, "croctool:", err)
		os.Exit(1)
	}
}
