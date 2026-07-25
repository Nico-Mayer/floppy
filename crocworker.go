package main

import (
	"fmt"
	"os"

	"github.com/schollz/croc/v10/src/croc"
	"github.com/schollz/croc/v10/src/models"
	"github.com/schollz/croc/v10/src/utils"
)

// The app binary doubles as a croc worker process: `bibor croc-worker
// send|recv ...` skips the GUI entirely and drives the croc library instead.
// CrocService spawns (and kills, for cancel) these workers, so croc ships
// inside the app binary and no external CLI is needed.

const crocCodePrefix = "CROC_CODE "

func defaultCrocOptions() croc.Options {
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

func runCrocWorker(args []string) int {
	if len(args) == 0 {
		fmt.Fprintln(os.Stderr, "usage: croc-worker send <path>... | croc-worker recv <destdir>")
		return 2
	}
	var err error
	switch args[0] {
	case "send":
		err = crocWorkerSend(args[1:])
	case "recv":
		err = crocWorkerRecv(args[1:])
	default:
		err = fmt.Errorf("unknown croc-worker mode %q", args[0])
	}
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		return 1
	}
	return 0
}

func crocWorkerSend(paths []string) error {
	if len(paths) == 0 {
		return fmt.Errorf("no files to send")
	}
	options := defaultCrocOptions()
	options.IsSender = true
	options.SharedSecret = utils.GetRandomName()

	// The parent process (CrocService) reads the code phrase from stdout.
	fmt.Println(crocCodePrefix + options.SharedSecret)

	client, err := croc.New(options)
	if err != nil {
		return err
	}
	filesInfo, emptyFolders, totalFolders, err := croc.GetFilesInfo(paths, false, false, nil)
	if err != nil {
		return err
	}
	return client.Send(filesInfo, emptyFolders, totalFolders)
}

func crocWorkerRecv(args []string) error {
	if len(args) != 1 {
		return fmt.Errorf("croc-worker recv needs exactly one destination directory")
	}
	secret := os.Getenv("CROC_SECRET")
	if secret == "" {
		return fmt.Errorf("CROC_SECRET is not set")
	}
	if err := os.MkdirAll(args[0], 0o755); err != nil {
		return err
	}
	// The croc library saves into the current working directory.
	if err := os.Chdir(args[0]); err != nil {
		return err
	}

	options := defaultCrocOptions()
	options.IsSender = false
	options.SharedSecret = secret

	client, err := croc.New(options)
	if err != nil {
		return err
	}
	return client.Receive()
}
