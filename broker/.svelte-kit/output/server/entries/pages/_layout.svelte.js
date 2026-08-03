import { C as attr, K as run, S as setContext, T as escape_html, _ as stringify, b as getContext, c as attributes, f as ensure_array_like, g as spread_props, k as on, l as bind_props, o as attr_class, s as attr_style, u as derived, w as clsx, x as hasContext } from "../../chunks/index-server.js";
import { n as resolve, t as asset } from "../../chunks/paths.js";
import { i as haptics, n as X, r as Check, t as app } from "../../chunks/transfer-app.svelte.js";
import { t as page } from "../../chunks/state.js";
import { B as createSubscriber, H as Loader_circle, K as cn, L as MediaQuery, N as isWindows, U as Icon, V as Spinner, W as Button, j as isPhoneChrome, k as isMac, m as mergeProps, t as StubMark } from "../../chunks/StubMark.js";
import { C as Window } from "../../chunks/ipc.js";
import { a as Responsive_dialog_title, c as Responsive_dialog_header, i as Responsive_dialog_description, l as Responsive_dialog_content, o as Responsive_dialog_footer, p as scanner, r as BusyButton, s as Responsive_dialog_body, t as Info, u as Responsive_dialog } from "../../chunks/info.js";
import { t as Separator } from "../../chunks/separator.js";
import { T as Dialog_title, _ as Dialog_overlay, a as cn$1, g as Dialog_description, h as Dialog, i as toastState, m as Dialog_close, n as SonnerState, p as Dialog_content, t as pairing, w as Portal } from "../../chunks/pairing-app.svelte.js";
import { a as Tooltip_content, i as Tooltip_provider, n as Tooltip, r as Tooltip_trigger, t as Triangle_alert } from "../../chunks/triangle-alert.js";
import { a as Avatar, i as Avatar_fallback, r as platformNavItems, t as User } from "../../chunks/user.js";
import { n as formatBytes } from "../../chunks/format.js";
import { t as Download } from "../../chunks/download.js";
import { n as setMode, r as derivedMode, t as Mode_watcher } from "../../chunks/dist.js";
import { tv } from "tailwind-variants";
import "@tauri-apps/api/window";
import "@tauri-apps/api/app";
import "@tauri-apps/api/webview";
//#region node_modules/@lucide/svelte/dist/icons/keyboard.svelte
function Keyboard($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "keyboard" },
		props,
		{ iconNode: [
			["path", { "d": "M10 8h.01" }],
			["path", { "d": "M12 12h.01" }],
			["path", { "d": "M14 8h.01" }],
			["path", { "d": "M16 12h.01" }],
			["path", { "d": "M18 8h.01" }],
			["path", { "d": "M6 8h.01" }],
			["path", { "d": "M7 16h10" }],
			["path", { "d": "M8 12h.01" }],
			["rect", {
				"width": "20",
				"height": "16",
				"x": "2",
				"y": "4",
				"rx": "2"
			}]
		] }
	]));
}
//#endregion
//#region src/lib/components/devices/ScanSheet.svelte
function ScanSheet($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const phase = derived(() => scanner.phase);
		/**
		* How the window is painted, and how hard everything around it is dimmed.
		*
		* While the camera is starting or stopping there is nothing to frame, so the frame
		* stops existing: the window goes black and the dimming goes fully opaque, which
		* makes the whole screen one black field. A lit panel floating in a dimmed screen
		* is what a square with `bg-popover` looked like, and it read as a mistake.
		*
		* Holding a result is the opposite case — the spinner and the check have to be
		* legible — so there the window is a panel on purpose.
		*/
		const window_ = derived(() => scanner.warming ? "bg-black shadow-[0_0_0_100vmax_rgb(0_0_0/1)]" : phase() === "caught" || phase() === "added" ? "bg-popover shadow-[0_0_0_100vmax_rgb(0_0_0/0.72)]" : "shadow-[0_0_0_100vmax_rgb(0_0_0/0.72)]");
		const headline = derived(() => ({
			aiming: "Point at the code on your other device",
			caught: "Got that. Asking them to link…",
			added: "Added",
			retry: "That code didn't work"
		})[phase()]);
		const hint = derived(() => ({
			aiming: "Open Devices there and press the code button to show it.",
			caught: scanner.slow ? "Still waiting. Someone has to say yes on that device." : "They just have to say yes.",
			added: "You can send to it without a code from now on.",
			retry: scanner.problem
		})[phase()]);
		/**
		* `added` is the only phase with nothing to escape: it is under a second long and
		* it already succeeded. Everything else keeps a way out, including the wait — a
		* pairing waits on a person looking at another phone, and that person may not be
		* in the room.
		*/
		const escapable = derived(() => phase() !== "added");
		if (scanner.active) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div class="fixed inset-0 z-(--z-scanner) flex flex-col"><div class="relative z-10 flex justify-end p-4 pt-[calc(var(--safe-top)+--spacing(4))]">`);
			if (escapable()) {
				$$renderer.push("<!--[0-->");
				Button($$renderer, {
					variant: "secondary",
					size: "icon",
					"aria-label": phase() === "caught" ? "Stop waiting" : "Stop scanning",
					onclick: () => scanner.stop(),
					children: ($$renderer) => {
						X($$renderer, {});
					},
					$$slots: { default: true }
				});
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--></div> <div class="relative z-0 flex flex-1 items-center justify-center p-8"><div${attr_class(clsx([
				"relative flex aspect-square w-full max-w-72 items-center justify-center rounded-4xl",
				"transition-[background-color,box-shadow] duration-300",
				window_()
			]))}>`);
			if (scanner.warming && phase() === "aiming") $$renderer.push("<!--[0-->");
			else if (phase() === "caught") {
				$$renderer.push("<!--[1-->");
				Spinner($$renderer, {
					size: "panel",
					class: "text-muted-foreground"
				});
			} else if (phase() === "added") {
				$$renderer.push("<!--[2-->");
				$$renderer.push(`<span class="flex size-16 animate-pop items-center justify-center rounded-full bg-receive/15 text-receive">`);
				Check($$renderer, { class: "size-8" });
				$$renderer.push(`<!----></span>`);
			} else {
				$$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--[-->`);
				const each_array = ensure_array_like([
					["-top-1 -left-1", "rounded-tl-4xl border-t-4 border-l-4"],
					["-top-1 -right-1", "rounded-tr-4xl border-t-4 border-r-4"],
					["-bottom-1 -left-1", "rounded-bl-4xl border-b-4 border-l-4"],
					["-bottom-1 -right-1", "rounded-br-4xl border-b-4 border-r-4"]
				]);
				for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
					let [place, edges] = each_array[$$index];
					$$renderer.push(`<span${attr_class(`absolute size-10 border-white/90 ${stringify(place)} ${stringify(edges)}`)}></span>`);
				}
				$$renderer.push(`<!--]-->`);
			}
			$$renderer.push(`<!--]--></div></div> <div class="relative z-10 rounded-t-4xl bg-popover p-4 pb-[calc(var(--safe-bottom)+--spacing(4))] shadow-xl"><div class="mx-auto flex w-full max-w-sm flex-col gap-3 text-center"><p class="text-sm font-medium">${escape_html(headline())}</p> <p${attr_class(clsx(["text-xs", phase() === "retry" ? "text-destructive" : "text-muted-foreground"]))}>${escape_html(hint())}</p> `);
			if (phase() === "aiming" || phase() === "retry" || phase() === "caught" && scanner.slow) {
				$$renderer.push("<!--[0-->");
				Button($$renderer, {
					variant: "secondary",
					class: "w-full",
					onclick: () => scanner.typeInstead(),
					children: ($$renderer) => {
						Keyboard($$renderer, { "data-icon": "inline-start" });
						$$renderer.push(`<!----> Type the code instead`);
					},
					$$slots: { default: true }
				});
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--></div></div></div>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
	});
}
//#endregion
//#region node_modules/svelte-sonner/dist/Loader.svelte
var bars = Array(12).fill(0);
function Loader($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		"use strict";
		let { visible, class: className } = $$props;
		$$renderer.push(`<div${attr_class(clsx(["sonner-loading-wrapper", className].filter(Boolean).join(" ")))}${attr("data-visible", visible)}><div class="sonner-spinner"><!--[-->`);
		const each_array = ensure_array_like(bars);
		for (let i = 0, $$length = each_array.length; i < $$length; i++) {
			each_array[i];
			$$renderer.push(`<div class="sonner-loading-bar"></div>`);
		}
		$$renderer.push(`<!--]--></div></div>`);
	});
}
//#endregion
//#region node_modules/svelte-sonner/node_modules/runed/dist/internal/configurable-globals.js
var defaultWindow = void 0;
//#endregion
//#region node_modules/svelte-sonner/node_modules/runed/dist/internal/utils/dom.js
/**
* Handles getting the active element in a document or shadow root.
* If the active element is within a shadow root, it will traverse the shadow root
* to find the active element.
* If not, it will return the active element in the document.
*
* @param document A document or shadow root to get the active element from.
* @returns The active element in the document or shadow root.
*/
function getActiveElement(document) {
	let activeElement = document.activeElement;
	while (activeElement?.shadowRoot) {
		const node = activeElement.shadowRoot.activeElement;
		if (node === activeElement) break;
		else activeElement = node;
	}
	return activeElement;
}
//#endregion
//#region node_modules/svelte-sonner/node_modules/runed/dist/utilities/active-element/active-element.svelte.js
var ActiveElement = class {
	#document;
	#subscribe;
	constructor(options = {}) {
		const { window = defaultWindow, document = window?.document } = options;
		if (window === void 0) return;
		this.#document = document;
		this.#subscribe = createSubscriber((update) => {
			const cleanupFocusIn = on(window, "focusin", update);
			const cleanupFocusOut = on(window, "focusout", update);
			return () => {
				cleanupFocusIn();
				cleanupFocusOut();
			};
		});
	}
	get current() {
		this.#subscribe?.();
		if (!this.#document) return null;
		return getActiveElement(this.#document);
	}
};
new ActiveElement();
//#endregion
//#region node_modules/svelte-sonner/node_modules/runed/dist/utilities/context/context.js
var Context = class {
	#name;
	#key;
	/**
	* @param name The name of the context.
	* This is used for generating the context key and error messages.
	*/
	constructor(name) {
		this.#name = name;
		this.#key = Symbol(name);
	}
	/**
	* The key used to get and set the context.
	*
	* It is not recommended to use this value directly.
	* Instead, use the methods provided by this class.
	*/
	get key() {
		return this.#key;
	}
	/**
	* Checks whether this has been set in the context of a parent component.
	*
	* Must be called during component initialisation.
	*/
	exists() {
		return hasContext(this.#key);
	}
	/**
	* Retrieves the context that belongs to the closest parent component.
	*
	* Must be called during component initialisation.
	*
	* @throws An error if the context does not exist.
	*/
	get() {
		const context = getContext(this.#key);
		if (context === void 0) throw new Error(`Context "${this.#name}" not found`);
		return context;
	}
	/**
	* Retrieves the context that belongs to the closest parent component,
	* or the given fallback value if the context does not exist.
	*
	* Must be called during component initialisation.
	*/
	getOr(fallback) {
		const context = getContext(this.#key);
		if (context === void 0) return fallback;
		return context;
	}
	/**
	* Associates the given value with the current component and returns it.
	*
	* Must be called during component initialisation.
	*/
	set(context) {
		return setContext(this.#key, context);
	}
};
//#endregion
//#region node_modules/svelte-sonner/node_modules/runed/dist/utilities/watch/watch.svelte.js
function runWatcher(sources, flush, effect, options = {}) {
	const { lazy = false } = options;
}
function watch(sources, effect, options) {
	runWatcher(sources, "post", effect, options);
}
function watchPre(sources, effect, options) {
	runWatcher(sources, "pre", effect, options);
}
watch.pre = watchPre;
function watchOnce(source, effect) {}
function watchOncePre(source, effect) {}
watchOnce.pre = watchOncePre;
//#endregion
//#region node_modules/svelte-sonner/node_modules/runed/dist/utilities/resource/resource.svelte.js
function debounce(fn, delay) {
	let timeoutId;
	let lastResolve = null;
	return (...args) => {
		return new Promise((resolve) => {
			if (lastResolve) lastResolve(void 0);
			lastResolve = resolve;
			clearTimeout(timeoutId);
			timeoutId = setTimeout(async () => {
				const result = await fn(...args);
				if (lastResolve) {
					lastResolve(result);
					lastResolve = null;
				}
			}, delay);
		});
	};
}
function throttle(fn, delay) {
	let lastRun = 0;
	let lastPromise = null;
	return (...args) => {
		const now = Date.now();
		if (lastRun && now - lastRun < delay) return lastPromise ?? Promise.resolve(void 0);
		lastRun = now;
		lastPromise = fn(...args);
		return lastPromise;
	};
}
function runResource(source, fetcher, options = {}, effectFn) {
	const { lazy = false, once = false, initialValue, debounce: debounceTime, throttle: throttleTime } = options;
	let current = initialValue;
	let loading = false;
	let error = void 0;
	let cleanupFns = [];
	const runCleanup = () => {
		cleanupFns.forEach((fn) => fn());
		cleanupFns = [];
	};
	const onCleanup = (fn) => {
		cleanupFns = [...cleanupFns, fn];
	};
	const baseFetcher = async (value, previousValue, refetching = false) => {
		try {
			loading = true;
			error = void 0;
			runCleanup();
			const controller = new AbortController();
			onCleanup(() => controller.abort());
			const result = await fetcher(value, previousValue, {
				data: current,
				refetching,
				onCleanup,
				signal: controller.signal
			});
			current = result;
			return result;
		} catch (e) {
			if (!(e instanceof DOMException && e.name === "AbortError")) error = e;
			return;
		} finally {
			loading = false;
		}
	};
	const runFetcher = debounceTime ? debounce(baseFetcher, debounceTime) : throttleTime ? throttle(baseFetcher, throttleTime) : baseFetcher;
	const sources = Array.isArray(source) ? source : [source];
	let prevValues;
	effectFn((values, previousValues) => {
		if (once && prevValues) return;
		prevValues = values;
		runFetcher(Array.isArray(source) ? values : values[0], Array.isArray(source) ? previousValues : previousValues?.[0]);
	}, { lazy });
	return {
		get current() {
			return current;
		},
		get loading() {
			return loading;
		},
		get error() {
			return error;
		},
		mutate: (value) => {
			current = value;
		},
		refetch: (info) => {
			const values = sources.map((s) => s());
			return runFetcher(Array.isArray(source) ? values : values[0], Array.isArray(source) ? values : values[0], info ?? true);
		}
	};
}
function resource(source, fetcher, options) {
	return runResource(source, fetcher, options, (fn, options) => {
		const sources = Array.isArray(source) ? source : [source];
		const getters = () => sources.map((s) => s());
		watch(getters, (values, previousValues) => {
			fn(values, previousValues ?? []);
		}, options);
	});
}
function resourcePre(source, fetcher, options) {
	return runResource(source, fetcher, options, (fn, options) => {
		const sources = Array.isArray(source) ? source : [source];
		const getter = () => sources.map((s) => s());
		watch.pre(getter, (values, previousValues) => {
			fn(values, previousValues ?? []);
		}, options);
	});
}
resource.pre = resourcePre;
new Context("richColorsContext");
var sonnerContext = new Context("<Toaster/>");
//#endregion
//#region node_modules/svelte-sonner/dist/types.js
function isAction(action) {
	return action.label !== void 0;
}
//#endregion
//#region node_modules/svelte-sonner/dist/internal/use-document-hidden.svelte.js
function useDocumentHidden() {
	let current = typeof document !== "undefined" ? document.hidden : false;
	return { get current() {
		return current;
	} };
}
//#endregion
//#region node_modules/svelte-sonner/dist/Toast.svelte
var TOAST_LIFETIME$1 = 4e3;
var GAP$1 = 14;
var TIME_BEFORE_UNMOUNT = 200;
var DEFAULT_TOAST_CLASSES = {
	toast: "",
	title: "",
	description: "",
	loader: "",
	closeButton: "",
	cancelButton: "",
	actionButton: "",
	action: "",
	warning: "",
	error: "",
	success: "",
	default: "",
	info: "",
	loading: ""
};
function Toast($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { toast, index, expanded, invert: invertFromToaster, position, visibleToasts, expandByDefault, closeButton: closeButtonFromToaster, interacting, cancelButtonStyle = "", actionButtonStyle = "", duration: durationFromToaster, descriptionClass = "", classes: classesProp, unstyled = false, loadingIcon, successIcon, errorIcon, warningIcon, closeIcon, infoIcon, defaultRichColors = false, swipeDirections: swipeDirectionsProp, closeButtonAriaLabel, pauseWhenPageIsHidden, $$slots, $$events, ...restProps } = $$props;
		const defaultClasses = { ...DEFAULT_TOAST_CLASSES };
		let mounted = false;
		let removed = false;
		let swiping = false;
		let swipeOut = false;
		let isSwiped = false;
		let offsetBeforeRemove = 0;
		let initialHeight = 0;
		toast.duration;
		let swipeOutDirection = null;
		const isFront = derived(() => index === 0);
		const isVisible = derived(() => index + 1 <= visibleToasts);
		const toastType = derived(() => toast.type);
		const dismissible = derived(() => toast.dismissible !== void 0 ? toast.dismissible !== false : toast.dismissable !== false);
		const toastClass = derived(() => toast.class || "");
		const toastDescriptionClass = derived(() => toast.descriptionClass || "");
		const heightIndex = derived(() => toastState.heights.findIndex((height) => height.toastId === toast.id) || 0);
		const closeButton = derived(() => toast.closeButton ?? closeButtonFromToaster);
		derived(() => toast.duration ?? durationFromToaster ?? TOAST_LIFETIME$1);
		const coords = derived(() => position.split("-"));
		const toastsHeightBefore = derived(() => toastState.heights.reduce((prev, curr, reducerIndex) => {
			if (reducerIndex >= heightIndex()) return prev;
			return prev + curr.height;
		}, 0));
		useDocumentHidden();
		const invert = derived(() => toast.invert || invertFromToaster);
		const disabled = derived(() => toastType() === "loading");
		const classes = derived(() => ({
			...defaultClasses,
			...classesProp
		}));
		derived(() => toast.title);
		derived(() => toast.description);
		const offset = derived(() => Math.round(heightIndex() * GAP$1 + toastsHeightBefore()));
		function deleteToast() {
			removed = true;
			offsetBeforeRemove = offset();
			toastState.removeHeight(toast.id);
			setTimeout(() => {
				toastState.remove(toast.id);
			}, TIME_BEFORE_UNMOUNT);
		}
		derived(() => toast.promise && toastType() === "loading" || toast.duration === Number.POSITIVE_INFINITY);
		const icon = derived(() => {
			if (toast.icon) return toast.icon;
			if (toastType() === "success") return successIcon;
			if (toastType() === "error") return errorIcon;
			if (toastType() === "warning") return warningIcon;
			if (toastType() === "info") return infoIcon;
			if (toastType() === "loading") return loadingIcon;
			return null;
		});
		function LoadingIcon($$renderer) {
			if (loadingIcon) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<div${attr_class(clsx(cn$1(classes()?.loader, toast?.classes?.loader, "sonner-loader")))}${attr("data-visible", toastType() === "loading")}>`);
				loadingIcon($$renderer);
				$$renderer.push(`<!----></div>`);
			} else {
				$$renderer.push("<!--[-1-->");
				Loader($$renderer, {
					class: cn$1(classes()?.loader, toast.classes?.loader),
					visible: toastType() === "loading"
				});
			}
			$$renderer.push(`<!--]-->`);
		}
		$$renderer.push(`<li${attr("tabindex", 0)}${attr_class(clsx(cn$1(restProps.class, toastClass(), classes()?.toast, toast?.classes?.toast, classes()?.[toastType()], toast?.classes?.[toastType()])))}${attr("aria-live", toast.important ? "assertive" : "polite")} aria-atomic="true" data-sonner-toast=""${attr("data-rich-colors", toast.richColors ?? defaultRichColors)}${attr("data-styled", !(toast.component || toast.unstyled || unstyled))}${attr("data-mounted", mounted)}${attr("data-promise", Boolean(toast.promise))}${attr("data-swiped", isSwiped)}${attr("data-removed", removed)}${attr("data-visible", isVisible())}${attr("data-y-position", coords()[0])}${attr("data-x-position", coords()[1])}${attr("data-index", index)}${attr("data-front", isFront())}${attr("data-swiping", swiping)}${attr("data-dismissible", dismissible())}${attr("data-type", toastType())}${attr("data-invert", invert())}${attr("data-swipe-out", swipeOut)}${attr("data-swipe-direction", swipeOutDirection)}${attr("data-expanded", Boolean(expanded || expandByDefault && mounted))}${attr_style(`${restProps.style} ${toast.style}`, {
			"--index": index,
			"--toasts-before": index,
			"--z-index": toastState.toasts.length - index,
			"--offset": `${removed ? offsetBeforeRemove : offset()}px`,
			"--initial-height": expandByDefault ? "auto" : `${initialHeight}px`
		})}>`);
		if (closeButton() && !toast.component && toastType() !== "loading" && closeIcon !== null) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<button${attr("aria-label", closeButtonAriaLabel)}${attr("data-disabled", disabled())} data-close-button=""${attr_class(clsx(cn$1(classes()?.closeButton, toast?.classes?.closeButton)))}>`);
			closeIcon?.($$renderer);
			$$renderer.push(`<!----></button>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> `);
		if (toast.component) {
			$$renderer.push("<!--[0-->");
			const Component = toast.component;
			if (Component) {
				$$renderer.push("<!--[-->");
				Component($$renderer, spread_props([toast.componentProps, { closeToast: deleteToast }]));
				$$renderer.push("<!--]-->");
			} else {
				$$renderer.push("<!--[!-->");
				$$renderer.push("<!--]-->");
			}
		} else {
			$$renderer.push("<!--[-1-->");
			if ((toastType() || toast.icon || toast.promise) && toast.icon !== null && (icon() !== null || toast.icon)) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<div data-icon=""${attr_class(clsx(cn$1(classes()?.icon, toast?.classes?.icon)))}>`);
				if (toast.promise || toastType() === "loading") {
					$$renderer.push("<!--[0-->");
					if (toast.icon) {
						$$renderer.push("<!--[0-->");
						if (toast.icon) {
							$$renderer.push("<!--[-->");
							toast.icon($$renderer, {});
							$$renderer.push("<!--]-->");
						} else {
							$$renderer.push("<!--[!-->");
							$$renderer.push("<!--]-->");
						}
					} else {
						$$renderer.push("<!--[-1-->");
						LoadingIcon($$renderer);
					}
					$$renderer.push(`<!--]-->`);
				} else $$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]--> `);
				if (toast.type !== "loading") {
					$$renderer.push("<!--[0-->");
					if (toast.icon) {
						$$renderer.push("<!--[0-->");
						if (toast.icon) {
							$$renderer.push("<!--[-->");
							toast.icon($$renderer, {});
							$$renderer.push("<!--]-->");
						} else {
							$$renderer.push("<!--[!-->");
							$$renderer.push("<!--]-->");
						}
					} else if (toastType() === "success") {
						$$renderer.push("<!--[1-->");
						successIcon?.($$renderer);
						$$renderer.push(`<!---->`);
					} else if (toastType() === "error") {
						$$renderer.push("<!--[2-->");
						errorIcon?.($$renderer);
						$$renderer.push(`<!---->`);
					} else if (toastType() === "warning") {
						$$renderer.push("<!--[3-->");
						warningIcon?.($$renderer);
						$$renderer.push(`<!---->`);
					} else if (toastType() === "info") {
						$$renderer.push("<!--[4-->");
						infoIcon?.($$renderer);
						$$renderer.push(`<!---->`);
					} else $$renderer.push("<!--[-1-->");
					$$renderer.push(`<!--]-->`);
				} else $$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]--></div>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> <div data-content=""${attr_class(clsx(cn$1(classes()?.content, toast?.classes?.content)))}><div data-title=""${attr_class(clsx(cn$1(classes()?.title, toast?.classes?.title)))}>`);
			if (toast.title) {
				$$renderer.push("<!--[0-->");
				if (typeof toast.title !== "string") {
					$$renderer.push("<!--[0-->");
					const Title = toast.title;
					if (Title) {
						$$renderer.push("<!--[-->");
						Title($$renderer, spread_props([toast.componentProps]));
						$$renderer.push("<!--]-->");
					} else {
						$$renderer.push("<!--[!-->");
						$$renderer.push("<!--]-->");
					}
				} else {
					$$renderer.push("<!--[-1-->");
					$$renderer.push(`${escape_html(toast.title)}`);
				}
				$$renderer.push(`<!--]-->`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--></div> `);
			if (toast.description) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<div data-description=""${attr_class(clsx(cn$1(descriptionClass, toastDescriptionClass(), classes()?.description, toast.classes?.description)))}>`);
				if (typeof toast.description !== "string") {
					$$renderer.push("<!--[0-->");
					const Description = toast.description;
					if (Description) {
						$$renderer.push("<!--[-->");
						Description($$renderer, spread_props([toast.componentProps]));
						$$renderer.push("<!--]-->");
					} else {
						$$renderer.push("<!--[!-->");
						$$renderer.push("<!--]-->");
					}
				} else {
					$$renderer.push("<!--[-1-->");
					$$renderer.push(`${escape_html(toast.description)}`);
				}
				$$renderer.push(`<!--]--></div>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--></div> `);
			if (toast.cancel) {
				$$renderer.push("<!--[0-->");
				if (typeof toast.cancel === "function") {
					$$renderer.push("<!--[0-->");
					if (toast.cancel) {
						$$renderer.push("<!--[-->");
						toast.cancel($$renderer, {});
						$$renderer.push("<!--]-->");
					} else {
						$$renderer.push("<!--[!-->");
						$$renderer.push("<!--]-->");
					}
				} else if (isAction(toast.cancel)) {
					$$renderer.push("<!--[1-->");
					$$renderer.push(`<button data-button="" data-cancel=""${attr_style(toast.cancelButtonStyle ?? cancelButtonStyle)}${attr_class(clsx(cn$1(classes()?.cancelButton, toast?.classes?.cancelButton)))}>${escape_html(toast.cancel.label)}</button>`);
				} else $$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]-->`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> `);
			if (toast.action) {
				$$renderer.push("<!--[0-->");
				if (typeof toast.action === "function") {
					$$renderer.push("<!--[0-->");
					if (toast.action) {
						$$renderer.push("<!--[-->");
						toast.action($$renderer, {});
						$$renderer.push("<!--]-->");
					} else {
						$$renderer.push("<!--[!-->");
						$$renderer.push("<!--]-->");
					}
				} else if (isAction(toast.action)) {
					$$renderer.push("<!--[1-->");
					$$renderer.push(`<button data-button=""${attr_style(toast.actionButtonStyle ?? actionButtonStyle)}${attr_class(clsx(cn$1(classes()?.actionButton, toast?.classes?.actionButton)))}>${escape_html(toast.action.label)}</button>`);
				} else $$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]-->`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]-->`);
		}
		$$renderer.push(`<!--]--></li>`);
	});
}
//#endregion
//#region node_modules/svelte-sonner/dist/icons/SuccessIcon.svelte
function SuccessIcon($$renderer) {
	$$renderer.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" height="20" width="20" data-sonner-success-icon=""><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"></path></svg>`);
}
//#endregion
//#region node_modules/svelte-sonner/dist/icons/ErrorIcon.svelte
function ErrorIcon($$renderer) {
	$$renderer.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" height="20" width="20" data-sonner-error-icon=""><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"></path></svg>`);
}
//#endregion
//#region node_modules/svelte-sonner/dist/icons/WarningIcon.svelte
function WarningIcon($$renderer) {
	$$renderer.push(`<svg viewBox="0 0 64 64" fill="currentColor" height="20" width="20" data-sonner-warning-icon="" xmlns="http://www.w3.org/2000/svg"><path d="M32.427,7.987c2.183,0.124 4,1.165 5.096,3.281l17.936,36.208c1.739,3.66 -0.954,8.585 -5.373,8.656l-36.119,0c-4.022,-0.064 -7.322,-4.631 -5.352,-8.696l18.271,-36.207c0.342,-0.65 0.498,-0.838 0.793,-1.179c1.186,-1.375 2.483,-2.111 4.748,-2.063Zm-0.295,3.997c-0.687,0.034 -1.316,0.419 -1.659,1.017c-6.312,11.979 -12.397,24.081 -18.301,36.267c-0.546,1.225 0.391,2.797 1.762,2.863c12.06,0.195 24.125,0.195 36.185,0c1.325,-0.064 2.321,-1.584 1.769,-2.85c-5.793,-12.184 -11.765,-24.286 -17.966,-36.267c-0.366,-0.651 -0.903,-1.042 -1.79,-1.03Z"></path><path d="M33.631,40.581l-3.348,0l-0.368,-16.449l4.1,0l-0.384,16.449Zm-3.828,5.03c0,-0.609 0.197,-1.113 0.592,-1.514c0.396,-0.4 0.935,-0.601 1.618,-0.601c0.684,0 1.223,0.201 1.618,0.601c0.395,0.401 0.593,0.905 0.593,1.514c0,0.587 -0.193,1.078 -0.577,1.473c-0.385,0.395 -0.929,0.593 -1.634,0.593c-0.705,0 -1.249,-0.198 -1.634,-0.593c-0.384,-0.395 -0.576,-0.886 -0.576,-1.473Z"></path></svg>`);
}
//#endregion
//#region node_modules/svelte-sonner/dist/icons/InfoIcon.svelte
function InfoIcon($$renderer) {
	$$renderer.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" height="20" width="20" data-sonner-info-icon=""><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clip-rule="evenodd"></path></svg>`);
}
//#endregion
//#region node_modules/svelte-sonner/dist/icons/CloseIcon.svelte
function CloseIcon($$renderer) {
	$$renderer.push(`<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" data-sonner-close-icon=""><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`);
}
//#endregion
//#region node_modules/svelte-sonner/dist/Toaster.svelte
var VISIBLE_TOASTS_AMOUNT = 3;
var VIEWPORT_OFFSET = "24px";
var MOBILE_VIEWPORT_OFFSET = "16px";
var TOAST_LIFETIME = 4e3;
var TOAST_WIDTH = 356;
var GAP = 14;
var DARK = "dark";
var LIGHT = "light";
function getOffsetObject(defaultOffset, mobileOffset) {
	const styles = {};
	[defaultOffset, mobileOffset].forEach((offset, index) => {
		const isMobile = index === 1;
		const prefix = isMobile ? "--mobile-offset" : "--offset";
		const defaultValue = isMobile ? MOBILE_VIEWPORT_OFFSET : VIEWPORT_OFFSET;
		function assignAll(offset) {
			[
				"top",
				"right",
				"bottom",
				"left"
			].forEach((key) => {
				styles[`${prefix}-${key}`] = typeof offset === "number" ? `${offset}px` : offset;
			});
		}
		if (typeof offset === "number" || typeof offset === "string") assignAll(offset);
		else if (typeof offset === "object") [
			"top",
			"right",
			"bottom",
			"left"
		].forEach((key) => {
			const value = offset[key];
			if (value === void 0) styles[`${prefix}-${key}`] = defaultValue;
			else styles[`${prefix}-${key}`] = typeof value === "number" ? `${value}px` : value;
		});
		else assignAll(defaultValue);
	});
	return styles;
}
function Toaster($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		function getInitialTheme(t) {
			if (t !== "system") return t;
			if (typeof window !== "undefined") {
				if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) return DARK;
				return LIGHT;
			}
			return LIGHT;
		}
		let { invert = false, position = "bottom-right", hotkey = ["altKey", "KeyT"], expand = false, closeButton = false, offset = VIEWPORT_OFFSET, mobileOffset = MOBILE_VIEWPORT_OFFSET, theme = "light", richColors = false, duration = TOAST_LIFETIME, visibleToasts = VISIBLE_TOASTS_AMOUNT, toastOptions = {}, dir = "auto", gap = GAP, pauseWhenPageIsHidden = false, loadingIcon: loadingIconProp, successIcon: successIconProp, errorIcon: errorIconProp, warningIcon: warningIconProp, closeIcon: closeIconProp, infoIcon: infoIconProp, containerAriaLabel = "Notifications", class: className, closeButtonAriaLabel = "Close toast", onblur, onfocus, onmouseenter, onmousemove, onmouseleave, ondragend, onpointerdown, onpointerup, $$slots, $$events, ...restProps } = $$props;
		function getDocumentDirection() {
			if (dir !== "auto") return dir;
			if (typeof window === "undefined") return "ltr";
			if (typeof document === "undefined") return "ltr";
			const dirAttribute = document.documentElement.getAttribute("dir");
			if (dirAttribute === "auto" || !dirAttribute) {
				run(() => dir = window.getComputedStyle(document.documentElement).direction ?? "ltr");
				return dir;
			}
			run(() => dir = dirAttribute);
			return dirAttribute;
		}
		const possiblePositions = derived(() => Array.from(new Set([position, ...toastState.toasts.filter((toast) => toast.position).map((toast) => toast.position)].filter(Boolean))));
		let expanded = false;
		let interacting = false;
		let actualTheme = getInitialTheme(theme);
		const hotkeyLabel = derived(() => hotkey.join("+").replace(/Key/g, "").replace(/Digit/g, ""));
		sonnerContext.set(new SonnerState());
		$$renderer.push(`<section${attr("aria-label", `${stringify(containerAriaLabel)} ${stringify(hotkeyLabel())}`)}${attr("tabindex", -1)} aria-live="polite" aria-relevant="additions text" aria-atomic="false" class="svelte-nbs0zk">`);
		if (toastState.toasts.length > 0) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<!--[-->`);
			const each_array = ensure_array_like(possiblePositions());
			for (let index = 0, $$length = each_array.length; index < $$length; index++) {
				let position = each_array[index];
				const [y, x] = position.split("-");
				const offsetObject = getOffsetObject(offset, mobileOffset);
				$$renderer.push(`<ol${attributes({
					tabindex: -1,
					dir: getDocumentDirection(),
					class: clsx(className),
					"data-sonner-toaster": true,
					"data-sonner-theme": actualTheme,
					"data-y-position": y,
					"data-x-position": x,
					style: restProps.style,
					...restProps
				}, "svelte-nbs0zk", void 0, {
					"--front-toast-height": `${toastState.heights[0]?.height}px`,
					"--width": `${TOAST_WIDTH}px`,
					"--gap": `${gap}px`,
					"--offset-top": offsetObject["--offset-top"],
					"--offset-right": offsetObject["--offset-right"],
					"--offset-bottom": offsetObject["--offset-bottom"],
					"--offset-left": offsetObject["--offset-left"],
					"--mobile-offset-top": offsetObject["--mobile-offset-top"],
					"--mobile-offset-right": offsetObject["--mobile-offset-right"],
					"--mobile-offset-bottom": offsetObject["--mobile-offset-bottom"],
					"--mobile-offset-left": offsetObject["--mobile-offset-left"]
				})}><!--[-->`);
				const each_array_1 = ensure_array_like(toastState.toasts.filter((toast) => !toast.position && index === 0 || toast.position === position));
				for (let index = 0, $$length = each_array_1.length; index < $$length; index++) {
					let toast = each_array_1[index];
					{
						function successIcon($$renderer) {
							if (successIconProp) {
								$$renderer.push("<!--[0-->");
								successIconProp?.($$renderer);
								$$renderer.push(`<!---->`);
							} else if (successIconProp !== null) {
								$$renderer.push("<!--[1-->");
								SuccessIcon($$renderer, {});
							} else $$renderer.push("<!--[-1-->");
							$$renderer.push(`<!--]-->`);
						}
						function errorIcon($$renderer) {
							if (errorIconProp) {
								$$renderer.push("<!--[0-->");
								errorIconProp?.($$renderer);
								$$renderer.push(`<!---->`);
							} else if (errorIconProp !== null) {
								$$renderer.push("<!--[1-->");
								ErrorIcon($$renderer, {});
							} else $$renderer.push("<!--[-1-->");
							$$renderer.push(`<!--]-->`);
						}
						function warningIcon($$renderer) {
							if (warningIconProp) {
								$$renderer.push("<!--[0-->");
								warningIconProp?.($$renderer);
								$$renderer.push(`<!---->`);
							} else if (warningIconProp !== null) {
								$$renderer.push("<!--[1-->");
								WarningIcon($$renderer, {});
							} else $$renderer.push("<!--[-1-->");
							$$renderer.push(`<!--]-->`);
						}
						function infoIcon($$renderer) {
							if (infoIconProp) {
								$$renderer.push("<!--[0-->");
								infoIconProp?.($$renderer);
								$$renderer.push(`<!---->`);
							} else if (infoIconProp !== null) {
								$$renderer.push("<!--[1-->");
								InfoIcon($$renderer, {});
							} else $$renderer.push("<!--[-1-->");
							$$renderer.push(`<!--]-->`);
						}
						function closeIcon($$renderer) {
							if (closeIconProp) {
								$$renderer.push("<!--[0-->");
								closeIconProp?.($$renderer);
								$$renderer.push(`<!---->`);
							} else if (closeIconProp !== null) {
								$$renderer.push("<!--[1-->");
								CloseIcon($$renderer, {});
							} else $$renderer.push("<!--[-1-->");
							$$renderer.push(`<!--]-->`);
						}
						Toast($$renderer, {
							index,
							toast,
							defaultRichColors: richColors,
							duration: toastOptions?.duration ?? duration,
							class: toastOptions?.class ?? "",
							descriptionClass: toastOptions?.descriptionClass || "",
							invert,
							visibleToasts,
							closeButton,
							interacting,
							position,
							style: toastOptions?.style ?? "",
							classes: toastOptions.classes || {},
							unstyled: toastOptions.unstyled ?? false,
							cancelButtonStyle: toastOptions?.cancelButtonStyle ?? "",
							actionButtonStyle: toastOptions?.actionButtonStyle ?? "",
							closeButtonAriaLabel: toastOptions?.closeButtonAriaLabel ?? closeButtonAriaLabel,
							expandByDefault: expand,
							expanded,
							pauseWhenPageIsHidden,
							loadingIcon: loadingIconProp,
							successIcon,
							errorIcon,
							warningIcon,
							infoIcon,
							closeIcon,
							$$slots: {
								successIcon: true,
								errorIcon: true,
								warningIcon: true,
								infoIcon: true,
								closeIcon: true
							}
						});
					}
				}
				$$renderer.push(`<!--]--></ol>`);
			}
			$$renderer.push(`<!--]-->`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--></section>`);
	});
}
//#endregion
//#region src/lib/components/prompts/IncomingOfferDialog.svelte
function IncomingOfferDialog($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const open = derived(() => pairing.incoming !== null);
		function onOpenChange(next) {
			if (!next && pairing.incoming) pairing.decline();
		}
		function files(n) {
			return `${n} ${n === 1 ? "file" : "files"}`;
		}
		if (Responsive_dialog) {
			$$renderer.push("<!--[-->");
			Responsive_dialog($$renderer, {
				open: open(),
				onOpenChange,
				children: ($$renderer) => {
					if (Responsive_dialog_content) {
						$$renderer.push("<!--[-->");
						Responsive_dialog_content($$renderer, {
							class: "sm:max-w-sm",
							"data-layer": "prompt",
							children: ($$renderer) => {
								if (Responsive_dialog_header) {
									$$renderer.push("<!--[-->");
									Responsive_dialog_header($$renderer, {
										children: ($$renderer) => {
											if (Responsive_dialog_title) {
												$$renderer.push("<!--[-->");
												Responsive_dialog_title($$renderer, {
													children: ($$renderer) => {
														$$renderer.push(`<!---->Incoming files`);
													},
													$$slots: { default: true }
												});
												$$renderer.push("<!--]-->");
											} else {
												$$renderer.push("<!--[!-->");
												$$renderer.push("<!--]-->");
											}
											$$renderer.push(` `);
											if (pairing.incoming) {
												$$renderer.push("<!--[0-->");
												if (Responsive_dialog_description) {
													$$renderer.push("<!--[-->");
													Responsive_dialog_description($$renderer, {
														children: ($$renderer) => {
															$$renderer.push(`<span class="font-medium text-foreground">${escape_html(pairing.incoming.fromName)}</span> wants to send you
					${escape_html(files(pairing.incoming.fileCount))} `);
															if (pairing.incoming.totalBytes > 0) {
																$$renderer.push("<!--[0-->");
																$$renderer.push(`· ${escape_html(formatBytes(pairing.incoming.totalBytes))}`);
															} else $$renderer.push("<!--[-1-->");
															$$renderer.push(`<!--]-->`);
														},
														$$slots: { default: true }
													});
													$$renderer.push("<!--]-->");
												} else {
													$$renderer.push("<!--[!-->");
													$$renderer.push("<!--]-->");
												}
											} else $$renderer.push("<!--[-1-->");
											$$renderer.push(`<!--]-->`);
										},
										$$slots: { default: true }
									});
									$$renderer.push("<!--]-->");
								} else {
									$$renderer.push("<!--[!-->");
									$$renderer.push("<!--]-->");
								}
								$$renderer.push(` `);
								if (Responsive_dialog_footer) {
									$$renderer.push("<!--[-->");
									Responsive_dialog_footer($$renderer, {
										class: "max-sm:gap-4",
										children: ($$renderer) => {
											Button($$renderer, {
												variant: "outline",
												onclick: () => {
													haptics.declined();
													pairing.decline();
												},
												children: ($$renderer) => {
													X($$renderer, { "data-icon": "inline-start" });
													$$renderer.push(`<!----> No thanks`);
												},
												$$slots: { default: true }
											});
											$$renderer.push(`<!----> `);
											Button($$renderer, {
												onclick: () => {
													haptics.accepted();
													pairing.accept();
												},
												children: ($$renderer) => {
													Download($$renderer, { "data-icon": "inline-start" });
													$$renderer.push(`<!----> Accept`);
												},
												$$slots: { default: true }
											});
											$$renderer.push(`<!---->`);
										},
										$$slots: { default: true }
									});
									$$renderer.push("<!--]-->");
								} else {
									$$renderer.push("<!--[!-->");
									$$renderer.push("<!--]-->");
								}
							},
							$$slots: { default: true }
						});
						$$renderer.push("<!--]-->");
					} else {
						$$renderer.push("<!--[!-->");
						$$renderer.push("<!--]-->");
					}
				},
				$$slots: { default: true }
			});
			$$renderer.push("<!--]-->");
		} else {
			$$renderer.push("<!--[!-->");
			$$renderer.push("<!--]-->");
		}
	});
}
//#endregion
//#region src/lib/components/prompts/IncomingPairDialog.svelte
function IncomingPairDialog($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const open = derived(() => pairing.request !== null);
		const confirming = derived(() => pairing.isPending("confirm"));
		function onOpenChange(next) {
			if (!next && pairing.request) pairing.dismissPair();
		}
		function confirm() {
			const req = pairing.request;
			if (!req) return;
			haptics.accepted();
			pairing.confirmPair(req.suggestedName);
		}
		if (Responsive_dialog) {
			$$renderer.push("<!--[-->");
			Responsive_dialog($$renderer, {
				open: open(),
				onOpenChange,
				children: ($$renderer) => {
					if (Responsive_dialog_content) {
						$$renderer.push("<!--[-->");
						Responsive_dialog_content($$renderer, {
							class: "sm:max-w-sm",
							"data-layer": "prompt",
							children: ($$renderer) => {
								if (Responsive_dialog_header) {
									$$renderer.push("<!--[-->");
									Responsive_dialog_header($$renderer, {
										children: ($$renderer) => {
											if (Responsive_dialog_title) {
												$$renderer.push("<!--[-->");
												Responsive_dialog_title($$renderer, {
													children: ($$renderer) => {
														$$renderer.push(`<!---->Add this device?`);
													},
													$$slots: { default: true }
												});
												$$renderer.push("<!--]-->");
											} else {
												$$renderer.push("<!--[!-->");
												$$renderer.push("<!--]-->");
											}
											$$renderer.push(` `);
											if (Responsive_dialog_description) {
												$$renderer.push("<!--[-->");
												Responsive_dialog_description($$renderer, {
													children: ($$renderer) => {
														$$renderer.push(`<!---->A device used your code to link. It's called <span class="font-medium text-foreground">${escape_html(pairing.request?.suggestedName)}</span>. Add it and you can
				send to it without a code.`);
													},
													$$slots: { default: true }
												});
												$$renderer.push("<!--]-->");
											} else {
												$$renderer.push("<!--[!-->");
												$$renderer.push("<!--]-->");
											}
										},
										$$slots: { default: true }
									});
									$$renderer.push("<!--]-->");
								} else {
									$$renderer.push("<!--[!-->");
									$$renderer.push("<!--]-->");
								}
								$$renderer.push(` `);
								if (pairing.request?.via === "code" && pairing.request?.sas) {
									$$renderer.push("<!--[0-->");
									if (Responsive_dialog_body) {
										$$renderer.push("<!--[-->");
										Responsive_dialog_body($$renderer, {
											children: ($$renderer) => {
												$$renderer.push(`<p class="text-center text-sm text-muted-foreground">Make sure both devices show <span class="font-mono font-medium text-foreground">${escape_html(pairing.request.sas)}</span></p>`);
											},
											$$slots: { default: true }
										});
										$$renderer.push("<!--]-->");
									} else {
										$$renderer.push("<!--[!-->");
										$$renderer.push("<!--]-->");
									}
								} else $$renderer.push("<!--[-1-->");
								$$renderer.push(`<!--]--> `);
								if (Responsive_dialog_footer) {
									$$renderer.push("<!--[-->");
									Responsive_dialog_footer($$renderer, {
										class: "max-sm:gap-4",
										children: ($$renderer) => {
											Button($$renderer, {
												variant: "outline",
												disabled: confirming(),
												onclick: () => {
													haptics.declined();
													pairing.dismissPair();
												},
												children: ($$renderer) => {
													X($$renderer, { "data-icon": "inline-start" });
													$$renderer.push(`<!----> Not now`);
												},
												$$slots: { default: true }
											});
											$$renderer.push(`<!----> `);
											BusyButton($$renderer, {
												pending: confirming(),
												pendingLabel: "Adding…",
												onclick: confirm,
												children: ($$renderer) => {
													Check($$renderer, { "data-icon": "inline-start" });
													$$renderer.push(`<!----> Add`);
												},
												$$slots: { default: true }
											});
											$$renderer.push(`<!---->`);
										},
										$$slots: { default: true }
									});
									$$renderer.push("<!--]-->");
								} else {
									$$renderer.push("<!--[!-->");
									$$renderer.push("<!--]-->");
								}
							},
							$$slots: { default: true }
						});
						$$renderer.push("<!--]-->");
					} else {
						$$renderer.push("<!--[!-->");
						$$renderer.push("<!--]-->");
					}
				},
				$$slots: { default: true }
			});
			$$renderer.push("<!--]-->");
		} else {
			$$renderer.push("<!--[!-->");
			$$renderer.push("<!--]-->");
		}
	});
}
//#endregion
//#region src/lib/components/ui/sidebar/sidebar-content.svelte
function Sidebar_content($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, children, $$slots, $$events, ...restProps } = $$props;
		$$renderer.push(`<div${attributes({
			"data-slot": "sidebar-content",
			"data-sidebar": "content",
			class: clsx(cn("no-scrollbar gap-2 [--radius:var(--radius-xl)] flex min-h-0 flex-1 flex-col overflow-auto group-data-[collapsible=icon]:overflow-hidden", className)),
			...restProps
		})}>`);
		children?.($$renderer);
		$$renderer.push(`<!----></div>`);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region src/lib/components/ui/sidebar/sidebar-footer.svelte
function Sidebar_footer($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, children, $$slots, $$events, ...restProps } = $$props;
		$$renderer.push(`<div${attributes({
			"data-slot": "sidebar-footer",
			"data-sidebar": "footer",
			class: clsx(cn("gap-2 p-2 flex flex-col", className)),
			...restProps
		})}>`);
		children?.($$renderer);
		$$renderer.push(`<!----></div>`);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region src/lib/components/ui/sidebar/sidebar-group-content.svelte
function Sidebar_group_content($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, children, $$slots, $$events, ...restProps } = $$props;
		$$renderer.push(`<div${attributes({
			"data-slot": "sidebar-group-content",
			"data-sidebar": "group-content",
			class: clsx(cn("text-sm w-full", className)),
			...restProps
		})}>`);
		children?.($$renderer);
		$$renderer.push(`<!----></div>`);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region src/lib/components/ui/sidebar/sidebar-group-label.svelte
function Sidebar_group_label($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, children, child, class: className, $$slots, $$events, ...restProps } = $$props;
		const mergedProps = derived(() => ({
			class: cn("h-8 rounded-xl px-3 text-xs font-medium text-sidebar-foreground/70 ring-sidebar-ring transition-[margin,opacity] duration-200 ease-linear group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0 focus-visible:ring-2 [&>svg]:size-4 flex shrink-0 items-center outline-hidden [&>svg]:shrink-0", className),
			"data-slot": "sidebar-group-label",
			"data-sidebar": "group-label",
			...restProps
		}));
		if (child) {
			$$renderer.push("<!--[0-->");
			child($$renderer, { props: mergedProps() });
			$$renderer.push(`<!---->`);
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<div${attributes({ ...mergedProps() })}>`);
			children?.($$renderer);
			$$renderer.push(`<!----></div>`);
		}
		$$renderer.push(`<!--]-->`);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region src/lib/components/ui/sidebar/sidebar-group.svelte
function Sidebar_group($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, children, $$slots, $$events, ...restProps } = $$props;
		$$renderer.push(`<div${attributes({
			"data-slot": "sidebar-group",
			"data-sidebar": "group",
			class: clsx(cn("p-2 relative flex w-full min-w-0 flex-col", className)),
			...restProps
		})}>`);
		children?.($$renderer);
		$$renderer.push(`<!----></div>`);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region src/lib/components/ui/sidebar/sidebar-header.svelte
function Sidebar_header($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, children, $$slots, $$events, ...restProps } = $$props;
		$$renderer.push(`<div${attributes({
			"data-slot": "sidebar-header",
			"data-sidebar": "header",
			class: clsx(cn("gap-2 p-2 [--radius:var(--radius-xl)] flex flex-col", className)),
			...restProps
		})}>`);
		children?.($$renderer);
		$$renderer.push(`<!----></div>`);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region src/lib/components/ui/sidebar/sidebar-inset.svelte
function Sidebar_inset($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, children, $$slots, $$events, ...restProps } = $$props;
		$$renderer.push(`<main${attributes({
			"data-slot": "sidebar-inset",
			class: clsx(cn("bg-background md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-2xl md:peer-data-[variant=inset]:shadow-sm md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2 relative flex w-full flex-1 flex-col", className)),
			...restProps
		})}>`);
		children?.($$renderer);
		$$renderer.push(`<!----></main>`);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region src/lib/components/ui/sidebar/sidebar-menu-badge.svelte
function Sidebar_menu_badge($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, children, $$slots, $$events, ...restProps } = $$props;
		$$renderer.push(`<div${attributes({
			"data-slot": "sidebar-menu-badge",
			"data-sidebar": "menu-badge",
			class: clsx(cn("pointer-events-none absolute right-1 flex h-5 min-w-5 rounded-xl px-1 text-xs font-medium text-sidebar-foreground peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[size=default]/menu-button:top-1.5 peer-data-[size=lg]/menu-button:top-2.5 peer-data-[size=sm]/menu-button:top-1 peer-data-active/menu-button:text-sidebar-accent-foreground flex items-center justify-center tabular-nums select-none group-data-[collapsible=icon]:hidden", className)),
			...restProps
		})}>`);
		children?.($$renderer);
		$$renderer.push(`<!----></div>`);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region src/lib/hooks/is-mobile.svelte.ts
var DEFAULT_MOBILE_BREAKPOINT = 768;
var IsMobile = class extends MediaQuery {
	constructor(breakpoint = DEFAULT_MOBILE_BREAKPOINT) {
		super(`max-width: ${breakpoint - 1}px`);
	}
};
//#endregion
//#region src/lib/components/ui/sidebar/constants.ts
var SIDEBAR_COOKIE_NAME = "sidebar_state";
var SIDEBAR_COOKIE_MAX_AGE = 604800;
var SIDEBAR_WIDTH = "16rem";
var SIDEBAR_WIDTH_MOBILE = "18rem";
var SIDEBAR_WIDTH_ICON = "3rem";
//#endregion
//#region src/lib/components/ui/sidebar/context.svelte.ts
var SidebarState = class {
	props;
	#open = derived(() => this.props.open());
	get open() {
		return this.#open();
	}
	set open($$value) {
		return this.#open($$value);
	}
	openMobile = false;
	setOpen;
	#isMobile;
	#state = derived(() => this.open ? "expanded" : "collapsed");
	get state() {
		return this.#state();
	}
	set state($$value) {
		return this.#state($$value);
	}
	constructor(props) {
		this.setOpen = props.setOpen;
		this.#isMobile = new IsMobile();
		this.props = props;
	}
	get isMobile() {
		return this.#isMobile.current;
	}
	handleShortcutKeydown = (e) => {
		if (e.key === "b" && (e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			this.toggle();
		}
	};
	setOpenMobile = (value) => {
		this.openMobile = value;
	};
	toggle = () => {
		return this.#isMobile.current ? this.openMobile = !this.openMobile : this.setOpen(!this.open);
	};
};
var SYMBOL_KEY = "scn-sidebar";
/**
* Instantiates a new `SidebarState` instance and sets it in the context.
*
* @param props The constructor props for the `SidebarState` class.
* @returns  The `SidebarState` instance.
*/
function setSidebar(props) {
	return setContext(Symbol.for(SYMBOL_KEY), new SidebarState(props));
}
/**
* Retrieves the `SidebarState` instance from the context. This is a class instance,
* so you cannot destructure it.
* @returns The `SidebarState` instance.
*/
function useSidebar() {
	return getContext(Symbol.for(SYMBOL_KEY));
}
//#endregion
//#region src/lib/components/ui/sidebar/sidebar-menu-button.svelte
var sidebarMenuButtonVariants = tv({
	base: "gap-2 rounded-xl px-3 py-2 text-left text-sm ring-sidebar-ring transition-[width,height,padding] max-md:min-h-11 group-has-data-[sidebar=menu-action]/menu-item:pr-8 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground data-open:hover:bg-sidebar-accent data-open:hover:text-sidebar-accent-foreground data-active:bg-sidebar-accent data-active:font-medium data-active:text-sidebar-accent-foreground peer/menu-button group/menu-button flex w-full items-center overflow-hidden outline-hidden disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 [&>span:last-child]:truncate",
	variants: {
		variant: {
			default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
			outline: "bg-background shadow-[0_0_0_1px_var(--sidebar-border)] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_var(--sidebar-accent)]"
		},
		size: {
			default: "h-9 text-sm",
			sm: "h-8 text-xs",
			lg: "h-14 px-3 text-sm group-data-[collapsible=icon]:p-0!"
		}
	},
	defaultVariants: {
		variant: "default",
		size: "default"
	}
});
function Sidebar_menu_button($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, children, child, variant = "default", size = "default", isActive = false, tooltipContent, tooltipContentProps, $$slots, $$events, ...restProps } = $$props;
		const sidebar = useSidebar();
		const buttonProps = derived(() => ({
			class: cn(sidebarMenuButtonVariants({
				variant,
				size
			}), className),
			"data-slot": "sidebar-menu-button",
			"data-sidebar": "menu-button",
			"data-size": size,
			"data-active": isActive,
			...restProps
		}));
		function Button($$renderer, { props }) {
			const mergedProps = mergeProps(buttonProps(), props);
			if (child) {
				$$renderer.push("<!--[0-->");
				child($$renderer, { props: mergedProps });
				$$renderer.push(`<!---->`);
			} else {
				$$renderer.push("<!--[-1-->");
				$$renderer.push(`<button${attributes({ ...mergedProps })}>`);
				children?.($$renderer);
				$$renderer.push(`<!----></button>`);
			}
			$$renderer.push(`<!--]-->`);
		}
		if (!tooltipContent) {
			$$renderer.push("<!--[0-->");
			Button($$renderer, {});
		} else {
			$$renderer.push("<!--[-1-->");
			if (Tooltip) {
				$$renderer.push("<!--[-->");
				Tooltip($$renderer, {
					children: ($$renderer) => {
						{
							function child($$renderer, { props }) {
								Button($$renderer, { props });
							}
							if (Tooltip_trigger) {
								$$renderer.push("<!--[-->");
								Tooltip_trigger($$renderer, {
									child,
									$$slots: { child: true }
								});
								$$renderer.push("<!--]-->");
							} else {
								$$renderer.push("<!--[!-->");
								$$renderer.push("<!--]-->");
							}
						}
						$$renderer.push(` `);
						if (Tooltip_content) {
							$$renderer.push("<!--[-->");
							Tooltip_content($$renderer, spread_props([
								{
									side: "right",
									align: "center",
									hidden: sidebar.state !== "collapsed" || sidebar.isMobile
								},
								tooltipContentProps,
								{
									children: ($$renderer) => {
										if (typeof tooltipContent === "string") {
											$$renderer.push("<!--[0-->");
											$$renderer.push(`${escape_html(tooltipContent)}`);
										} else if (tooltipContent) {
											$$renderer.push("<!--[1-->");
											tooltipContent($$renderer);
											$$renderer.push(`<!---->`);
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
				});
				$$renderer.push("<!--]-->");
			} else {
				$$renderer.push("<!--[!-->");
				$$renderer.push("<!--]-->");
			}
		}
		$$renderer.push(`<!--]-->`);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region src/lib/components/ui/sidebar/sidebar-menu-item.svelte
function Sidebar_menu_item($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, children, $$slots, $$events, ...restProps } = $$props;
		$$renderer.push(`<li${attributes({
			"data-slot": "sidebar-menu-item",
			"data-sidebar": "menu-item",
			class: clsx(cn("group/menu-item relative", className)),
			...restProps
		})}>`);
		children?.($$renderer);
		$$renderer.push(`<!----></li>`);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region src/lib/components/ui/sidebar/sidebar-menu.svelte
function Sidebar_menu($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, children, $$slots, $$events, ...restProps } = $$props;
		$$renderer.push(`<ul${attributes({
			"data-slot": "sidebar-menu",
			"data-sidebar": "menu",
			class: clsx(cn("gap-0.5 flex w-full min-w-0 flex-col", className)),
			...restProps
		})}>`);
		children?.($$renderer);
		$$renderer.push(`<!----></ul>`);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region src/lib/components/ui/sidebar/sidebar-provider.svelte
function Sidebar_provider($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, open = true, onOpenChange = () => {}, class: className, style, children, $$slots, $$events, ...restProps } = $$props;
		setSidebar({
			open: () => open,
			setOpen: (value) => {
				open = value;
				onOpenChange(value);
				document.cookie = `${SIDEBAR_COOKIE_NAME}=${open}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
			}
		});
		if (Tooltip_provider) {
			$$renderer.push("<!--[-->");
			Tooltip_provider($$renderer, {
				delayDuration: 0,
				children: ($$renderer) => {
					$$renderer.push(`<div${attributes({
						"data-slot": "sidebar-wrapper",
						style: `--sidebar-width: ${stringify(SIDEBAR_WIDTH)}; --sidebar-width-icon: ${stringify(SIDEBAR_WIDTH_ICON)}; ${stringify(style)}`,
						class: clsx(cn("group/sidebar-wrapper flex min-h-svh w-full has-data-[variant=inset]:bg-sidebar", className)),
						...restProps
					})}>`);
					children?.($$renderer);
					$$renderer.push(`<!----></div>`);
				},
				$$slots: { default: true }
			});
			$$renderer.push("<!--]-->");
		} else {
			$$renderer.push("<!--[!-->");
			$$renderer.push("<!--]-->");
		}
		bind_props($$props, {
			ref,
			open
		});
	});
}
//#endregion
//#region src/lib/components/ui/sidebar/sidebar-separator.svelte
function Sidebar_separator($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, $$slots, $$events, ...restProps } = $$props;
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			Separator($$renderer, spread_props([
				{
					"data-slot": "sidebar-separator",
					"data-sidebar": "separator",
					class: cn("mx-2 bg-sidebar-border w-auto", className)
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
//#region src/lib/components/ui/sheet/sheet-overlay.svelte
function Sheet_overlay($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, $$slots, $$events, ...restProps } = $$props;
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (Dialog_overlay) {
				$$renderer.push("<!--[-->");
				Dialog_overlay($$renderer, spread_props([
					{
						"data-slot": "sheet-overlay",
						class: cn("bg-black/30 supports-backdrop-filter:backdrop-blur-sm fixed inset-0 z-50", className)
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
//#region src/lib/components/ui/sheet/sheet-portal.svelte
function Sheet_portal($$renderer, $$props) {
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
//#region src/lib/components/ui/sheet/sheet-content.svelte
function Sheet_content($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, side = "right", showCloseButton = true, portalProps, children, $$slots, $$events, ...restProps } = $$props;
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			Sheet_portal($$renderer, spread_props([portalProps, {
				children: ($$renderer) => {
					Sheet_overlay($$renderer, {});
					$$renderer.push(`<!----> `);
					if (Dialog_content) {
						$$renderer.push("<!--[-->");
						Dialog_content($$renderer, spread_props([
							{
								"data-slot": "sheet-content",
								"data-side": side,
								class: cn("fixed z-50 flex flex-col bg-popover bg-clip-padding text-sm text-popover-foreground shadow-xl transition duration-200 ease-in-out data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=bottom]:border-t data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:w-3/4 data-[side=left]:border-r data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:w-3/4 data-[side=right]:border-l data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:border-b data-[side=left]:sm:max-w-sm data-[side=right]:sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-[side=bottom]:data-open:slide-in-from-bottom-10 data-[side=left]:data-open:slide-in-from-left-10 data-[side=right]:data-open:slide-in-from-right-10 data-[side=top]:data-open:slide-in-from-top-10 data-closed:animate-out data-closed:fade-out-0 data-[side=bottom]:data-closed:slide-out-to-bottom-10 data-[side=left]:data-closed:slide-out-to-left-10 data-[side=right]:data-closed:slide-out-to-right-10 data-[side=top]:data-closed:slide-out-to-top-10", className)
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
														class: "absolute top-4 right-4 bg-secondary",
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
													"data-slot": "sheet-close",
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
//#region src/lib/components/ui/sheet/sheet-description.svelte
function Sheet_description($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, $$slots, $$events, ...restProps } = $$props;
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (Dialog_description) {
				$$renderer.push("<!--[-->");
				Dialog_description($$renderer, spread_props([
					{
						"data-slot": "sheet-description",
						class: cn("text-sm text-muted-foreground", className)
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
//#region src/lib/components/ui/sheet/sheet-header.svelte
function Sheet_header($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, children, $$slots, $$events, ...restProps } = $$props;
		$$renderer.push(`<div${attributes({
			"data-slot": "sheet-header",
			class: clsx(cn("gap-1.5 p-6 flex flex-col", className)),
			...restProps
		})}>`);
		children?.($$renderer);
		$$renderer.push(`<!----></div>`);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region src/lib/components/ui/sheet/sheet-title.svelte
function Sheet_title($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, $$slots, $$events, ...restProps } = $$props;
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (Dialog_title) {
				$$renderer.push("<!--[-->");
				Dialog_title($$renderer, spread_props([
					{
						"data-slot": "sheet-title",
						class: cn("font-heading text-base font-medium text-foreground", className)
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
//#region src/lib/components/ui/sheet/sheet.svelte
function Sheet($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { open = false, $$slots, $$events, ...restProps } = $$props;
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (Dialog) {
				$$renderer.push("<!--[-->");
				Dialog($$renderer, spread_props([restProps, {
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
//#region src/lib/components/ui/sidebar/sidebar.svelte
function Sidebar($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, side = "left", variant = "sidebar", collapsible = "offcanvas", class: className, children, $$slots, $$events, ...restProps } = $$props;
		const sidebar = useSidebar();
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (collapsible === "none") {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<div${attributes({
					class: clsx(cn("flex h-full w-(--sidebar-width) flex-col bg-sidebar text-sidebar-foreground", className)),
					...restProps
				})}>`);
				children?.($$renderer);
				$$renderer.push(`<!----></div>`);
			} else if (sidebar.isMobile) {
				$$renderer.push("<!--[1-->");
				var bind_get = () => sidebar.openMobile;
				var bind_set = (v) => sidebar.setOpenMobile(v);
				if (Sheet) {
					$$renderer.push("<!--[-->");
					Sheet($$renderer, spread_props([
						{
							get open() {
								return bind_get();
							},
							set open($$value) {
								bind_set($$value);
							}
						},
						restProps,
						{
							children: ($$renderer) => {
								if (Sheet_content) {
									$$renderer.push("<!--[-->");
									Sheet_content($$renderer, {
										"data-sidebar": "sidebar",
										"data-slot": "sidebar",
										"data-mobile": "true",
										class: cn("w-(--sidebar-width) bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden", className),
										style: `--sidebar-width: ${stringify(SIDEBAR_WIDTH_MOBILE)};`,
										side,
										get ref() {
											return ref;
										},
										set ref($$value) {
											ref = $$value;
											$$settled = false;
										},
										children: ($$renderer) => {
											if (Sheet_header) {
												$$renderer.push("<!--[-->");
												Sheet_header($$renderer, {
													class: "sr-only",
													children: ($$renderer) => {
														if (Sheet_title) {
															$$renderer.push("<!--[-->");
															Sheet_title($$renderer, {
																children: ($$renderer) => {
																	$$renderer.push(`<!---->Sidebar`);
																},
																$$slots: { default: true }
															});
															$$renderer.push("<!--]-->");
														} else {
															$$renderer.push("<!--[!-->");
															$$renderer.push("<!--]-->");
														}
														$$renderer.push(` `);
														if (Sheet_description) {
															$$renderer.push("<!--[-->");
															Sheet_description($$renderer, {
																children: ($$renderer) => {
																	$$renderer.push(`<!---->Displays the mobile sidebar.`);
																},
																$$slots: { default: true }
															});
															$$renderer.push("<!--]-->");
														} else {
															$$renderer.push("<!--[!-->");
															$$renderer.push("<!--]-->");
														}
													},
													$$slots: { default: true }
												});
												$$renderer.push("<!--]-->");
											} else {
												$$renderer.push("<!--[!-->");
												$$renderer.push("<!--]-->");
											}
											$$renderer.push(` <div class="flex h-full w-full flex-col">`);
											children?.($$renderer);
											$$renderer.push(`<!----></div>`);
										},
										$$slots: { default: true }
									});
									$$renderer.push("<!--]-->");
								} else {
									$$renderer.push("<!--[!-->");
									$$renderer.push("<!--]-->");
								}
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
				$$renderer.push(`<div class="group peer hidden text-sidebar-foreground md:block"${attr("data-state", sidebar.state)}${attr("data-collapsible", sidebar.state === "collapsed" ? collapsible : "")}${attr("data-variant", variant)}${attr("data-side", side)} data-slot="sidebar"><div data-slot="sidebar-gap"${attr_class(clsx(cn("transition-[width] duration-200 ease-linear relative w-(--sidebar-width) bg-transparent", "group-data-[collapsible=offcanvas]:w-0", "group-data-[side=right]:rotate-180", variant === "floating" || variant === "inset" ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]" : "group-data-[collapsible=icon]:w-(--sidebar-width-icon)")))}></div> <div${attributes({
					"data-slot": "sidebar-container",
					class: clsx(cn("fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear md:flex", side === "left" ? "start-0 group-data-[collapsible=offcanvas]:start-[calc(var(--sidebar-width)*-1)]" : "end-0 group-data-[collapsible=offcanvas]:end-[calc(var(--sidebar-width)*-1)]", variant === "floating" || variant === "inset" ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]" : "group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-e group-data-[side=right]:border-s", className)),
					...restProps
				})}><div data-sidebar="sidebar" data-slot="sidebar-inner" class="bg-sidebar group-data-[variant=floating]:rounded-2xl group-data-[variant=floating]:shadow-sm group-data-[variant=floating]:ring-1 group-data-[variant=floating]:ring-sidebar-border flex size-full flex-col">`);
				children?.($$renderer);
				$$renderer.push(`<!----></div></div></div>`);
			}
			$$renderer.push(`<!--]-->`);
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
//#region node_modules/@lucide/svelte/dist/icons/menu.svelte
function Menu($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "menu" },
		props,
		{ iconNode: [
			["path", { "d": "M4 5h16" }],
			["path", { "d": "M4 12h16" }],
			["path", { "d": "M4 19h16" }]
		] }
	]));
}
//#endregion
//#region node_modules/@lucide/svelte/dist/icons/minus.svelte
function Minus($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "minus" },
		props,
		{ iconNode: [["path", { "d": "M5 12h14" }]] }
	]));
}
//#endregion
//#region node_modules/@lucide/svelte/dist/icons/square.svelte
function Square($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "square" },
		props,
		{ iconNode: [["rect", {
			"width": "18",
			"height": "18",
			"x": "3",
			"y": "3",
			"rx": "2"
		}]] }
	]));
}
//#endregion
//#region src/lib/components/shell/AppHeader.svelte
function AppHeader($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const sidebar = useSidebar();
		const showMenu = derived(() => !sidebar.isMobile);
		function menuToggle($$renderer) {
			if (showMenu()) {
				$$renderer.push("<!--[0-->");
				Button($$renderer, {
					variant: "ghost",
					size: "icon",
					class: "size-8",
					"aria-label": "Menu",
					onclick: () => sidebar.toggle(),
					children: ($$renderer) => {
						Menu($$renderer, {});
					},
					$$slots: { default: true }
				});
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]-->`);
		}
		if (!isPhoneChrome) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<header class="pointer-events-auto sticky top-0 z-(--z-header) flex w-full items-center border-b bg-background" data-tauri-drag-region=""><div class="flex h-(--header-height) w-full items-center gap-2 pr-2 pl-3" data-tauri-drag-region="">`);
			if (isMac) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<div class="w-20" data-tauri-drag-region=""></div>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> `);
			if (isWindows) {
				$$renderer.push("<!--[0-->");
				menuToggle($$renderer);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> <div class="flex-1" data-tauri-drag-region=""></div> `);
			if (!isWindows) {
				$$renderer.push("<!--[0-->");
				menuToggle($$renderer);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> `);
			if (isWindows) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<div class="flex items-center gap-1">`);
				Button($$renderer, {
					class: "size-8",
					variant: "ghost",
					size: "icon",
					onclick: () => Window.Minimise(),
					"aria-label": "Minimize",
					children: ($$renderer) => {
						Minus($$renderer, {});
					},
					$$slots: { default: true }
				});
				$$renderer.push(`<!----> `);
				Button($$renderer, {
					class: "size-8",
					variant: "ghost",
					size: "icon",
					onclick: () => Window.ToggleMaximise(),
					"aria-label": "Maximize",
					children: ($$renderer) => {
						Square($$renderer, {});
					},
					$$slots: { default: true }
				});
				$$renderer.push(`<!----> `);
				Button($$renderer, {
					class: "size-8 hover:bg-destructive hover:text-white",
					variant: "ghost",
					size: "icon",
					onclick: () => Window.Close(),
					"aria-label": "Close",
					children: ($$renderer) => {
						X($$renderer, {});
					},
					$$slots: { default: true }
				});
				$$renderer.push(`<!----></div>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--></div></header>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
	});
}
//#endregion
//#region src/lib/components/shell/AppSidebar.svelte
function AppSidebar($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const pathname = derived(() => page.url.pathname);
		/** The paired-device count, shown on the Devices row once there is one. */
		function showCount(item) {
			return item.href === "/devices" && pairing.available && pairing.devices.length > 0;
		}
		if (Sidebar) {
			$$renderer.push("<!--[-->");
			Sidebar($$renderer, {
				collapsible: "icon",
				class: "top-(--header-height)! h-[calc(100svh-var(--header-height))]!",
				children: ($$renderer) => {
					if (Sidebar_header) {
						$$renderer.push("<!--[-->");
						Sidebar_header($$renderer, {
							children: ($$renderer) => {
								if (Sidebar_menu) {
									$$renderer.push("<!--[-->");
									Sidebar_menu($$renderer, {
										children: ($$renderer) => {
											if (Sidebar_menu_item) {
												$$renderer.push("<!--[-->");
												Sidebar_menu_item($$renderer, {
													children: ($$renderer) => {
														{
															function child($$renderer, { props }) {
																$$renderer.push(`<div${attributes({ ...props })}><img${attr("src", asset("/logo.png"))} alt="" class="size-8 shrink-0 rounded-lg"/> <div class="flex min-w-0 flex-col leading-tight"><span class="truncate font-medium">Floppy</span> <span class="truncate text-xs text-muted-foreground">Peer-to-peer transfer</span></div></div>`);
															}
															if (Sidebar_menu_button) {
																$$renderer.push("<!--[-->");
																Sidebar_menu_button($$renderer, {
																	size: "lg",
																	class: "cursor-default hover:bg-transparent hover:text-sidebar-foreground active:bg-transparent active:text-sidebar-foreground",
																	child,
																	$$slots: { child: true }
																});
																$$renderer.push("<!--]-->");
															} else {
																$$renderer.push("<!--[!-->");
																$$renderer.push("<!--]-->");
															}
														}
													},
													$$slots: { default: true }
												});
												$$renderer.push("<!--]-->");
											} else {
												$$renderer.push("<!--[!-->");
												$$renderer.push("<!--]-->");
											}
										},
										$$slots: { default: true }
									});
									$$renderer.push("<!--]-->");
								} else {
									$$renderer.push("<!--[!-->");
									$$renderer.push("<!--]-->");
								}
							},
							$$slots: { default: true }
						});
						$$renderer.push("<!--]-->");
					} else {
						$$renderer.push("<!--[!-->");
						$$renderer.push("<!--]-->");
					}
					$$renderer.push(` `);
					if (Sidebar_content) {
						$$renderer.push("<!--[-->");
						Sidebar_content($$renderer, {
							children: ($$renderer) => {
								if (Sidebar_group) {
									$$renderer.push("<!--[-->");
									Sidebar_group($$renderer, {
										children: ($$renderer) => {
											if (Sidebar_group_label) {
												$$renderer.push("<!--[-->");
												Sidebar_group_label($$renderer, {
													children: ($$renderer) => {
														$$renderer.push(`<!---->Menu`);
													},
													$$slots: { default: true }
												});
												$$renderer.push("<!--]-->");
											} else {
												$$renderer.push("<!--[!-->");
												$$renderer.push("<!--]-->");
											}
											$$renderer.push(` `);
											if (Sidebar_group_content) {
												$$renderer.push("<!--[-->");
												Sidebar_group_content($$renderer, {
													children: ($$renderer) => {
														if (Sidebar_menu) {
															$$renderer.push("<!--[-->");
															Sidebar_menu($$renderer, {
																children: ($$renderer) => {
																	$$renderer.push(`<!--[-->`);
																	const each_array = ensure_array_like(platformNavItems);
																	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
																		let item = each_array[$$index];
																		const active = pathname() === item.href;
																		if (Sidebar_menu_item) {
																			$$renderer.push("<!--[-->");
																			Sidebar_menu_item($$renderer, {
																				children: ($$renderer) => {
																					{
																						function child($$renderer, { props }) {
																							$$renderer.push(`<a${attributes({
																								href: resolve(item.href),
																								...props,
																								"aria-label": item.stub ? `${item.label}, preview` : void 0
																							})}>`);
																							if (item.icon) {
																								$$renderer.push("<!--[-->");
																								item.icon($$renderer, {});
																								$$renderer.push("<!--]-->");
																							} else {
																								$$renderer.push("<!--[!-->");
																								$$renderer.push("<!--]-->");
																							}
																							$$renderer.push(` <span>${escape_html(item.label)}</span></a>`);
																						}
																						if (Sidebar_menu_button) {
																							$$renderer.push("<!--[-->");
																							Sidebar_menu_button($$renderer, {
																								isActive: active,
																								tooltipContent: item.label,
																								child,
																								$$slots: { child: true }
																							});
																							$$renderer.push("<!--]-->");
																						} else {
																							$$renderer.push("<!--[!-->");
																							$$renderer.push("<!--]-->");
																						}
																					}
																					$$renderer.push(` `);
																					if (showCount(item) || item.stub) {
																						$$renderer.push("<!--[0-->");
																						if (Sidebar_menu_badge) {
																							$$renderer.push("<!--[-->");
																							Sidebar_menu_badge($$renderer, {
																								class: "top-1/2! -translate-y-1/2 gap-1.5",
																								children: ($$renderer) => {
																									if (showCount(item)) {
																										$$renderer.push("<!--[0-->");
																										$$renderer.push(`${escape_html(pairing.devices.length)}`);
																									} else $$renderer.push("<!--[-1-->");
																									$$renderer.push(`<!--]--> `);
																									if (item.stub) {
																										$$renderer.push("<!--[0-->");
																										$$renderer.push(`<span class="size-1.5 rounded-full bg-muted-foreground" aria-hidden="true"></span>`);
																									} else $$renderer.push("<!--[-1-->");
																									$$renderer.push(`<!--]-->`);
																								},
																								$$slots: { default: true }
																							});
																							$$renderer.push("<!--]-->");
																						} else {
																							$$renderer.push("<!--[!-->");
																							$$renderer.push("<!--]-->");
																						}
																					} else $$renderer.push("<!--[-1-->");
																					$$renderer.push(`<!--]-->`);
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
																},
																$$slots: { default: true }
															});
															$$renderer.push("<!--]-->");
														} else {
															$$renderer.push("<!--[!-->");
															$$renderer.push("<!--]-->");
														}
													},
													$$slots: { default: true }
												});
												$$renderer.push("<!--]-->");
											} else {
												$$renderer.push("<!--[!-->");
												$$renderer.push("<!--]-->");
											}
										},
										$$slots: { default: true }
									});
									$$renderer.push("<!--]-->");
								} else {
									$$renderer.push("<!--[!-->");
									$$renderer.push("<!--]-->");
								}
							},
							$$slots: { default: true }
						});
						$$renderer.push("<!--]-->");
					} else {
						$$renderer.push("<!--[!-->");
						$$renderer.push("<!--]-->");
					}
					$$renderer.push(` `);
					if (Sidebar_separator) {
						$$renderer.push("<!--[-->");
						Sidebar_separator($$renderer, { class: "group-data-[collapsible=icon]:mx-1 data-[orientation=horizontal]:w-auto" });
						$$renderer.push("<!--]-->");
					} else {
						$$renderer.push("<!--[!-->");
						$$renderer.push("<!--]-->");
					}
					$$renderer.push(` `);
					if (Sidebar_footer) {
						$$renderer.push("<!--[-->");
						Sidebar_footer($$renderer, {
							class: "pb-[calc(--spacing(2)+var(--safe-bottom))]",
							children: ($$renderer) => {
								if (Sidebar_menu) {
									$$renderer.push("<!--[-->");
									Sidebar_menu($$renderer, {
										children: ($$renderer) => {
											if (Sidebar_menu_item) {
												$$renderer.push("<!--[-->");
												Sidebar_menu_item($$renderer, {
													children: ($$renderer) => {
														{
															function child($$renderer, { props }) {
																$$renderer.push(`<a${attributes({
																	href: resolve("/account"),
																	...props
																})}>`);
																if (Avatar) {
																	$$renderer.push("<!--[-->");
																	Avatar($$renderer, {
																		class: "size-8 rounded-lg",
																		children: ($$renderer) => {
																			if (Avatar_fallback) {
																				$$renderer.push("<!--[-->");
																				Avatar_fallback($$renderer, {
																					class: "rounded-lg",
																					children: ($$renderer) => {
																						User($$renderer, { class: "size-4" });
																					},
																					$$slots: { default: true }
																				});
																				$$renderer.push("<!--]-->");
																			} else {
																				$$renderer.push("<!--[!-->");
																				$$renderer.push("<!--]-->");
																			}
																		},
																		$$slots: { default: true }
																	});
																	$$renderer.push("<!--]-->");
																} else {
																	$$renderer.push("<!--[!-->");
																	$$renderer.push("<!--]-->");
																}
																$$renderer.push(` <div class="flex min-w-0 flex-col leading-tight"><span class="truncate font-medium">Not signed in</span> <span class="truncate text-xs text-muted-foreground">Sync your devices</span></div> `);
																StubMark($$renderer, { class: "ml-auto" });
																$$renderer.push(`<!----></a>`);
															}
															if (Sidebar_menu_button) {
																$$renderer.push("<!--[-->");
																Sidebar_menu_button($$renderer, {
																	size: "lg",
																	tooltipContent: "Sign in",
																	child,
																	$$slots: { child: true }
																});
																$$renderer.push("<!--]-->");
															} else {
																$$renderer.push("<!--[!-->");
																$$renderer.push("<!--]-->");
															}
														}
													},
													$$slots: { default: true }
												});
												$$renderer.push("<!--]-->");
											} else {
												$$renderer.push("<!--[!-->");
												$$renderer.push("<!--]-->");
											}
										},
										$$slots: { default: true }
									});
									$$renderer.push("<!--]-->");
								} else {
									$$renderer.push("<!--[!-->");
									$$renderer.push("<!--]-->");
								}
							},
							$$slots: { default: true }
						});
						$$renderer.push("<!--]-->");
					} else {
						$$renderer.push("<!--[!-->");
						$$renderer.push("<!--]-->");
					}
				},
				$$slots: { default: true }
			});
			$$renderer.push("<!--]-->");
		} else {
			$$renderer.push("<!--[!-->");
			$$renderer.push("<!--]-->");
		}
	});
}
//#endregion
//#region src/lib/components/shell/BottomNav.svelte
function BottomNav($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const pathname = derived(() => page.url.pathname);
		/** The paired-device count, shown on the Devices item once there is one. */
		function count(item) {
			if (item.href !== "/devices") return null;
			if (!pairing.available || pairing.devices.length === 0) return null;
			return pairing.devices.length;
		}
		/**
		* Whether this destination holds a transfer worth pointing at. The bar is on
		* every route, so this is how a failure or a running transfer stays visible
		* from wherever the user happens to be — the mode switcher's spinner was only
		* ever visible if you were already looking at the transfer screen.
		*/
		function transfer(item) {
			const side = item.href === "/send" ? app.send : item.href === "/receive" ? app.receive : null;
			if (!side) return null;
			if (side.error) return "failed";
			return side.busy ? "running" : null;
		}
		{
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<nav aria-label="Main" class="flex shrink-0 items-stretch border-t bg-background pt-1 pr-(--safe-right) pb-[calc(--spacing(0)+var(--safe-bottom))] pl-(--safe-left)"><!--[-->`);
			const each_array = ensure_array_like(platformNavItems);
			for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
				let item = each_array[$$index];
				const active = pathname() === item.href;
				const n = count(item);
				const state = transfer(item);
				$$renderer.push(`<a${attr("href", resolve(item.href))}${attr("aria-current", active ? "page" : void 0)}${attr("aria-label", item.stub ? `${item.label}, preview` : void 0)}${attr_class(clsx(cn("flex min-h-14 flex-1 flex-col items-center justify-center gap-1.5 px-1 py-2 transition-colors", active ? "text-foreground" : "text-muted-foreground")))}><span class="relative flex">`);
				if (item.icon) {
					$$renderer.push("<!--[-->");
					item.icon($$renderer, { class: cn("size-5", active && "stroke-[2.25]") });
					$$renderer.push("<!--]-->");
				} else {
					$$renderer.push("<!--[!-->");
					$$renderer.push("<!--]-->");
				}
				$$renderer.push(` `);
				if (n !== null || item.stub || state) {
					$$renderer.push("<!--[0-->");
					$$renderer.push(`<span class="absolute -top-1.5 left-full flex -translate-x-1 items-center gap-1" aria-hidden="true">`);
					if (state) {
						$$renderer.push("<!--[0-->");
						$$renderer.push(`<span${attr_class(clsx(cn("size-1.5 rounded-full", state === "failed" ? "bg-destructive" : "animate-pulse bg-foreground")))}></span>`);
					} else $$renderer.push("<!--[-1-->");
					$$renderer.push(`<!--]--> `);
					if (n !== null) {
						$$renderer.push("<!--[0-->");
						$$renderer.push(`<span class="min-w-4 rounded-full bg-primary px-1 text-center text-[10px] leading-4 font-medium text-primary-foreground">${escape_html(n)}</span>`);
					} else $$renderer.push("<!--[-1-->");
					$$renderer.push(`<!--]--> `);
					if (item.stub) {
						$$renderer.push("<!--[0-->");
						$$renderer.push(`<span class="size-1.5 rounded-full bg-muted-foreground"></span>`);
					} else $$renderer.push("<!--[-1-->");
					$$renderer.push(`<!--]--></span>`);
				} else $$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]--></span> <span class="text-xs leading-none font-medium">${escape_html(item.label)}</span></a>`);
			}
			$$renderer.push(`<!--]--></nav>`);
		}
		$$renderer.push(`<!--]-->`);
	});
}
//#endregion
//#region node_modules/@lucide/svelte/dist/icons/circle-check.svelte
function Circle_check($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "circle-check" },
		props,
		{ iconNode: [["circle", {
			"cx": "12",
			"cy": "12",
			"r": "10"
		}], ["path", { "d": "m9 12 2 2 4-4" }]] }
	]));
}
//#endregion
//#region node_modules/@lucide/svelte/dist/icons/octagon-x.svelte
function Octagon_x($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "octagon-x" },
		props,
		{ iconNode: [
			["path", { "d": "m15 9-6 6" }],
			["path", { "d": "M2.586 16.726A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2h6.624a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586z" }],
			["path", { "d": "m9 9 6 6" }]
		] }
	]));
}
//#endregion
//#region src/lib/components/ui/sonner/sonner.svelte
function Sonner_1($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { $$slots, $$events, ...restProps } = $$props;
		{
			function loadingIcon($$renderer) {
				Loader_circle($$renderer, { class: "size-4 animate-spin" });
			}
			function successIcon($$renderer) {
				Circle_check($$renderer, { class: "size-4" });
			}
			function errorIcon($$renderer) {
				Octagon_x($$renderer, { class: "size-4" });
			}
			function infoIcon($$renderer) {
				Info($$renderer, { class: "size-4" });
			}
			function warningIcon($$renderer) {
				Triangle_alert($$renderer, { class: "size-4" });
			}
			Toaster($$renderer, spread_props([
				{
					theme: derivedMode.current,
					class: "toaster group",
					style: "--normal-bg: var(--color-popover); --normal-text: var(--color-popover-foreground); --normal-border: var(--color-border);"
				},
				restProps,
				{
					loadingIcon,
					successIcon,
					errorIcon,
					infoIcon,
					warningIcon,
					$$slots: {
						loadingIcon: true,
						successIcon: true,
						errorIcon: true,
						infoIcon: true,
						warningIcon: true
					}
				}
			]));
		}
	});
}
//#endregion
//#region src/routes/+layout.svelte
function _layout($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const { children } = $$props;
		let sidebarOpen = true;
		const isMobile = new IsMobile();
		if (isPhoneChrome && typeof document !== "undefined") document.documentElement.dataset.mobile = "";
		if (isPhoneChrome && typeof document !== "undefined") setMode("system");
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			Mode_watcher($$renderer, {});
			$$renderer.push(`<!----> `);
			ScanSheet($$renderer, {});
			$$renderer.push(`<!----> `);
			if (Sidebar_provider) {
				$$renderer.push("<!--[-->");
				Sidebar_provider($$renderer, {
					class: "h-svh min-h-0! flex-col",
					get open() {
						return sidebarOpen;
					},
					set open($$value) {
						sidebarOpen = $$value;
						$$settled = false;
					},
					children: ($$renderer) => {
						AppHeader($$renderer, {});
						$$renderer.push(`<!----> <div class="flex min-h-0 w-full flex-1">`);
						if (!isMobile.current) {
							$$renderer.push("<!--[0-->");
							AppSidebar($$renderer, {});
						} else $$renderer.push("<!--[-1-->");
						$$renderer.push(`<!--]--> `);
						if (Sidebar_inset) {
							$$renderer.push("<!--[-->");
							Sidebar_inset($$renderer, {
								class: "min-h-0 overflow-clip bg-background pt-(--safe-top) pr-(--safe-right) pl-(--safe-left)",
								children: ($$renderer) => {
									$$renderer.push(`<!---->`);
									$$renderer.push(`<div class="flex min-h-0 w-full flex-1 flex-col">`);
									children($$renderer);
									$$renderer.push(`<!----></div>`);
									$$renderer.push(`<!---->`);
								},
								$$slots: { default: true }
							});
							$$renderer.push("<!--]-->");
						} else {
							$$renderer.push("<!--[!-->");
							$$renderer.push("<!--]-->");
						}
						$$renderer.push(`</div> `);
						if (isMobile.current) {
							$$renderer.push("<!--[0-->");
							BottomNav($$renderer, {});
						} else $$renderer.push("<!--[-1-->");
						$$renderer.push(`<!--]-->`);
					},
					$$slots: { default: true }
				});
				$$renderer.push("<!--]-->");
			} else {
				$$renderer.push("<!--[!-->");
				$$renderer.push("<!--]-->");
			}
			$$renderer.push(` `);
			IncomingOfferDialog($$renderer, {});
			$$renderer.push(`<!----> `);
			IncomingPairDialog($$renderer, {});
			$$renderer.push(`<!----> `);
			Sonner_1($$renderer, {
				position: "top-center",
				richColors: true,
				offset: { top: "calc(var(--header-height) + var(--spacing) * 2)" },
				mobileOffset: { top: "calc(var(--safe-top) + var(--spacing) * 2)" },
				closeButton: true
			});
			$$renderer.push(`<!---->`);
		}
		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);
		$$renderer.subsume($$inner_renderer);
	});
}
//#endregion
export { _layout as default };
