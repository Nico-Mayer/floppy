import { I as set, L as state, M as get, P as render_effect, U as deferred, W as noop, g as spread_props } from "./index-server.js";
import { t as goto } from "./client.js";
import { n as resolve } from "./paths.js";
import { F as loop, I as raf, L as MediaQuery, M as isTouch, U as Icon } from "./StubMark.js";
import { E as describeTransferError, T as describeError, f as QuickShare, i as ClearInputCache, n as CancelReceive, p as Receive, r as CancelSend, s as Describe, w as events } from "./ipc.js";
import { impactFeedback, notificationFeedback } from "@tauri-apps/plugin-haptics";
import { open } from "@tauri-apps/plugin-dialog";
//#region node_modules/svelte/src/motion/utils.js
/**
* @param {any} obj
* @returns {obj is Date}
*/
function is_date(obj) {
	return Object.prototype.toString.call(obj) === "[object Date]";
}
//#endregion
//#region node_modules/svelte/src/motion/spring.js
/**
* @template T
* @param {TickContext} ctx
* @param {T} last_value
* @param {T} current_value
* @param {T} target_value
* @returns {T}
*/
function tick_spring(ctx, last_value, current_value, target_value) {
	if (typeof current_value === "number" || is_date(current_value)) {
		const delta = target_value - current_value;
		const velocity = (current_value - last_value) / (ctx.dt || 1 / 60);
		const d = (velocity + (ctx.opts.stiffness * delta - ctx.opts.damping * velocity) * ctx.inv_mass) * ctx.dt;
		if (Math.abs(d) < ctx.opts.precision && Math.abs(delta) < ctx.opts.precision) return target_value;
		else {
			ctx.settled = false;
			return is_date(current_value) ? new Date(current_value.getTime() + d) : current_value + d;
		}
	} else if (Array.isArray(current_value)) return current_value.map((_, i) => tick_spring(ctx, last_value[i], current_value[i], target_value[i]));
	else if (typeof current_value === "object") {
		const next_value = {};
		for (const k in current_value) next_value[k] = tick_spring(ctx, last_value[k], current_value[k], target_value[k]);
		return next_value;
	} else throw new Error(`Cannot spring ${typeof current_value} values`);
}
/**
* A wrapper for a value that behaves in a spring-like fashion. Changes to `spring.target` will cause `spring.current` to
* move towards it over time, taking account of the `spring.stiffness` and `spring.damping` parameters.
*
* ```svelte
* <script>
* 	import { Spring } from 'svelte/motion';
*
* 	const spring = new Spring(0);
* <\/script>
*
* <input type="range" bind:value={spring.target} />
* <input type="range" bind:value={spring.current} disabled />
* ```
* @template T
* @since 5.8.0
*/
var Spring = class Spring {
	#stiffness = /* @__PURE__ */ state(.15);
	#damping = /* @__PURE__ */ state(.8);
	#precision = /* @__PURE__ */ state(.01);
	#current;
	#target;
	#last_value = void 0;
	#last_time = 0;
	#inverse_mass = 1;
	#momentum = 0;
	/** @type {import('../internal/client/types').Task | null} */
	#task = null;
	/** @type {ReturnType<typeof deferred> | null} */
	#deferred = null;
	/**
	* @param {T} value
	* @param {SpringOptions} [options]
	*/
	constructor(value, options = {}) {
		this.#current = /* @__PURE__ */ state(value);
		this.#target = /* @__PURE__ */ state(value);
		if (typeof options.stiffness === "number") this.#stiffness.v = clamp(options.stiffness, 0, 1);
		if (typeof options.damping === "number") this.#damping.v = clamp(options.damping, 0, 1);
		if (typeof options.precision === "number") this.#precision.v = options.precision;
	}
	/**
	* Create a spring whose value is bound to the return value of `fn`. This must be called
	* inside an effect root (for example, during component initialisation).
	*
	* ```svelte
	* <script>
	* 	import { Spring } from 'svelte/motion';
	*
	* 	let { number } = $props();
	*
	* 	const spring = Spring.of(() => number);
	* <\/script>
	* ```
	* @template U
	* @param {() => U} fn
	* @param {SpringOptions} [options]
	*/
	static of(fn, options) {
		const spring = new Spring(fn(), options);
		render_effect(() => {
			spring.set(fn());
		});
		return spring;
	}
	/** @param {T} value */
	#update(value) {
		set(this.#target, value);
		this.#current.v ??= value;
		this.#last_value ??= this.#current.v;
		if (!this.#task) {
			this.#last_time = raf.now();
			var inv_mass_recovery_rate = 1e3 / (this.#momentum * 60);
			this.#task ??= loop((now) => {
				this.#inverse_mass = Math.min(this.#inverse_mass + inv_mass_recovery_rate, 1);
				const elapsed = Math.min(now - this.#last_time, 1e3 / 30);
				/** @type {import('./private').TickContext} */
				const ctx = {
					inv_mass: this.#inverse_mass,
					opts: {
						stiffness: this.#stiffness.v,
						damping: this.#damping.v,
						precision: this.#precision.v
					},
					settled: true,
					dt: elapsed * 60 / 1e3
				};
				var next = tick_spring(ctx, this.#last_value, this.#current.v, this.#target.v);
				this.#last_value = this.#current.v;
				this.#last_time = now;
				set(this.#current, next);
				if (ctx.settled) this.#task = null;
				return !ctx.settled;
			});
		}
		return this.#task.promise;
	}
	/**
	* Sets `spring.target` to `value` and returns a `Promise` that resolves if and when `spring.current` catches up to it.
	*
	* If `options.instant` is `true`, `spring.current` immediately matches `spring.target`.
	*
	* If `options.preserveMomentum` is provided, the spring will continue on its current trajectory for
	* the specified number of milliseconds. This is useful for things like 'fling' gestures.
	*
	* @param {T} value
	* @param {SpringUpdateOptions} [options]
	*/
	set(value, options) {
		this.#deferred?.reject(/* @__PURE__ */ new Error("Aborted"));
		if (options?.instant || this.#current.v === void 0) {
			this.#task?.abort();
			this.#task = null;
			set(this.#current, set(this.#target, value));
			this.#last_value = value;
			return Promise.resolve();
		}
		if (options?.preserveMomentum) {
			this.#inverse_mass = 0;
			this.#momentum = options.preserveMomentum;
		}
		var d = this.#deferred = deferred();
		d.promise.catch(noop);
		this.#update(value).then(() => {
			if (d !== this.#deferred) return;
			d.resolve(void 0);
		});
		return d.promise;
	}
	get current() {
		return get(this.#current);
	}
	get damping() {
		return get(this.#damping);
	}
	set damping(v) {
		set(this.#damping, clamp(v, 0, 1));
	}
	get precision() {
		return get(this.#precision);
	}
	set precision(v) {
		set(this.#precision, v);
	}
	get stiffness() {
		return get(this.#stiffness);
	}
	set stiffness(v) {
		set(this.#stiffness, clamp(v, 0, 1));
	}
	get target() {
		return get(this.#target);
	}
	set target(v) {
		this.set(v);
	}
};
/**
* @param {number} n
* @param {number} min
* @param {number} max
*/
function clamp(n, min, max) {
	return Math.max(min, Math.min(max, n));
}
//#endregion
//#region node_modules/svelte/src/motion/index.js
/**
* A [media query](https://svelte.dev/docs/svelte/svelte-reactivity#MediaQuery) that matches if the user [prefers reduced motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion).
*
* ```svelte
* <script>
* 	import { prefersReducedMotion } from 'svelte/motion';
* 	import { fly } from 'svelte/transition';
*
* 	let visible = $state(false);
* <\/script>
*
* <button onclick={() => visible = !visible}>
* 	toggle
* </button>
*
* {#if visible}
* 	<p transition:fly={{ y: prefersReducedMotion.current ? 0 : 200 }}>
* 		flies in, unless the user prefers reduced motion
* 	</p>
* {/if}
* ```
* @type {MediaQuery}
* @since 5.7.0
*/
var prefersReducedMotion = /*@__PURE__*/ new MediaQuery("(prefers-reduced-motion: reduce)");
//#endregion
//#region src/lib/motion.ts
/**
* Durations for the JS-driven transitions.
*
* app.css already neutralises the CSS keyframe animations under
* `prefers-reduced-motion`, but Svelte's transition directives are JS and
* ignore that media query — so they consult it here instead. Collapsing to 0
* removes the movement while keeping every enter/exit hook intact, so nothing
* downstream has to branch.
*/
var motionOK = () => !prefersReducedMotion.current;
/** Standard: panels arriving and leaving. */
var normal = () => motionOK() ? 220 : 0;
//#endregion
//#region src/lib/haptics.ts
async function feel(run) {
	if (!isTouch()) return;
	try {
		await run();
	} catch {}
}
var haptics = {
	/** A code was copied to the clipboard. */
	copied: () => feel(() => impactFeedback("light")),
	/** A QR code was read: the camera caught something, before anything is known. */
	scanned: () => feel(() => impactFeedback("medium")),
	/** A file was taken out of the send queue. */
	removed: () => feel(() => impactFeedback("light")),
	/** A transfer finished, in either direction. The one success note. */
	transferDone: () => feel(() => notificationFeedback("success")),
	/** An incoming transfer was accepted. Heavier than declining: more happened. */
	accepted: () => feel(() => impactFeedback("medium")),
	/** An incoming transfer was declined. */
	declined: () => feel(() => impactFeedback("light"))
};
//#endregion
//#region node_modules/@lucide/svelte/dist/icons/check.svelte
function Check($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "check" },
		props,
		{ iconNode: [["path", { "d": "M20 6 9 17l-5-5" }]] }
	]));
}
//#endregion
//#region node_modules/@lucide/svelte/dist/icons/x.svelte
function X($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "x" },
		props,
		{ iconNode: [["path", { "d": "M18 6 6 18" }], ["path", { "d": "m6 6 12 12" }]] }
	]));
}
//#endregion
//#region src/lib/transfer-app.svelte.ts
var SendTransfer = class {
	status = "idle";
	/**
	* This side's failure, owned here rather than app-wide: Send and Receive are
	* separate routes, so a shared field would render a send failure on whichever
	* screen the user happened to be looking at, and the two sides can fail
	* independently.
	*/
	error = null;
	files = [];
	/** The code phrase for this send. Only ever shown for a `code` target. */
	code = "";
	progress = 0;
	stats = null;
	/** Where this send is going; set by start()/beginTrusted(), read by the UI. */
	target = { kind: "code" };
	/**
	* What the target picker points at: 'code' or a trusted device's fingerprint.
	*
	* Lives here rather than in the Send panel because it outlives both a transfer
	* (send twice to the same laptop without re-choosing) and the panel itself, so
	* leaving Send and coming back does not silently reset who the files were going
	* to. `target` is the different thing — the snapshot the in-flight transfer
	* belongs to.
	*/
	picked = "code";
	get busy() {
		return this.status !== "idle" && this.status !== "done";
	}
	/** Combined size of the queue, for the send button and the size warning. */
	get totalSize() {
		return this.files.reduce((sum, file) => sum + file.size, 0);
	}
	add(entries) {
		if (this.status !== "idle") return;
		for (const entry of entries) if (!this.files.some((file) => file.path === entry.path)) this.files.push(entry);
	}
	removeFile(path) {
		this.files = this.files.filter((file) => file.path !== path);
		haptics.removed();
	}
	/** True while a native picker is open, so a second click is ignored. */
	#picking = false;
	/**
	* The same flag, for the Send screen's idle surfaces to show they are working.
	*
	* It has to be read from outside because the wait is invisible otherwise: iOS
	* dismisses the picker sheet *before* it starts loading what was chosen, and
	* reports nothing at all until every item is ready, so the app sits on screen
	* doing nothing visible for as long as a big selection takes. Nothing finer
	* than a boolean is available — the platform hands back the whole selection at
	* once or not at all, so there is no count to show and no progress to track.
	*/
	get picking() {
		return this.#picking;
	}
	pickFiles() {
		return this.#pick({
			multiple: true,
			title: "Add files"
		});
	}
	/**
	* The phone's photo library — videos as well as photos, because a gallery
	* holds both and a clip too big to message is the thing people most want to
	* send from a phone. Only reachable from the phone sheet; there is no photo
	* library on a laptop.
	*/
	pickPhotos() {
		return this.#pick({
			multiple: true,
			pickerMode: "media"
		});
	}
	/**
	* Open one native picker and queue whatever it hands back.
	*
	* One guard shared by both callers — the empty state is a big click target,
	* and two *different* pickers open at once is exactly what a guard per picker
	* would fail to catch.
	*
	* A picker that hands back nothing is a no-op whatever the reason: Android
	* reports a dismissed picker as a rejection while iOS and desktop resolve
	* with null, and telling a cancel from a failure would mean matching on a
	* message to show something nobody asked for.
	*/
	async #pick(options) {
		if (this.#picking) return;
		this.#picking = true;
		try {
			const selected = await open(options);
			if (selected) await this.addPaths(selected);
		} catch {} finally {
			this.#picking = false;
		}
	}
	/**
	* Add paths — bare strings from a drop or the picker — resolved to entries.
	* Folders are dropped: the picker only offers files, and the transport sends
	* files, so a dragged-in folder must not reach the queue.
	*/
	async addPaths(paths) {
		if (!paths.length) return;
		this.add((await Describe(paths) ?? []).filter((entry) => !entry.isDir));
	}
	async start() {
		this.error = null;
		this.target = { kind: "code" };
		this.progress = 0;
		this.stats = null;
		this.status = "starting";
		try {
			await QuickShare(this.files.map((file) => file.path));
		} catch (e) {
			this.error = describeError(e, "send");
			this.status = "idle";
		}
	}
	/**
	* Enter the connecting state for a trusted-device send. Unlike start() this
	* serves nothing yet: the pairing layer offers the files and the real send
	* begins only when the peer accepts, arriving as the usual code event.
	* So for this target 'starting' means "waiting for them to accept" and
	* 'waiting' means "accepted, the transfer is connecting"; the panel says as much
	* instead of showing a code phrase nobody needs to read.
	*/
	beginTrusted(device) {
		this.target = {
			kind: "device",
			...device
		};
		this.progress = 0;
		this.stats = null;
		this.status = "starting";
	}
	/**
	* The peer accepted a trusted offer. Leave the 'waiting for a yes' screen for
	* the accepted/connecting state; the first progress event takes it to
	* 'sending'. A trusted send emits no code phrase, so this (and progress) are
	* the only things that move it off 'starting'.
	*/
	accepted() {
		if (this.status === "starting") this.status = "waiting";
	}
	async cancel() {
		this.status = "cancelling";
		try {
			await CancelSend();
		} finally {
			this.#clearTransfer();
		}
	}
	/**
	* The other side has it all. The queue stays for the completion summary, but
	* the sandbox copies behind it do not: they have been delivered, and on a
	* phone a queue of videos is the biggest thing the app is holding.
	*
	* Safe to reap here because the done screen reads only the in-memory entries
	* (names and sizes for the summary), never the bytes. Not done on cancel —
	* cancelling keeps the queue so the same files can be sent again, and those
	* entries have to keep pointing at readable files.
	*/
	complete() {
		this.status = "done";
		ClearInputCache().catch(() => {});
	}
	/**
	* Give up on this attempt but keep the queue, the way cancel does. Every way a
	* send can end without sending goes through here — cancelled, declined, target
	* offline, refused before it started — so which of them happened never decides
	* whether the files are still there. The caller sets `error` afterwards if
	* there is something to say.
	*
	* Not reset(): that reaps the sandbox copies the entries point at, which is
	* only ever right when the queue is going away with them.
	*/
	stop() {
		this.#clearTransfer();
	}
	/**
	* Clear the queue and everything behind it.
	*
	* Only ever call this when no send is serving. The core imports files by
	* reference, so the blob store points at these sandbox copies rather than
	* holding its own — deleting them under a live passive send would leave the
	* receiver fetching a file that is no longer there. One caller: the done
	* screen's "send something else". A send that failed uses stop() instead.
	*/
	reset() {
		this.#clearTransfer();
		this.files = [];
		ClearInputCache().catch(() => {});
	}
	#clearTransfer() {
		this.code = "";
		this.target = { kind: "code" };
		this.progress = 0;
		this.stats = null;
		this.status = "idle";
	}
};
/**
* How long a receive may sit unconnected before the UI suggests the code might
* be wrong. A receive waits for its peer forever, so nothing else ever says so.
*/
var MISTYPED_CODE_HINT_DELAY = 15e3;
var ReceiveTransfer = class {
	status = "idle";
	/** This side's failure. See the note on SendTransfer.error. */
	error = null;
	code = "";
	savedTo = "";
	progress = null;
	stats = null;
	/** Where this receive came from; set by start()/beginTrusted(), read by the UI. */
	target = { kind: "code" };
	/** Set once the connect attempt has taken suspiciously long. */
	tooSlow = false;
	#hintTimer;
	get busy() {
		return this.status !== "idle" && this.status !== "done";
	}
	async start() {
		this.error = null;
		this.target = { kind: "code" };
		this.progress = null;
		this.stats = null;
		this.tooSlow = false;
		this.status = "connecting";
		this.#hintTimer = setTimeout(() => this.tooSlow = true, MISTYPED_CODE_HINT_DELAY);
		try {
			await Receive(this.code);
		} catch (e) {
			this.error = describeError(e, "receive");
			this.stop();
		}
	}
	/**
	* Enter the connecting state for an accepted trusted-device transfer. The
	* sender starts first; the first receive progress event flips this to receiving once bytes
	* arrive. No mistyped-code hint — there was no code to mistype. The offer is
	* kept as the target so the panel can name the sender and what it is bringing
	* before a single byte has landed.
	*/
	beginTrusted(offer) {
		this.error = null;
		this.target = {
			kind: "device",
			...offer
		};
		this.savedTo = "";
		this.progress = null;
		this.stats = null;
		this.tooSlow = false;
		this.status = "connecting";
	}
	/** True while progress events are still meaningful for this transfer. */
	get transferring() {
		return this.status === "connecting" || this.status === "receiving";
	}
	/** The peer answered: bytes are moving, so the code was right. */
	connected() {
		this.#clearHint();
		if (this.status === "connecting") this.status = "receiving";
	}
	/** Files are on disk at dest. */
	complete(dest) {
		this.#clearHint();
		this.savedTo = dest;
		this.status = "done";
	}
	/** Give up on this attempt but keep the code around to be corrected. */
	stop() {
		this.#clearHint();
		this.status = "idle";
	}
	async cancel() {
		this.#clearHint();
		this.status = "cancelling";
		try {
			await CancelReceive();
		} finally {
			this.#clearTransfer();
		}
	}
	reset() {
		this.#clearTransfer();
		this.code = "";
	}
	#clearTransfer() {
		this.#clearHint();
		this.savedTo = "";
		this.target = { kind: "code" };
		this.progress = null;
		this.stats = null;
		this.status = "idle";
	}
	#clearHint() {
		clearTimeout(this.#hintTimer);
		this.#hintTimer = void 0;
		this.tooSlow = false;
	}
};
var TransferApp = class {
	send = new SendTransfer();
	receive = new ReceiveTransfer();
	/**
	* Subscribe to transfer events; returns the cleanup for onMount. Payloads
	* are typed by the generated bindings (events.rs). Send and receive share
	* one progress/done/error event each, told apart by `kind`.
	*/
	listen() {
		const subs = [
			events.codeEvent.listen((e) => {
				this.send.code = e.payload.code;
				this.send.status = "waiting";
			}),
			events.progressEvent.listen((e) => {
				const p = e.payload;
				if (p.kind === "send") {
					const s = this.send.status;
					if (s === "starting" || s === "waiting" || s === "sending") {
						this.send.stats = p;
						this.send.progress = p.percent;
						this.send.status = "sending";
					}
				} else {
					if (!this.receive.transferring) return;
					this.receive.connected();
					this.receive.stats = p;
					this.receive.progress = p.percent;
				}
			}),
			events.doneEvent.listen((e) => {
				if (e.payload.kind === "send") this.send.complete();
				else this.receive.complete(e.payload.dest);
				haptics.transferDone();
			}),
			events.deepLink.listen((e) => {
				this.receive.code = e.payload.code;
				goto(resolve("/receive"));
			}),
			events.errorEvent.listen((e) => {
				if (e.payload.kind === "send") {
					this.send.error = describeTransferError(e.payload.code, e.payload.message, "send");
					if (this.send.status !== "done") this.send.status = "idle";
				} else {
					this.receive.error = describeTransferError(e.payload.code, e.payload.message, "receive");
					if (this.receive.status !== "done") this.receive.stop();
				}
			})
		];
		return () => subs.forEach((sub) => sub.then((unlisten) => unlisten()));
	}
};
var app = new TransferApp();
//#endregion
export { motionOK as a, haptics as i, X as n, normal as o, Check as r, Spring as s, app as t };
