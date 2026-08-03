import { K as run, S as setContext, a as unmount, b as getContext, c as attributes, g as spread_props, i as tick, k as on, l as bind_props, m as props_id, n as mount, u as derived, w as clsx$1, x as hasContext, y as getAllContexts, z as snapshot } from "./index-server.js";
import { t as goto } from "./client.js";
import { n as resolve } from "./paths.js";
import { t as app } from "./transfer-app.svelte.js";
import { B as createSubscriber, E as simpleBox, K as cn$1, R as SvelteMap, S as boxWith$1, c as createBitsAttrs, d as getDataOpenClosed, f as getDataTransitionAttrs, g as executeCallbacks$1, i as boolToEmptyStrOrUndef, m as mergeProps$1, p as attachRef, r as createId, v as composeHandlers$1, z as SvelteSet } from "./StubMark.js";
import { D as errorText, T as describeError, _ as SendTo, a as ConfirmPair, b as TrustedDevices, c as DismissPair, g as SelfName, h as RenameDevice, m as RedeemPairCode, o as Decline, t as Accept, u as Identity, v as SetSelfName, w as events, x as Untrust, y as ShowPairCode } from "./ipc.js";
import { a as Context$1, i as watch$1 } from "./separator.js";
import { n as contains, t as DOMContext } from "./dom-context.svelte.js";
import { i as isElementOrSVGElement, n as isBrowser$2, o as isHTMLElement, s as isIOS$1, t as noop$2 } from "./noop.js";
import { clsx } from "clsx";
import parse from "style-to-object";
import { focusable, isFocusable, tabbable } from "tabbable";
//#region node_modules/svelte-toolbelt/dist/utils/on-destroy-effect.svelte.js
function onDestroyEffect$1(fn) {}
//#endregion
//#region node_modules/svelte-toolbelt/dist/utils/after-sleep.js
/**
* A utility function that executes a callback after a specified number of milliseconds.
*/
function afterSleep$1(ms, cb) {
	return setTimeout(cb, ms);
}
//#endregion
//#region node_modules/svelte-toolbelt/dist/utils/after-tick.js
function afterTick$1(fn) {
	(/* @__PURE__ */ tick()).then(fn);
}
//#endregion
//#region node_modules/bits-ui/dist/internal/animations-complete.js
var AnimationsComplete = class {
	#opts;
	#currentFrame = null;
	#observer = null;
	#runId = 0;
	constructor(opts) {
		this.#opts = opts;
	}
	#cleanup() {
		if (this.#currentFrame !== null) {
			window.cancelAnimationFrame(this.#currentFrame);
			this.#currentFrame = null;
		}
		this.#observer?.disconnect();
		this.#observer = null;
		this.#runId++;
	}
	run(fn) {
		this.#cleanup();
		const node = this.#opts.ref.current;
		if (!node) return;
		if (typeof node.getAnimations !== "function") {
			this.#executeCallback(fn);
			return;
		}
		const runId = this.#runId;
		const executeIfCurrent = () => {
			if (runId !== this.#runId) return;
			this.#executeCallback(fn);
		};
		const waitForAnimations = () => {
			if (runId !== this.#runId) return;
			const animations = node.getAnimations();
			if (animations.length === 0) {
				executeIfCurrent();
				return;
			}
			Promise.all(animations.map((animation) => animation.finished)).then(() => {
				executeIfCurrent();
			}).catch(() => {
				if (runId !== this.#runId) return;
				if (node.getAnimations().some((animation) => animation.pending || animation.playState !== "finished")) {
					waitForAnimations();
					return;
				}
				executeIfCurrent();
			});
		};
		const requestWaitForAnimations = () => {
			this.#currentFrame = window.requestAnimationFrame(() => {
				this.#currentFrame = null;
				waitForAnimations();
			});
		};
		if (!this.#opts.afterTick.current) {
			requestWaitForAnimations();
			return;
		}
		this.#currentFrame = window.requestAnimationFrame(() => {
			this.#currentFrame = null;
			const startingStyleAttr = "data-starting-style";
			if (!node.hasAttribute(startingStyleAttr)) {
				requestWaitForAnimations();
				return;
			}
			this.#observer = new MutationObserver(() => {
				if (runId !== this.#runId) return;
				if (node.hasAttribute(startingStyleAttr)) return;
				this.#observer?.disconnect();
				this.#observer = null;
				requestWaitForAnimations();
			});
			this.#observer.observe(node, {
				attributes: true,
				attributeFilter: [startingStyleAttr]
			});
		});
	}
	#executeCallback(fn) {
		const execute = () => {
			fn();
		};
		if (this.#opts.afterTick) afterTick$1(execute);
		else execute();
	}
};
//#endregion
//#region node_modules/bits-ui/dist/internal/presence-manager.svelte.js
var PresenceManager = class {
	#opts;
	#enabled;
	#afterAnimations;
	#shouldRender = false;
	#transitionStatus = void 0;
	#hasMounted = false;
	#transitionFrame = null;
	constructor(opts) {
		this.#opts = opts;
		this.#shouldRender = opts.open.current;
		this.#enabled = opts.enabled ?? true;
		this.#afterAnimations = new AnimationsComplete({
			ref: this.#opts.ref,
			afterTick: this.#opts.open
		});
		watch$1(() => this.#opts.open.current, (isOpen) => {
			if (!this.#hasMounted) {
				this.#hasMounted = true;
				return;
			}
			this.#clearTransitionFrame();
			if (!isOpen && this.#opts.shouldSkipExitAnimation?.()) {
				this.#shouldRender = false;
				this.#transitionStatus = void 0;
				this.#opts.onComplete?.();
				return;
			}
			if (isOpen) this.#shouldRender = true;
			this.#transitionStatus = isOpen ? "starting" : "ending";
			if (isOpen) this.#transitionFrame = window.requestAnimationFrame(() => {
				this.#transitionFrame = null;
				if (this.#opts.open.current) this.#transitionStatus = void 0;
			});
			if (!this.#enabled) {
				if (!isOpen) this.#shouldRender = false;
				this.#transitionStatus = void 0;
				this.#opts.onComplete?.();
				return;
			}
			this.#afterAnimations.run(() => {
				if (isOpen === this.#opts.open.current) {
					if (!this.#opts.open.current) this.#shouldRender = false;
					this.#transitionStatus = void 0;
					this.#opts.onComplete?.();
				}
			});
		});
	}
	get shouldRender() {
		return this.#shouldRender;
	}
	get transitionStatus() {
		return this.#transitionStatus;
	}
	#clearTransitionFrame() {
		if (this.#transitionFrame === null) return;
		window.cancelAnimationFrame(this.#transitionFrame);
		this.#transitionFrame = null;
	}
};
//#endregion
//#region node_modules/bits-ui/dist/bits/dialog/dialog.svelte.js
var dialogAttrs = createBitsAttrs({
	component: "dialog",
	parts: [
		"content",
		"trigger",
		"overlay",
		"title",
		"description",
		"close",
		"cancel",
		"action"
	]
});
var DialogRootContext = new Context$1("Dialog.Root | AlertDialog.Root");
var DialogRootState = class DialogRootState {
	static create(opts) {
		const parent = DialogRootContext.getOr(null);
		return DialogRootContext.set(new DialogRootState(opts, parent));
	}
	opts;
	triggerNode = null;
	contentNode = null;
	overlayNode = null;
	descriptionNode = null;
	contentId = void 0;
	titleId = void 0;
	triggerId = void 0;
	descriptionId = void 0;
	cancelNode = null;
	nestedOpenCount = 0;
	depth;
	parent;
	contentPresence;
	overlayPresence;
	constructor(opts, parent) {
		this.opts = opts;
		this.parent = parent;
		this.depth = parent ? parent.depth + 1 : 0;
		this.handleOpen = this.handleOpen.bind(this);
		this.handleClose = this.handleClose.bind(this);
		this.contentPresence = new PresenceManager({
			ref: boxWith$1(() => this.contentNode),
			open: this.opts.open,
			enabled: true,
			onComplete: () => {
				this.opts.onOpenChangeComplete.current(this.opts.open.current);
			}
		});
		this.overlayPresence = new PresenceManager({
			ref: boxWith$1(() => this.overlayNode),
			open: this.opts.open,
			enabled: true
		});
		watch$1(() => this.opts.open.current, (isOpen) => {
			if (!this.parent) return;
			if (isOpen) this.parent.incrementNested();
			else this.parent.decrementNested();
		}, { lazy: true });
	}
	handleOpen() {
		if (this.opts.open.current) return;
		this.opts.open.current = true;
	}
	handleClose() {
		if (!this.opts.open.current) return;
		this.opts.open.current = false;
	}
	getBitsAttr = (part) => {
		return dialogAttrs.getAttr(part, this.opts.variant.current);
	};
	incrementNested() {
		this.nestedOpenCount++;
		this.parent?.incrementNested();
	}
	decrementNested() {
		if (this.nestedOpenCount === 0) return;
		this.nestedOpenCount--;
		this.parent?.decrementNested();
	}
	#sharedProps = derived(() => ({ "data-state": getDataOpenClosed(this.opts.open.current) }));
	get sharedProps() {
		return this.#sharedProps();
	}
	set sharedProps($$value) {
		return this.#sharedProps($$value);
	}
};
var DialogCloseState = class DialogCloseState {
	static create(opts) {
		return new DialogCloseState(opts, DialogRootContext.get());
	}
	opts;
	root;
	attachment;
	constructor(opts, root) {
		this.opts = opts;
		this.root = root;
		this.attachment = attachRef(this.opts.ref);
		this.onclick = this.onclick.bind(this);
		this.onkeydown = this.onkeydown.bind(this);
	}
	onclick(e) {
		if (this.opts.disabled.current) return;
		if (e.button > 0) return;
		this.root.handleClose();
	}
	onkeydown(e) {
		if (this.opts.disabled.current) return;
		if (e.key === " " || e.key === "Enter") {
			e.preventDefault();
			this.root.handleClose();
		}
	}
	#props = derived(() => ({
		id: this.opts.id.current,
		[this.root.getBitsAttr(this.opts.variant.current)]: "",
		onclick: this.onclick,
		onkeydown: this.onkeydown,
		disabled: this.opts.disabled.current ? true : void 0,
		tabindex: 0,
		...this.root.sharedProps,
		...this.attachment
	}));
	get props() {
		return this.#props();
	}
	set props($$value) {
		return this.#props($$value);
	}
};
var DialogTitleState = class DialogTitleState {
	static create(opts) {
		return new DialogTitleState(opts, DialogRootContext.get());
	}
	opts;
	root;
	attachment;
	constructor(opts, root) {
		this.opts = opts;
		this.root = root;
		this.root.titleId = this.opts.id.current;
		this.attachment = attachRef(this.opts.ref);
		watch$1.pre(() => this.opts.id.current, (id) => {
			this.root.titleId = id;
		});
	}
	#props = derived(() => ({
		id: this.opts.id.current,
		role: "heading",
		"aria-level": this.opts.level.current,
		[this.root.getBitsAttr("title")]: "",
		...this.root.sharedProps,
		...this.attachment
	}));
	get props() {
		return this.#props();
	}
	set props($$value) {
		return this.#props($$value);
	}
};
var DialogDescriptionState = class DialogDescriptionState {
	static create(opts) {
		return new DialogDescriptionState(opts, DialogRootContext.get());
	}
	opts;
	root;
	attachment;
	constructor(opts, root) {
		this.opts = opts;
		this.root = root;
		this.root.descriptionId = this.opts.id.current;
		this.attachment = attachRef(this.opts.ref, (v) => {
			this.root.descriptionNode = v;
		});
		watch$1.pre(() => this.opts.id.current, (id) => {
			this.root.descriptionId = id;
		});
	}
	#props = derived(() => ({
		id: this.opts.id.current,
		[this.root.getBitsAttr("description")]: "",
		...this.root.sharedProps,
		...this.attachment
	}));
	get props() {
		return this.#props();
	}
	set props($$value) {
		return this.#props($$value);
	}
};
var DialogContentState = class DialogContentState {
	static create(opts) {
		return new DialogContentState(opts, DialogRootContext.get());
	}
	opts;
	root;
	attachment;
	constructor(opts, root) {
		this.opts = opts;
		this.root = root;
		this.attachment = attachRef(this.opts.ref, (v) => {
			this.root.contentNode = v;
			this.root.contentId = v?.id;
		});
	}
	#snippetProps = derived(() => ({ open: this.root.opts.open.current }));
	get snippetProps() {
		return this.#snippetProps();
	}
	set snippetProps($$value) {
		return this.#snippetProps($$value);
	}
	#props = derived(() => ({
		id: this.opts.id.current,
		role: this.root.opts.variant.current === "alert-dialog" ? "alertdialog" : "dialog",
		"aria-modal": "true",
		"aria-describedby": this.root.descriptionId,
		"aria-labelledby": this.root.titleId,
		[this.root.getBitsAttr("content")]: "",
		style: {
			pointerEvents: "auto",
			outline: this.root.opts.variant.current === "alert-dialog" ? "none" : void 0,
			"--bits-dialog-depth": this.root.depth,
			"--bits-dialog-nested-count": this.root.nestedOpenCount,
			contain: "layout style"
		},
		tabindex: this.root.opts.variant.current === "alert-dialog" ? -1 : void 0,
		"data-nested-open": boolToEmptyStrOrUndef(this.root.nestedOpenCount > 0),
		"data-nested": boolToEmptyStrOrUndef(this.root.parent !== null),
		...getDataTransitionAttrs(this.root.contentPresence.transitionStatus),
		...this.root.sharedProps,
		...this.attachment
	}));
	get props() {
		return this.#props();
	}
	set props($$value) {
		return this.#props($$value);
	}
	get shouldRender() {
		return this.root.contentPresence.shouldRender;
	}
};
var DialogOverlayState = class DialogOverlayState {
	static create(opts) {
		return new DialogOverlayState(opts, DialogRootContext.get());
	}
	opts;
	root;
	attachment;
	constructor(opts, root) {
		this.opts = opts;
		this.root = root;
		this.attachment = attachRef(this.opts.ref, (v) => this.root.overlayNode = v);
	}
	#snippetProps = derived(() => ({ open: this.root.opts.open.current }));
	get snippetProps() {
		return this.#snippetProps();
	}
	set snippetProps($$value) {
		return this.#snippetProps($$value);
	}
	#props = derived(() => ({
		id: this.opts.id.current,
		[this.root.getBitsAttr("overlay")]: "",
		style: {
			pointerEvents: "auto",
			"--bits-dialog-depth": this.root.depth,
			"--bits-dialog-nested-count": this.root.nestedOpenCount
		},
		"data-nested-open": boolToEmptyStrOrUndef(this.root.nestedOpenCount > 0),
		"data-nested": boolToEmptyStrOrUndef(this.root.parent !== null),
		...getDataTransitionAttrs(this.root.overlayPresence.transitionStatus),
		...this.root.sharedProps,
		...this.attachment
	}));
	get props() {
		return this.#props();
	}
	set props($$value) {
		return this.#props($$value);
	}
	get shouldRender() {
		return this.root.overlayPresence.shouldRender;
	}
};
//#endregion
//#region node_modules/bits-ui/dist/bits/dialog/components/dialog-title.svelte
function Dialog_title($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const uid = props_id($$renderer);
		let { id = createId(uid), ref = null, child, children, level = 2, $$slots, $$events, ...restProps } = $$props;
		const titleState = DialogTitleState.create({
			id: boxWith$1(() => id),
			level: boxWith$1(() => level),
			ref: boxWith$1(() => ref, (v) => ref = v)
		});
		const mergedProps = derived(() => mergeProps$1(restProps, titleState.props));
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
//#region node_modules/bits-ui/dist/bits/utilities/portal/portal-consumer.svelte
function Portal_consumer($$renderer, $$props) {
	const { children } = $$props;
	$$renderer.push(`<!---->`);
	children?.($$renderer);
	$$renderer.push(`<!---->`);
	$$renderer.push(`<!---->`);
}
//#endregion
//#region node_modules/bits-ui/dist/bits/utilities/config/bits-config.js
var BitsConfigContext = new Context$1("BitsConfig");
/**
* Gets the current Bits UI configuration state from the context.
*
* Returns a default configuration (where all values are `undefined`) if no configuration is found.
*/
function getBitsConfig() {
	const fallback = new BitsConfigState(null, {});
	return BitsConfigContext.getOr(fallback).opts;
}
/**
* Configuration state that inherits from parent configurations.
*
* @example
* Config resolution:
* ```
* Level 1: { defaultPortalTo: "#some-element", theme: "dark" }
* Level 2: { spacing: "large" } // inherits defaultPortalTo="#some-element", theme="dark"
* Level 3: { theme: "light" }   // inherits defaultPortalTo="#some-element", spacing="large", overrides theme="light"
* ```
*/
var BitsConfigState = class {
	opts;
	constructor(parent, opts) {
		const resolveConfigOption = createConfigResolver(parent, opts);
		this.opts = {
			defaultPortalTo: resolveConfigOption((config) => config.defaultPortalTo),
			defaultLocale: resolveConfigOption((config) => config.defaultLocale)
		};
	}
};
/**
* Returns a config resolver that resolves a given config option's value.
*
* The resolver creates reactive boxes that resolve config option values using this priority:
* 1. Current level's value (if defined)
* 2. Parent level's value (if defined and current is undefined)
* 3. `undefined` (if no value is found in either parent or child)
*
* @param parent - Parent configuration state (null if this is root level)
* @param currentOpts - Current level's configuration options
*
* @example
* ```typescript
* // Given this hierarchy:
* // Root: { defaultPortalTo: "#some-element" }
* // Child: { someOtherProp: "value" } // no defaultPortalTo specified
*
* const resolveConfigOption = createConfigResolver(parent, opts);
* const portalTo = resolveConfigOption(config => config.defaultPortalTo);
*
* // portalTo.current === "#some-element" (inherited from parent)
* // even when child didn't specify `defaultPortalTo`
* ```
*/
function createConfigResolver(parent, currentOpts) {
	return (getter) => {
		return boxWith$1(() => {
			const value = getter(currentOpts)?.current;
			if (value !== void 0) return value;
			if (parent === null) return void 0;
			return getter(parent.opts)?.current;
		});
	};
}
//#endregion
//#region node_modules/bits-ui/dist/bits/utilities/config/prop-resolvers.js
/**
* Creates a generic prop resolver that follows a standard priority chain:
* 1. The getter's prop value (if defined)
* 2. The config default value (if no getter prop value is defined)
* 3. The fallback value (if no config value found)
*/
function createPropResolver(configOption, fallback) {
	return (getProp) => {
		const config = getBitsConfig();
		return boxWith$1(() => {
			const propValue = getProp();
			if (propValue !== void 0) return propValue;
			const option = configOption(config).current;
			if (option !== void 0) return option;
			return fallback;
		});
	};
}
/**
* Resolves a portal's `to` value using the prop, the config default, or a fallback.
*
* Default value: `"body"`
*/
var resolvePortalToProp = createPropResolver((config) => config.defaultPortalTo, "body");
//#endregion
//#region node_modules/bits-ui/dist/bits/utilities/portal/portal.svelte
function Portal($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { to: toProp, children, disabled } = $$props;
		const to = resolvePortalToProp(() => toProp);
		const context = getAllContexts();
		let target = derived(getTarget);
		function getTarget() {
			if (!isBrowser$2 || disabled) return null;
			let localTarget = null;
			if (typeof to.current === "string") localTarget = document.querySelector(to.current);
			else localTarget = to.current;
			return localTarget;
		}
		let instance;
		function unmountInstance() {
			if (instance) {
				unmount(instance);
				instance = null;
			}
		}
		watch$1([() => target(), () => disabled], ([target, disabled]) => {
			if (!target || disabled) {
				unmountInstance();
				return;
			}
			instance = mount(Portal_consumer, {
				target,
				props: { children },
				context
			});
			return () => {
				unmountInstance();
			};
		});
		if (disabled) {
			$$renderer.push("<!--[0-->");
			children?.($$renderer);
			$$renderer.push(`<!---->`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
	});
}
//#endregion
//#region node_modules/bits-ui/dist/internal/events.js
/**
* Creates a typed event dispatcher and listener pair for custom events
* @template T - The type of data that will be passed in the event detail
* @param eventName - The name of the custom event
* @param options - CustomEvent options (bubbles, cancelable, etc.)
*/
var CustomEventDispatcher = class {
	eventName;
	options;
	constructor(eventName, options = {
		bubbles: true,
		cancelable: true
	}) {
		this.eventName = eventName;
		this.options = options;
	}
	createEvent(detail) {
		return new CustomEvent(this.eventName, {
			...this.options,
			detail
		});
	}
	dispatch(element, detail) {
		const event = this.createEvent(detail);
		element.dispatchEvent(event);
		return event;
	}
	listen(element, callback, options) {
		const handler = (event) => {
			callback(event);
		};
		return on(element, this.eventName, handler, options);
	}
};
//#endregion
//#region node_modules/bits-ui/dist/internal/debounce.js
function debounce(fn, wait = 500) {
	let timeout = null;
	const debounced = (...args) => {
		if (timeout !== null) clearTimeout(timeout);
		timeout = setTimeout(() => {
			fn(...args);
		}, wait);
	};
	debounced.destroy = () => {
		if (timeout !== null) {
			clearTimeout(timeout);
			timeout = null;
		}
	};
	return debounced;
}
//#endregion
//#region node_modules/bits-ui/dist/internal/elements.js
function isOrContainsTarget(node, target) {
	return node === target || node.contains(target);
}
function getOwnerDocument(el) {
	return el?.ownerDocument ?? document;
}
//#endregion
//#region node_modules/bits-ui/dist/internal/dom.js
/**
* Determines if the click event truly occurred outside the content node.
* This was added to handle password managers and other elements that may be injected
* into the DOM but visually appear inside the content.
*/
function isClickTrulyOutside(event, contentNode) {
	const { clientX, clientY } = event;
	const rect = contentNode.getBoundingClientRect();
	return clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom;
}
//#endregion
//#region node_modules/bits-ui/dist/bits/menu/menu.svelte.js
var CONTEXT_MENU_TRIGGER_ATTR = "data-context-menu-trigger";
var CONTEXT_MENU_CONTENT_ATTR = "data-context-menu-content";
new Context$1("Menu.Root");
new Context$1("Menu.Root | Menu.Sub");
new Context$1("Menu.Content");
new Context$1("Menu.Group | Menu.RadioGroup");
new Context$1("Menu.RadioGroup");
new Context$1("Menu.CheckboxGroup");
new CustomEventDispatcher("bitsmenuopen", {
	bubbles: false,
	cancelable: true
});
createBitsAttrs({
	component: "menu",
	parts: [
		"trigger",
		"content",
		"sub-trigger",
		"item",
		"group",
		"group-heading",
		"checkbox-group",
		"checkbox-item",
		"radio-group",
		"radio-item",
		"separator",
		"sub-content",
		"arrow"
	]
});
//#endregion
//#region node_modules/bits-ui/dist/bits/utilities/dismissible-layer/use-dismissable-layer.svelte.js
globalThis.bitsDismissableLayers ??= /* @__PURE__ */ new Map();
var DismissibleLayerState = class DismissibleLayerState {
	static create(opts) {
		return new DismissibleLayerState(opts);
	}
	opts;
	#interactOutsideProp;
	#behaviorType;
	#interceptedEvents = { pointerdown: false };
	#isResponsibleLayer = false;
	#isFocusInsideDOMTree = false;
	#documentObj = void 0;
	#onFocusOutside;
	#unsubClickListener = noop$2;
	constructor(opts) {
		this.opts = opts;
		this.#behaviorType = opts.interactOutsideBehavior;
		this.#interactOutsideProp = opts.onInteractOutside;
		this.#onFocusOutside = opts.onFocusOutside;
		let unsubEvents = noop$2;
		const cleanup = () => {
			this.#resetState();
			globalThis.bitsDismissableLayers.delete(this);
			this.#handleInteractOutside.destroy();
			unsubEvents();
		};
		watch$1([() => this.opts.enabled.current, () => this.opts.ref.current], () => {
			if (!this.opts.enabled.current || !this.opts.ref.current) return;
			afterSleep$1(1, () => {
				if (!this.opts.ref.current) return;
				globalThis.bitsDismissableLayers.set(this, this.#behaviorType);
				unsubEvents();
				unsubEvents = this.#addEventListeners();
			});
			return cleanup;
		});
	}
	#handleFocus = (event) => {
		if (event.defaultPrevented) return;
		if (!this.opts.ref.current) return;
		afterTick$1(() => {
			if (!this.opts.ref.current || this.#isTargetWithinLayer(event.target)) return;
			if (event.target && !this.#isFocusInsideDOMTree) this.#onFocusOutside.current?.(event);
		});
	};
	#addEventListeners() {
		return executeCallbacks$1(
			/**
			* CAPTURE INTERACTION START
			* mark interaction-start event as intercepted.
			* mark responsible layer during interaction start
			* to avoid checking if is responsible layer during interaction end
			* when a new floating element may have been opened.
			*/
			on(this.#documentObj, "pointerdown", executeCallbacks$1(this.#markInterceptedEvent, this.#markResponsibleLayer), { capture: true }),
			/**
			* BUBBLE INTERACTION START
			* Mark interaction-start event as non-intercepted. Debounce `onInteractOutsideStart`
			* to avoid prematurely checking if other events were intercepted.
			*/
			on(this.#documentObj, "pointerdown", executeCallbacks$1(this.#markNonInterceptedEvent, this.#handleInteractOutside)),
			/**
			* HANDLE FOCUS OUTSIDE
			*/
			on(this.#documentObj, "focusin", this.#handleFocus)
		);
	}
	#handleDismiss = (e) => {
		let event = e;
		if (event.defaultPrevented) event = createWrappedEvent(e);
		this.#interactOutsideProp.current(e);
	};
	#handleInteractOutside = debounce((e) => {
		if (!this.opts.ref.current) {
			this.#unsubClickListener();
			return;
		}
		const isEventValid = this.opts.isValidEvent.current(e, this.opts.ref.current) || isValidEvent(e, this.opts.ref.current);
		if (!this.#isResponsibleLayer || this.#isAnyEventIntercepted() || !isEventValid) {
			this.#unsubClickListener();
			return;
		}
		let event = e;
		if (event.defaultPrevented) event = createWrappedEvent(event);
		if (this.#behaviorType.current !== "close" && this.#behaviorType.current !== "defer-otherwise-close") {
			this.#unsubClickListener();
			return;
		}
		if (e.pointerType === "touch") {
			this.#unsubClickListener();
			this.#unsubClickListener = on(this.#documentObj, "click", this.#handleDismiss, { once: true });
		} else this.#interactOutsideProp.current(event);
	}, 10);
	#markInterceptedEvent = (e) => {
		this.#interceptedEvents[e.type] = true;
	};
	#markNonInterceptedEvent = (e) => {
		this.#interceptedEvents[e.type] = false;
	};
	#markResponsibleLayer = () => {
		if (!this.opts.ref.current) return;
		this.#isResponsibleLayer = isResponsibleLayer(this.opts.ref.current);
	};
	#isTargetWithinLayer = (target) => {
		if (!this.opts.ref.current) return false;
		return isOrContainsTarget(this.opts.ref.current, target);
	};
	#resetState = debounce(() => {
		for (const eventType in this.#interceptedEvents) this.#interceptedEvents[eventType] = false;
		this.#isResponsibleLayer = false;
	}, 20);
	#isAnyEventIntercepted() {
		return Object.values(this.#interceptedEvents).some(Boolean);
	}
	#onfocuscapture = () => {
		this.#isFocusInsideDOMTree = true;
	};
	#onblurcapture = () => {
		this.#isFocusInsideDOMTree = false;
	};
	props = {
		onfocuscapture: this.#onfocuscapture,
		onblurcapture: this.#onblurcapture
	};
};
function getTopMostDismissableLayer(layersArr = [...globalThis.bitsDismissableLayers]) {
	return layersArr.findLast(([_, { current: behaviorType }]) => behaviorType === "close" || behaviorType === "ignore");
}
function isResponsibleLayer(node) {
	const layersArr = [...globalThis.bitsDismissableLayers];
	/**
	* We first check if we can find a top layer with `close` or `ignore`.
	* If that top layer was found and matches the provided node, then the node is
	* responsible for the outside interaction. Otherwise, we know that all layers defer so
	* the first layer is the responsible one.
	*/
	const topMostLayer = getTopMostDismissableLayer(layersArr);
	if (topMostLayer) return topMostLayer[0].opts.ref.current === node;
	const [firstLayerNode] = layersArr[0];
	return firstLayerNode.opts.ref.current === node;
}
function isValidEvent(e, node) {
	const target = e.target;
	if (!isElementOrSVGElement(target)) return false;
	const targetIsContextMenuTrigger = Boolean(target.closest(`[${CONTEXT_MENU_TRIGGER_ATTR}]`));
	const nodeIsContextMenu = Boolean(node.closest(`[${CONTEXT_MENU_CONTENT_ATTR}]`));
	if ("button" in e && e.button > 0 && !targetIsContextMenuTrigger) return false;
	if ("button" in e && e.button === 0 && targetIsContextMenuTrigger && nodeIsContextMenu) return true;
	if (targetIsContextMenuTrigger && nodeIsContextMenu) return false;
	return getOwnerDocument(target).documentElement.contains(target) && !isOrContainsTarget(node, target) && isClickTrulyOutside(e, node);
}
function createWrappedEvent(e) {
	const capturedCurrentTarget = e.currentTarget;
	const capturedTarget = e.target;
	let newEvent;
	if (e instanceof PointerEvent) newEvent = new PointerEvent(e.type, e);
	else newEvent = new PointerEvent("pointerdown", e);
	let isPrevented = false;
	return new Proxy(newEvent, { get: (target, prop) => {
		if (prop === "currentTarget") return capturedCurrentTarget;
		if (prop === "target") return capturedTarget;
		if (prop === "preventDefault") return () => {
			isPrevented = true;
			if (typeof target.preventDefault === "function") target.preventDefault();
		};
		if (prop === "defaultPrevented") return isPrevented;
		if (prop in target) return target[prop];
		return e[prop];
	} });
}
//#endregion
//#region node_modules/bits-ui/dist/bits/utilities/dismissible-layer/dismissible-layer.svelte
function Dismissible_layer($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { interactOutsideBehavior = "close", onInteractOutside = noop$2, onFocusOutside = noop$2, id, children, enabled, isValidEvent = () => false, ref } = $$props;
		const dismissibleLayerState = DismissibleLayerState.create({
			id: boxWith$1(() => id),
			interactOutsideBehavior: boxWith$1(() => interactOutsideBehavior),
			onInteractOutside: boxWith$1(() => onInteractOutside),
			enabled: boxWith$1(() => enabled),
			onFocusOutside: boxWith$1(() => onFocusOutside),
			isValidEvent: boxWith$1(() => isValidEvent),
			ref
		});
		children?.($$renderer, { props: dismissibleLayerState.props });
		$$renderer.push(`<!---->`);
	});
}
//#endregion
//#region node_modules/bits-ui/dist/bits/utilities/escape-layer/use-escape-layer.svelte.js
globalThis.bitsEscapeLayers ??= /* @__PURE__ */ new Map();
var EscapeLayerState = class EscapeLayerState {
	static create(opts) {
		return new EscapeLayerState(opts);
	}
	opts;
	domContext;
	constructor(opts) {
		this.opts = opts;
		this.domContext = new DOMContext(this.opts.ref);
		let unsubEvents = noop$2;
		watch$1(() => opts.enabled.current, (enabled) => {
			if (enabled) {
				globalThis.bitsEscapeLayers.set(this, opts.escapeKeydownBehavior);
				unsubEvents = this.#addEventListener();
			}
			return () => {
				unsubEvents();
				globalThis.bitsEscapeLayers.delete(this);
			};
		});
	}
	#addEventListener = () => {
		return on(this.domContext.getDocument(), "keydown", this.#onkeydown, { passive: false });
	};
	#onkeydown = (e) => {
		if (e.key !== "Escape" || !isResponsibleEscapeLayer(this)) return;
		const clonedEvent = new KeyboardEvent(e.type, e);
		e.preventDefault();
		const behaviorType = this.opts.escapeKeydownBehavior.current;
		if (behaviorType !== "close" && behaviorType !== "defer-otherwise-close") return;
		this.opts.onEscapeKeydown.current(clonedEvent);
	};
};
function isResponsibleEscapeLayer(instance) {
	const layersArr = [...globalThis.bitsEscapeLayers];
	/**
	* We first check if we can find a top layer with `close` or `ignore`.
	* If that top layer was found and matches the provided node, then the node is
	* responsible for the escape. Otherwise, we know that all layers defer so
	* the first layer is the responsible one.
	*/
	const topMostLayer = layersArr.findLast(([_, { current: behaviorType }]) => behaviorType === "close" || behaviorType === "ignore");
	if (topMostLayer) return topMostLayer[0] === instance;
	const [firstLayerNode] = layersArr[0];
	return firstLayerNode === instance;
}
//#endregion
//#region node_modules/bits-ui/dist/bits/utilities/escape-layer/escape-layer.svelte
function Escape_layer($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { escapeKeydownBehavior = "close", onEscapeKeydown = noop$2, children, enabled, ref } = $$props;
		EscapeLayerState.create({
			escapeKeydownBehavior: boxWith$1(() => escapeKeydownBehavior),
			onEscapeKeydown: boxWith$1(() => onEscapeKeydown),
			enabled: boxWith$1(() => enabled),
			ref
		});
		children?.($$renderer);
		$$renderer.push(`<!---->`);
	});
}
//#endregion
//#region node_modules/bits-ui/dist/bits/utilities/focus-scope/focus-scope-manager.js
var FocusScopeManager = class FocusScopeManager {
	static instance;
	#scopeStack = simpleBox([]);
	#focusHistory = /* @__PURE__ */ new WeakMap();
	#preFocusHistory = /* @__PURE__ */ new WeakMap();
	static getInstance() {
		if (!this.instance) this.instance = new FocusScopeManager();
		return this.instance;
	}
	register(scope) {
		const current = this.getActive();
		if (current && current !== scope) current.pause();
		const activeElement = document.activeElement;
		if (activeElement && activeElement !== document.body) this.#preFocusHistory.set(scope, activeElement);
		this.#scopeStack.current = this.#scopeStack.current.filter((s) => s !== scope);
		this.#scopeStack.current.unshift(scope);
	}
	unregister(scope) {
		this.#scopeStack.current = this.#scopeStack.current.filter((s) => s !== scope);
		const next = this.getActive();
		if (next) next.resume();
	}
	getActive() {
		return this.#scopeStack.current[0];
	}
	setFocusMemory(scope, element) {
		this.#focusHistory.set(scope, element);
	}
	getFocusMemory(scope) {
		return this.#focusHistory.get(scope);
	}
	isActiveScope(scope) {
		return this.getActive() === scope;
	}
	setPreFocusMemory(scope, element) {
		this.#preFocusHistory.set(scope, element);
	}
	getPreFocusMemory(scope) {
		return this.#preFocusHistory.get(scope);
	}
	clearPreFocusMemory(scope) {
		this.#preFocusHistory.delete(scope);
	}
};
//#endregion
//#region node_modules/bits-ui/dist/bits/utilities/focus-scope/focus-scope.svelte.js
var FocusScope = class FocusScope {
	#paused = false;
	#container = null;
	#manager = FocusScopeManager.getInstance();
	#cleanupFns = [];
	#opts;
	constructor(opts) {
		this.#opts = opts;
	}
	get paused() {
		return this.#paused;
	}
	pause() {
		this.#paused = true;
	}
	resume() {
		this.#paused = false;
	}
	#cleanup() {
		for (const fn of this.#cleanupFns) fn();
		this.#cleanupFns = [];
	}
	mount(container) {
		if (this.#container) this.unmount();
		this.#container = container;
		this.#manager.register(this);
		this.#setupEventListeners();
		this.#handleOpenAutoFocus();
	}
	unmount() {
		if (!this.#container) return;
		this.#cleanup();
		this.#handleCloseAutoFocus();
		this.#manager.unregister(this);
		this.#manager.clearPreFocusMemory(this);
		this.#container = null;
	}
	#handleOpenAutoFocus() {
		if (!this.#container) return;
		const event = new CustomEvent("focusScope.onOpenAutoFocus", {
			bubbles: false,
			cancelable: true
		});
		this.#opts.onOpenAutoFocus.current(event);
		if (!event.defaultPrevented) requestAnimationFrame(() => {
			if (!this.#container) return;
			const firstTabbable = this.#getFirstTabbable();
			if (firstTabbable) {
				firstTabbable.focus();
				this.#manager.setFocusMemory(this, firstTabbable);
			} else this.#container.focus();
		});
	}
	#handleCloseAutoFocus() {
		const event = new CustomEvent("focusScope.onCloseAutoFocus", {
			bubbles: false,
			cancelable: true
		});
		this.#opts.onCloseAutoFocus.current?.(event);
		if (!event.defaultPrevented) {
			const preFocusedElement = this.#manager.getPreFocusMemory(this);
			if (preFocusedElement && document.contains(preFocusedElement)) try {
				preFocusedElement.focus();
			} catch {
				document.body.focus();
			}
		}
	}
	#setupEventListeners() {
		if (!this.#container || !this.#opts.trap.current) return;
		const container = this.#container;
		const doc = container.ownerDocument;
		const handleFocus = (e) => {
			if (this.#paused || !this.#manager.isActiveScope(this)) return;
			const target = e.target;
			if (!target) return;
			if (container.contains(target)) this.#manager.setFocusMemory(this, target);
			else {
				const lastFocused = this.#manager.getFocusMemory(this);
				if (lastFocused && container.contains(lastFocused) && isFocusable(lastFocused)) {
					e.preventDefault();
					lastFocused.focus();
				} else {
					const firstTabbable = this.#getFirstTabbable();
					const firstFocusable = this.#getAllFocusables()[0];
					(firstTabbable || firstFocusable || container).focus();
				}
			}
		};
		const handleKeydown = (e) => {
			if (!this.#opts.loop || this.#paused || e.key !== "Tab") return;
			if (!this.#manager.isActiveScope(this)) return;
			const tabbables = this.#getTabbables();
			if (tabbables.length === 0) return;
			const first = tabbables[0];
			const last = tabbables[tabbables.length - 1];
			if (!e.shiftKey && doc.activeElement === last) {
				e.preventDefault();
				first.focus();
			} else if (e.shiftKey && doc.activeElement === first) {
				e.preventDefault();
				last.focus();
			}
		};
		this.#cleanupFns.push(on(doc, "focusin", handleFocus, { capture: true }), on(container, "keydown", handleKeydown));
		const observer = new MutationObserver(() => {
			const lastFocused = this.#manager.getFocusMemory(this);
			if (lastFocused && !container.contains(lastFocused)) {
				const firstTabbable = this.#getFirstTabbable();
				const firstFocusable = this.#getAllFocusables()[0];
				const elementToFocus = firstTabbable || firstFocusable;
				if (elementToFocus) {
					elementToFocus.focus();
					this.#manager.setFocusMemory(this, elementToFocus);
				} else container.focus();
			}
		});
		observer.observe(container, {
			childList: true,
			subtree: true
		});
		this.#cleanupFns.push(() => observer.disconnect());
	}
	#getTabbables() {
		if (!this.#container) return [];
		return tabbable(this.#container, {
			includeContainer: false,
			getShadowRoot: true
		});
	}
	#getFirstTabbable() {
		return this.#getTabbables()[0] || null;
	}
	#getAllFocusables() {
		if (!this.#container) return [];
		return focusable(this.#container, {
			includeContainer: false,
			getShadowRoot: true
		});
	}
	static use(opts) {
		let scope = null;
		watch$1([() => opts.ref.current, () => opts.enabled.current], ([ref, enabled]) => {
			if (ref && enabled) {
				if (!scope) scope = new FocusScope(opts);
				scope.mount(ref);
			} else if (scope) {
				scope.unmount();
				scope = null;
			}
		});
		return { get props() {
			return { tabindex: -1 };
		} };
	}
};
//#endregion
//#region node_modules/bits-ui/dist/bits/utilities/focus-scope/focus-scope.svelte
function Focus_scope($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { enabled = false, trapFocus = false, loop = false, onCloseAutoFocus = noop$2, onOpenAutoFocus = noop$2, focusScope, ref } = $$props;
		const focusScopeState = FocusScope.use({
			enabled: boxWith$1(() => enabled),
			trap: boxWith$1(() => trapFocus),
			loop,
			onCloseAutoFocus: boxWith$1(() => onCloseAutoFocus),
			onOpenAutoFocus: boxWith$1(() => onOpenAutoFocus),
			ref
		});
		focusScope?.($$renderer, { props: focusScopeState.props });
		$$renderer.push(`<!---->`);
	});
}
//#endregion
//#region node_modules/bits-ui/dist/bits/utilities/text-selection-layer/use-text-selection-layer.svelte.js
var noopPointer = () => {};
globalThis.bitsTextSelectionLayers ??= /* @__PURE__ */ new Map();
var TextSelectionLayerState = class TextSelectionLayerState {
	static create(opts) {
		return new TextSelectionLayerState(opts);
	}
	opts;
	domContext;
	#unsubSelectionLock = noop$2;
	#enabledSnapshot = false;
	#onPointerDownSnapshot = noopPointer;
	#onPointerUpSnapshot = noopPointer;
	constructor(opts) {
		this.opts = opts;
		this.domContext = new DOMContext(opts.ref);
		let unsubEvents = noop$2;
		watch$1(() => [
			this.opts.enabled.current,
			this.opts.onPointerDown.current,
			this.opts.onPointerUp.current
		], ([enabled, onPointerDown, onPointerUp]) => {
			this.#enabledSnapshot = enabled;
			this.#onPointerDownSnapshot = onPointerDown;
			this.#onPointerUpSnapshot = onPointerUp;
			if (enabled) {
				globalThis.bitsTextSelectionLayers.set(this, this.opts.enabled);
				unsubEvents();
				unsubEvents = this.#addEventListeners();
			}
			return () => {
				this.#enabledSnapshot = false;
				unsubEvents();
				this.#resetSelectionLock();
				globalThis.bitsTextSelectionLayers.delete(this);
			};
		});
	}
	#addEventListeners() {
		return executeCallbacks$1(on(this.domContext.getDocument(), "pointerdown", this.#pointerdown), on(this.domContext.getDocument(), "pointerup", composeHandlers$1(this.#resetSelectionLock, this.#pointerupUserHandler)));
	}
	#pointerupUserHandler = (e) => {
		this.#onPointerUpSnapshot(e);
	};
	#pointerdown = (e) => {
		const node = this.opts.ref.current;
		const target = e.target;
		if (!isHTMLElement(node) || !isHTMLElement(target) || !this.#enabledSnapshot) return;
		/**
		* We only lock user-selection overflow if layer is the top most layer and
		* pointerdown occurred inside the node. You are still allowed to select text
		* outside the node provided pointerdown occurs outside the node.
		*/
		if (!isHighestLayer(this) || !contains(node, target)) return;
		this.#onPointerDownSnapshot(e);
		if (e.defaultPrevented) return;
		this.#unsubSelectionLock = preventTextSelectionOverflow(node, this.domContext.getDocument().body);
	};
	#resetSelectionLock = () => {
		this.#unsubSelectionLock();
		this.#unsubSelectionLock = noop$2;
	};
};
var getUserSelect = (node) => node.style.userSelect || node.style.webkitUserSelect;
function preventTextSelectionOverflow(node, body) {
	const originalBodyUserSelect = getUserSelect(body);
	const originalNodeUserSelect = getUserSelect(node);
	setUserSelect(body, "none");
	setUserSelect(node, "text");
	return () => {
		setUserSelect(body, originalBodyUserSelect);
		setUserSelect(node, originalNodeUserSelect);
	};
}
function setUserSelect(node, value) {
	node.style.userSelect = value;
	node.style.webkitUserSelect = value;
}
function isHighestLayer(instance) {
	const layersArr = [...globalThis.bitsTextSelectionLayers];
	if (!layersArr.length) return false;
	const highestLayer = layersArr.at(-1);
	if (!highestLayer) return false;
	return highestLayer[0] === instance;
}
//#endregion
//#region node_modules/bits-ui/dist/bits/utilities/text-selection-layer/text-selection-layer.svelte
function Text_selection_layer($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { preventOverflowTextSelection = true, onPointerDown = noop$2, onPointerUp = noop$2, id, children, enabled, ref } = $$props;
		TextSelectionLayerState.create({
			id: boxWith$1(() => id),
			onPointerDown: boxWith$1(() => onPointerDown),
			onPointerUp: boxWith$1(() => onPointerUp),
			enabled: boxWith$1(() => enabled && preventOverflowTextSelection),
			ref
		});
		children?.($$renderer);
		$$renderer.push(`<!---->`);
	});
}
//#endregion
//#region node_modules/bits-ui/dist/internal/use-id.js
globalThis.bitsIdCounter ??= { current: 0 };
/**
* Generates a unique ID based on a global counter.
*/
function useId$1(prefix = "bits") {
	globalThis.bitsIdCounter.current++;
	return `${prefix}-${globalThis.bitsIdCounter.current}`;
}
//#endregion
//#region node_modules/bits-ui/dist/internal/shared-state.svelte.js
var SharedState = class {
	#factory;
	#subscribers = 0;
	#state;
	#scope;
	constructor(factory) {
		this.#factory = factory;
	}
	#dispose() {
		this.#subscribers -= 1;
		if (this.#scope && this.#subscribers <= 0) {
			this.#scope();
			this.#state = void 0;
			this.#scope = void 0;
		}
	}
	get(...args) {
		this.#subscribers += 1;
		if (this.#state === void 0) this.#scope = () => {};
		return this.#state;
	}
};
//#endregion
//#region node_modules/bits-ui/dist/internal/body-scroll-lock.svelte.js
var lockMap = new SvelteMap();
var initialBodyStyle = null;
var cleanupTimeoutId = null;
var isInCleanupTransition = false;
var anyLocked = boxWith$1(() => {
	for (const value of lockMap.values()) if (value) return true;
	return false;
});
/**
* We track the time we scheduled the cleanup to prevent race conditions
* when multiple locks are created/destroyed in the same tick, ensuring
* only the last one to schedule the cleanup will run.
*
* reference: https://github.com/huntabyte/bits-ui/issues/1639
*/
var cleanupScheduledAt = null;
var bodyLockStackCount = new SharedState(() => {
	function resetBodyStyle() {}
	function cancelPendingCleanup() {
		if (cleanupTimeoutId === null) return;
		window.clearTimeout(cleanupTimeoutId);
		cleanupTimeoutId = null;
	}
	function scheduleCleanupIfNoNewLocks(delay, callback) {
		cancelPendingCleanup();
		isInCleanupTransition = true;
		cleanupScheduledAt = Date.now();
		const currentCleanupId = cleanupScheduledAt;
		/**
		* We schedule the cleanup to run after a delay to allow new locks to register
		* that might have been added in the same tick as the current cleanup.
		*
		* If a new lock is added in the same tick, the cleanup will be cancelled and
		* a new cleanup will be scheduled.
		*
		* This is to prevent the cleanup from running too early and resetting the body
		* style before the new lock has had a chance to apply its styles.
		*/
		const cleanupFn = () => {
			cleanupTimeoutId = null;
			if (cleanupScheduledAt !== currentCleanupId) return;
			if (!isAnyLocked(lockMap)) {
				isInCleanupTransition = false;
				callback();
			} else isInCleanupTransition = false;
		};
		const actualDelay = delay === null ? 24 : delay;
		cleanupTimeoutId = window.setTimeout(cleanupFn, actualDelay);
	}
	function ensureInitialStyleCaptured() {
		if (initialBodyStyle === null && lockMap.size === 0 && !isInCleanupTransition) initialBodyStyle = document.body.getAttribute("style");
	}
	watch$1(() => anyLocked.current, () => {
		if (!anyLocked.current) return;
		ensureInitialStyleCaptured();
		isInCleanupTransition = false;
		const htmlStyle = getComputedStyle(document.documentElement);
		const bodyStyle = getComputedStyle(document.body);
		const hasStableGutter = htmlStyle.scrollbarGutter?.includes("stable") || bodyStyle.scrollbarGutter?.includes("stable");
		const verticalScrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
		const config = {
			padding: Number.parseInt(bodyStyle.paddingRight ?? "0", 10) + verticalScrollbarWidth,
			margin: Number.parseInt(bodyStyle.marginRight ?? "0", 10)
		};
		if (verticalScrollbarWidth > 0 && !hasStableGutter) {
			document.body.style.paddingRight = `${config.padding}px`;
			document.body.style.marginRight = `${config.margin}px`;
			document.body.style.setProperty("--scrollbar-width", `${verticalScrollbarWidth}px`);
		}
		document.body.style.overflow = "hidden";
		if (isIOS$1) on(document, "touchmove", (e) => {
			if (e.target !== document.documentElement) return;
			if (e.touches.length > 1) return;
			e.preventDefault();
		}, { passive: false });
		/**
		* We ensure pointer-events: none is applied _after_ DOM updates, so that any focus/
		* interaction changes from opening overlays/menus complete _before_ we block pointer
		* events.
		*
		* this avoids race conditions where pointer-events could be set too early and break
		* focus/interaction.
		*/
		afterTick$1(() => {
			document.body.style.pointerEvents = "none";
			document.body.style.overflow = "hidden";
		});
	});
	return {
		get lockMap() {
			return lockMap;
		},
		resetBodyStyle,
		scheduleCleanupIfNoNewLocks,
		cancelPendingCleanup,
		ensureInitialStyleCaptured
	};
});
var BodyScrollLock = class {
	#id = useId$1();
	#initialState;
	#restoreScrollDelay = () => null;
	#countState;
	locked;
	constructor(initialState, restoreScrollDelay = () => null) {
		this.#initialState = initialState;
		this.#restoreScrollDelay = restoreScrollDelay;
		this.#countState = bodyLockStackCount.get();
		if (!this.#countState) return;
		/**
		* Since a new lock is being created, we cancel any pending cleanup to
		* prevent the cleanup from running too early and resetting the body style
		* before the new lock has had a chance to apply its styles.
		*
		* reference: https://github.com/huntabyte/bits-ui/issues/1639
		*/
		this.#countState.cancelPendingCleanup();
		this.#countState.ensureInitialStyleCaptured();
		this.#countState.lockMap.set(this.#id, this.#initialState ?? false);
		this.locked = boxWith$1(() => this.#countState.lockMap.get(this.#id) ?? false, (v) => this.#countState.lockMap.set(this.#id, v));
	}
};
function isAnyLocked(map) {
	for (const [_, value] of map) if (value) return true;
	return false;
}
//#endregion
//#region node_modules/bits-ui/dist/bits/utilities/scroll-lock/scroll-lock.svelte
function Scroll_lock($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { preventScroll = true, restoreScrollDelay = null } = $$props;
		if (preventScroll) new BodyScrollLock(preventScroll, () => restoreScrollDelay);
	});
}
//#endregion
//#region node_modules/bits-ui/dist/bits/dialog/components/dialog-overlay.svelte
function Dialog_overlay($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const uid = props_id($$renderer);
		let { id = createId(uid), forceMount = false, child, children, ref = null, $$slots, $$events, ...restProps } = $$props;
		const overlayState = DialogOverlayState.create({
			id: boxWith$1(() => id),
			ref: boxWith$1(() => ref, (v) => ref = v)
		});
		const mergedProps = derived(() => mergeProps$1(restProps, overlayState.props));
		if (overlayState.shouldRender || forceMount) {
			$$renderer.push("<!--[0-->");
			if (child) {
				$$renderer.push("<!--[0-->");
				child($$renderer, {
					props: mergeProps$1(mergedProps()),
					...overlayState.snippetProps
				});
				$$renderer.push(`<!---->`);
			} else {
				$$renderer.push("<!--[-1-->");
				$$renderer.push(`<div${attributes({ ...mergeProps$1(mergedProps()) })}>`);
				children?.($$renderer, overlayState.snippetProps);
				$$renderer.push(`<!----></div>`);
			}
			$$renderer.push(`<!--]-->`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region node_modules/bits-ui/dist/bits/dialog/components/dialog-description.svelte
function Dialog_description($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const uid = props_id($$renderer);
		let { id = createId(uid), children, child, ref = null, $$slots, $$events, ...restProps } = $$props;
		const descriptionState = DialogDescriptionState.create({
			id: boxWith$1(() => id),
			ref: boxWith$1(() => ref, (v) => ref = v)
		});
		const mergedProps = derived(() => mergeProps$1(restProps, descriptionState.props));
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
//#region node_modules/bits-ui/dist/bits/dialog/components/dialog.svelte
function Dialog($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { open = false, onOpenChange = noop$2, onOpenChangeComplete = noop$2, children } = $$props;
		DialogRootState.create({
			variant: boxWith$1(() => "dialog"),
			open: boxWith$1(() => open, (v) => {
				open = v;
				onOpenChange(v);
			}),
			onOpenChangeComplete: boxWith$1(() => onOpenChangeComplete)
		});
		children?.($$renderer);
		$$renderer.push(`<!---->`);
		bind_props($$props, { open });
	});
}
//#endregion
//#region node_modules/bits-ui/dist/bits/dialog/components/dialog-close.svelte
function Dialog_close($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const uid = props_id($$renderer);
		let { children, child, id = createId(uid), ref = null, disabled = false, $$slots, $$events, ...restProps } = $$props;
		const closeState = DialogCloseState.create({
			variant: boxWith$1(() => "close"),
			id: boxWith$1(() => id),
			ref: boxWith$1(() => ref, (v) => ref = v),
			disabled: boxWith$1(() => Boolean(disabled))
		});
		const mergedProps = derived(() => mergeProps$1(restProps, closeState.props));
		if (child) {
			$$renderer.push("<!--[0-->");
			child($$renderer, { props: mergedProps() });
			$$renderer.push(`<!---->`);
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<button${attributes({ ...mergedProps() })}>`);
			children?.($$renderer);
			$$renderer.push(`<!----></button>`);
		}
		$$renderer.push(`<!--]-->`);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region node_modules/bits-ui/dist/bits/dialog/components/dialog-content.svelte
function Dialog_content($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const uid = props_id($$renderer);
		let { id = createId(uid), children, child, ref = null, forceMount = false, onCloseAutoFocus = noop$2, onOpenAutoFocus = noop$2, onEscapeKeydown = noop$2, onInteractOutside = noop$2, trapFocus = true, preventScroll = true, restoreScrollDelay = null, $$slots, $$events, ...restProps } = $$props;
		const contentState = DialogContentState.create({
			id: boxWith$1(() => id),
			ref: boxWith$1(() => ref, (v) => ref = v)
		});
		const mergedProps = derived(() => mergeProps$1(restProps, contentState.props));
		if (contentState.shouldRender || forceMount) {
			$$renderer.push("<!--[0-->");
			{
				function focusScope($$renderer, { props: focusScopeProps }) {
					Escape_layer($$renderer, spread_props([mergedProps(), {
						enabled: contentState.root.opts.open.current,
						ref: contentState.opts.ref,
						onEscapeKeydown: (e) => {
							onEscapeKeydown(e);
							if (e.defaultPrevented) return;
							contentState.root.handleClose();
						},
						children: ($$renderer) => {
							Dismissible_layer($$renderer, spread_props([mergedProps(), {
								ref: contentState.opts.ref,
								enabled: contentState.root.opts.open.current,
								onInteractOutside: (e) => {
									onInteractOutside(e);
									if (e.defaultPrevented) return;
									contentState.root.handleClose();
								},
								children: ($$renderer) => {
									Text_selection_layer($$renderer, spread_props([mergedProps(), {
										ref: contentState.opts.ref,
										enabled: contentState.root.opts.open.current,
										children: ($$renderer) => {
											if (child) {
												$$renderer.push("<!--[0-->");
												if (contentState.root.opts.open.current) {
													$$renderer.push("<!--[0-->");
													Scroll_lock($$renderer, {
														preventScroll,
														restoreScrollDelay
													});
												} else $$renderer.push("<!--[-1-->");
												$$renderer.push(`<!--]--> `);
												child($$renderer, {
													props: mergeProps$1(mergedProps(), focusScopeProps),
													...contentState.snippetProps
												});
												$$renderer.push(`<!---->`);
											} else {
												$$renderer.push("<!--[-1-->");
												Scroll_lock($$renderer, { preventScroll });
												$$renderer.push(`<!----> <div${attributes({ ...mergeProps$1(mergedProps(), focusScopeProps) })}>`);
												children?.($$renderer);
												$$renderer.push(`<!----></div>`);
											}
											$$renderer.push(`<!--]-->`);
										},
										$$slots: { default: true }
									}]));
								},
								$$slots: { default: true }
							}]));
						},
						$$slots: { default: true }
					}]));
				}
				Focus_scope($$renderer, {
					ref: contentState.opts.ref,
					loop: true,
					trapFocus,
					enabled: contentState.root.opts.open.current,
					onOpenAutoFocus,
					onCloseAutoFocus,
					focusScope,
					$$slots: { focusScope: true }
				});
			}
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region node_modules/vaul-svelte/node_modules/svelte-toolbelt/dist/utils/is.js
function isFunction(value) {
	return typeof value === "function";
}
function isObject(value) {
	return value !== null && typeof value === "object";
}
var CLASS_VALUE_PRIMITIVE_TYPES = [
	"string",
	"number",
	"bigint",
	"boolean"
];
function isClassValue(value) {
	if (value === null || value === void 0) return true;
	if (CLASS_VALUE_PRIMITIVE_TYPES.includes(typeof value)) return true;
	if (Array.isArray(value)) return value.every((item) => isClassValue(item));
	if (typeof value === "object") {
		if (Object.getPrototypeOf(value) !== Object.prototype) return false;
		return true;
	}
	return false;
}
//#endregion
//#region node_modules/vaul-svelte/node_modules/svelte-toolbelt/dist/box/box.svelte.js
var BoxSymbol = Symbol("box");
var isWritableSymbol = Symbol("is-writable");
function isBox(value) {
	return isObject(value) && BoxSymbol in value;
}
/**
* @returns Whether the value is a WritableBox
*
* @see {@link https://runed.dev/docs/functions/box}
*/
function isWritableBox(value) {
	return box.isBox(value) && isWritableSymbol in value;
}
function box(initialValue) {
	let current = initialValue;
	return {
		[BoxSymbol]: true,
		[isWritableSymbol]: true,
		get current() {
			return current;
		},
		set current(v) {
			current = v;
		}
	};
}
function boxWith(getter, setter) {
	const derived$1 = derived(getter);
	if (setter) return {
		[BoxSymbol]: true,
		[isWritableSymbol]: true,
		get current() {
			return derived$1();
		},
		set current(v) {
			setter(v);
		}
	};
	return {
		[BoxSymbol]: true,
		get current() {
			return getter();
		}
	};
}
function boxFrom(value) {
	if (box.isBox(value)) return value;
	if (isFunction(value)) return box.with(value);
	return box(value);
}
/**
* Function that gets an object of boxes, and returns an object of reactive values
*
* @example
* const count = box(0)
* const flat = box.flatten({ count, double: box.with(() => count.current) })
* // type of flat is { count: number, readonly double: number }
*
* @see {@link https://runed.dev/docs/functions/box}
*/
function boxFlatten(boxes) {
	return Object.entries(boxes).reduce((acc, [key, b]) => {
		if (!box.isBox(b)) return Object.assign(acc, { [key]: b });
		if (box.isWritableBox(b)) Object.defineProperty(acc, key, {
			get() {
				return b.current;
			},
			set(v) {
				b.current = v;
			}
		});
		else Object.defineProperty(acc, key, { get() {
			return b.current;
		} });
		return acc;
	}, {});
}
/**
* Function that converts a box to a readonly box.
*
* @example
* const count = box(0) // WritableBox<number>
* const countReadonly = box.readonly(count) // ReadableBox<number>
*
* @see {@link https://runed.dev/docs/functions/box}
*/
function toReadonlyBox(b) {
	if (!box.isWritableBox(b)) return b;
	return {
		[BoxSymbol]: true,
		get current() {
			return b.current;
		}
	};
}
box.from = boxFrom;
box.with = boxWith;
box.flatten = boxFlatten;
box.readonly = toReadonlyBox;
box.isBox = isBox;
box.isWritableBox = isWritableBox;
//#endregion
//#region node_modules/vaul-svelte/node_modules/svelte-toolbelt/dist/utils/compose-handlers.js
/**
* Composes event handlers into a single function that can be called with an event.
* If the previous handler cancels the event using `event.preventDefault()`, the handlers
* that follow will not be called.
*/
function composeHandlers(...handlers) {
	return function(e) {
		for (const handler of handlers) {
			if (!handler) continue;
			if (e.defaultPrevented) return;
			if (typeof handler === "function") handler.call(this, e);
			else handler.current?.call(this, e);
		}
	};
}
//#endregion
//#region node_modules/vaul-svelte/node_modules/svelte-toolbelt/dist/utils/strings.js
var NUMBER_CHAR_RE = /\d/;
var STR_SPLITTERS = [
	"-",
	"_",
	"/",
	"."
];
function isUppercase(char = "") {
	if (NUMBER_CHAR_RE.test(char)) return void 0;
	return char !== char.toLowerCase();
}
function splitByCase(str) {
	const parts = [];
	let buff = "";
	let previousUpper;
	let previousSplitter;
	for (const char of str) {
		const isSplitter = STR_SPLITTERS.includes(char);
		if (isSplitter === true) {
			parts.push(buff);
			buff = "";
			previousUpper = void 0;
			continue;
		}
		const isUpper = isUppercase(char);
		if (previousSplitter === false) {
			if (previousUpper === false && isUpper === true) {
				parts.push(buff);
				buff = char;
				previousUpper = isUpper;
				continue;
			}
			if (previousUpper === true && isUpper === false && buff.length > 1) {
				const lastChar = buff.at(-1);
				parts.push(buff.slice(0, Math.max(0, buff.length - 1)));
				buff = lastChar + char;
				previousUpper = isUpper;
				continue;
			}
		}
		buff += char;
		previousUpper = isUpper;
		previousSplitter = isSplitter;
	}
	parts.push(buff);
	return parts;
}
function pascalCase(str) {
	if (!str) return "";
	return splitByCase(str).map((p) => upperFirst(p)).join("");
}
function camelCase(str) {
	return lowerFirst(pascalCase(str || ""));
}
function upperFirst(str) {
	return str ? str[0].toUpperCase() + str.slice(1) : "";
}
function lowerFirst(str) {
	return str ? str[0].toLowerCase() + str.slice(1) : "";
}
//#endregion
//#region node_modules/vaul-svelte/node_modules/svelte-toolbelt/dist/utils/css-to-style-obj.js
function cssToStyleObj(css) {
	if (!css) return {};
	const styleObj = {};
	function iterator(name, value) {
		if (name.startsWith("-moz-") || name.startsWith("-webkit-") || name.startsWith("-ms-") || name.startsWith("-o-")) {
			styleObj[pascalCase(name)] = value;
			return;
		}
		if (name.startsWith("--")) {
			styleObj[name] = value;
			return;
		}
		styleObj[camelCase(name)] = value;
	}
	parse(css, iterator);
	return styleObj;
}
//#endregion
//#region node_modules/vaul-svelte/node_modules/svelte-toolbelt/dist/utils/execute-callbacks.js
/**
* Executes an array of callback functions with the same arguments.
* @template T The types of the arguments that the callback functions take.
* @param callbacks array of callback functions to execute.
* @returns A new function that executes all of the original callback functions with the same arguments.
*/
function executeCallbacks(...callbacks) {
	return (...args) => {
		for (const callback of callbacks) if (typeof callback === "function") callback(...args);
	};
}
//#endregion
//#region node_modules/vaul-svelte/node_modules/svelte-toolbelt/dist/utils/style-to-css.js
function createParser(matcher, replacer) {
	const regex = RegExp(matcher, "g");
	return (str) => {
		if (typeof str !== "string") throw new TypeError(`expected an argument of type string, but got ${typeof str}`);
		if (!str.match(regex)) return str;
		return str.replace(regex, replacer);
	};
}
var camelToKebab = createParser(/[A-Z]/, (match) => `-${match.toLowerCase()}`);
function styleToCSS(styleObj) {
	if (!styleObj || typeof styleObj !== "object" || Array.isArray(styleObj)) throw new TypeError(`expected an argument of type object, but got ${typeof styleObj}`);
	return Object.keys(styleObj).map((property) => `${camelToKebab(property)}: ${styleObj[property]};`).join("\n");
}
//#endregion
//#region node_modules/vaul-svelte/node_modules/svelte-toolbelt/dist/utils/style.js
function styleToString(style = {}) {
	return styleToCSS(style).replace("\n", " ");
}
styleToString({
	position: "absolute",
	width: "1px",
	height: "1px",
	padding: "0",
	margin: "-1px",
	overflow: "hidden",
	clip: "rect(0, 0, 0, 0)",
	whiteSpace: "nowrap",
	borderWidth: "0",
	transform: "translateX(-100%)"
});
//#endregion
//#region node_modules/vaul-svelte/node_modules/svelte-toolbelt/dist/utils/merge-props.js
/**
* Modified from https://github.com/adobe/react-spectrum/blob/main/packages/%40react-aria/utils/src/mergeProps.ts (see NOTICE.txt for source)
*/
function isEventHandler(key) {
	return key.length > 2 && key.startsWith("on") && key[2] === key[2]?.toLowerCase();
}
/**
* Given a list of prop objects, merges them into a single object.
* - Automatically composes event handlers (e.g. `onclick`, `oninput`, etc.)
* - Chains regular functions with the same name so they are called in order
* - Merges class strings with `clsx`
* - Merges style objects and converts them to strings
* - Handles a bug with Svelte where setting the `hidden` attribute to `false` doesn't remove it
* - Overrides other values with the last one
*/
function mergeProps(...args) {
	const result = { ...args[0] };
	for (let i = 1; i < args.length; i++) {
		const props = args[i];
		for (const key in props) {
			const a = result[key];
			const b = props[key];
			const aIsFunction = typeof a === "function";
			const bIsFunction = typeof b === "function";
			if (aIsFunction && typeof bIsFunction && isEventHandler(key)) result[key] = composeHandlers(a, b);
			else if (aIsFunction && bIsFunction) result[key] = executeCallbacks(a, b);
			else if (key === "class") {
				const aIsClassValue = isClassValue(a);
				const bIsClassValue = isClassValue(b);
				if (aIsClassValue && bIsClassValue) result[key] = clsx(a, b);
				else if (aIsClassValue) result[key] = clsx(a);
				else if (bIsClassValue) result[key] = clsx(b);
			} else if (key === "style") {
				const aIsObject = typeof a === "object";
				const bIsObject = typeof b === "object";
				const aIsString = typeof a === "string";
				const bIsString = typeof b === "string";
				if (aIsObject && bIsObject) result[key] = {
					...a,
					...b
				};
				else if (aIsObject && bIsString) {
					const parsedStyle = cssToStyleObj(b);
					result[key] = {
						...a,
						...parsedStyle
					};
				} else if (aIsString && bIsObject) result[key] = {
					...cssToStyleObj(a),
					...b
				};
				else if (aIsString && bIsString) {
					const parsedStyleA = cssToStyleObj(a);
					const parsedStyleB = cssToStyleObj(b);
					result[key] = {
						...parsedStyleA,
						...parsedStyleB
					};
				} else if (aIsObject) result[key] = a;
				else if (bIsObject) result[key] = b;
				else if (aIsString) result[key] = a;
				else if (bIsString) result[key] = b;
			} else result[key] = b !== void 0 ? b : a;
		}
	}
	if (typeof result.style === "object") result.style = styleToString(result.style).replaceAll("\n", " ");
	if (result.hidden !== true) {
		result.hidden = void 0;
		delete result.hidden;
	}
	if (result.disabled !== true) {
		result.disabled = void 0;
		delete result.disabled;
	}
	return result;
}
//#endregion
//#region node_modules/vaul-svelte/node_modules/runed/dist/internal/configurable-globals.js
var defaultWindow = void 0;
//#endregion
//#region node_modules/vaul-svelte/node_modules/runed/dist/internal/utils/dom.js
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
//#region node_modules/vaul-svelte/node_modules/runed/dist/utilities/active-element/active-element.svelte.js
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
//#region node_modules/vaul-svelte/node_modules/runed/dist/utilities/watch/watch.svelte.js
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
//#region node_modules/vaul-svelte/node_modules/runed/dist/utilities/context/context.js
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
//#region node_modules/vaul-svelte/node_modules/svelte-toolbelt/dist/utils/use-ref-by-id.svelte.js
function useRefById({ id, ref, deps = () => true, onRefChange, getRootNode }) {
	watch([() => id.current, deps], ([_id]) => {
		const node = (getRootNode?.() ?? document)?.getElementById(_id);
		if (node) ref.current = node;
		else ref.current = null;
		onRefChange?.(ref.current);
	});
}
//#endregion
//#region node_modules/vaul-svelte/node_modules/svelte-toolbelt/dist/utils/after-sleep.js
/**
* A utility function that executes a callback after a specified number of milliseconds.
*/
function afterSleep(ms, cb) {
	return setTimeout(cb, ms);
}
//#endregion
//#region node_modules/vaul-svelte/node_modules/svelte-toolbelt/dist/utils/after-tick.js
function afterTick(fn) {
	(/* @__PURE__ */ tick()).then(fn);
}
//#endregion
//#region node_modules/vaul-svelte/dist/internal/noop.js
function noop() {}
//#endregion
//#region node_modules/vaul-svelte/dist/internal/constants.js
var TRANSITIONS = {
	DURATION: .5,
	EASE: [
		.32,
		.72,
		0,
		1
	]
};
var CLOSE_THRESHOLD = .25;
var DRAG_CLASS = "vaul-dragging";
//#endregion
//#region node_modules/vaul-svelte/dist/helpers.js
var cache = /* @__PURE__ */ new WeakMap();
function set(el, styles, ignoreCache = false) {
	if (!el || !(el instanceof HTMLElement)) return;
	let originalStyles = {};
	Object.entries(styles).forEach(([key, value]) => {
		if (key.startsWith("--")) {
			el.style.setProperty(key, value);
			return;
		}
		originalStyles[key] = el.style[key];
		el.style[key] = value;
	});
	if (ignoreCache) return;
	cache.set(el, originalStyles);
}
function reset(el, prop) {
	if (!el || !(el instanceof HTMLElement)) return;
	let originalStyles = cache.get(el);
	if (!originalStyles) return;
	if (prop) el.style[prop] = originalStyles[prop];
	else Object.entries(originalStyles).forEach(([key, value]) => {
		el.style[key] = value;
	});
}
var isVertical = (direction) => {
	switch (direction) {
		case "top":
		case "bottom": return true;
		case "left":
		case "right": return false;
		default: return direction;
	}
};
function getTranslate(element, direction) {
	if (!element) return null;
	const style = window.getComputedStyle(element);
	const transform = style.transform || style.webkitTransform || style.mozTransform;
	let mat = transform.match(/^matrix3d\((.+)\)$/);
	if (mat) return parseFloat(mat[1].split(", ")[isVertical(direction) ? 13 : 12]);
	mat = transform.match(/^matrix\((.+)\)$/);
	return mat ? parseFloat(mat[1].split(", ")[isVertical(direction) ? 5 : 4]) : null;
}
function dampenValue(v) {
	return 8 * (Math.log(v + 1) - 2);
}
function assignStyle(element, style) {
	if (!element) return () => {};
	const prevStyle = element.style.cssText;
	Object.assign(element.style, style);
	return () => {
		element.style.cssText = prevStyle;
	};
}
//#endregion
//#region node_modules/vaul-svelte/dist/use-snap-points.svelte.js
function useSnapPoints({ snapPoints, drawerNode, overlayNode, fadeFromIndex, setOpenTime, direction, container, snapToSequentialPoint, activeSnapPoint, open, isReleasing }) {
	let windowDimensions = typeof window !== "undefined" ? {
		innerWidth: window.innerWidth,
		innerHeight: window.innerHeight
	} : void 0;
	const isLastSnapPoint = derived(() => activeSnapPoint.current === snapPoints.current?.[snapPoints.current.length - 1] || null);
	const activeSnapPointIndex = derived(() => snapPoints.current?.findIndex((snapPoint) => snapPoint === activeSnapPoint.current));
	const shouldFade = derived(() => snapPoints.current && snapPoints.current.length > 0 && (fadeFromIndex.current || fadeFromIndex.current === 0) && !Number.isNaN(fadeFromIndex.current) && snapPoints.current[fadeFromIndex.current] === activeSnapPoint.current || !snapPoints.current);
	const snapPointsOffset = derived(() => {
		open.current;
		const containerSize = container.current ? {
			width: container.current.getBoundingClientRect().width,
			height: container.current.getBoundingClientRect().height
		} : typeof window !== "undefined" ? {
			width: window.innerWidth,
			height: window.innerHeight
		} : {
			width: 0,
			height: 0
		};
		return snapPoints.current?.map((snapPoint) => {
			const isPx = typeof snapPoint === "string";
			let snapPointAsNumber = 0;
			if (isPx) snapPointAsNumber = parseInt(snapPoint, 10);
			if (isVertical(direction.current)) {
				const height = isPx ? snapPointAsNumber : windowDimensions ? snapPoint * containerSize.height : 0;
				if (windowDimensions) return direction.current === "bottom" ? containerSize.height - height : -containerSize.height + height;
				return height;
			}
			const width = isPx ? snapPointAsNumber : windowDimensions ? snapPoint * containerSize.width : 0;
			if (windowDimensions) return direction.current === "right" ? containerSize.width - width : -containerSize.width + width;
			return width;
		}) ?? [];
	});
	const activeSnapPointOffset = derived(() => {
		if (activeSnapPointIndex() !== null) {
			if (activeSnapPointIndex() !== void 0) return snapPointsOffset()[activeSnapPointIndex()];
		}
		return null;
	});
	function onSnapPointChange(activeSnapPointIndex) {
		if (snapPoints.current && activeSnapPointIndex === snapPointsOffset().length - 1) setOpenTime(/* @__PURE__ */ new Date());
	}
	function snapToPoint(dimension) {
		const newSnapPointIndex = snapPointsOffset()?.findIndex((snapPointDim) => snapPointDim === dimension) ?? null;
		onSnapPointChange(newSnapPointIndex);
		set(drawerNode(), {
			transition: `transform ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(",")})`,
			transform: isVertical(direction.current) ? `translate3d(0, ${dimension}px, 0)` : `translate3d(${dimension}px, 0, 0)`
		});
		if (snapPointsOffset() && newSnapPointIndex !== snapPointsOffset().length - 1 && fadeFromIndex.current !== void 0 && newSnapPointIndex !== fadeFromIndex.current && newSnapPointIndex < fadeFromIndex.current) set(overlayNode(), {
			transition: `opacity ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(",")})`,
			opacity: "0"
		});
		else set(overlayNode(), {
			transition: `opacity ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(",")})`,
			opacity: "1"
		});
		activeSnapPoint.current = snapPoints.current?.[Math.max(newSnapPointIndex, 0)];
	}
	watch([() => activeSnapPoint.current, () => open.current], () => {
		const releasing = isReleasing();
		if (!activeSnapPoint.current || releasing) return;
		const newIndex = snapPoints.current?.findIndex((snapPoint) => snapPoint === activeSnapPoint.current) ?? -1;
		if (snapPointsOffset() && newIndex !== -1 && typeof snapPointsOffset()[newIndex] === "number") {
			if (snapPointsOffset()[newIndex] === activeSnapPoint.current) return;
			snapToPoint(snapPointsOffset()[newIndex]);
		}
	});
	function onRelease({ draggedDistance, closeDrawer, velocity, dismissible }) {
		if (fadeFromIndex.current === void 0) return;
		const dir = direction.current;
		const currentPosition = dir === "bottom" || dir === "right" ? (activeSnapPointOffset() ?? 0) - draggedDistance : (activeSnapPointOffset() ?? 0) + draggedDistance;
		const isOverlaySnapPoint = activeSnapPointIndex() === fadeFromIndex.current - 1;
		const isFirst = activeSnapPointIndex() === 0;
		const hasDraggedUp = draggedDistance > 0;
		if (isOverlaySnapPoint) set(overlayNode(), { transition: `opacity ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(",")})` });
		if (!snapToSequentialPoint.current && velocity > 2 && !hasDraggedUp) {
			if (dismissible) closeDrawer();
			else snapToPoint(snapPointsOffset()[0]);
			return;
		}
		if (!snapToSequentialPoint.current && velocity > 2 && hasDraggedUp && snapPointsOffset() && snapPoints.current) {
			snapToPoint(snapPointsOffset()[snapPoints.current.length - 1]);
			return;
		}
		const closestSnapPoint = snapPointsOffset()?.reduce((prev, curr) => {
			if (typeof prev !== "number" || typeof curr !== "number") return prev;
			return Math.abs(curr - currentPosition) < Math.abs(prev - currentPosition) ? curr : prev;
		});
		const dim = isVertical(dir) ? window.innerHeight : window.innerWidth;
		if (velocity > .4 && Math.abs(draggedDistance) < dim * .4) {
			const dragDirection = hasDraggedUp ? 1 : -1;
			if (dragDirection > 0 && isLastSnapPoint() && snapPoints.current) {
				snapToPoint(snapPointsOffset()[snapPoints.current.length - 1]);
				return;
			}
			if (isFirst && dragDirection < 0 && dismissible) closeDrawer();
			if (activeSnapPointIndex() === null) return;
			snapToPoint(snapPointsOffset()[activeSnapPointIndex() + dragDirection]);
			return;
		}
		snapToPoint(closestSnapPoint);
	}
	function onDrag({ draggedDistance }) {
		if (activeSnapPointOffset() === null) return;
		const dir = direction.current;
		const newValue = isBottomOrRight(dir) ? activeSnapPointOffset() - draggedDistance : activeSnapPointOffset() + draggedDistance;
		const lastSnapPoint = snapPointsOffset()[snapPointsOffset().length - 1];
		if (isBottomOrRight(dir) && newValue < lastSnapPoint) return;
		if (!isBottomOrRight(dir) && newValue > lastSnapPoint) return;
		set(drawerNode(), { transform: isVertical(dir) ? `translate3d(0, ${newValue}px, 0)` : `translate3d(${newValue}px, 0, 0)` });
	}
	function getPercentageDragged(absDraggedDistance, isDraggingDown) {
		if (!snapPoints.current || typeof activeSnapPointIndex() !== "number" || !snapPointsOffset() || fadeFromIndex.current === void 0) return null;
		const isOverlaySnapPoint = activeSnapPointIndex() === fadeFromIndex.current - 1;
		if (activeSnapPointIndex() >= fadeFromIndex.current && isDraggingDown) return 0;
		if (isOverlaySnapPoint && !isDraggingDown) return 1;
		if (!shouldFade() && !isOverlaySnapPoint) return null;
		const targetSnapPointIndex = isOverlaySnapPoint ? activeSnapPointIndex() + 1 : activeSnapPointIndex() - 1;
		const snapPointDistance = isOverlaySnapPoint ? snapPointsOffset()[targetSnapPointIndex] - snapPointsOffset()[targetSnapPointIndex - 1] : snapPointsOffset()[targetSnapPointIndex + 1] - snapPointsOffset()[targetSnapPointIndex];
		const percentageDragged = absDraggedDistance / Math.abs(snapPointDistance);
		if (isOverlaySnapPoint) return 1 - percentageDragged;
		else return percentageDragged;
	}
	return {
		get isLastSnapPoint() {
			return isLastSnapPoint();
		},
		get shouldFade() {
			return shouldFade();
		},
		get activeSnapPointIndex() {
			return activeSnapPointIndex();
		},
		get snapPointsOffset() {
			return snapshot(snapPointsOffset());
		},
		getPercentageDragged,
		onRelease,
		onDrag
	};
}
function isBottomOrRight(direction) {
	if (direction === "bottom" || direction === "right") return true;
	return false;
}
//#endregion
//#region node_modules/vaul-svelte/dist/internal/browser.js
var isBrowser$1 = typeof document !== "undefined";
function isMobileFirefox() {
	const userAgent = navigator.userAgent;
	return typeof window !== "undefined" && (/Firefox/.test(userAgent) && /Mobile/.test(userAgent) || /FxiOS/.test(userAgent));
}
function isMac() {
	return testPlatform(/^Mac/);
}
function isIPhone() {
	return testPlatform(/^iPhone/);
}
function isSafari() {
	return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}
function isIPad() {
	return testPlatform(/^iPad/) || isMac() && navigator.maxTouchPoints > 1;
}
function isIOS() {
	return isIPhone() || isIPad();
}
function testPlatform(re) {
	return typeof window !== "undefined" && window.navigator != null ? re.test(window.navigator.platform) : void 0;
}
//#endregion
//#region node_modules/vaul-svelte/dist/use-prevent-scroll.svelte.js
var KEYBOARD_BUFFER = 24;
function chain(...callbacks) {
	return (...args) => {
		for (let callback of callbacks) if (typeof callback === "function") callback(...args);
	};
}
var visualViewport = isBrowser$1 && window.visualViewport;
function isScrollable(node) {
	let style = window.getComputedStyle(node);
	return /(auto|scroll)/.test(style.overflow + style.overflowX + style.overflowY);
}
function getScrollParent(node) {
	if (isScrollable(node)) node = node.parentElement;
	while (node && !isScrollable(node)) node = node.parentElement;
	return node || document.scrollingElement || document.documentElement;
}
var nonTextInputTypes = /* @__PURE__ */ new Set([
	"checkbox",
	"radio",
	"range",
	"color",
	"file",
	"image",
	"button",
	"submit",
	"reset"
]);
var preventScrollCount = 0;
var restore;
/**
* Prevents scrolling on the document body on mount, and
* restores it on unmount. Also ensures that content does not
* shift due to the scrollbars disappearing.
*/
function usePreventScroll(opts) {
	watch(opts.isDisabled, () => {
		if (opts.isDisabled()) return;
		preventScrollCount++;
		if (preventScrollCount === 1) {
			if (isIOS()) restore = preventScrollMobileSafari();
		}
		return () => {
			preventScrollCount--;
			if (preventScrollCount === 0) restore?.();
		};
	});
}
function preventScrollMobileSafari() {
	let scrollable;
	let lastY = 0;
	const onTouchStart = (e) => {
		scrollable = getScrollParent(e.target);
		if (scrollable === document.documentElement && scrollable === document.body) return;
		lastY = e.changedTouches[0].pageY;
	};
	let onTouchMove = (e) => {
		if (!scrollable || scrollable === document.documentElement || scrollable === document.body) {
			e.preventDefault();
			return;
		}
		let y = e.changedTouches[0].pageY;
		let scrollTop = scrollable.scrollTop;
		let bottom = scrollable.scrollHeight - scrollable.clientHeight;
		if (bottom === 0) return;
		if (scrollTop <= 0 && y > lastY || scrollTop >= bottom && y < lastY) e.preventDefault();
		lastY = y;
	};
	let onTouchEnd = (e) => {
		let target = e.target;
		if (isInput(target) && target !== document.activeElement) {
			e.preventDefault();
			target.style.transform = "translateY(-2000px)";
			target.focus();
			requestAnimationFrame(() => {
				target.style.transform = "";
			});
		}
	};
	const onFocus = (e) => {
		let target = e.target;
		if (isInput(target)) {
			target.style.transform = "translateY(-2000px)";
			requestAnimationFrame(() => {
				target.style.transform = "";
				if (visualViewport) if (visualViewport.height < window.innerHeight) requestAnimationFrame(() => {
					scrollIntoView(target);
				});
				else visualViewport.addEventListener("resize", () => scrollIntoView(target), { once: true });
			});
		}
	};
	let onWindowScroll = () => {
		window.scrollTo(0, 0);
	};
	let scrollX = window.pageXOffset;
	let scrollY = window.pageYOffset;
	let restoreStyles = chain(setStyle(document.documentElement, "paddingRight", `${window.innerWidth - document.documentElement.clientWidth}px`));
	window.scrollTo(0, 0);
	let removeEvents = chain(on(document, "touchstart", onTouchStart, {
		passive: false,
		capture: true
	}), on(document, "touchmove", onTouchMove, {
		passive: false,
		capture: true
	}), on(document, "touchend", onTouchEnd, {
		passive: false,
		capture: true
	}), on(document, "focus", onFocus, { capture: true }), on(window, "scroll", onWindowScroll));
	return () => {
		restoreStyles();
		removeEvents();
		window.scrollTo(scrollX, scrollY);
	};
}
function setStyle(element, style, value) {
	let cur = element.style[style];
	element.style[style] = value;
	return () => {
		element.style[style] = cur;
	};
}
function scrollIntoView(target) {
	let root = document.scrollingElement || document.documentElement;
	while (target && target !== root) {
		let scrollable = getScrollParent(target);
		if (scrollable !== document.documentElement && scrollable !== document.body && scrollable !== target) {
			let scrollableTop = scrollable.getBoundingClientRect().top;
			let targetTop = target.getBoundingClientRect().top;
			if (target.getBoundingClientRect().bottom > scrollable.getBoundingClientRect().bottom + KEYBOARD_BUFFER) scrollable.scrollTop += targetTop - scrollableTop;
		}
		target = scrollable.parentElement;
	}
}
function isInput(target) {
	return target instanceof HTMLInputElement && !nonTextInputTypes.has(target.type) || target instanceof HTMLTextAreaElement || target instanceof HTMLElement && target.isContentEditable;
}
//#endregion
//#region node_modules/vaul-svelte/dist/use-position-fixed.svelte.js
var previousBodyPosition = null;
function usePositionFixed({ open, modal, nested, hasBeenOpened, preventScrollRestoration, noBodyStyles }) {
	let activeUrl = typeof window !== "undefined" ? window.location.href : "";
	let scrollPos = 0;
	function setPositionFixed() {
		if (!isSafari()) return;
		if (previousBodyPosition === null && open.current && !noBodyStyles.current) {
			previousBodyPosition = {
				position: document.body.style.position,
				top: document.body.style.top,
				left: document.body.style.left,
				height: document.body.style.height,
				right: "unset"
			};
			const { scrollX, innerHeight } = window;
			document.body.style.setProperty("position", "fixed", "important");
			Object.assign(document.body.style, {
				top: `0px`,
				left: `${-scrollX}px`,
				right: "0px",
				height: "auto"
			});
			window.setTimeout(() => window.requestAnimationFrame(() => {
				const bottomBarHeight = innerHeight - window.innerHeight;
				if (bottomBarHeight && scrollPos >= innerHeight) document.body.style.top = `${-(scrollPos + bottomBarHeight)}px`;
			}), 300);
		}
	}
	function restorePositionSetting() {
		if (!isSafari()) return;
		if (previousBodyPosition !== null && !noBodyStyles.current) {
			const y = -parseInt(document.body.style.top, 10);
			const x = -parseInt(document.body.style.left, 10);
			Object.assign(document.body.style, previousBodyPosition);
			window.requestAnimationFrame(() => {
				if (preventScrollRestoration.current && activeUrl !== window.location.href) {
					activeUrl = window.location.href;
					return;
				}
				window.scrollTo(x, y);
			});
			previousBodyPosition = null;
		}
	}
	watch([() => modal.current, () => activeUrl], () => {
		if (!modal.current) return;
		return () => {
			if (typeof document === "undefined") return;
			if (!!document.querySelector("[data-vaul-drawer]")) return;
			restorePositionSetting();
		};
	});
	watch([
		() => open.current,
		() => hasBeenOpened(),
		() => activeUrl,
		() => modal.current,
		() => nested.current
	], () => {
		if (nested.current || !hasBeenOpened()) return;
		if (open.current) {
			!window.matchMedia("(display-mode: standalone)").matches && setPositionFixed();
			if (!modal.current) window.setTimeout(() => {
				restorePositionSetting();
			}, 500);
		} else restorePositionSetting();
	});
	return { restorePositionSetting };
}
//#endregion
//#region node_modules/vaul-svelte/dist/context.js
var DrawerContext = new Context("Drawer.Root");
//#endregion
//#region node_modules/vaul-svelte/dist/use-drawer-root.svelte.js
function useDrawerRoot(opts) {
	let hasBeenOpened = false;
	let isDragging = false;
	let justReleased = false;
	let overlayNode = null;
	let drawerNode = null;
	let openTime = null;
	let dragStartTime = null;
	let dragEndTime = null;
	let lastTimeDragPrevented = null;
	let isAllowedToDrag = false;
	let nestedOpenChangeTimer = null;
	let pointerStart = 0;
	let keyboardIsOpen = box(false);
	let shouldAnimate = !opts.open.current;
	let previousDiffFromInitial = 0;
	let drawerHeight = 0;
	let drawerWidth = 0;
	let initialDrawerHeight = 0;
	let isReleasing = false;
	const snapPointsState = useSnapPoints({
		snapPoints: opts.snapPoints,
		drawerNode: () => drawerNode,
		activeSnapPoint: opts.activeSnapPoint,
		container: opts.container,
		direction: opts.direction,
		fadeFromIndex: opts.fadeFromIndex,
		overlayNode: () => overlayNode,
		setOpenTime: (time) => {
			openTime = time;
		},
		snapToSequentialPoint: opts.snapToSequentialPoint,
		open: opts.open,
		isReleasing: () => isReleasing
	});
	usePreventScroll({ isDisabled: () => !opts.open.current || isDragging || !opts.modal.current || justReleased || !hasBeenOpened || !opts.repositionInputs.current || !opts.disablePreventScroll.current });
	const { restorePositionSetting } = usePositionFixed({
		...opts,
		hasBeenOpened: () => hasBeenOpened
	});
	function getScale() {
		return (window.innerWidth - 26) / window.innerWidth;
	}
	function onPress(event) {
		if (!opts.dismissible.current && !opts.snapPoints.current) return;
		if (drawerNode && !drawerNode.contains(event.target)) return;
		drawerHeight = drawerNode?.getBoundingClientRect().height || 0;
		drawerWidth = drawerNode?.getBoundingClientRect().width || 0;
		isDragging = true;
		dragStartTime = /* @__PURE__ */ new Date();
		if (isIOS()) on(window, "touchend", () => isAllowedToDrag = false, { once: true });
		event.target.setPointerCapture(event.pointerId);
		pointerStart = isVertical(opts.direction.current) ? event.pageY : event.pageX;
	}
	function shouldDrag(el, isDraggingInDirection) {
		let element = el;
		const highlightedText = window.getSelection()?.toString();
		const swipeAmount = drawerNode ? getTranslate(drawerNode, opts.direction.current) : null;
		const date = /* @__PURE__ */ new Date();
		if (element.tagName === "SELECT") return false;
		if (element.hasAttribute("data-vaul-no-drag") || element.closest("[data-vaul-no-drag]")) return false;
		if (opts.direction.current === "right" || opts.direction.current === "left") return true;
		if (openTime && date.getTime() - openTime.getTime() < 500) return false;
		if (swipeAmount !== null) {
			if (opts.direction.current === "bottom" ? swipeAmount > 0 : swipeAmount < 0) return true;
		}
		if (highlightedText && highlightedText.length > 0) return false;
		if (lastTimeDragPrevented && date.getTime() - lastTimeDragPrevented.getTime() < opts.scrollLockTimeout.current && swipeAmount === 0) {
			lastTimeDragPrevented = date;
			return false;
		}
		if (isDraggingInDirection) {
			lastTimeDragPrevented = date;
			return false;
		}
		while (element) {
			if (element.scrollHeight > element.clientHeight) {
				if (element.scrollTop !== 0) {
					lastTimeDragPrevented = /* @__PURE__ */ new Date();
					return false;
				}
				if (element.getAttribute("role") === "dialog") return true;
			}
			element = element.parentNode;
		}
		return true;
	}
	function onDrag(event) {
		if (!drawerNode || !isDragging) return;
		const directionMultiplier = opts.direction.current === "bottom" || opts.direction.current === "right" ? 1 : -1;
		const draggedDistance = (pointerStart - (isVertical(opts.direction.current) ? event.pageY : event.pageX)) * directionMultiplier;
		const isDraggingInDirection = draggedDistance > 0;
		const noCloseSnapPointsPreCondition = opts.snapPoints.current && !opts.dismissible.current && !isDraggingInDirection;
		if (noCloseSnapPointsPreCondition && snapPointsState.activeSnapPointIndex === 0) return;
		const absDraggedDistance = Math.abs(draggedDistance);
		const wrapper = document.querySelector("[data-vaul-drawer-wrapper]");
		let percentageDragged = absDraggedDistance / (opts.direction.current === "bottom" || opts.direction.current === "top" ? drawerHeight : drawerWidth);
		const snapPointPercentageDragged = snapPointsState.getPercentageDragged(absDraggedDistance, isDraggingInDirection);
		if (snapPointPercentageDragged !== null) percentageDragged = snapPointPercentageDragged;
		if (noCloseSnapPointsPreCondition && percentageDragged >= 1) return;
		if (!isAllowedToDrag && !shouldDrag(event.target, isDraggingInDirection)) return;
		drawerNode.classList.add(DRAG_CLASS);
		isAllowedToDrag = true;
		set(drawerNode, { transition: "none" });
		set(overlayNode, { transition: "none" });
		if (opts.snapPoints.current) snapPointsState.onDrag({ draggedDistance });
		if (isDraggingInDirection && !opts.snapPoints.current) {
			const dampenedDraggedDistance = dampenValue(draggedDistance);
			const translateValue = Math.min(dampenedDraggedDistance * -1, 0) * directionMultiplier;
			set(drawerNode, { transform: isVertical(opts.direction.current) ? `translate3d(0, ${translateValue}px, 0)` : `translate3d(${translateValue}px, 0, 0)` });
			return;
		}
		const opacityValue = 1 - percentageDragged;
		if (snapPointsState.shouldFade || opts.fadeFromIndex.current && snapPointsState.activeSnapPointIndex === opts.fadeFromIndex.current - 1) {
			opts.onDrag.current?.(event, percentageDragged);
			set(overlayNode, {
				opacity: `${opacityValue}`,
				transition: "none"
			}, true);
		}
		if (wrapper && overlayNode && opts.shouldScaleBackground.current) {
			const scaleValue = Math.min(getScale() + percentageDragged * (1 - getScale()), 1);
			const borderRadiusValue = 8 - percentageDragged * 8;
			const translateValue = Math.max(0, 14 - percentageDragged * 14);
			set(wrapper, {
				borderRadius: `${borderRadiusValue}px`,
				transform: isVertical(opts.direction.current) ? `scale(${scaleValue}) translate3d(0, ${translateValue}px, 0)` : `scale(${scaleValue}) translate3d(${translateValue}px, 0, 0)`,
				transition: "none"
			}, true);
		}
		if (!opts.snapPoints.current) {
			const translateValue = absDraggedDistance * directionMultiplier;
			set(drawerNode, { transform: isVertical(opts.direction.current) ? `translate3d(0, ${translateValue}px, 0)` : `translate3d(${translateValue}px, 0, 0)` });
		}
	}
	function onDialogOpenChange(o) {
		if (!opts.dismissible.current && !o) return;
		if (o) hasBeenOpened = true;
		else closeDrawer(true);
		opts.open.current = o;
	}
	function onVisualViewportChange() {
		if (!drawerNode || !opts.repositionInputs.current) return;
		const focusedElement = document.activeElement;
		if (isInput(focusedElement) || keyboardIsOpen.current) {
			const visualViewportHeight = window.visualViewport?.height || 0;
			const totalHeight = window.innerHeight;
			let diffFromInitial = totalHeight - visualViewportHeight;
			const drawerHeight = drawerNode.getBoundingClientRect().height || 0;
			const isTallEnough = drawerHeight > totalHeight * .8;
			if (!initialDrawerHeight) initialDrawerHeight = drawerHeight;
			const offsetFromTop = drawerNode.getBoundingClientRect().top;
			if (Math.abs(previousDiffFromInitial - diffFromInitial) > 60) keyboardIsOpen.current = !keyboardIsOpen.current;
			if (opts.snapPoints.current && opts.snapPoints.current.length > 0 && snapPointsState.snapPointsOffset && snapPointsState.activeSnapPointIndex) {
				const activeSnapPointHeight = snapPointsState.snapPointsOffset[snapPointsState.activeSnapPointIndex] || 0;
				diffFromInitial += activeSnapPointHeight;
			}
			previousDiffFromInitial = diffFromInitial;
			if (drawerHeight > visualViewportHeight || keyboardIsOpen.current) {
				const height = drawerNode.getBoundingClientRect().height;
				let newDrawerHeight = height;
				if (height > visualViewportHeight) newDrawerHeight = visualViewportHeight - (isTallEnough ? offsetFromTop : 26);
				if (opts.fixed.current) drawerNode.style.height = `${height - Math.max(diffFromInitial, 0)}px`;
				else drawerNode.style.height = `${Math.max(newDrawerHeight, visualViewportHeight - offsetFromTop)}px`;
			} else if (!isMobileFirefox()) drawerNode.style.height = `${initialDrawerHeight}px`;
			if (opts.snapPoints.current && opts.snapPoints.current.length > 0 && !keyboardIsOpen.current) drawerNode.style.bottom = `0px`;
			else drawerNode.style.bottom = `${Math.max(diffFromInitial, 0)}px`;
		}
	}
	watch([
		() => snapPointsState.activeSnapPointIndex,
		() => opts.snapPoints.current,
		() => snapPointsState.snapPointsOffset,
		() => drawerNode
	], () => {
		if (!window.visualViewport) return;
		return on(window.visualViewport, "resize", onVisualViewportChange);
	});
	function cancelDrag() {
		if (!isDragging || !drawerNode) return;
		drawerNode.classList.remove(DRAG_CLASS);
		isAllowedToDrag = false;
		isDragging = false;
		dragEndTime = /* @__PURE__ */ new Date();
	}
	function closeDrawer(fromWithin) {
		cancelDrag();
		opts.onClose?.current();
		if (!fromWithin) {
			handleOpenChange(false);
			opts.open.current = false;
		}
		window.setTimeout(() => {
			if (opts.snapPoints.current && opts.snapPoints.current.length > 0) opts.activeSnapPoint.current = opts.snapPoints.current[0];
		}, TRANSITIONS.DURATION * 1e3);
	}
	function resetDrawer() {
		if (!drawerNode) return;
		const wrapper = document.querySelector("[data-vaul-drawer-wrapper]");
		const currentSwipeAmount = getTranslate(drawerNode, opts.direction.current);
		set(drawerNode, {
			transform: "translate3d(0, 0, 0)",
			transition: `transform ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(",")})`
		});
		set(overlayNode, {
			transition: `opacity ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(",")})`,
			opacity: "1"
		});
		if (opts.shouldScaleBackground.current && currentSwipeAmount && currentSwipeAmount > 0 && opts.open.current) set(wrapper, {
			borderRadius: `8px`,
			overflow: "hidden",
			...isVertical(opts.direction.current) ? {
				transform: `scale(${getScale()}) translate3d(0, calc(env(safe-area-inset-top) + 14px), 0)`,
				transformOrigin: "top"
			} : {
				transform: `scale(${getScale()}) translate3d(calc(env(safe-area-inset-top) + 14px), 0, 0)`,
				transformOrigin: "left"
			},
			transitionProperty: "transform, border-radius",
			transitionDuration: `${TRANSITIONS.DURATION}s`,
			transitionTimingFunction: `cubic-bezier(${TRANSITIONS.EASE.join(",")})`
		}, true);
	}
	function onRelease(event) {
		isReleasing = true;
		handleRelease(event);
		afterTick(() => {
			isReleasing = false;
		});
	}
	function handleRelease(event) {
		if (!isDragging || !drawerNode) return;
		drawerNode.classList.remove(DRAG_CLASS);
		isAllowedToDrag = false;
		isDragging = false;
		dragEndTime = /* @__PURE__ */ new Date();
		const swipeAmount = getTranslate(drawerNode, opts.direction.current);
		if (!event || event.target && !shouldDrag(event.target, false) || !swipeAmount || Number.isNaN(swipeAmount)) return;
		if (dragStartTime === null) return;
		const timeTaken = dragEndTime.getTime() - dragStartTime.getTime();
		const distMoved = pointerStart - (isVertical(opts.direction.current) ? event.pageY : event.pageX);
		const velocity = Math.abs(distMoved) / timeTaken;
		if (velocity > .05) {
			justReleased = true;
			setTimeout(() => {
				justReleased = false;
			}, 200);
		}
		if (opts.snapPoints.current) {
			const directionMultiplier = opts.direction.current === "bottom" || opts.direction.current === "right" ? 1 : -1;
			snapPointsState.onRelease({
				draggedDistance: distMoved * directionMultiplier,
				closeDrawer,
				velocity,
				dismissible: opts.dismissible.current
			});
			opts.onRelease.current?.(event, true);
			return;
		}
		if (opts.direction.current === "bottom" || opts.direction.current === "right" ? distMoved > 0 : distMoved < 0) {
			resetDrawer();
			opts.onRelease.current?.(event, true);
			return;
		}
		if (velocity > .4) {
			closeDrawer();
			opts.onRelease.current?.(event, false);
			return;
		}
		const visibleDrawerHeight = Math.min(drawerNode.getBoundingClientRect().height ?? 0, window.innerHeight);
		const visibleDrawerWidth = Math.min(drawerNode.getBoundingClientRect().width ?? 0, window.innerWidth);
		const isHorizontalSwipe = opts.direction.current === "left" || opts.direction.current === "right";
		if (Math.abs(swipeAmount) >= (isHorizontalSwipe ? visibleDrawerWidth : visibleDrawerHeight) * opts.closeThreshold.current) {
			closeDrawer();
			opts.onRelease.current?.(event, false);
			return;
		}
		opts.onRelease.current?.(event, true);
		resetDrawer();
	}
	watch(() => opts.open.current, () => {
		if (opts.open.current) {
			set(document.documentElement, { scrollBehavior: "auto" });
			openTime = /* @__PURE__ */ new Date();
		}
		return () => {
			reset(document.documentElement, "scrollBehavior");
		};
	});
	function onNestedOpenChange(o) {
		const scale = o ? (window.innerWidth - 16) / window.innerWidth : 1;
		const initialTranslate = o ? -16 : 0;
		if (nestedOpenChangeTimer) window.clearTimeout(nestedOpenChangeTimer);
		set(drawerNode, {
			transition: `transform ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(",")})`,
			transform: isVertical(opts.direction.current) ? `scale(${scale}) translate3d(0, ${initialTranslate}px, 0)` : `scale(${scale}) translate3d(${initialTranslate}px, 0, 0)`
		});
		if (!o && drawerNode) nestedOpenChangeTimer = window.setTimeout(() => {
			const translateValue = getTranslate(drawerNode, opts.direction.current);
			set(drawerNode, {
				transition: "none",
				transform: isVertical(opts.direction.current) ? `translate3d(0, ${translateValue}px, 0)` : `translate3d(${translateValue}px, 0, 0)`
			});
		}, 500);
	}
	function onNestedDrag(_event, percentageDragged) {
		if (percentageDragged < 0) return;
		const initialScale = (window.innerWidth - 16) / window.innerWidth;
		const newScale = initialScale + percentageDragged * (1 - initialScale);
		const newTranslate = -16 + percentageDragged * 16;
		set(drawerNode, {
			transform: isVertical(opts.direction.current) ? `scale(${newScale}) translate3d(0, ${newTranslate}px, 0)` : `scale(${newScale}) translate3d(${newTranslate}px, 0, 0)`,
			transition: "none"
		});
	}
	function onNestedRelease(_event, o) {
		const dim = isVertical(opts.direction.current) ? window.innerHeight : window.innerWidth;
		const scale = o ? (dim - 16) / dim : 1;
		const translate = o ? -16 : 0;
		if (o) set(drawerNode, {
			transition: `transform ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(",")})`,
			transform: isVertical(opts.direction.current) ? `scale(${scale}) translate3d(0, ${translate}px, 0)` : `scale(${scale}) translate3d(${translate}px, 0, 0)`
		});
	}
	let bodyStyles;
	function handleOpenChange(o) {
		opts.onOpenChange.current?.(o);
		if (o && !opts.nested.current) bodyStyles = document.body.style.cssText;
		else if (!o && !opts.nested.current) afterSleep(TRANSITIONS.DURATION * 1e3, () => {
			document.body.style.cssText = bodyStyles;
		});
		if (!o && !opts.nested.current) restorePositionSetting();
		setTimeout(() => {
			opts.onAnimationEnd.current?.(o);
		}, TRANSITIONS.DURATION * 1e3);
		if (o && !opts.modal.current) {
			if (typeof window !== "undefined") window.requestAnimationFrame(() => {
				document.body.style.pointerEvents = "auto";
			});
		}
		if (!o) document.body.style.pointerEvents = "auto";
	}
	watch(() => opts.modal.current, () => {
		if (!opts.modal.current) window.requestAnimationFrame(() => {
			document.body.style.pointerEvents = "auto";
		});
	});
	function setOverlayNode(node) {
		overlayNode = node;
	}
	function setDrawerNode(node) {
		drawerNode = node;
	}
	return DrawerContext.set({
		...opts,
		keyboardIsOpen,
		closeDrawer,
		setDrawerNode,
		setOverlayNode,
		onDrag,
		onNestedDrag,
		onNestedOpenChange,
		onNestedRelease,
		onRelease,
		onPress,
		onDialogOpenChange,
		get shouldAnimate() {
			return shouldAnimate;
		},
		get isDragging() {
			return isDragging;
		},
		get overlayNode() {
			return overlayNode;
		},
		get drawerNode() {
			return drawerNode;
		},
		get snapPointsOffset() {
			return snapPointsState.snapPointsOffset;
		},
		get shouldFade() {
			return snapPointsState.shouldFade;
		},
		restorePositionSetting,
		handleOpenChange
	});
}
//#endregion
//#region node_modules/vaul-svelte/dist/components/drawer/drawer.svelte
function Drawer$1($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { open = false, onOpenChange = noop, onDrag = noop, onRelease = noop, snapPoints, shouldScaleBackground = false, setBackgroundColorOnScale = true, closeThreshold = CLOSE_THRESHOLD, scrollLockTimeout = 100, dismissible = true, handleOnly = false, fadeFromIndex = snapPoints && snapPoints.length - 1, activeSnapPoint = null, onActiveSnapPointChange = noop, fixed = false, modal = true, onClose = noop, nested = false, noBodyStyles = false, direction = "bottom", snapToSequentialPoint = false, preventScrollRestoration = false, repositionInputs = true, onAnimationEnd = noop, container = null, autoFocus = false, disablePreventScroll = true, $$slots, $$events, ...restProps } = $$props;
		const rootState = useDrawerRoot({
			open: box.with(() => open, (o) => {
				open = o;
				rootState.handleOpenChange(o);
			}),
			closeThreshold: box.with(() => closeThreshold),
			scrollLockTimeout: box.with(() => scrollLockTimeout),
			snapPoints: box.with(() => snapPoints),
			fadeFromIndex: box.with(() => fadeFromIndex),
			nested: box.with(() => nested),
			shouldScaleBackground: box.with(() => shouldScaleBackground),
			activeSnapPoint: box.with(() => activeSnapPoint, (v) => {
				activeSnapPoint = v;
				onActiveSnapPointChange(v);
			}),
			onRelease: box.with(() => onRelease),
			onDrag: box.with(() => onDrag),
			onClose: box.with(() => onClose),
			dismissible: box.with(() => dismissible),
			direction: box.with(() => direction),
			fixed: box.with(() => fixed),
			modal: box.with(() => modal),
			handleOnly: box.with(() => handleOnly),
			noBodyStyles: box.with(() => noBodyStyles),
			preventScrollRestoration: box.with(() => preventScrollRestoration),
			setBackgroundColorOnScale: box.with(() => setBackgroundColorOnScale),
			repositionInputs: box.with(() => repositionInputs),
			autoFocus: box.with(() => autoFocus),
			snapToSequentialPoint: box.with(() => snapToSequentialPoint),
			container: box.with(() => container),
			disablePreventScroll: box.with(() => disablePreventScroll),
			onOpenChange: box.with(() => onOpenChange),
			onAnimationEnd: box.with(() => onAnimationEnd)
		});
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			var bind_get = () => rootState.open.current;
			var bind_set = (o) => {
				rootState.onDialogOpenChange(o);
			};
			if (Dialog) {
				$$renderer.push("<!--[-->");
				Dialog($$renderer, spread_props([{
					get open() {
						return bind_get();
					},
					set open($$value) {
						bind_set($$value);
					}
				}, restProps]));
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
		bind_props($$props, {
			open,
			activeSnapPoint
		});
	});
}
//#endregion
//#region node_modules/vaul-svelte/dist/internal/use-id.js
globalThis.vaulIdCounter ??= { current: 0 };
/**
* Generates a unique ID based on a global counter.
*/
function useId(prefix = "vaul-svelte") {
	globalThis.vaulIdCounter.current++;
	return `${prefix}-${globalThis.vaulIdCounter.current}`;
}
//#endregion
//#region node_modules/vaul-svelte/dist/use-scale-background.svelte.js
function useScaleBackground() {
	const ctx = DrawerContext.get();
	let timeoutId = null;
	const initialBackgroundColor = typeof document !== "undefined" ? document.body.style.backgroundColor : "";
	function getScale() {
		return (window.innerWidth - 26) / window.innerWidth;
	}
	watch([
		() => ctx.open.current,
		() => ctx.shouldScaleBackground.current,
		() => ctx.setBackgroundColorOnScale.current
	], () => {
		if (ctx.open.current && ctx.shouldScaleBackground.current) {
			if (timeoutId) clearTimeout(timeoutId);
			const wrapper = document.querySelector("[data-vaul-drawer-wrapper]") || document.querySelector("[data-vaul-drawer-wrapper]");
			if (!wrapper) return;
			ctx.setBackgroundColorOnScale.current && !ctx.noBodyStyles.current && assignStyle(document.body, { background: "black" }), assignStyle(wrapper, {
				transformOrigin: isVertical(ctx.direction.current) ? "top" : "left",
				transitionProperty: "transform, border-radius",
				transitionDuration: `${TRANSITIONS.DURATION}s`,
				transitionTimingFunction: `cubic-bezier(${TRANSITIONS.EASE.join(",")})`
			});
			const wrapperStylesCleanup = assignStyle(wrapper, {
				borderRadius: `8px`,
				overflow: "hidden",
				...isVertical(ctx.direction.current) ? { transform: `scale(${getScale()}) translate3d(0, calc(env(safe-area-inset-top) + 14px), 0)` } : { transform: `scale(${getScale()}) translate3d(calc(env(safe-area-inset-top) + 14px), 0, 0)` }
			});
			return () => {
				wrapperStylesCleanup();
				timeoutId = window.setTimeout(() => {
					if (initialBackgroundColor) document.body.style.background = initialBackgroundColor;
					else document.body.style.removeProperty("background");
				}, TRANSITIONS.DURATION * 1e3);
			};
		}
	});
}
//#endregion
//#region node_modules/vaul-svelte/dist/use-drawer-content.svelte.js
function useDrawerContent(opts) {
	const ctx = DrawerContext.get();
	let mounted = false;
	useRefById({
		id: opts.id,
		ref: opts.ref,
		deps: () => [mounted, ctx.open.current],
		onRefChange: (node) => {
			if (!mounted) ctx.setDrawerNode(null);
			else ctx.setDrawerNode(node);
		}
	});
	let delayedSnapPoints = false;
	let pointerStart = null;
	let lastKnownPointerEvent = null;
	let wasBeyondThePoint = false;
	const hasSnapPoints = derived(() => ctx.snapPoints.current && ctx.snapPoints.current.length > 0);
	useScaleBackground();
	function isDeltaInDirection(delta, direction, threshold = 0) {
		if (wasBeyondThePoint) return true;
		const deltaY = Math.abs(delta.y);
		const deltaX = Math.abs(delta.x);
		const isDeltaX = deltaX > deltaY;
		const dFactor = ["bottom", "right"].includes(direction) ? 1 : -1;
		if (direction === "left" || direction === "right") {
			if (!(delta.x * dFactor < 0) && deltaX >= 0 && deltaX <= threshold) return isDeltaX;
		} else if (!(delta.y * dFactor < 0) && deltaY >= 0 && deltaY <= threshold) return !isDeltaX;
		wasBeyondThePoint = true;
		return true;
	}
	watch([() => hasSnapPoints(), () => ctx.open.current], () => {
		if (hasSnapPoints() && ctx.open.current) window.requestAnimationFrame(() => {
			delayedSnapPoints = true;
		});
		else delayedSnapPoints = false;
	});
	function handleOnPointerUp(e) {
		pointerStart = null;
		wasBeyondThePoint = false;
		ctx.onRelease(e);
	}
	function onpointerdown(e) {
		if (ctx.handleOnly.current) return;
		opts.onpointerdown.current?.(e);
		pointerStart = {
			x: e.pageX,
			y: e.pageY
		};
		ctx.onPress(e);
	}
	function onOpenAutoFocus(e) {
		opts.onOpenAutoFocus.current?.(e);
		if (!ctx.autoFocus.current) e.preventDefault();
	}
	function onInteractOutside(e) {
		opts.onInteractOutside.current?.(e);
		if (!ctx.modal.current || e.defaultPrevented) {
			e.preventDefault();
			return;
		}
		if (ctx.keyboardIsOpen.current) ctx.keyboardIsOpen.current = false;
	}
	function onFocusOutside(e) {
		if (!ctx.modal.current) {
			e.preventDefault();
			return;
		}
	}
	function onpointermove(e) {
		lastKnownPointerEvent = e;
		if (ctx.handleOnly.current) return;
		opts.onpointermove.current?.(e);
		if (!pointerStart) return;
		const yPosition = e.pageY - pointerStart.y;
		const xPosition = e.pageX - pointerStart.x;
		const swipeStartThreshold = e.pointerType === "touch" ? 10 : 2;
		if (isDeltaInDirection({
			x: xPosition,
			y: yPosition
		}, ctx.direction.current, swipeStartThreshold)) ctx.onDrag(e);
		else if (Math.abs(xPosition) > swipeStartThreshold || Math.abs(yPosition) > swipeStartThreshold) pointerStart = null;
	}
	function onpointerup(e) {
		opts.onpointerup.current?.(e);
		pointerStart = null;
		wasBeyondThePoint = false;
		ctx.onRelease(e);
	}
	function onpointerout(e) {
		opts.onpointerout.current?.(e);
		handleOnPointerUp(lastKnownPointerEvent);
	}
	function oncontextmenu(e) {
		opts.oncontextmenu.current?.(e);
		if (lastKnownPointerEvent) handleOnPointerUp(lastKnownPointerEvent);
	}
	const props = derived(() => ({
		id: opts.id.current,
		"data-vaul-drawer-direction": ctx.direction.current,
		"data-vaul-drawer": "",
		"data-vaul-delayed-snap-points": delayedSnapPoints ? "true" : "false",
		"data-vaul-snap-points": ctx.open.current && hasSnapPoints() ? "true" : "false",
		"data-vaul-custom-container": ctx.container.current ? "true" : "false",
		"data-vaul-animate": ctx.shouldAnimate ? "true" : "false",
		onpointerdown,
		onOpenAutoFocus,
		onInteractOutside,
		onFocusOutside,
		onpointerup,
		onpointermove,
		onpointerout,
		oncontextmenu,
		preventScroll: ctx.modal.current
	}));
	return {
		get props() {
			return props();
		},
		ctx,
		setMounted: (value) => {
			mounted = value;
		}
	};
}
//#endregion
//#region node_modules/vaul-svelte/dist/components/utils/mounted.svelte
function Mounted($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { onMounted } = $$props;
	});
}
//#endregion
//#region node_modules/vaul-svelte/dist/components/drawer/drawer-content.svelte
function Drawer_content$1($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { id = useId(), ref = null, onOpenAutoFocus = noop, onInteractOutside = noop, onFocusOutside = noop, oncontextmenu = noop, onpointerdown = noop, onpointerup = noop, onpointerout = noop, onpointermove = noop, children, $$slots, $$events, ...restProps } = $$props;
		const contentState = useDrawerContent({
			id: box.with(() => id),
			ref: box.with(() => ref, (v) => ref = v),
			oncontextmenu: box.with(() => oncontextmenu ?? noop),
			onInteractOutside: box.with(() => onInteractOutside),
			onpointerdown: box.with(() => onpointerdown ?? noop),
			onpointermove: box.with(() => onpointermove ?? noop),
			onpointerout: box.with(() => onpointerout ?? noop),
			onpointerup: box.with(() => onpointerup ?? noop),
			onOpenAutoFocus: box.with(() => onOpenAutoFocus),
			onFocusOutside: box.with(() => onFocusOutside)
		});
		const snapPointsOffset = contentState.ctx.snapPointsOffset;
		const styleProp = derived(() => snapPointsOffset && snapPointsOffset.length > 0 ? { "--snap-point-height": `${snapPointsOffset[contentState.ctx.activeSnapPointIndex ?? 0]}px` } : {});
		const mergedProps = derived(() => mergeProps(restProps, contentState.props, { style: styleProp() }));
		if (Dialog_content) {
			$$renderer.push("<!--[-->");
			Dialog_content($$renderer, spread_props([mergedProps(), {
				children: ($$renderer) => {
					children?.($$renderer);
					$$renderer.push(`<!----> `);
					Mounted($$renderer, { onMounted: contentState.setMounted });
					$$renderer.push(`<!---->`);
				},
				$$slots: { default: true }
			}]));
			$$renderer.push("<!--]-->");
		} else {
			$$renderer.push("<!--[!-->");
			$$renderer.push("<!--]-->");
		}
		bind_props($$props, { ref });
	});
}
//#endregion
//#region node_modules/vaul-svelte/dist/use-drawer-overlay.svelte.js
function useDrawerOverlay(opts) {
	const ctx = DrawerContext.get();
	let mounted = false;
	useRefById({
		id: opts.id,
		ref: opts.ref,
		deps: () => mounted,
		onRefChange: (node) => {
			if (!mounted) ctx.setOverlayNode(null);
			else ctx.setOverlayNode(node);
		}
	});
	const hasSnapPoints = derived(() => ctx.snapPoints.current && ctx.snapPoints.current.length > 0);
	const shouldRender = derived(() => ctx.modal.current);
	const props = derived(() => ({
		id: opts.id.current,
		onmouseup: ctx.onRelease,
		"data-vaul-overlay": "",
		"data-vaul-snap-points": ctx.open.current && hasSnapPoints() ? "true" : "false",
		"data-vaul-snap-points-overlay": ctx.open.current && ctx.shouldFade ? "true" : "false",
		"data-vaul-animate": ctx.shouldAnimate ? "true" : "false"
	}));
	return {
		get props() {
			return props();
		},
		get shouldRender() {
			return shouldRender();
		},
		setMounted: (value) => {
			mounted = value;
		}
	};
}
//#endregion
//#region node_modules/vaul-svelte/dist/components/drawer/drawer-overlay.svelte
function Drawer_overlay$1($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { id = useId(), ref = null, children, $$slots, $$events, ...restProps } = $$props;
		const overlayState = useDrawerOverlay({
			id: box.with(() => id),
			ref: box.with(() => ref, (v) => ref = v)
		});
		const mergedProps = derived(() => mergeProps(restProps, overlayState.props));
		if (overlayState.shouldRender) {
			$$renderer.push("<!--[0-->");
			if (Dialog_overlay) {
				$$renderer.push("<!--[-->");
				Dialog_overlay($$renderer, spread_props([mergedProps(), {
					children: ($$renderer) => {
						Mounted($$renderer, { onMounted: overlayState.setMounted });
						$$renderer.push(`<!----> `);
						children?.($$renderer);
						$$renderer.push(`<!---->`);
					},
					$$slots: { default: true }
				}]));
				$$renderer.push("<!--]-->");
			} else {
				$$renderer.push("<!--[!-->");
				$$renderer.push("<!--]-->");
			}
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region node_modules/vaul-svelte/dist/components/drawer/drawer-portal.svelte
function Drawer_portal$1($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const ctx = DrawerContext.get();
		let { to = ctx.container.current ?? void 0, $$slots, $$events, ...restProps } = $$props;
		if (Portal) {
			$$renderer.push("<!--[-->");
			Portal($$renderer, spread_props([{ to }, restProps]));
			$$renderer.push("<!--]-->");
		} else {
			$$renderer.push("<!--[!-->");
			$$renderer.push("<!--]-->");
		}
	});
}
var Title = Dialog_title;
var Description = Dialog_description;
var Close = Dialog_close;
//#endregion
//#region src/lib/components/ui/drawer/drawer.svelte
function Drawer($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { shouldScaleBackground = true, open = false, activeSnapPoint = null, $$slots, $$events, ...restProps } = $$props;
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (Drawer$1) {
				$$renderer.push("<!--[-->");
				Drawer$1($$renderer, spread_props([
					{ shouldScaleBackground },
					restProps,
					{
						get open() {
							return open;
						},
						set open($$value) {
							open = $$value;
							$$settled = false;
						},
						get activeSnapPoint() {
							return activeSnapPoint;
						},
						set activeSnapPoint($$value) {
							activeSnapPoint = $$value;
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
		bind_props($$props, {
			open,
			activeSnapPoint
		});
	});
}
//#endregion
//#region src/lib/components/ui/drawer/drawer-portal.svelte
function Drawer_portal($$renderer, $$props) {
	let { $$slots, $$events, ...restProps } = $$props;
	if (Drawer_portal$1) {
		$$renderer.push("<!--[-->");
		Drawer_portal$1($$renderer, spread_props([restProps]));
		$$renderer.push("<!--]-->");
	} else {
		$$renderer.push("<!--[!-->");
		$$renderer.push("<!--]-->");
	}
}
//#endregion
//#region src/lib/components/ui/drawer/drawer-overlay.svelte
function Drawer_overlay($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, $$slots, $$events, ...restProps } = $$props;
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (Drawer_overlay$1) {
				$$renderer.push("<!--[-->");
				Drawer_overlay$1($$renderer, spread_props([
					{
						"data-slot": "drawer-overlay",
						class: cn$1("data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 bg-black/30 supports-backdrop-filter:backdrop-blur-sm fixed inset-0 z-50", className)
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
//#region src/lib/components/ui/drawer/drawer-content.svelte
function Drawer_content($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, portalProps, children, $$slots, $$events, ...restProps } = $$props;
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			Drawer_portal($$renderer, spread_props([portalProps, {
				children: ($$renderer) => {
					Drawer_overlay($$renderer, {});
					$$renderer.push(`<!----> `);
					if (Drawer_content$1) {
						$$renderer.push("<!--[-->");
						Drawer_content$1($$renderer, spread_props([
							{
								"data-slot": "drawer-content",
								class: cn$1("before:bg-popover before:border-border relative flex h-auto flex-col bg-transparent p-4 text-sm before:absolute before:inset-2 before:-z-10 before:rounded-4xl before:border before:shadow-xl data-[vaul-drawer-direction=bottom]:inset-x-0 data-[vaul-drawer-direction=bottom]:bottom-0 data-[vaul-drawer-direction=bottom]:mt-24 data-[vaul-drawer-direction=bottom]:max-h-[80vh] data-[vaul-drawer-direction=left]:inset-y-0 data-[vaul-drawer-direction=left]:left-0 data-[vaul-drawer-direction=left]:w-3/4 data-[vaul-drawer-direction=right]:inset-y-0 data-[vaul-drawer-direction=right]:right-0 data-[vaul-drawer-direction=right]:w-3/4 data-[vaul-drawer-direction=top]:inset-x-0 data-[vaul-drawer-direction=top]:top-0 data-[vaul-drawer-direction=top]:mb-24 data-[vaul-drawer-direction=top]:max-h-[80vh] data-[vaul-drawer-direction=left]:sm:max-w-sm data-[vaul-drawer-direction=right]:sm:max-w-sm group/drawer-content fixed z-50", className)
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
									$$renderer.push(`<div class="bg-muted mx-auto mt-4 hidden h-1.5 w-[100px] shrink-0 rounded-full group-data-[vaul-drawer-direction=bottom]/drawer-content:block bg-muted mx-auto hidden shrink-0 group-data-[vaul-drawer-direction=bottom]/drawer-content:block"></div> `);
									children?.($$renderer);
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
//#region src/lib/components/ui/drawer/drawer-description.svelte
function Drawer_description($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, $$slots, $$events, ...restProps } = $$props;
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (Description) {
				$$renderer.push("<!--[-->");
				Description($$renderer, spread_props([
					{
						"data-slot": "drawer-description",
						class: cn$1("text-muted-foreground text-sm", className)
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
//#region src/lib/components/ui/drawer/drawer-footer.svelte
function Drawer_footer($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, children, $$slots, $$events, ...restProps } = $$props;
		$$renderer.push(`<div${attributes({
			"data-slot": "drawer-footer",
			class: clsx$1(cn$1("gap-2 p-4 mt-auto flex flex-col", className)),
			...restProps
		})}>`);
		children?.($$renderer);
		$$renderer.push(`<!----></div>`);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region src/lib/components/ui/drawer/drawer-header.svelte
function Drawer_header($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, children, $$slots, $$events, ...restProps } = $$props;
		$$renderer.push(`<div${attributes({
			"data-slot": "drawer-header",
			class: clsx$1(cn$1("gap-0.5 p-4 group-data-[vaul-drawer-direction=bottom]/drawer-content:text-center group-data-[vaul-drawer-direction=top]/drawer-content:text-center md:gap-1.5 md:text-left flex flex-col", className)),
			...restProps
		})}>`);
		children?.($$renderer);
		$$renderer.push(`<!----></div>`);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region src/lib/components/ui/drawer/drawer-title.svelte
function Drawer_title($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, $$slots, $$events, ...restProps } = $$props;
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (Title) {
				$$renderer.push("<!--[-->");
				Title($$renderer, spread_props([
					{
						"data-slot": "drawer-title",
						class: cn$1("font-heading text-foreground text-base font-medium", className)
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
//#region src/lib/components/ui/drawer/drawer-close.svelte
function Drawer_close($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, $$slots, $$events, ...restProps } = $$props;
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (Close) {
				$$renderer.push("<!--[-->");
				Close($$renderer, spread_props([
					{ "data-slot": "drawer-close" },
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
//#region node_modules/svelte-sonner/dist/internal/helpers.js
function cn(...classes) {
	return classes.filter(Boolean).join(" ");
}
var isBrowser = typeof document !== "undefined";
//#endregion
//#region node_modules/svelte-sonner/dist/toast-state.svelte.js
var toastsCounter = 0;
var ToastState = class {
	toasts = [];
	heights = [];
	#findToastIdx = (id) => {
		const idx = this.toasts.findIndex((toast) => toast.id === id);
		if (idx === -1) return null;
		return idx;
	};
	addToast = (data) => {
		if (!isBrowser) return;
		this.toasts.unshift(data);
	};
	updateToast = ({ id, data, type, message }) => {
		const toastIdx = this.toasts.findIndex((toast) => toast.id === id);
		const toastToUpdate = this.toasts[toastIdx];
		this.toasts[toastIdx] = {
			...toastToUpdate,
			...data,
			id,
			title: message,
			type,
			updated: true
		};
	};
	create = (data) => {
		const { message, ...rest } = data;
		const id = typeof data?.id === "number" || data.id && data.id?.length > 0 ? data.id : toastsCounter++;
		const dismissible = data.dismissible !== void 0 ? data.dismissible : data.dismissable !== void 0 ? data.dismissable : true;
		const type = data.type === void 0 ? "default" : data.type;
		run(() => {
			if (this.toasts.find((toast) => toast.id === id)) this.updateToast({
				id,
				data,
				type,
				message,
				dismissible
			});
			else this.addToast({
				...rest,
				id,
				title: message,
				dismissible,
				type
			});
		});
		return id;
	};
	dismiss = (id) => {
		run(() => {
			if (id === void 0) {
				this.toasts = this.toasts.map((toast) => ({
					...toast,
					dismiss: true
				}));
				return;
			}
			const toastIdx = this.toasts.findIndex((toast) => toast.id === id);
			if (this.toasts[toastIdx]) this.toasts[toastIdx] = {
				...this.toasts[toastIdx],
				dismiss: true
			};
		});
		return id;
	};
	remove = (id) => {
		if (id === void 0) {
			this.toasts = [];
			return;
		}
		const toastIdx = this.#findToastIdx(id);
		if (toastIdx === null) return;
		this.toasts.splice(toastIdx, 1);
		return id;
	};
	message = (message, data) => {
		return this.create({
			...data,
			type: "default",
			message
		});
	};
	error = (message, data) => {
		return this.create({
			...data,
			type: "error",
			message
		});
	};
	success = (message, data) => {
		return this.create({
			...data,
			type: "success",
			message
		});
	};
	info = (message, data) => {
		return this.create({
			...data,
			type: "info",
			message
		});
	};
	warning = (message, data) => {
		return this.create({
			...data,
			type: "warning",
			message
		});
	};
	loading = (message, data) => {
		return this.create({
			...data,
			type: "loading",
			message
		});
	};
	promise = (promise, data) => {
		if (!data) return;
		let id = void 0;
		if (data.loading !== void 0) id = this.create({
			...data,
			promise,
			type: "loading",
			message: typeof data.loading === "string" ? data.loading : data.loading()
		});
		const p = promise instanceof Promise ? promise : promise();
		let shouldDismiss = id !== void 0;
		p.then((response) => {
			if (typeof response === "object" && response && "ok" in response && typeof response.ok === "boolean" && !response.ok) {
				shouldDismiss = false;
				const message = constructPromiseErrorMessage(response);
				this.create({
					id,
					type: "error",
					message
				});
			} else if (data.success !== void 0) {
				shouldDismiss = false;
				const message = typeof data.success === "function" ? data.success(response) : data.success;
				this.create({
					id,
					type: "success",
					message
				});
			}
		}).catch((error) => {
			if (data.error !== void 0) {
				shouldDismiss = false;
				const message = typeof data.error === "function" ? data.error(error) : data.error;
				this.create({
					id,
					type: "error",
					message
				});
			}
		}).finally(() => {
			if (shouldDismiss) {
				this.dismiss(id);
				id = void 0;
			}
			data.finally?.();
		});
		return id;
	};
	custom = (component, data) => {
		const id = data?.id || toastsCounter++;
		this.create({
			component,
			id,
			...data
		});
		return id;
	};
	removeHeight = (id) => {
		this.heights = this.heights.filter((height) => height.toastId !== id);
	};
	setHeight = (data) => {
		const toastIdx = this.#findToastIdx(data.toastId);
		if (toastIdx === null) {
			this.heights.push(data);
			return;
		}
		this.heights[toastIdx] = data;
	};
	reset = () => {
		this.toasts = [];
		this.heights = [];
	};
};
function constructPromiseErrorMessage(response) {
	if (response && typeof response === "object" && "status" in response) return `HTTP error! Status: ${response.status}`;
	return `Error! ${response}`;
}
var toastState = new ToastState();
function toastFunction(message, data) {
	return toastState.create({
		message,
		...data
	});
}
var SonnerState = class {
	/**
	* A derived state of the toasts that are not dismissed.
	*/
	#activeToasts = derived(() => toastState.toasts.filter((toast) => !toast.dismiss));
	get toasts() {
		return this.#activeToasts();
	}
};
var toast = Object.assign(toastFunction, {
	success: toastState.success,
	info: toastState.info,
	warning: toastState.warning,
	error: toastState.error,
	custom: toastState.custom,
	message: toastState.message,
	promise: toastState.promise,
	dismiss: toastState.dismiss,
	loading: toastState.loading,
	getActiveToasts: () => {
		return toastState.toasts.filter((toast) => !toast.dismiss);
	}
});
//#endregion
//#region src/lib/pairing-app.svelte.ts
var PairingApp = class {
	/** This device's encoded public identity (used internally for pairing). */
	identity = "";
	/** This device's own name, shown to peers and editable on the Devices page. */
	selfName = "";
	devices = [];
	/** A verified incoming offer awaiting the user's accept/decline. */
	incoming = null;
	/** A device that redeemed a code we are showing, awaiting our confirm. */
	request = null;
	/**
	* How many pairings have completed on this device this session. Only ever read
	* as a signal that one just did — a count rather than a flag so a surface can
	* tell "another one happened" from "the same one is still the latest", which a
	* boolean cannot say without someone having to reset it.
	*/
	paired = 0;
	/**
	* Whether the first device-list load has settled, success or not. Until it
	* has, an empty list means "still loading", and the Devices page shows
	* placeholder rows rather than the empty state.
	*/
	loaded = false;
	/**
	* Device actions currently in flight, keyed `action:fingerprint` (`confirm`
	* and `rename:self` stand alone). Held here rather than in a component
	* because a row, a dialog, and a panel can each start the same action, and
	* the state must survive any one of them closing (`feedback`).
	*/
	#pending = new SvelteSet();
	/** Whether a device action is still running, wherever it was started. */
	isPending(key) {
		return this.#pending.has(key);
	}
	async #track(key, work) {
		this.#pending.add(key);
		try {
			return await work();
		} finally {
			this.#pending.delete(key);
		}
	}
	/** Whether the pairing backend came up (broker reachable, identity loaded). */
	get available() {
		return this.identity !== "";
	}
	/** Subscribe to pairing events; returns the cleanup for onMount. */
	async init() {
		try {
			this.identity = await Identity();
			this.selfName = await SelfName();
			await this.refresh();
		} catch {} finally {
			this.loaded = true;
		}
		const subs = [
			events.pairingOfferEvent.listen((e) => this.incoming = e.payload),
			events.pairingAccepted.listen(() => {
				app.send.accepted();
				this.incoming = null;
				goto(resolve("/send"));
			}),
			events.pairingDeclined.listen((e) => {
				this.#resetPendingSend();
				toast.info(e.payload.busy ? "They're busy. Try again in a bit." : "They turned it down");
			}),
			events.pairingError.listen((e) => {
				if (app.send.status === "starting") {
					app.send.stop();
					app.send.error = {
						title: "Could not send",
						message: e.payload.message
					};
				} else toast.error(e.payload.message);
			}),
			events.pairingRequest.listen((e) => {
				this.request = e.payload;
				goto(resolve("/devices"));
			}),
			events.pairingPaired.listen(() => {
				this.paired += 1;
				this.refresh();
				goto(resolve("/devices"));
			})
		];
		return () => subs.forEach((sub) => sub.then((unlisten) => unlisten()));
	}
	async refresh() {
		this.devices = await TrustedDevices() ?? [];
		this.loaded = true;
	}
	/**
	* Show a pairing code (also rendered as a QR) for another device to redeem.
	* A fresh call shows a new code; the old one expires on its own. The core
	* returns how long the code lasts with it, so the UI counts down the same
	* number the core enforces rather than a copy of it.
	*/
	showCode() {
		return ShowPairCode();
	}
	/**
	* Redeem a code shown on another device. `via` is 'qr' when scanned or 'code'
	* when typed. Resolves once the other device confirms; the `pairing:paired`
	* event then refreshes the list and toasts. Rejects so the caller can show the
	* linking state ending.
	*/
	async redeemCode(code, via) {
		await RedeemPairCode(code, via);
	}
	/** Rename this device. The new name is advertised to peers from now on. */
	async setSelfName(name) {
		const next = name.trim();
		if (!next) return;
		try {
			await this.#track("rename:self", () => SetSelfName(next));
			this.selfName = next;
		} catch (e) {
			toast.error(`Could not rename this device: ${errorText(e)}`);
		}
	}
	async accept() {
		if (!this.incoming) return;
		const offer = this.incoming;
		this.incoming = null;
		goto(resolve("/receive"));
		app.receive.beginTrusted({
			name: offer.fromName,
			fileCount: offer.fileCount,
			totalBytes: offer.totalBytes
		});
		try {
			await this.#track("accept", () => Accept(offer.transferId));
		} catch (e) {
			app.receive.stop();
			app.receive.error = describeError(e, "receive");
		}
	}
	async decline() {
		if (!this.incoming) return;
		const id = this.incoming.transferId;
		this.incoming = null;
		try {
			await this.#track("decline", () => Decline(id));
		} catch (e) {
			toast.error(errorText(e));
		}
	}
	/**
	* Offer already-selected files to a trusted device. The send panel enters
	* its connecting state immediately; the actual send begins once the peer
	* accepts (driven by the code/progress events), or is unwound on decline.
	*/
	async sendTo(fingerprint, paths) {
		if (!paths.length) return;
		const device = this.devices.find((d) => d.fingerprint === fingerprint);
		if (!device) return;
		app.send.error = null;
		app.send.beginTrusted({
			fingerprint,
			name: device.name
		});
		try {
			await this.#track(`send:${fingerprint}`, () => SendTo(fingerprint, paths));
		} catch (e) {
			app.send.stop();
			app.send.error = describeError(e, "send");
		}
	}
	/**
	* Approve a device that redeemed our code, trusting it under `name`.
	* The prompt stays open, its confirm showing the work, until the agreement
	* settles — the pairing:paired event then refreshes the list.
	*/
	async confirmPair(name) {
		const req = this.request;
		if (!req || this.isPending("confirm")) return;
		try {
			await this.#track("confirm", () => ConfirmPair(req.fingerprint, name));
		} catch (e) {
			toast.error(`Could not add that device: ${errorText(e)}`);
		} finally {
			this.request = null;
		}
	}
	/** Turn down a device that redeemed our code. */
	async dismissPair() {
		const req = this.request;
		if (!req || this.isPending("confirm")) return;
		this.request = null;
		try {
			await DismissPair(req.fingerprint);
		} catch {}
	}
	/** Rename a trusted device. Refresh either way so the list matches the store. */
	async rename(fingerprint, name) {
		try {
			await this.#track(`rename:${fingerprint}`, () => RenameDevice(fingerprint, name));
		} catch (e) {
			toast.error(`Could not rename that device: ${errorText(e)}`);
		}
		await this.refresh();
	}
	/**
	* Un-trust a device. Both halves of the trust store are on disk, so this can
	* genuinely fail — and it used to fail silently: an unhandled rejection left
	* the row sitting in the list with nothing said, so the store and the list
	* disagreed until the next refresh put the device back.
	*/
	async untrust(fingerprint) {
		try {
			await this.#track(`untrust:${fingerprint}`, () => Untrust(fingerprint));
		} catch (e) {
			toast.error(`Could not remove that device: ${errorText(e)}`);
		}
		await this.refresh();
	}
	#resetPendingSend() {
		if (app.send.status === "starting") app.send.stop();
	}
};
var pairing = new PairingApp();
//#endregion
export { Dismissible_layer as C, afterTick$1 as D, PresenceManager as E, afterSleep$1 as O, Escape_layer as S, Dialog_title as T, Dialog_overlay as _, cn as a, Text_selection_layer as b, Drawer_header as c, Drawer_content as d, Drawer as f, Dialog_description as g, Dialog as h, toastState as i, onDestroyEffect$1 as k, Drawer_footer as l, Dialog_close as m, SonnerState as n, Drawer_close as o, Dialog_content as p, toast as r, Drawer_title as s, pairing as t, Drawer_description as u, Scroll_lock as v, Portal as w, Focus_scope as x, useId$1 as y };
