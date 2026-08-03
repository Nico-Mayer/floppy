import { T as escape_html, c as attributes, g as spread_props, l as bind_props, o as attr_class, w as clsx } from "./index-server.js";
import { i as haptics, n as X, o as normal } from "./transfer-app.svelte.js";
import { A as isNarrow, K as cn, U as Icon, V as Spinner, W as Button, j as isPhoneChrome } from "./StubMark.js";
import { D as errorText } from "./ipc.js";
import { T as Dialog_title$1, _ as Dialog_overlay$1, c as Drawer_header, d as Drawer_content, f as Drawer, g as Dialog_description$1, h as Dialog$1, l as Drawer_footer, m as Dialog_close, p as Dialog_content$1, s as Drawer_title, u as Drawer_description, w as Portal } from "./pairing-app.svelte.js";
import { Format, cancel, checkPermissions, openAppSettings, requestPermissions, scan } from "@tauri-apps/plugin-barcode-scanner";
//#region src/lib/scan.svelte.ts
var ADDED_HOLD = 900;
var CAMERA_WARM = 350;
var chromeIn = () => Math.max(normal(), 50);
var WAIT_SLOW = 12e3;
var WAIT_LIMIT = 45e3;
function canScan() {
	return isPhoneChrome;
}
/** Send the user to the OS settings page for this app, to turn the camera on. */
function openSettings() {
	return openAppSettings();
}
var Scanner = class {
	/** Whether the camera surface is up right now. */
	active = false;
	phase = "aiming";
	/** Why the last code did not work, shown so the user can aim at another one. */
	problem = "";
	/** The other device is taking its time, so the wait says more about itself. */
	slow = false;
	/** The camera has been asked for but is probably not showing anything yet. */
	warming = false;
	#settle = null;
	#timers = [];
	/**
	* Ask for the camera and keep it up until something ends the attempt. `handle`
	* is what to do with a decoded code — it resolves when the pairing is agreed and
	* throws when it is refused. Never throws itself: every way this can end is one
	* of the outcomes, because the caller has somewhere to go in all of them.
	*
	* The permission is settled before the chrome appears, so a refusal never
	* flashes a viewfinder that was never going to work.
	*/
	async run(handle) {
		if (!canScan()) return { kind: "denied" };
		if (this.active) return { kind: "cancelled" };
		try {
			let state = await checkPermissions();
			if (state === "prompt") state = await requestPermissions();
			if (state !== "granted") return { kind: "denied" };
		} catch (error) {
			return {
				kind: "failed",
				message: describe(error)
			};
		}
		this.active = true;
		this.phase = "aiming";
		this.problem = "";
		this.slow = false;
		this.warming = true;
		return new Promise((settle) => {
			this.#settle = settle;
			this.#timers.push(setTimeout(() => void this.#read(handle), chromeIn()));
		});
	}
	/**
	* Go back to the app: no scan, or an answer this person is done waiting for.
	* Available in every phase, because "this is not working" can happen in any of
	* them and the app is what the user wants back.
	*/
	stop() {
		this.#end({ kind: "cancelled" });
	}
	/** Give up on the camera and type the code instead. */
	typeInstead() {
		this.#end({ kind: "type" });
	}
	/**
	* One pass of the camera: read, then live with what came back. A code that is
	* refused loops straight back here with the reason on screen, because the fix is
	* to point at a different code and the camera is already in your hand.
	*/
	async #read(handle) {
		this.warming = true;
		this.#timers.push(setTimeout(() => this.warming = false, CAMERA_WARM));
		let content;
		try {
			content = (await scan({
				windowed: true,
				formats: [Format.QRCode],
				cameraDirection: "back"
			})).content.trim();
		} catch (error) {
			if (looksCancelled(error)) this.#end({ kind: "cancelled" });
			else this.#end({
				kind: "failed",
				message: describe(error)
			});
			return;
		}
		if (!this.#settle) return;
		this.phase = "caught";
		this.problem = "";
		this.slow = false;
		haptics.scanned();
		this.#timers.push(setTimeout(() => this.slow = true, WAIT_SLOW), setTimeout(() => this.#end({
			kind: "failed",
			message: "That device hasn't answered. Try again, or type the code."
		}), WAIT_LIMIT));
		try {
			await handle(content);
		} catch (error) {
			if (!this.#settle) return;
			this.#clearTimers();
			this.phase = "retry";
			this.slow = false;
			this.problem = errorText(error);
			this.#read(handle);
			return;
		}
		if (!this.#settle) return;
		this.#clearTimers();
		this.phase = "added";
		this.slow = false;
		this.#timers.push(setTimeout(() => this.#end({ kind: "paired" }), ADDED_HOLD));
	}
	/**
	* Settle the attempt once, whichever of the ways got here first: the plugin
	* returned, the plugin threw, the user pressed something, or a pairing landed.
	* `cancel()` makes a running `scan()` reject, so a stop would otherwise settle a
	* second time with a cancel the caller has already been told about.
	*/
	#end(outcome) {
		const settle = this.#settle;
		this.#settle = null;
		this.#clearTimers();
		this.active = false;
		this.phase = "aiming";
		this.problem = "";
		this.slow = false;
		this.warming = true;
		cancel().catch(() => {});
		settle?.(outcome);
	}
	#clearTimers() {
		this.#timers.forEach(clearTimeout);
		this.#timers = [];
	}
};
var scanner = new Scanner();
function describe(error) {
	if (error instanceof Error) return error.message;
	return typeof error === "string" ? error : "The camera didn't open. Try again, or type their code.";
}
function looksCancelled(error) {
	const text = (error instanceof Error ? error.message : String(error)).toLowerCase();
	return text.includes("cancel") || text.includes("closed");
}
//#endregion
//#region src/lib/components/ui/dialog/dialog.svelte
function Dialog($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { open = false, $$slots, $$events, ...restProps } = $$props;
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (Dialog$1) {
				$$renderer.push("<!--[-->");
				Dialog$1($$renderer, spread_props([restProps, {
					get open() {
						return open;
					},
					set open($$value) {
						open = $$value;
						$$settled = false;
					}
				}]));
				$$renderer.push("<!--]-->");
			} else {
				$$renderer.push("<!--[!-->");
				$$renderer.push("<!--]-->");
			}
		}
		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);
		$$renderer.subsume($$inner_renderer);
		bind_props($$props, { open });
	});
}
//#endregion
//#region src/lib/components/ui/dialog/dialog-portal.svelte
function Dialog_portal($$renderer, $$props) {
	let { $$slots, $$events, ...restProps } = $$props;
	if (Portal) {
		$$renderer.push("<!--[-->");
		Portal($$renderer, spread_props([restProps]));
		$$renderer.push("<!--]-->");
	} else {
		$$renderer.push("<!--[!-->");
		$$renderer.push("<!--]-->");
	}
}
//#endregion
//#region src/lib/components/ui/dialog/dialog-title.svelte
function Dialog_title($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, $$slots, $$events, ...restProps } = $$props;
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (Dialog_title$1) {
				$$renderer.push("<!--[-->");
				Dialog_title$1($$renderer, spread_props([
					{
						"data-slot": "dialog-title",
						class: cn("font-heading text-base leading-none font-medium", className)
					},
					restProps,
					{
						get ref() {
							return ref;
						},
						set ref($$value) {
							ref = $$value;
							$$settled = false;
						}
					}
				]));
				$$renderer.push("<!--]-->");
			} else {
				$$renderer.push("<!--[!-->");
				$$renderer.push("<!--]-->");
			}
		}
		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);
		$$renderer.subsume($$inner_renderer);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region src/lib/components/ui/dialog/dialog-footer.svelte
function Dialog_footer($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, children, showCloseButton = false, $$slots, $$events, ...restProps } = $$props;
		$$renderer.push(`<div${attributes({
			"data-slot": "dialog-footer",
			class: clsx(cn("gap-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)),
			...restProps
		})}>`);
		children?.($$renderer);
		$$renderer.push(`<!----> `);
		if (showCloseButton) {
			$$renderer.push("<!--[0-->");
			{
				function child($$renderer, { props }) {
					Button($$renderer, spread_props([
						{ variant: "outline" },
						props,
						{
							children: ($$renderer) => {
								$$renderer.push(`<!---->Close`);
							},
							$$slots: { default: true }
						}
					]));
				}
				if (Dialog_close) {
					$$renderer.push("<!--[-->");
					Dialog_close($$renderer, {
						child,
						$$slots: { child: true }
					});
					$$renderer.push("<!--]-->");
				} else {
					$$renderer.push("<!--[!-->");
					$$renderer.push("<!--]-->");
				}
			}
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--></div>`);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region src/lib/components/ui/dialog/dialog-header.svelte
function Dialog_header($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, children, $$slots, $$events, ...restProps } = $$props;
		$$renderer.push(`<div${attributes({
			"data-slot": "dialog-header",
			class: clsx(cn("gap-1.5 flex flex-col", className)),
			...restProps
		})}>`);
		children?.($$renderer);
		$$renderer.push(`<!----></div>`);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region src/lib/components/ui/dialog/dialog-overlay.svelte
function Dialog_overlay($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, $$slots, $$events, ...restProps } = $$props;
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (Dialog_overlay$1) {
				$$renderer.push("<!--[-->");
				Dialog_overlay$1($$renderer, spread_props([
					{
						"data-slot": "dialog-overlay",
						class: cn("data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 bg-black/30 duration-100 supports-backdrop-filter:backdrop-blur-sm fixed inset-0 isolate z-50", className)
					},
					restProps,
					{
						get ref() {
							return ref;
						},
						set ref($$value) {
							ref = $$value;
							$$settled = false;
						}
					}
				]));
				$$renderer.push("<!--]-->");
			} else {
				$$renderer.push("<!--[!-->");
				$$renderer.push("<!--]-->");
			}
		}
		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);
		$$renderer.subsume($$inner_renderer);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region src/lib/components/ui/dialog/dialog-content.svelte
function Dialog_content($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, portalProps, children, showCloseButton = true, $$slots, $$events, ...restProps } = $$props;
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			Dialog_portal($$renderer, spread_props([portalProps, {
				children: ($$renderer) => {
					if (Dialog_overlay) {
						$$renderer.push("<!--[-->");
						Dialog_overlay($$renderer, {});
						$$renderer.push("<!--]-->");
					} else {
						$$renderer.push("<!--[!-->");
						$$renderer.push("<!--]-->");
					}
					$$renderer.push(` `);
					if (Dialog_content$1) {
						$$renderer.push("<!--[-->");
						Dialog_content$1($$renderer, spread_props([
							{
								"data-slot": "dialog-content",
								class: cn("bg-popover text-popover-foreground data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 ring-foreground/5 dark:ring-foreground/10 grid max-w-[calc(100%-2rem)] gap-6 rounded-4xl p-6 text-sm shadow-xl ring-1 duration-100 sm:max-w-md fixed top-1/2 left-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2 outline-none", className)
							},
							restProps,
							{
								get ref() {
									return ref;
								},
								set ref($$value) {
									ref = $$value;
									$$settled = false;
								},
								children: ($$renderer) => {
									children?.($$renderer);
									$$renderer.push(`<!----> `);
									if (showCloseButton) {
										$$renderer.push("<!--[0-->");
										{
											function child($$renderer, { props }) {
												Button($$renderer, spread_props([
													{
														variant: "ghost",
														class: "bg-secondary absolute top-4 right-4",
														size: "icon-sm"
													},
													props,
													{
														children: ($$renderer) => {
															X($$renderer, {});
															$$renderer.push(`<!----> <span class="sr-only">Close</span>`);
														},
														$$slots: { default: true }
													}
												]));
											}
											if (Dialog_close) {
												$$renderer.push("<!--[-->");
												Dialog_close($$renderer, {
													"data-slot": "dialog-close",
													child,
													$$slots: { child: true }
												});
												$$renderer.push("<!--]-->");
											} else {
												$$renderer.push("<!--[!-->");
												$$renderer.push("<!--]-->");
											}
										}
									} else $$renderer.push("<!--[-1-->");
									$$renderer.push(`<!--]-->`);
								},
								$$slots: { default: true }
							}
						]));
						$$renderer.push("<!--]-->");
					} else {
						$$renderer.push("<!--[!-->");
						$$renderer.push("<!--]-->");
					}
				},
				$$slots: { default: true }
			}]));
		}
		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);
		$$renderer.subsume($$inner_renderer);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region src/lib/components/ui/dialog/dialog-description.svelte
function Dialog_description($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, $$slots, $$events, ...restProps } = $$props;
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (Dialog_description$1) {
				$$renderer.push("<!--[-->");
				Dialog_description$1($$renderer, spread_props([
					{
						"data-slot": "dialog-description",
						class: cn("text-muted-foreground *:[a]:hover:text-foreground text-sm *:[a]:underline *:[a]:underline-offset-3", className)
					},
					restProps,
					{
						get ref() {
							return ref;
						},
						set ref($$value) {
							ref = $$value;
							$$settled = false;
						}
					}
				]));
				$$renderer.push("<!--]-->");
			} else {
				$$renderer.push("<!--[!-->");
				$$renderer.push("<!--]-->");
			}
		}
		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);
		$$renderer.subsume($$inner_renderer);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region src/lib/components/ui/responsive-dialog/context.ts
/** Reactive — read inside markup or `$derived` and it re-renders across the breakpoint. */
function isDesktop() {
	return !isNarrow();
}
//#endregion
//#region src/lib/components/ui/responsive-dialog/responsive-dialog.svelte
function Responsive_dialog($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { open = false, onOpenChange, children } = $$props;
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (isDesktop()) {
				$$renderer.push("<!--[0-->");
				if (Dialog) {
					$$renderer.push("<!--[-->");
					Dialog($$renderer, {
						onOpenChange,
						get open() {
							return open;
						},
						set open($$value) {
							open = $$value;
							$$settled = false;
						},
						children: ($$renderer) => {
							children($$renderer);
							$$renderer.push(`<!---->`);
						},
						$$slots: { default: true }
					});
					$$renderer.push("<!--]-->");
				} else {
					$$renderer.push("<!--[!-->");
					$$renderer.push("<!--]-->");
				}
			} else {
				$$renderer.push("<!--[-1-->");
				if (Drawer) {
					$$renderer.push("<!--[-->");
					Drawer($$renderer, {
						onOpenChange,
						get open() {
							return open;
						},
						set open($$value) {
							open = $$value;
							$$settled = false;
						},
						children: ($$renderer) => {
							children($$renderer);
							$$renderer.push(`<!---->`);
						},
						$$slots: { default: true }
					});
					$$renderer.push("<!--]-->");
				} else {
					$$renderer.push("<!--[!-->");
					$$renderer.push("<!--]-->");
				}
			}
			$$renderer.push(`<!--]-->`);
		}
		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);
		$$renderer.subsume($$inner_renderer);
		bind_props($$props, { open });
	});
}
//#endregion
//#region src/lib/components/ui/responsive-dialog/responsive-dialog-content.svelte
function Responsive_dialog_content($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { class: className, children, $$slots, $$events, ...restProps } = $$props;
		if (isDesktop()) {
			$$renderer.push("<!--[0-->");
			if (Dialog_content) {
				$$renderer.push("<!--[-->");
				Dialog_content($$renderer, spread_props([
					{ class: className },
					restProps,
					{
						children: ($$renderer) => {
							children($$renderer);
							$$renderer.push(`<!---->`);
						},
						$$slots: { default: true }
					}
				]));
				$$renderer.push("<!--]-->");
			} else {
				$$renderer.push("<!--[!-->");
				$$renderer.push("<!--]-->");
			}
		} else {
			$$renderer.push("<!--[-1-->");
			if (Drawer_content) {
				$$renderer.push("<!--[-->");
				Drawer_content($$renderer, spread_props([
					{ class: className },
					restProps,
					{
						children: ($$renderer) => {
							children($$renderer);
							$$renderer.push(`<!---->`);
						},
						$$slots: { default: true }
					}
				]));
				$$renderer.push("<!--]-->");
			} else {
				$$renderer.push("<!--[!-->");
				$$renderer.push("<!--]-->");
			}
		}
		$$renderer.push(`<!--]-->`);
	});
}
//#endregion
//#region src/lib/components/ui/responsive-dialog/responsive-dialog-header.svelte
function Responsive_dialog_header($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { class: className, children, $$slots, $$events, ...restProps } = $$props;
		if (isDesktop()) {
			$$renderer.push("<!--[0-->");
			if (Dialog_header) {
				$$renderer.push("<!--[-->");
				Dialog_header($$renderer, spread_props([
					{ class: className },
					restProps,
					{
						children: ($$renderer) => {
							children($$renderer);
							$$renderer.push(`<!---->`);
						},
						$$slots: { default: true }
					}
				]));
				$$renderer.push("<!--]-->");
			} else {
				$$renderer.push("<!--[!-->");
				$$renderer.push("<!--]-->");
			}
		} else {
			$$renderer.push("<!--[-1-->");
			if (Drawer_header) {
				$$renderer.push("<!--[-->");
				Drawer_header($$renderer, spread_props([
					{ class: className },
					restProps,
					{
						children: ($$renderer) => {
							children($$renderer);
							$$renderer.push(`<!---->`);
						},
						$$slots: { default: true }
					}
				]));
				$$renderer.push("<!--]-->");
			} else {
				$$renderer.push("<!--[!-->");
				$$renderer.push("<!--]-->");
			}
		}
		$$renderer.push(`<!--]-->`);
	});
}
//#endregion
//#region src/lib/components/ui/responsive-dialog/responsive-dialog-body.svelte
function Responsive_dialog_body($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { class: className, children } = $$props;
		if (isDesktop()) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div${attr_class(clsx(className))}>`);
			children($$renderer);
			$$renderer.push(`<!----></div>`);
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<div${attr_class(clsx(cn("px-4", className)))}>`);
			children($$renderer);
			$$renderer.push(`<!----></div>`);
		}
		$$renderer.push(`<!--]-->`);
	});
}
//#endregion
//#region src/lib/components/ui/responsive-dialog/responsive-dialog-footer.svelte
function Responsive_dialog_footer($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { class: className, children, $$slots, $$events, ...restProps } = $$props;
		if (isDesktop()) {
			$$renderer.push("<!--[0-->");
			if (Dialog_footer) {
				$$renderer.push("<!--[-->");
				Dialog_footer($$renderer, spread_props([
					{ class: className },
					restProps,
					{
						children: ($$renderer) => {
							children($$renderer);
							$$renderer.push(`<!---->`);
						},
						$$slots: { default: true }
					}
				]));
				$$renderer.push("<!--]-->");
			} else {
				$$renderer.push("<!--[!-->");
				$$renderer.push("<!--]-->");
			}
		} else {
			$$renderer.push("<!--[-1-->");
			if (Drawer_footer) {
				$$renderer.push("<!--[-->");
				Drawer_footer($$renderer, spread_props([
					{ class: className },
					restProps,
					{
						children: ($$renderer) => {
							children($$renderer);
							$$renderer.push(`<!---->`);
						},
						$$slots: { default: true }
					}
				]));
				$$renderer.push("<!--]-->");
			} else {
				$$renderer.push("<!--[!-->");
				$$renderer.push("<!--]-->");
			}
		}
		$$renderer.push(`<!--]-->`);
	});
}
//#endregion
//#region src/lib/components/ui/responsive-dialog/responsive-dialog-title.svelte
function Responsive_dialog_title($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { class: className, children, $$slots, $$events, ...restProps } = $$props;
		if (isDesktop()) {
			$$renderer.push("<!--[0-->");
			if (Dialog_title) {
				$$renderer.push("<!--[-->");
				Dialog_title($$renderer, spread_props([
					{ class: className },
					restProps,
					{
						children: ($$renderer) => {
							children($$renderer);
							$$renderer.push(`<!---->`);
						},
						$$slots: { default: true }
					}
				]));
				$$renderer.push("<!--]-->");
			} else {
				$$renderer.push("<!--[!-->");
				$$renderer.push("<!--]-->");
			}
		} else {
			$$renderer.push("<!--[-1-->");
			if (Drawer_title) {
				$$renderer.push("<!--[-->");
				Drawer_title($$renderer, spread_props([
					{ class: className },
					restProps,
					{
						children: ($$renderer) => {
							children($$renderer);
							$$renderer.push(`<!---->`);
						},
						$$slots: { default: true }
					}
				]));
				$$renderer.push("<!--]-->");
			} else {
				$$renderer.push("<!--[!-->");
				$$renderer.push("<!--]-->");
			}
		}
		$$renderer.push(`<!--]-->`);
	});
}
//#endregion
//#region src/lib/components/ui/responsive-dialog/responsive-dialog-description.svelte
function Responsive_dialog_description($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { class: className, children, $$slots, $$events, ...restProps } = $$props;
		if (isDesktop()) {
			$$renderer.push("<!--[0-->");
			if (Dialog_description) {
				$$renderer.push("<!--[-->");
				Dialog_description($$renderer, spread_props([
					{ class: className },
					restProps,
					{
						children: ($$renderer) => {
							children($$renderer);
							$$renderer.push(`<!---->`);
						},
						$$slots: { default: true }
					}
				]));
				$$renderer.push("<!--]-->");
			} else {
				$$renderer.push("<!--[!-->");
				$$renderer.push("<!--]-->");
			}
		} else {
			$$renderer.push("<!--[-1-->");
			if (Drawer_description) {
				$$renderer.push("<!--[-->");
				Drawer_description($$renderer, spread_props([
					{ class: className },
					restProps,
					{
						children: ($$renderer) => {
							children($$renderer);
							$$renderer.push(`<!---->`);
						},
						$$slots: { default: true }
					}
				]));
				$$renderer.push("<!--]-->");
			} else {
				$$renderer.push("<!--[!-->");
				$$renderer.push("<!--]-->");
			}
		}
		$$renderer.push(`<!--]-->`);
	});
}
//#endregion
//#region src/lib/components/feedback/BusyButton.svelte
function BusyButton($$renderer, $$props) {
	let { pending = false, pendingLabel, disabled, children, $$slots, $$events, ...rest } = $$props;
	Button($$renderer, spread_props([rest, {
		disabled: disabled || pending,
		children: ($$renderer) => {
			if (pending) {
				$$renderer.push("<!--[0-->");
				Spinner($$renderer, { "data-icon": "inline-start" });
				$$renderer.push(`<!----> ${escape_html(pendingLabel)}`);
			} else {
				$$renderer.push("<!--[-1-->");
				children?.($$renderer);
				$$renderer.push(`<!---->`);
			}
			$$renderer.push(`<!--]-->`);
		},
		$$slots: { default: true }
	}]));
}
//#endregion
//#region src/lib/components/ui/skeleton/skeleton.svelte
function Skeleton($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, $$slots, $$events, ...restProps } = $$props;
		$$renderer.push(`<div${attributes({
			"data-slot": "skeleton",
			class: clsx(cn("rounded-2xl bg-muted animate-pulse", className)),
			...restProps
		})}></div>`);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region node_modules/@lucide/svelte/dist/icons/info.svelte
function Info($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "info" },
		props,
		{ iconNode: [
			["circle", {
				"cx": "12",
				"cy": "12",
				"r": "10"
			}],
			["path", { "d": "M12 16v-4" }],
			["path", { "d": "M12 8h.01" }]
		] }
	]));
}
//#endregion
export { Responsive_dialog_title as a, Responsive_dialog_header as c, canScan as d, openSettings as f, Responsive_dialog_description as i, Responsive_dialog_content as l, Skeleton as n, Responsive_dialog_footer as o, scanner as p, BusyButton as r, Responsive_dialog_body as s, Info as t, Responsive_dialog as u };
