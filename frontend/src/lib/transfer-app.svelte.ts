import {
    CancelReceive,
    CancelSend,
    Receive,
    Send,
} from "$bindings/bibor/crocservice";
import { SelectFiles } from "$bindings/bibor/fileservice";
import type { TransferStats } from "$bindings/bibor/models";
import { Events } from "@wailsio/runtime";
import type {
    ReceiveStatus,
    SendStatus,
} from "./components/transfer/types";

export type Mode = "send" | "receive";

class SendTransfer {
    status = $state<SendStatus>("idle");
    files = $state<string[]>([]);
    code = $state("");
    progress = $state(0);
    stats = $state<TransferStats | null>(null);

    get busy() {
        return this.status !== "idle" && this.status !== "done";
    }

    addFile(path: string) {
        if (this.status === "idle" && !this.files.includes(path)) {
            this.files.push(path);
        }
    }

    removeFile(path: string) {
        this.files = this.files.filter((f) => f !== path);
    }

    async pick() {
        const paths = await SelectFiles();
        for (const path of paths ?? []) this.addFile(path);
    }

    async start() {
        app.error = "";
        this.progress = 0;
        this.stats = null;
        this.status = "starting";
        try {
            await Send(this.files);
        } catch (e) {
            app.error = String(e);
            this.status = "idle";
        }
    }

    async cancel() {
        await CancelSend();
        this.reset();
    }

    reset() {
        this.files = [];
        this.code = "";
        this.progress = 0;
        this.stats = null;
        this.status = "idle";
    }
}

/**
 * How long a receive may sit unconnected before the UI suggests the code might
 * be wrong. croc waits for its peer forever, so nothing else ever says so.
 */
const MISTYPED_CODE_HINT_DELAY = 15_000;

class ReceiveTransfer {
    status = $state<ReceiveStatus>("idle");
    code = $state("");
    savedTo = $state("");
    progress = $state<number | null>(null);
    stats = $state<TransferStats | null>(null);
    /** Set once the connect attempt has taken suspiciously long. */
    tooSlow = $state(false);
    #hintTimer: ReturnType<typeof setTimeout> | undefined;

    get busy() {
        return this.status === "connecting" || this.status === "receiving";
    }

    async start() {
        app.error = "";
        this.progress = null;
        this.stats = null;
        this.tooSlow = false;
        this.status = "connecting";
        this.#hintTimer = setTimeout(
            () => (this.tooSlow = true),
            MISTYPED_CODE_HINT_DELAY,
        );
        try {
            await Receive(this.code);
        } catch (e) {
            app.error = String(e);
            this.stop();
        }
    }

    /** The peer answered: bytes are moving, so the code was right. */
    connected() {
        this.#clearHint();
        this.status = "receiving";
    }

    /** Give up on this attempt but keep the code around to be corrected. */
    stop() {
        this.#clearHint();
        this.status = "idle";
    }

    async cancel() {
        await CancelReceive();
        this.reset();
    }

    reset() {
        this.#clearHint();
        this.code = "";
        this.savedTo = "";
        this.progress = null;
        this.stats = null;
        this.status = "idle";
    }

    #clearHint() {
        clearTimeout(this.#hintTimer);
        this.#hintTimer = undefined;
        this.tooSlow = false;
    }
}

class TransferApp {
    mode = $state<Mode>("send");
    error = $state("");
    send = new SendTransfer();
    receive = new ReceiveTransfer();

    /** Subscribe to croc events; returns the cleanup for onMount. */
    listen() {
        const unsubs = [
            Events.On("files-dropped", (ev: { data: string[] | null }) => {
                for (const path of ev.data ?? []) this.send.addFile(path);
            }),
            Events.On("croc:code", (ev: { data: string }) => {
                this.send.code = ev.data;
                this.send.status = "waiting";
            }),
            Events.On("croc:send:progress", (ev: { data: TransferStats }) => {
                // Progress only makes sense once the code phrase exists — never
                // let a stray progress line hide the code screen.
                if (
                    this.send.status === "waiting" ||
                    this.send.status === "sending"
                ) {
                    this.send.stats = ev.data;
                    this.send.progress = ev.data.percent;
                    this.send.status = "sending";
                }
            }),
            Events.On("croc:recv:progress", (ev: { data: TransferStats }) => {
                // A receiver has no byte counts until the peer answers, so the
                // first progress event doubles as the "connected" signal.
                this.receive.connected();
                this.receive.stats = ev.data;
                this.receive.progress = ev.data.percent;
            }),
            Events.On("croc:sent", () => {
                this.send.status = "done";
            }),
            Events.On("croc:received", (ev: { data: string }) => {
                this.receive.connected();
                this.receive.savedTo = ev.data;
                this.receive.status = "done";
            }),
            Events.On("croc:error", (ev: { data: string }) => {
                this.error = ev.data;
                if (this.send.status !== "done") this.send.status = "idle";
                if (this.receive.status !== "done") this.receive.stop();
            }),
        ];
        return () => unsubs.forEach((unsub) => unsub());
    }
}

export const app = new TransferApp();
