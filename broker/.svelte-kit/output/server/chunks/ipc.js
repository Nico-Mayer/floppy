import { invoke } from "@tauri-apps/api/core";
import * as __TAURI_EVENT from "@tauri-apps/api/event";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { getCurrentWindow } from "@tauri-apps/api/window";
//#region src/lib/errors.ts
/**
* A rejected command. Thrown by the `ipc` wrappers so every `catch` gets the
* typed reason, while `String(e)` still reads as a sentence for the toasts that
* only want text. Lives here rather than in `ipc/` so the copy it needs for
* `message` does not have to be imported across the two, which would be a cycle.
*/
var CommandFailure = class extends Error {
	reason;
	constructor(reason) {
		super(commandErrorSentence(reason));
		this.name = "CommandFailure";
		this.reason = reason;
	}
};
/** Headline plus advice for each way a command can refuse to start. */
var COMMAND_COPY = {
	noFiles: {
		title: "Nothing to send",
		message: "Pick at least one file first."
	},
	busy: {
		title: "One at a time",
		message: "Stop the transfer that is running, then start this one."
	},
	unwinding: {
		title: "Hang on a second",
		message: "The last transfer is still wrapping up. Try again in a moment."
	},
	badCode: {
		title: "That code looks off",
		message: "Codes look like 4821-mirror-tundra-basil. Give yours another look."
	}
};
/** Headline for each class of mid-transfer failure. The sentence comes from Rust. */
var TRANSFER_TITLES = {
	connect: "No connection",
	disconnected: "The other device dropped out",
	timeout: "No answer",
	bad_ticket: "That code looks off",
	storage: "Cannot save there"
};
/**
* Rules for text we did not write and cannot classify: OS messages surfaced by
* an `other` failure (opening a folder, copying a pick into the cache). Short
* list on purpose. Anything unmatched is shown verbatim rather than explained
* away.
*/
var TEXT_RULES = [{
	match: /no space left|disk full/i,
	title: "No space left",
	message: "Free up some room, then try again."
}, {
	match: /permission denied|access is denied|operation not permitted/i,
	title: "Not allowed",
	message: "Floppy is not allowed to touch that file. Check its permissions."
}];
/** Fallback headline when nothing matches, based on which side failed. */
function fallbackTitle(kind) {
	if (kind === "send") return "Could not send";
	if (kind === "receive") return "Could not receive";
	return "Something went wrong";
}
/** The plain sentence for a command refusal, used as the thrown error's message. */
function commandErrorSentence(reason) {
	return reason.kind === "other" ? reason.message : COMMAND_COPY[reason.kind].message;
}
/** The human text inside any failure, for interpolating into a sentence. */
function errorText(cause) {
	if (cause instanceof CommandFailure) return commandErrorSentence(cause.reason);
	return String(cause).replace(/^Error:\s*/i, "").trim();
}
/**
* describeError turns a rejected command into a headline plus an actionable
* line. `kind` is the transfer direction when known ('send' | 'receive'), used
* only for the fallback headline.
*/
function describeError(cause, kind) {
	if (cause instanceof CommandFailure && cause.reason.kind !== "other") return COMMAND_COPY[cause.reason.kind];
	const text = errorText(cause);
	if (!text) return {
		title: fallbackTitle(kind),
		message: "No details came back with it."
	};
	for (const rule of TEXT_RULES) if (rule.match.test(text)) return {
		title: rule.title,
		message: rule.message,
		detail: text
	};
	return {
		title: fallbackTitle(kind),
		message: text
	};
}
/**
* describeTransferError turns a mid-transfer failure event into the same shape.
* The message is Rust's, because only Rust knows what actually broke.
*/
function describeTransferError(code, message, kind) {
	return {
		title: code === "other" ? fallbackTitle(kind) : TRANSFER_TITLES[code],
		message: message || "No details came back with it."
	};
}
//#endregion
//#region src/lib/ipc/bindings.ts
/** Commands */
var commands = {
	send: (paths) => typedError(invoke("send", { paths })),
	receive: (code) => typedError(invoke("receive", { code })),
	cancelSend: () => typedError(invoke("cancel_send")),
	cancelReceive: () => typedError(invoke("cancel_receive")),
	/**  Quick one-off share over a human code phrase (code-phrase-share). */
	quickShare: (paths) => typedError(invoke("quick_share", { paths })),
	describe: (paths) => typedError(invoke("describe", { paths })),
	/**
	*  Delete the sandbox copies made for the send queue (a no-op on desktop, where
	*  nothing is copied). The frontend calls this when the queue is cleared.
	*/
	clearInputCache: () => typedError(invoke("clear_input_cache")),
	/**
	*  Reveal a received folder in the file manager (desktop). Not offered on mobile:
	*  received files land in the system-visible location (Android public Downloads,
	*  iOS Files → On My iPhone → Floppy), reachable from the OS file apps, and there
	*  is no reliable in-app intent to jump straight there.
	*/
	openPath: (path) => typedError(invoke("open_path", { path })),
	/**
	*  The resolved download root, as shown in desktop settings. The same resolver
	*  the transfer core is built with, so the value shown is the value used. Pure
	*  read: nothing is created — a receive makes the folder when it needs it.
	*/
	downloadRoot: () => typedError(invoke("download_root")),
	identity: () => typedError(invoke("identity")),
	/**  This device's own name, shown to peers during pairing and on transfers. */
	selfName: () => typedError(invoke("self_name")),
	/**
	*  Rename this device. The new name is advertised to peers on the next pairing
	*  or transfer.
	*/
	setSelfName: (name) => typedError(invoke("set_self_name", { name })),
	trustedDevices: () => typedError(invoke("trusted_devices")),
	untrust: (fingerprint) => typedError(invoke("untrust", { fingerprint })),
	/**
	*  Approve a pending pairing (from a `PairingRequest`) and trust the peer under
	*  `name`.
	*/
	confirmPair: (fingerprint, name) => typedError(invoke("confirm_pair", {
		fingerprint,
		name
	})),
	/**  Discard a pending pairing without trusting the peer. */
	dismissPair: (fingerprint) => typedError(invoke("dismiss_pair", { fingerprint })),
	/**  Rename an already-trusted device. */
	renameDevice: (fingerprint, name) => typedError(invoke("rename_device", {
		fingerprint,
		name
	})),
	/**
	*  Show a pairing code on this device (also rendered as a QR). Another device
	*  redeems it to pair; this device confirms the request before trust is written.
	*  Comes back with how long the code lasts, so the UI can count it down rather
	*  than keep its own copy of the timeout.
	*/
	showPairCode: () => typedError(invoke("show_pair_code")),
	/**
	*  Redeem a pairing code shown on another device. `via` is "qr" when scanned or
	*  "code" when typed, so the other device knows whether to show an SAS.
	*/
	redeemPairCode: (code, via) => typedError(invoke("redeem_pair_code", {
		code,
		via
	})),
	accept: (transferId) => typedError(invoke("accept", { transferId })),
	decline: (transferId) => typedError(invoke("decline", { transferId })),
	sendTo: (fingerprint, paths) => typedError(invoke("send_to", {
		fingerprint,
		paths
	}))
};
/** Events */
var events = {
	codeEvent: makeEvent("code-event"),
	deepLink: makeEvent("deep-link"),
	doneEvent: makeEvent("done-event"),
	errorEvent: makeEvent("error-event"),
	pairingAccepted: makeEvent("pairing-accepted"),
	pairingDeclined: makeEvent("pairing-declined"),
	pairingError: makeEvent("pairing-error"),
	pairingOfferEvent: makeEvent("pairing-offer-event"),
	pairingPaired: makeEvent("pairing-paired"),
	pairingRequest: makeEvent("pairing-request"),
	progressEvent: makeEvent("progress-event")
};
async function typedError(result) {
	try {
		return {
			status: "ok",
			data: await result
		};
	} catch (e) {
		if (e instanceof Error) throw e;
		return {
			status: "error",
			error: e
		};
	}
}
function makeEvent(name, serialize, deserialize) {
	const mapEvent = (cb) => (event) => cb({
		...event,
		payload: deserialize ? deserialize(event.payload) : event.payload
	});
	const mapPayload = (payload) => serialize ? serialize(payload) : payload;
	const base = {
		listen: (cb) => __TAURI_EVENT.listen(name, mapEvent(cb)),
		once: (cb) => __TAURI_EVENT.once(name, mapEvent(cb)),
		emit: ((payload) => __TAURI_EVENT.emit(name, mapPayload(payload)))
	};
	const fn = (target) => ({
		listen: (cb) => target.listen(name, mapEvent(cb)),
		once: (cb) => target.once(name, mapEvent(cb)),
		emit: ((payload) => target.emit(name, mapPayload(payload)))
	});
	return Object.assign(fn, base);
}
//#endregion
//#region src/lib/ipc/runtime.ts
var Window = {
	Minimise: () => getCurrentWindow().minimize(),
	ToggleMaximise: () => getCurrentWindow().toggleMaximize(),
	Close: () => getCurrentWindow().close()
};
/**
* The OS clipboard, via the clipboard-manager plugin rather than
* `navigator.clipboard`, which needs a secure context and permission the
* webview does not always grant.
*/
var Clipboard = { SetText: (text) => writeText(text) };
//#endregion
//#region src/lib/ipc/index.ts
/**
* Unwrap a tauri-specta `Result`: return the data, or throw the typed failure.
* The thrown value keeps the `CommandError` variant, so a caller can tell "the
* device is busy" from "the disk is full" without reading the message.
*/
async function ok(p) {
	const r = await p;
	if (r.status === "error") throw new CommandFailure(r.error);
	return r.data;
}
var Receive = (code) => ok(commands.receive(code));
var CancelSend = () => ok(commands.cancelSend());
var CancelReceive = () => ok(commands.cancelReceive());
var QuickShare = (paths) => ok(commands.quickShare(paths));
var Describe = (paths) => ok(commands.describe(paths));
var OpenPath = (path) => ok(commands.openPath(path));
/** The resolved download root, the same value transfers land under. */
var DownloadRoot = () => ok(commands.downloadRoot());
/** Reap the sandbox copies made for a mobile send queue (a no-op on desktop). */
var ClearInputCache = () => ok(commands.clearInputCache());
var Identity = () => ok(commands.identity());
var TrustedDevices = () => ok(commands.trustedDevices());
var Untrust = (fingerprint) => ok(commands.untrust(fingerprint));
var ConfirmPair = (fingerprint, name) => ok(commands.confirmPair(fingerprint, name));
var DismissPair = (fingerprint) => ok(commands.dismissPair(fingerprint));
var RenameDevice = (fingerprint, name) => ok(commands.renameDevice(fingerprint, name));
var ShowPairCode = () => ok(commands.showPairCode());
var RedeemPairCode = (code, via) => ok(commands.redeemPairCode(code, via));
var SelfName = () => ok(commands.selfName());
var SetSelfName = (name) => ok(commands.setSelfName(name));
var Accept = (transferId) => ok(commands.accept(transferId));
var Decline = (transferId) => ok(commands.decline(transferId));
var SendTo = (fingerprint, paths) => ok(commands.sendTo(fingerprint, paths));
//#endregion
export { Window as C, errorText as D, describeTransferError as E, Clipboard as S, describeError as T, SendTo as _, ConfirmPair as a, TrustedDevices as b, DismissPair as c, OpenPath as d, QuickShare as f, SelfName as g, RenameDevice as h, ClearInputCache as i, DownloadRoot as l, RedeemPairCode as m, CancelReceive as n, Decline as o, Receive as p, CancelSend as r, Describe as s, Accept as t, Identity as u, SetSelfName as v, events as w, Untrust as x, ShowPairCode as y };
