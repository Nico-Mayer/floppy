import { C as attr, K as run, S as setContext, T as escape_html, _ as stringify, b as getContext, c as attributes, d as element, f as ensure_array_like, g as spread_props, k as on, l as bind_props, m as props_id, o as attr_class, s as attr_style, u as derived, w as clsx, x as hasContext } from "../../../chunks/index-server.js";
import { n as resolve } from "../../../chunks/paths.js";
import { a as motionOK, n as X, r as Check, t as app } from "../../../chunks/transfer-app.svelte.js";
import { G as buttonVariants, K as cn, M as isTouch, P as createAttachmentKey, S as boxWith, U as Icon, W as Button, a as boolToStr, c as createBitsAttrs, d as getDataOpenClosed, f as getDataTransitionAttrs, i as boolToEmptyStrOrUndef, j as isPhoneChrome, m as mergeProps, o as boolToStrTrueOrUndef, p as attachRef, r as createId, s as boolToTrueOrUndef } from "../../../chunks/StubMark.js";
import { t as Hidden_input } from "../../../chunks/hidden-input.js";
import { a as Context$1, i as watch$1, n as Previous, t as Separator } from "../../../chunks/separator.js";
import { D as afterTick, E as PresenceManager, O as afterSleep, c as Drawer_header, d as Drawer_content, f as Drawer, o as Drawer_close, s as Drawer_title, t as pairing, u as Drawer_description, w as Portal } from "../../../chunks/pairing-app.svelte.js";
import { a as Tooltip_content, c as Floating_layer, i as Tooltip_provider, l as FloatingAnchorState, n as Tooltip, o as Popper_layer_force_mount, r as Tooltip_trigger, s as Popper_layer, t as Triangle_alert, u as getFloatingContentCSSVars } from "../../../chunks/triangle-alert.js";
import { t as DOMContext } from "../../../chunks/dom-context.svelte.js";
import { _ as HOME, b as PAGE_UP, f as ARROW_UP, l as ARROW_DOWN, s as isIOS, t as noop$1, y as PAGE_DOWN } from "../../../chunks/noop.js";
import { a as TransferComplete, i as PendingHint, n as EmptyHero, o as TransferProgress, r as DeviceGlyph, s as TransferCard, t as TransferError } from "../../../chunks/TransferError.js";
import { n as formatBytes, t as currentFile } from "../../../chunks/format.js";
import { t as Send } from "../../../chunks/send.js";
import { n as PageHeader, t as PageShell } from "../../../chunks/PageShell.js";
import { l as Input_group_addon, n as Empty_description, r as Empty_title, s as Input_group_input, u as Input_group } from "../../../chunks/empty.js";
import { i as CopyButton, n as Plus, r as Qrcode, t as Qr_code } from "../../../chunks/qr-code.js";
import { t as Laptop } from "../../../chunks/laptop.js";
import { convertFileSrc } from "@tauri-apps/api/core";
import { distance2D, inView, isMotionValue } from "framer-motion/dom";
import { HTMLProjectionNode, HTMLVisualElement, SVGVisualElement, addScaleCorrector, addValueToWillChange, animateMotionValue, animateVisualElement, buildHTMLStyles, buildSVGAttrs, calcChildStagger, calcLength, camelCaseAttributes, cancelFrame, convertBoundingBoxToBox, convertBoxToBoundingBox, correctBorderRadius, correctBoxShadow, createBox, eachAxis, frame, frameData, globalProjectionState, hover, isAnimationControls, isSVGTag, isVariantLabel, measurePageBox, microtask, mixNumber, percent, press, resolveVariant } from "motion-dom";
import { clamp, millisecondsToSeconds, noop, pipe, progress, secondsToMilliseconds } from "motion-utils";
import { invariant, warning } from "hey-listen";
//#region node_modules/bits-ui/dist/internal/arrays.js
/**
* Returns the array element after the given index, or undefined for out-of-bounds or empty arrays.
* @param array the array.
* @param index the index of the current element.
* @param loop loop to the beginning of the array if the next index is out of bounds?
*/
/**
* Returns the array element after the given index, or undefined for out-of-bounds or empty arrays.
* For single-element arrays, returns the element if the index is 0.
* @param array the array.
* @param index the index of the current element.
* @param loop loop to the beginning of the array if the next index is out of bounds?
*/
function next(array, index, loop = true) {
	if (array.length === 0 || index < 0 || index >= array.length) return;
	if (array.length === 1 && index === 0) return array[0];
	if (index === array.length - 1) return loop ? array[0] : void 0;
	return array[index + 1];
}
/**
* Returns the array element prior to the given index, or undefined for out-of-bounds or empty arrays.
* For single-element arrays, returns the element if the index is 0.
* @param array the array.
* @param index the index of the current element.
* @param loop loop to the end of the array if the previous index is out of bounds?
*/
function prev(array, index, loop = true) {
	if (array.length === 0 || index < 0 || index >= array.length) return;
	if (array.length === 1 && index === 0) return array[0];
	if (index === 0) return loop ? array[array.length - 1] : void 0;
	return array[index - 1];
}
/**
* Returns the element some number after the given index. If the target index is out of bounds:
*   - If looping is disabled, the first or last element will be returned.
*   - If looping is enabled, it will wrap around the array.
* Returns undefined for empty arrays or out-of-bounds initial indices.
* @param array the array.
* @param index the index of the current element.
* @param increment the number of elements to move forward (can be negative).
* @param loop loop around the array if the target index is out of bounds?
*/
function forward(array, index, increment, loop = true) {
	if (array.length === 0 || index < 0 || index >= array.length) return;
	let targetIndex = index + increment;
	if (loop) targetIndex = (targetIndex % array.length + array.length) % array.length;
	else targetIndex = Math.max(0, Math.min(targetIndex, array.length - 1));
	return array[targetIndex];
}
/**
* Returns the element some number before the given index. If the target index is out of bounds:
*   - If looping is disabled, the first or last element will be returned.
*   - If looping is enabled, it will wrap around the array.
* Returns undefined for empty arrays or out-of-bounds initial indices.
* @param array the array.
* @param index the index of the current element.
* @param decrement the number of elements to move backward (can be negative).
* @param loop loop around the array if the target index is out of bounds?
*/
function backward(array, index, decrement, loop = true) {
	if (array.length === 0 || index < 0 || index >= array.length) return;
	let targetIndex = index - decrement;
	if (loop) targetIndex = (targetIndex % array.length + array.length) % array.length;
	else targetIndex = Math.max(0, Math.min(targetIndex, array.length - 1));
	return array[targetIndex];
}
/**
* Finds the next matching item from a list of values based on a search string.
*
* This function handles several special cases in typeahead behavior:
*
* 1. Space handling: When a search string ends with a space, it handles it specially:
*    - If there's only one match for the text before the space, it ignores the space
*    - If there are multiple matches and the current match already starts with the search prefix
*      followed by a space, it keeps the current match (doesn't change selection on space)
*    - Only after typing characters beyond the space will it move to a more specific match
*
* 2. Repeated character handling: If a search consists of repeated characters (e.g., "aaa"),
*    it treats it as a single character for matching purposes
*
* 3. Cycling behavior: The function wraps around the values array starting from the current match
*    to find the next appropriate match, creating a cycling selection behavior
*
* @param values - Array of string values to search through (e.g., the text content of menu items)
* @param search - The current search string typed by the user
* @param currentMatch - The currently selected/matched item, if any
* @returns The next matching value that should be selected, or undefined if no match is found
*/
function getNextMatch(values, search, currentMatch) {
	const lowerSearch = search.toLowerCase();
	if (lowerSearch.endsWith(" ")) {
		const searchWithoutSpace = lowerSearch.slice(0, -1);
		/**
		* If there's only one match for the prefix without space, we don't
		* watch to match with space.
		*/
		if (values.filter((value) => value.toLowerCase().startsWith(searchWithoutSpace)).length <= 1) return getNextMatch(values, searchWithoutSpace, currentMatch);
		const currentMatchLowercase = currentMatch?.toLowerCase();
		/**
		* If the current match already starts with the search prefix and has a space afterward,
		* and the user has only typed up to that space, keep the current match until they
		* disambiguate.
		*/
		if (currentMatchLowercase && currentMatchLowercase.startsWith(searchWithoutSpace) && currentMatchLowercase.charAt(searchWithoutSpace.length) === " " && search.trim() === searchWithoutSpace) return currentMatch;
		/**
		* With multiple matches, find items that match the full search string with space
		*/
		const spacedMatches = values.filter((value) => value.toLowerCase().startsWith(lowerSearch));
		/**
		* If we found matches with the space, use the first one that's not the current match
		*/
		if (spacedMatches.length > 0) {
			const currentMatchIndex = currentMatch ? values.indexOf(currentMatch) : -1;
			return wrapArray(spacedMatches, Math.max(currentMatchIndex, 0)).find((match) => match !== currentMatch) || currentMatch;
		}
	}
	const normalizedSearch = search.length > 1 && Array.from(search).every((char) => char === search[0]) ? search[0] : search;
	const normalizedLowerSearch = normalizedSearch.toLowerCase();
	const currentMatchIndex = currentMatch ? values.indexOf(currentMatch) : -1;
	let wrappedValues = wrapArray(values, Math.max(currentMatchIndex, 0));
	if (normalizedSearch.length === 1) wrappedValues = wrappedValues.filter((v) => v !== currentMatch);
	const nextMatch = wrappedValues.find((value) => value?.toLowerCase().startsWith(normalizedLowerSearch));
	return nextMatch !== currentMatch ? nextMatch : void 0;
}
/**
* Wraps an array around itself at a given start index
* Example: `wrapArray(['a', 'b', 'c', 'd'], 2) === ['c', 'd', 'a', 'b']`
*/
function wrapArray(array, startIndex) {
	return array.map((_, index) => array[(startIndex + index) % array.length]);
}
//#endregion
//#region node_modules/bits-ui/dist/internal/box-auto-reset.svelte.js
var defaultOptions = {
	afterMs: 1e4,
	onChange: noop$1
};
function boxAutoReset(defaultValue, options) {
	const { afterMs, onChange, getWindow } = {
		...defaultOptions,
		...options
	};
	let timeout = null;
	let value = defaultValue;
	function resetAfter() {
		return getWindow().setTimeout(() => {
			value = defaultValue;
			onChange?.(defaultValue);
		}, afterMs);
	}
	return boxWith(() => value, (v) => {
		value = v;
		onChange?.(v);
		if (timeout) getWindow().clearTimeout(timeout);
		timeout = resetAfter();
	});
}
//#endregion
//#region node_modules/bits-ui/dist/internal/dom-typeahead.svelte.js
var DOMTypeahead = class {
	#opts;
	#search;
	#onMatch = derived(() => {
		if (this.#opts.onMatch) return this.#opts.onMatch;
		return (node) => node.focus();
	});
	#getCurrentItem = derived(() => {
		if (this.#opts.getCurrentItem) return this.#opts.getCurrentItem;
		return this.#opts.getActiveElement;
	});
	constructor(opts) {
		this.#opts = opts;
		this.#search = boxAutoReset("", {
			afterMs: 1e3,
			getWindow: opts.getWindow
		});
		this.handleTypeaheadSearch = this.handleTypeaheadSearch.bind(this);
		this.resetTypeahead = this.resetTypeahead.bind(this);
	}
	handleTypeaheadSearch(key, candidates) {
		if (!candidates.length) return;
		this.#search.current = this.#search.current + key;
		const currentItem = this.#getCurrentItem()();
		const currentMatch = candidates.find((item) => item === currentItem)?.textContent?.trim() ?? "";
		const nextMatch = getNextMatch(candidates.map((item) => item.textContent?.trim() ?? ""), this.#search.current, currentMatch);
		const newItem = candidates.find((item) => item.textContent?.trim() === nextMatch);
		if (newItem) this.#onMatch()(newItem);
		return newItem;
	}
	resetTypeahead() {
		this.#search.current = "";
	}
	get search() {
		return this.#search.current;
	}
};
//#endregion
//#region node_modules/bits-ui/dist/internal/data-typeahead.svelte.js
var DataTypeahead = class {
	#opts;
	#candidateValues = derived(() => this.#opts.candidateValues());
	#search;
	constructor(opts) {
		this.#opts = opts;
		this.#search = boxAutoReset("", {
			afterMs: 1e3,
			getWindow: this.#opts.getWindow
		});
		this.handleTypeaheadSearch = this.handleTypeaheadSearch.bind(this);
		this.resetTypeahead = this.resetTypeahead.bind(this);
	}
	handleTypeaheadSearch(key) {
		if (!this.#opts.enabled() || !this.#candidateValues().length) return;
		this.#search.current = this.#search.current + key;
		const currentItem = this.#opts.getCurrentItem();
		const currentMatch = this.#candidateValues().find((item) => item === currentItem) ?? "";
		const nextMatch = getNextMatch(this.#candidateValues().map((item) => item ?? ""), this.#search.current, currentMatch);
		const newItem = this.#candidateValues().find((item) => item === nextMatch);
		if (newItem) this.#opts.onMatch(newItem);
		return newItem;
	}
	resetTypeahead() {
		this.#search.current = "";
	}
};
var FIRST_KEYS = [
	ARROW_DOWN,
	PAGE_UP,
	HOME
];
var LAST_KEYS = [
	ARROW_UP,
	PAGE_DOWN,
	"End"
];
var FIRST_LAST_KEYS = [...FIRST_KEYS, ...LAST_KEYS];
var selectAttrs = createBitsAttrs({
	component: "select",
	parts: [
		"trigger",
		"content",
		"item",
		"viewport",
		"scroll-up-button",
		"scroll-down-button",
		"group",
		"group-label",
		"separator",
		"arrow",
		"input",
		"content-wrapper",
		"item-text",
		"value"
	]
});
var SelectRootContext = new Context$1("Select.Root | Combobox.Root");
var SelectGroupContext = new Context$1("Select.Group | Combobox.Group");
var SelectContentContext = new Context$1("Select.Content | Combobox.Content");
var SelectBaseRootState = class {
	opts;
	touchedInput = false;
	inputNode = null;
	contentNode = null;
	contentPresence;
	viewportNode = null;
	triggerNode = null;
	valueNode = null;
	valueId = "";
	highlightedNode = null;
	#highlightedValue = derived(() => {
		if (!this.highlightedNode) return null;
		return this.highlightedNode.getAttribute("data-value");
	});
	get highlightedValue() {
		return this.#highlightedValue();
	}
	set highlightedValue($$value) {
		return this.#highlightedValue($$value);
	}
	#highlightedId = derived(() => {
		if (!this.highlightedNode) return void 0;
		return this.highlightedNode.id;
	});
	get highlightedId() {
		return this.#highlightedId();
	}
	set highlightedId($$value) {
		return this.#highlightedId($$value);
	}
	#highlightedLabel = derived(() => {
		if (!this.highlightedNode) return null;
		return this.highlightedNode.getAttribute("data-label");
	});
	get highlightedLabel() {
		return this.#highlightedLabel();
	}
	set highlightedLabel($$value) {
		return this.#highlightedLabel($$value);
	}
	contentIsPositioned = false;
	isUsingKeyboard = false;
	isCombobox = false;
	domContext = new DOMContext(() => null);
	constructor(opts) {
		this.opts = opts;
		this.isCombobox = opts.isCombobox;
		this.contentPresence = new PresenceManager({
			ref: boxWith(() => this.contentNode),
			open: this.opts.open,
			onComplete: () => {
				this.opts.onOpenChangeComplete.current(this.opts.open.current);
			}
		});
	}
	setHighlightedNode(node, initial = false) {
		this.highlightedNode = node;
		if (node && (this.isUsingKeyboard || initial)) this.scrollHighlightedNodeIntoView(node);
	}
	scrollHighlightedNodeIntoView(node) {
		if (!this.viewportNode || !this.contentIsPositioned) return;
		node.scrollIntoView({ block: this.opts.scrollAlignment.current });
	}
	getCandidateNodes() {
		const node = this.contentNode;
		if (!node) return [];
		return Array.from(node.querySelectorAll(`[${this.getBitsAttr("item")}]:not([data-disabled])`));
	}
	setHighlightedToFirstCandidate(initial = false) {
		this.setHighlightedNode(null);
		let nodes = this.getCandidateNodes();
		if (!nodes.length) return;
		if (this.viewportNode) {
			const viewportRect = this.viewportNode.getBoundingClientRect();
			nodes = nodes.filter((node) => {
				if (!this.viewportNode) return false;
				const nodeRect = node.getBoundingClientRect();
				return nodeRect.right <= viewportRect.right && nodeRect.left >= viewportRect.left && nodeRect.bottom <= viewportRect.bottom && nodeRect.top >= viewportRect.top;
			});
		}
		this.setHighlightedNode(nodes[0], initial);
	}
	getNodeByValue(value) {
		return this.getCandidateNodes().find((node) => node.dataset.value === value) ?? null;
	}
	/**
	* Resolves the display label for a value: `items` entry when present, otherwise the
	* mounted item's `data-label` or its text content.
	*/
	getLabelForValue(value) {
		if (value === "") return "";
		const fromItems = this.opts.items.current.find((item) => item.value === value)?.label;
		if (fromItems !== void 0) return fromItems;
		const node = this.getNodeByValue(value);
		if (node) {
			const dataLabel = node.getAttribute("data-label");
			if (dataLabel !== null && dataLabel !== "") return dataLabel;
			return node.textContent?.trim() ?? value;
		}
		return value;
	}
	setOpen(open) {
		this.opts.open.current = open;
	}
	toggleOpen() {
		this.opts.open.current = !this.opts.open.current;
	}
	handleOpen() {
		this.setOpen(true);
	}
	handleClose() {
		this.setHighlightedNode(null);
		this.setOpen(false);
	}
	toggleMenu() {
		this.toggleOpen();
	}
	getBitsAttr = (part) => {
		return selectAttrs.getAttr(part, this.isCombobox ? "combobox" : void 0);
	};
};
var SelectSingleRootState = class extends SelectBaseRootState {
	opts;
	isMulti = false;
	#hasValue = derived(() => this.opts.value.current !== "");
	get hasValue() {
		return this.#hasValue();
	}
	set hasValue($$value) {
		return this.#hasValue($$value);
	}
	#currentLabel = derived(() => {
		if (!this.opts.items.current.length) return "";
		return this.opts.items.current.find((item) => item.value === this.opts.value.current)?.label ?? "";
	});
	get currentLabel() {
		return this.#currentLabel();
	}
	set currentLabel($$value) {
		return this.#currentLabel($$value);
	}
	#candidateLabels = derived(() => {
		if (!this.opts.items.current.length) return [];
		return this.opts.items.current.filter((item) => !item.disabled).map((item) => item.label);
	});
	get candidateLabels() {
		return this.#candidateLabels();
	}
	set candidateLabels($$value) {
		return this.#candidateLabels($$value);
	}
	#dataTypeaheadEnabled = derived(() => {
		if (this.isMulti) return false;
		if (this.opts.items.current.length === 0) return false;
		return true;
	});
	get dataTypeaheadEnabled() {
		return this.#dataTypeaheadEnabled();
	}
	set dataTypeaheadEnabled($$value) {
		return this.#dataTypeaheadEnabled($$value);
	}
	constructor(opts) {
		super(opts);
		this.opts = opts;
		watch$1(() => this.opts.open.current, () => {
			if (!this.opts.open.current) return;
			this.setInitialHighlightedNode();
		});
	}
	includesItem(itemValue) {
		return this.opts.value.current === itemValue;
	}
	toggleItem(itemValue, itemLabel = itemValue) {
		const newValue = this.includesItem(itemValue) ? "" : itemValue;
		this.opts.value.current = newValue;
		if (newValue !== "") this.opts.inputValue.current = itemLabel;
	}
	setInitialHighlightedNode() {
		afterTick(() => {
			if (this.highlightedNode && this.domContext.getDocument().contains(this.highlightedNode)) return;
			if (this.opts.value.current !== "") {
				const node = this.getNodeByValue(this.opts.value.current);
				if (node) {
					this.setHighlightedNode(node, true);
					return;
				}
			}
			this.setHighlightedToFirstCandidate(true);
		});
	}
};
var SelectMultipleRootState = class extends SelectBaseRootState {
	opts;
	isMulti = true;
	#hasValue = derived(() => this.opts.value.current.length > 0);
	get hasValue() {
		return this.#hasValue();
	}
	set hasValue($$value) {
		return this.#hasValue($$value);
	}
	constructor(opts) {
		super(opts);
		this.opts = opts;
		watch$1(() => this.opts.open.current, () => {
			if (!this.opts.open.current) return;
			this.setInitialHighlightedNode();
		});
	}
	includesItem(itemValue) {
		return this.opts.value.current.includes(itemValue);
	}
	toggleItem(itemValue, itemLabel = itemValue) {
		if (this.includesItem(itemValue)) this.opts.value.current = this.opts.value.current.filter((v) => v !== itemValue);
		else this.opts.value.current = [...this.opts.value.current, itemValue];
		this.opts.inputValue.current = itemLabel;
	}
	setInitialHighlightedNode() {
		afterTick(() => {
			if (!this.domContext) return;
			if (this.highlightedNode && this.domContext.getDocument().contains(this.highlightedNode)) return;
			if (this.opts.value.current.length && this.opts.value.current[0] !== "") {
				const node = this.getNodeByValue(this.opts.value.current[0]);
				if (node) {
					this.setHighlightedNode(node, true);
					return;
				}
			}
			this.setHighlightedToFirstCandidate(true);
		});
	}
};
var SelectRootState = class {
	static create(props) {
		const { type, ...rest } = props;
		const rootState = type === "single" ? new SelectSingleRootState(rest) : new SelectMultipleRootState(rest);
		return SelectRootContext.set(rootState);
	}
};
var SelectTriggerState = class SelectTriggerState {
	static create(opts) {
		return new SelectTriggerState(opts, SelectRootContext.get());
	}
	opts;
	root;
	attachment;
	#domTypeahead;
	#dataTypeahead;
	constructor(opts, root) {
		this.opts = opts;
		this.root = root;
		this.attachment = attachRef(opts.ref, (v) => this.root.triggerNode = v);
		this.root.domContext = new DOMContext(opts.ref);
		this.#domTypeahead = new DOMTypeahead({
			getCurrentItem: () => this.root.highlightedNode,
			onMatch: (node) => {
				this.root.setHighlightedNode(node);
			},
			getActiveElement: () => this.root.domContext.getActiveElement(),
			getWindow: () => this.root.domContext.getWindow()
		});
		this.#dataTypeahead = new DataTypeahead({
			getCurrentItem: () => {
				if (this.root.isMulti) return "";
				return this.root.currentLabel;
			},
			onMatch: (label) => {
				if (this.root.isMulti) return;
				if (!this.root.opts.items.current) return;
				const matchedItem = this.root.opts.items.current.find((item) => item.label === label);
				if (!matchedItem) return;
				this.root.opts.value.current = matchedItem.value;
			},
			enabled: () => !this.root.isMulti && this.root.dataTypeaheadEnabled,
			candidateValues: () => this.root.isMulti ? [] : this.root.candidateLabels,
			getWindow: () => this.root.domContext.getWindow()
		});
		this.onkeydown = this.onkeydown.bind(this);
		this.onpointerdown = this.onpointerdown.bind(this);
		this.onpointerup = this.onpointerup.bind(this);
		this.onclick = this.onclick.bind(this);
	}
	#handleOpen() {
		this.root.opts.open.current = true;
		this.#dataTypeahead.resetTypeahead();
		this.#domTypeahead.resetTypeahead();
	}
	#handlePointerOpen(_) {
		this.#handleOpen();
	}
	/**
	* Logic used to handle keyboard selection/deselection.
	*
	* If it returns true, it means the item was selected and whatever is calling
	* this function should return early
	*
	*/
	#handleKeyboardSelection() {
		const isCurrentSelectedValue = this.root.highlightedValue === this.root.opts.value.current;
		if (!this.root.opts.allowDeselect.current && isCurrentSelectedValue && !this.root.isMulti) {
			this.root.handleClose();
			return true;
		}
		if (this.root.highlightedValue !== null) this.root.toggleItem(this.root.highlightedValue, this.root.highlightedLabel ?? void 0);
		if (!this.root.isMulti && !isCurrentSelectedValue) {
			this.root.handleClose();
			return true;
		}
		return false;
	}
	onkeydown(e) {
		this.root.isUsingKeyboard = true;
		if (e.key === "ArrowUp" || e.key === "ArrowDown") e.preventDefault();
		if (!this.root.opts.open.current) {
			if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown" || e.key === "ArrowUp") {
				e.preventDefault();
				this.root.handleOpen();
			} else if (!this.root.isMulti && this.root.dataTypeaheadEnabled) {
				this.#dataTypeahead.handleTypeaheadSearch(e.key);
				return;
			}
			if (this.root.hasValue) return;
			const candidateNodes = this.root.getCandidateNodes();
			if (!candidateNodes.length) return;
			if (e.key === "ArrowDown") {
				const firstCandidate = candidateNodes[0];
				this.root.setHighlightedNode(firstCandidate);
			} else if (e.key === "ArrowUp") {
				const lastCandidate = candidateNodes[candidateNodes.length - 1];
				this.root.setHighlightedNode(lastCandidate);
			}
			return;
		}
		if (e.key === "Tab") {
			this.root.handleClose();
			return;
		}
		if ((e.key === "Enter" || e.key === " " && this.#domTypeahead.search === "") && !e.isComposing) {
			e.preventDefault();
			if (this.#handleKeyboardSelection()) return;
		}
		if (e.key === "ArrowUp" && e.altKey) this.root.handleClose();
		if (FIRST_LAST_KEYS.includes(e.key)) {
			e.preventDefault();
			const candidateNodes = this.root.getCandidateNodes();
			const currHighlightedNode = this.root.highlightedNode;
			const currIndex = currHighlightedNode ? candidateNodes.indexOf(currHighlightedNode) : -1;
			const loop = this.root.opts.loop.current;
			let nextItem;
			if (e.key === "ArrowDown") nextItem = next(candidateNodes, currIndex, loop);
			else if (e.key === "ArrowUp") nextItem = prev(candidateNodes, currIndex, loop);
			else if (e.key === "PageDown") nextItem = forward(candidateNodes, currIndex, 10, loop);
			else if (e.key === "PageUp") nextItem = backward(candidateNodes, currIndex, 10, loop);
			else if (e.key === "Home") nextItem = candidateNodes[0];
			else if (e.key === "End") nextItem = candidateNodes[candidateNodes.length - 1];
			if (!nextItem) return;
			this.root.setHighlightedNode(nextItem);
			return;
		}
		const isModifierKey = e.ctrlKey || e.altKey || e.metaKey;
		const isCharacterKey = e.key.length === 1;
		const isSpaceKey = e.key === " ";
		const candidateNodes = this.root.getCandidateNodes();
		if (e.key === "Tab") return;
		if (!isModifierKey && (isCharacterKey || isSpaceKey)) {
			if (!this.#domTypeahead.handleTypeaheadSearch(e.key, candidateNodes) && isSpaceKey) {
				e.preventDefault();
				this.#handleKeyboardSelection();
			}
			return;
		}
		if (!this.root.highlightedNode) this.root.setHighlightedToFirstCandidate();
	}
	onclick(e) {
		e.currentTarget.focus();
	}
	onpointerdown(e) {
		if (this.root.opts.disabled.current) return;
		if (e.pointerType === "touch") return e.preventDefault();
		const target = e.target;
		if (target?.hasPointerCapture(e.pointerId)) target?.releasePointerCapture(e.pointerId);
		if (e.button === 0 && e.ctrlKey === false) if (this.root.opts.open.current === false) this.#handlePointerOpen(e);
		else this.root.handleClose();
	}
	onpointerup(e) {
		if (this.root.opts.disabled.current) return;
		e.preventDefault();
		if (e.pointerType === "touch") if (this.root.opts.open.current === false) this.#handlePointerOpen(e);
		else this.root.handleClose();
	}
	#props = derived(() => ({
		id: this.opts.id.current,
		disabled: this.root.opts.disabled.current ? true : void 0,
		"aria-haspopup": "listbox",
		"aria-expanded": boolToStr(this.root.opts.open.current),
		"aria-activedescendant": this.root.highlightedId,
		"data-state": getDataOpenClosed(this.root.opts.open.current),
		"data-disabled": boolToEmptyStrOrUndef(this.root.opts.disabled.current),
		"data-placeholder": this.root.hasValue ? void 0 : "",
		[this.root.getBitsAttr("trigger")]: "",
		onpointerdown: this.onpointerdown,
		onkeydown: this.onkeydown,
		onclick: this.onclick,
		onpointerup: this.onpointerup,
		...this.attachment
	}));
	get props() {
		return this.#props();
	}
	set props($$value) {
		return this.#props($$value);
	}
};
var SelectContentState = class SelectContentState {
	static create(opts) {
		return SelectContentContext.set(new SelectContentState(opts, SelectRootContext.get()));
	}
	opts;
	root;
	attachment;
	isPositioned = false;
	domContext;
	constructor(opts, root) {
		this.opts = opts;
		this.root = root;
		this.attachment = attachRef(opts.ref, (v) => this.root.contentNode = v);
		this.domContext = new DOMContext(this.opts.ref);
		if (this.root.domContext === null) this.root.domContext = this.domContext;
		watch$1(() => this.root.opts.open.current, () => {
			if (this.root.opts.open.current) return;
			this.root.contentIsPositioned = false;
			this.isPositioned = false;
		});
		watch$1([() => this.isPositioned, () => this.root.highlightedNode], () => {
			if (!this.isPositioned || !this.root.highlightedNode) return;
			this.root.scrollHighlightedNodeIntoView(this.root.highlightedNode);
		});
		this.onpointermove = this.onpointermove.bind(this);
	}
	onpointermove(_) {
		this.root.isUsingKeyboard = false;
	}
	#styles = derived(() => {
		return getFloatingContentCSSVars(this.root.isCombobox ? "combobox" : "select");
	});
	onInteractOutside = (e) => {
		if (e.target === this.root.triggerNode || e.target === this.root.inputNode) {
			e.preventDefault();
			return;
		}
		this.opts.onInteractOutside.current(e);
		if (e.defaultPrevented) return;
		this.root.handleClose();
	};
	onEscapeKeydown = (e) => {
		this.opts.onEscapeKeydown.current(e);
		if (e.defaultPrevented) return;
		this.root.handleClose();
	};
	onOpenAutoFocus = (e) => {
		e.preventDefault();
	};
	onCloseAutoFocus = (e) => {
		e.preventDefault();
	};
	get shouldRender() {
		return this.root.contentPresence.shouldRender;
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
		role: "listbox",
		"aria-multiselectable": this.root.isMulti ? "true" : void 0,
		"data-state": getDataOpenClosed(this.root.opts.open.current),
		...getDataTransitionAttrs(this.root.contentPresence.transitionStatus),
		[this.root.getBitsAttr("content")]: "",
		style: {
			display: "flex",
			flexDirection: "column",
			outline: "none",
			boxSizing: "border-box",
			pointerEvents: "auto",
			...this.#styles()
		},
		onpointermove: this.onpointermove,
		...this.attachment
	}));
	get props() {
		return this.#props();
	}
	set props($$value) {
		return this.#props($$value);
	}
	popperProps = {
		onInteractOutside: this.onInteractOutside,
		onEscapeKeydown: this.onEscapeKeydown,
		onOpenAutoFocus: this.onOpenAutoFocus,
		onCloseAutoFocus: this.onCloseAutoFocus,
		trapFocus: false,
		loop: false,
		onPlaced: () => {
			if (this.root.opts.open.current) {
				this.root.contentIsPositioned = true;
				this.isPositioned = true;
			}
		}
	};
};
var SelectItemState = class SelectItemState {
	static create(opts) {
		return new SelectItemState(opts, SelectRootContext.get());
	}
	opts;
	root;
	attachment;
	#isSelected = derived(() => this.root.includesItem(this.opts.value.current));
	get isSelected() {
		return this.#isSelected();
	}
	set isSelected($$value) {
		return this.#isSelected($$value);
	}
	#isHighlighted = derived(() => this.root.highlightedValue === this.opts.value.current);
	get isHighlighted() {
		return this.#isHighlighted();
	}
	set isHighlighted($$value) {
		return this.#isHighlighted($$value);
	}
	prevHighlighted = new Previous(() => this.isHighlighted);
	mounted = false;
	constructor(opts, root) {
		this.opts = opts;
		this.root = root;
		this.attachment = attachRef(opts.ref);
		watch$1([() => this.isHighlighted, () => this.prevHighlighted.current], () => {
			if (this.isHighlighted) this.opts.onHighlight.current();
			else if (this.prevHighlighted.current) this.opts.onUnhighlight.current();
		});
		watch$1(() => this.mounted, () => {
			if (!this.mounted) return;
			this.root.setInitialHighlightedNode();
		});
		this.onpointerdown = this.onpointerdown.bind(this);
		this.onpointerup = this.onpointerup.bind(this);
		this.onpointermove = this.onpointermove.bind(this);
	}
	handleSelect() {
		if (this.opts.disabled.current) return;
		const isCurrentSelectedValue = this.opts.value.current === this.root.opts.value.current;
		if (!this.root.opts.allowDeselect.current && isCurrentSelectedValue && !this.root.isMulti) {
			this.root.handleClose();
			return;
		}
		this.root.toggleItem(this.opts.value.current, this.opts.label.current);
		if (!this.root.isMulti && !isCurrentSelectedValue) this.root.handleClose();
	}
	#snippetProps = derived(() => ({
		selected: this.isSelected,
		highlighted: this.isHighlighted
	}));
	get snippetProps() {
		return this.#snippetProps();
	}
	set snippetProps($$value) {
		return this.#snippetProps($$value);
	}
	onpointerdown(e) {
		e.preventDefault();
	}
	/**
	* Using `pointerup` instead of `click` allows power users to pointerdown
	* the trigger, then release pointerup on an item to select it vs having to do
	* multiple clicks.
	*/
	onpointerup(e) {
		if (e.defaultPrevented || !this.opts.ref.current) return;
		/**
		* For one reason or another, when it's a touch pointer and _not_ on IOS,
		* we need to listen for the immediate click event to handle the selection,
		* otherwise a click event will fire on the element _behind_ the item.
		*/
		if (e.pointerType === "touch" && !isIOS) {
			on(this.opts.ref.current, "click", () => {
				this.handleSelect();
				this.root.setHighlightedNode(this.opts.ref.current);
			}, { once: true });
			return;
		}
		e.preventDefault();
		this.handleSelect();
		if (e.pointerType === "touch") this.root.setHighlightedNode(this.opts.ref.current);
	}
	onpointermove(e) {
		/**
		* We don't want to highlight items on touch devices when scrolling,
		* as this is confusing behavior, so we return here and instead handle
		* the highlighting on the `pointerup` (or following `click`) event for
		* touch devices only.
		*/
		if (e.pointerType === "touch") return;
		if (this.root.highlightedNode !== this.opts.ref.current) this.root.setHighlightedNode(this.opts.ref.current);
	}
	#props = derived(() => ({
		id: this.opts.id.current,
		role: "option",
		"aria-selected": this.root.includesItem(this.opts.value.current) ? "true" : void 0,
		"data-value": this.opts.value.current,
		"data-disabled": boolToEmptyStrOrUndef(this.opts.disabled.current),
		"data-highlighted": this.root.highlightedValue === this.opts.value.current && !this.opts.disabled.current ? "" : void 0,
		"data-selected": this.root.includesItem(this.opts.value.current) ? "" : void 0,
		"data-label": this.opts.label.current,
		[this.root.getBitsAttr("item")]: "",
		onpointermove: this.onpointermove,
		onpointerdown: this.onpointerdown,
		onpointerup: this.onpointerup,
		...this.attachment
	}));
	get props() {
		return this.#props();
	}
	set props($$value) {
		return this.#props($$value);
	}
};
var SelectGroupState = class SelectGroupState {
	static create(opts) {
		return SelectGroupContext.set(new SelectGroupState(opts, SelectRootContext.get()));
	}
	opts;
	root;
	labelNode = null;
	attachment;
	constructor(opts, root) {
		this.opts = opts;
		this.root = root;
		this.attachment = attachRef(opts.ref);
	}
	#props = derived(() => ({
		id: this.opts.id.current,
		role: "group",
		[this.root.getBitsAttr("group")]: "",
		"aria-labelledby": this.labelNode?.id ?? void 0,
		...this.attachment
	}));
	get props() {
		return this.#props();
	}
	set props($$value) {
		return this.#props($$value);
	}
};
var SelectGroupHeadingState = class SelectGroupHeadingState {
	static create(opts) {
		return new SelectGroupHeadingState(opts, SelectGroupContext.get());
	}
	opts;
	group;
	attachment;
	constructor(opts, group) {
		this.opts = opts;
		this.group = group;
		this.attachment = attachRef(opts.ref, (v) => this.group.labelNode = v);
	}
	#props = derived(() => ({
		id: this.opts.id.current,
		[this.group.root.getBitsAttr("group-label")]: "",
		...this.attachment
	}));
	get props() {
		return this.#props();
	}
	set props($$value) {
		return this.#props($$value);
	}
};
var SelectHiddenInputState = class SelectHiddenInputState {
	static create(opts) {
		return new SelectHiddenInputState(opts, SelectRootContext.get());
	}
	opts;
	root;
	#shouldRender = derived(() => this.root.opts.name.current !== "");
	get shouldRender() {
		return this.#shouldRender();
	}
	set shouldRender($$value) {
		return this.#shouldRender($$value);
	}
	constructor(opts, root) {
		this.opts = opts;
		this.root = root;
		this.onfocus = this.onfocus.bind(this);
	}
	onfocus(e) {
		e.preventDefault();
		if (!this.root.isCombobox) this.root.triggerNode?.focus();
		else this.root.inputNode?.focus();
	}
	#props = derived(() => ({
		disabled: boolToTrueOrUndef(this.root.opts.disabled.current),
		required: boolToTrueOrUndef(this.root.opts.required.current),
		name: this.root.opts.name.current,
		value: this.opts.value.current,
		onfocus: this.onfocus
	}));
	get props() {
		return this.#props();
	}
	set props($$value) {
		return this.#props($$value);
	}
};
var SelectViewportState = class SelectViewportState {
	static create(opts) {
		return new SelectViewportState(opts, SelectContentContext.get());
	}
	opts;
	content;
	root;
	attachment;
	prevScrollTop = 0;
	constructor(opts, content) {
		this.opts = opts;
		this.content = content;
		this.root = content.root;
		this.attachment = attachRef(opts.ref, (v) => {
			this.root.viewportNode = v;
		});
	}
	#props = derived(() => ({
		id: this.opts.id.current,
		role: "presentation",
		[this.root.getBitsAttr("viewport")]: "",
		style: {
			position: "relative",
			flex: 1,
			overflow: "auto"
		},
		...this.attachment
	}));
	get props() {
		return this.#props();
	}
	set props($$value) {
		return this.#props($$value);
	}
};
var SelectScrollButtonImplState = class {
	opts;
	content;
	root;
	attachment;
	autoScrollTimer = null;
	userScrollTimer = -1;
	isUserScrolling = false;
	onAutoScroll = noop$1;
	mounted = false;
	constructor(opts, content) {
		this.opts = opts;
		this.content = content;
		this.root = content.root;
		this.attachment = attachRef(opts.ref);
		watch$1([() => this.mounted], () => {
			if (!this.mounted) {
				this.isUserScrolling = false;
				return;
			}
			if (this.isUserScrolling) return;
		});
		this.onpointerdown = this.onpointerdown.bind(this);
		this.onpointermove = this.onpointermove.bind(this);
		this.onpointerleave = this.onpointerleave.bind(this);
	}
	handleUserScroll() {
		this.content.domContext.clearTimeout(this.userScrollTimer);
		this.isUserScrolling = true;
		this.userScrollTimer = this.content.domContext.setTimeout(() => {
			this.isUserScrolling = false;
		}, 200);
	}
	clearAutoScrollInterval() {
		if (this.autoScrollTimer === null) return;
		this.content.domContext.clearTimeout(this.autoScrollTimer);
		this.autoScrollTimer = null;
	}
	onpointerdown(_) {
		if (this.autoScrollTimer !== null) return;
		const autoScroll = (tick) => {
			this.onAutoScroll();
			this.autoScrollTimer = this.content.domContext.setTimeout(() => autoScroll(tick + 1), this.opts.delay.current(tick));
		};
		this.autoScrollTimer = this.content.domContext.setTimeout(() => autoScroll(1), this.opts.delay.current(0));
	}
	onpointermove(e) {
		this.onpointerdown(e);
	}
	onpointerleave(_) {
		this.clearAutoScrollInterval();
	}
	#props = derived(() => ({
		id: this.opts.id.current,
		"aria-hidden": boolToStrTrueOrUndef(true),
		style: { flexShrink: 0 },
		onpointerdown: this.onpointerdown,
		onpointermove: this.onpointermove,
		onpointerleave: this.onpointerleave,
		...this.attachment
	}));
	get props() {
		return this.#props();
	}
	set props($$value) {
		return this.#props($$value);
	}
};
var SelectScrollDownButtonState = class SelectScrollDownButtonState {
	static create(opts) {
		return new SelectScrollDownButtonState(new SelectScrollButtonImplState(opts, SelectContentContext.get()));
	}
	scrollButtonState;
	content;
	root;
	canScrollDown = false;
	scrollIntoViewTimer = null;
	constructor(scrollButtonState) {
		this.scrollButtonState = scrollButtonState;
		this.content = scrollButtonState.content;
		this.root = scrollButtonState.root;
		this.scrollButtonState.onAutoScroll = this.handleAutoScroll;
		watch$1([() => this.root.viewportNode, () => this.content.isPositioned], () => {
			if (!this.root.viewportNode || !this.content.isPositioned) return;
			this.handleScroll(true);
			return on(this.root.viewportNode, "scroll", () => this.handleScroll());
		});
		/**
		* If the input value changes, this means that the filtered items may have changed,
		* so we need to re-evaluate the scroll-ability of the list.
		*/
		watch$1([
			() => this.root.opts.inputValue.current,
			() => this.root.viewportNode,
			() => this.content.isPositioned
		], () => {
			if (!this.root.viewportNode || !this.content.isPositioned) return;
			this.handleScroll(true);
		});
		watch$1(() => this.scrollButtonState.mounted, () => {
			if (!this.scrollButtonState.mounted) return;
			if (this.scrollIntoViewTimer) clearTimeout(this.scrollIntoViewTimer);
			this.scrollIntoViewTimer = afterSleep(5, () => {
				const activeItem = this.root.highlightedNode;
				if (!activeItem) return;
				this.root.scrollHighlightedNodeIntoView(activeItem);
			});
		});
	}
	/**
	* @param manual - if true, it means the function was invoked manually outside of an event
	* listener, so we don't call `handleUserScroll` to prevent the auto scroll from kicking in.
	*/
	handleScroll = (manual = false) => {
		if (!manual) this.scrollButtonState.handleUserScroll();
		if (!this.root.viewportNode) return;
		const maxScroll = this.root.viewportNode.scrollHeight - this.root.viewportNode.clientHeight;
		const paddingTop = Number.parseInt(getComputedStyle(this.root.viewportNode).paddingTop, 10);
		this.canScrollDown = Math.ceil(this.root.viewportNode.scrollTop) < maxScroll - paddingTop;
	};
	handleAutoScroll = () => {
		const viewport = this.root.viewportNode;
		const selectedItem = this.root.highlightedNode;
		if (!viewport || !selectedItem) return;
		viewport.scrollTop = viewport.scrollTop + selectedItem.offsetHeight;
	};
	#props = derived(() => ({
		...this.scrollButtonState.props,
		[this.root.getBitsAttr("scroll-down-button")]: ""
	}));
	get props() {
		return this.#props();
	}
	set props($$value) {
		return this.#props($$value);
	}
};
var SelectScrollUpButtonState = class SelectScrollUpButtonState {
	static create(opts) {
		return new SelectScrollUpButtonState(new SelectScrollButtonImplState(opts, SelectContentContext.get()));
	}
	scrollButtonState;
	content;
	root;
	canScrollUp = false;
	constructor(scrollButtonState) {
		this.scrollButtonState = scrollButtonState;
		this.content = scrollButtonState.content;
		this.root = scrollButtonState.root;
		this.scrollButtonState.onAutoScroll = this.handleAutoScroll;
		watch$1([() => this.root.viewportNode, () => this.content.isPositioned], () => {
			if (!this.root.viewportNode || !this.content.isPositioned) return;
			this.handleScroll(true);
			return on(this.root.viewportNode, "scroll", () => this.handleScroll());
		});
	}
	/**
	* @param manual - if true, it means the function was invoked manually outside of an event
	* listener, so we don't call `handleUserScroll` to prevent the auto scroll from kicking in.
	*/
	handleScroll = (manual = false) => {
		if (!manual) this.scrollButtonState.handleUserScroll();
		if (!this.root.viewportNode) return;
		const paddingTop = Number.parseInt(getComputedStyle(this.root.viewportNode).paddingTop, 10);
		this.canScrollUp = this.root.viewportNode.scrollTop - paddingTop > .1;
	};
	handleAutoScroll = () => {
		if (!this.root.viewportNode || !this.root.highlightedNode) return;
		this.root.viewportNode.scrollTop = this.root.viewportNode.scrollTop - this.root.highlightedNode.offsetHeight;
	};
	#props = derived(() => ({
		...this.scrollButtonState.props,
		[this.root.getBitsAttr("scroll-up-button")]: ""
	}));
	get props() {
		return this.#props();
	}
	set props($$value) {
		return this.#props($$value);
	}
};
//#endregion
//#region node_modules/bits-ui/dist/bits/select/components/select-hidden-input.svelte
function Select_hidden_input($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { value = void 0, autocomplete } = $$props;
		const hiddenInputState = SelectHiddenInputState.create({ value: boxWith(() => value) });
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (hiddenInputState.shouldRender) {
				$$renderer.push("<!--[0-->");
				Hidden_input($$renderer, spread_props([hiddenInputState.props, {
					autocomplete,
					get value() {
						return value;
					},
					set value($$value) {
						value = $$value;
						$$settled = false;
					}
				}]));
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]-->`);
		}
		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);
		$$renderer.subsume($$inner_renderer);
		bind_props($$props, { value });
	});
}
//#endregion
//#region node_modules/bits-ui/dist/bits/utilities/floating-layer/components/floating-layer-anchor.svelte
function Floating_layer_anchor($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { id, children, virtualEl, ref, tooltip = false } = $$props;
		FloatingAnchorState.create({
			id: boxWith(() => id),
			virtualEl: boxWith(() => virtualEl),
			ref
		}, tooltip);
		children?.($$renderer);
		$$renderer.push(`<!---->`);
	});
}
//#endregion
//#region node_modules/bits-ui/dist/bits/select/components/select-content.svelte
function Select_content$1($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const uid = props_id($$renderer);
		let { id = createId(uid), ref = null, forceMount = false, side = "bottom", onInteractOutside = noop$1, onEscapeKeydown = noop$1, children, child, preventScroll = false, style, $$slots, $$events, ...restProps } = $$props;
		const contentState = SelectContentState.create({
			id: boxWith(() => id),
			ref: boxWith(() => ref, (v) => ref = v),
			onInteractOutside: boxWith(() => onInteractOutside),
			onEscapeKeydown: boxWith(() => onEscapeKeydown)
		});
		const mergedProps = derived(() => mergeProps(restProps, contentState.props));
		if (forceMount) {
			$$renderer.push("<!--[0-->");
			{
				function popper($$renderer, { props, wrapperProps }) {
					const finalProps = mergeProps(props, { style: contentState.props.style }, { style });
					if (child) {
						$$renderer.push("<!--[0-->");
						child($$renderer, {
							props: finalProps,
							wrapperProps,
							...contentState.snippetProps
						});
						$$renderer.push(`<!---->`);
					} else {
						$$renderer.push("<!--[-1-->");
						$$renderer.push(`<div${attributes({ ...wrapperProps })}><div${attributes({ ...finalProps })}>`);
						children?.($$renderer);
						$$renderer.push(`<!----></div></div>`);
					}
					$$renderer.push(`<!--]-->`);
				}
				Popper_layer_force_mount($$renderer, spread_props([
					mergedProps(),
					contentState.popperProps,
					{
						ref: contentState.opts.ref,
						side,
						enabled: contentState.root.opts.open.current,
						id,
						preventScroll,
						forceMount: true,
						shouldRender: contentState.shouldRender,
						popper,
						$$slots: { popper: true }
					}
				]));
			}
		} else if (!forceMount) {
			$$renderer.push("<!--[1-->");
			{
				function popper($$renderer, { props, wrapperProps }) {
					const finalProps = mergeProps(props, { style: contentState.props.style }, { style });
					if (child) {
						$$renderer.push("<!--[0-->");
						child($$renderer, {
							props: finalProps,
							wrapperProps,
							...contentState.snippetProps
						});
						$$renderer.push(`<!---->`);
					} else {
						$$renderer.push("<!--[-1-->");
						$$renderer.push(`<div${attributes({ ...wrapperProps })}><div${attributes({ ...finalProps })}>`);
						children?.($$renderer);
						$$renderer.push(`<!----></div></div>`);
					}
					$$renderer.push(`<!--]-->`);
				}
				Popper_layer($$renderer, spread_props([
					mergedProps(),
					contentState.popperProps,
					{
						ref: contentState.opts.ref,
						side,
						open: contentState.root.opts.open.current,
						id,
						preventScroll,
						forceMount: false,
						shouldRender: contentState.shouldRender,
						popper,
						$$slots: { popper: true }
					}
				]));
			}
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region node_modules/bits-ui/dist/bits/utilities/mounted.svelte
function Mounted($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { mounted = false, onMountedChange = noop$1 } = $$props;
		bind_props($$props, { mounted });
	});
}
//#endregion
//#region node_modules/bits-ui/dist/bits/select/components/select-item.svelte
function Select_item$1($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const uid = props_id($$renderer);
		let { id = createId(uid), ref = null, value, label = value, disabled = false, children, child, onHighlight = noop$1, onUnhighlight = noop$1, $$slots, $$events, ...restProps } = $$props;
		const itemState = SelectItemState.create({
			id: boxWith(() => id),
			ref: boxWith(() => ref, (v) => ref = v),
			value: boxWith(() => value),
			disabled: boxWith(() => disabled),
			label: boxWith(() => label),
			onHighlight: boxWith(() => onHighlight),
			onUnhighlight: boxWith(() => onUnhighlight)
		});
		const mergedProps = derived(() => mergeProps(restProps, itemState.props));
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (child) {
				$$renderer.push("<!--[0-->");
				child($$renderer, {
					props: mergedProps(),
					...itemState.snippetProps
				});
				$$renderer.push(`<!---->`);
			} else {
				$$renderer.push("<!--[-1-->");
				$$renderer.push(`<div${attributes({ ...mergedProps() })}>`);
				children?.($$renderer, itemState.snippetProps);
				$$renderer.push(`<!----></div>`);
			}
			$$renderer.push(`<!--]--> `);
			Mounted($$renderer, {
				get mounted() {
					return itemState.mounted;
				},
				set mounted($$value) {
					itemState.mounted = $$value;
					$$settled = false;
				}
			});
			$$renderer.push(`<!---->`);
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
//#region node_modules/bits-ui/dist/bits/select/components/select-group.svelte
function Select_group$1($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const uid = props_id($$renderer);
		let { id = createId(uid), ref = null, children, child, $$slots, $$events, ...restProps } = $$props;
		const groupState = SelectGroupState.create({
			id: boxWith(() => id),
			ref: boxWith(() => ref, (v) => ref = v)
		});
		const mergedProps = derived(() => mergeProps(restProps, groupState.props));
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
//#region node_modules/bits-ui/dist/bits/select/components/select-group-heading.svelte
function Select_group_heading$1($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const uid = props_id($$renderer);
		let { id = createId(uid), ref = null, child, children, $$slots, $$events, ...restProps } = $$props;
		const groupHeadingState = SelectGroupHeadingState.create({
			id: boxWith(() => id),
			ref: boxWith(() => ref, (v) => ref = v)
		});
		const mergedProps = derived(() => mergeProps(restProps, groupHeadingState.props));
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
//#region node_modules/bits-ui/dist/bits/select/components/select-viewport.svelte
function Select_viewport($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const uid = props_id($$renderer);
		let { id = createId(uid), ref = null, children, child, $$slots, $$events, ...restProps } = $$props;
		const viewportState = SelectViewportState.create({
			id: boxWith(() => id),
			ref: boxWith(() => ref, (v) => ref = v)
		});
		const mergedProps = derived(() => mergeProps(restProps, viewportState.props));
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
//#region node_modules/bits-ui/dist/bits/select/components/select-scroll-down-button.svelte
function Select_scroll_down_button$1($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const uid = props_id($$renderer);
		let { id = createId(uid), ref = null, delay = () => 50, child, children, $$slots, $$events, ...restProps } = $$props;
		const scrollButtonState = SelectScrollDownButtonState.create({
			id: boxWith(() => id),
			ref: boxWith(() => ref, (v) => ref = v),
			delay: boxWith(() => delay)
		});
		const mergedProps = derived(() => mergeProps(restProps, scrollButtonState.props));
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (scrollButtonState.canScrollDown) {
				$$renderer.push("<!--[0-->");
				Mounted($$renderer, {
					get mounted() {
						return scrollButtonState.scrollButtonState.mounted;
					},
					set mounted($$value) {
						scrollButtonState.scrollButtonState.mounted = $$value;
						$$settled = false;
					}
				});
				$$renderer.push(`<!----> `);
				if (child) {
					$$renderer.push("<!--[0-->");
					child($$renderer, { props: restProps });
					$$renderer.push(`<!---->`);
				} else {
					$$renderer.push("<!--[-1-->");
					$$renderer.push(`<div${attributes({ ...mergedProps() })}>`);
					children?.($$renderer);
					$$renderer.push(`<!----></div>`);
				}
				$$renderer.push(`<!--]-->`);
			} else $$renderer.push("<!--[-1-->");
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
//#region node_modules/bits-ui/dist/bits/select/components/select-scroll-up-button.svelte
function Select_scroll_up_button$1($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const uid = props_id($$renderer);
		let { id = createId(uid), ref = null, delay = () => 50, child, children, $$slots, $$events, ...restProps } = $$props;
		const scrollButtonState = SelectScrollUpButtonState.create({
			id: boxWith(() => id),
			ref: boxWith(() => ref, (v) => ref = v),
			delay: boxWith(() => delay)
		});
		const mergedProps = derived(() => mergeProps(restProps, scrollButtonState.props));
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (scrollButtonState.canScrollUp) {
				$$renderer.push("<!--[0-->");
				Mounted($$renderer, {
					get mounted() {
						return scrollButtonState.scrollButtonState.mounted;
					},
					set mounted($$value) {
						scrollButtonState.scrollButtonState.mounted = $$value;
						$$settled = false;
					}
				});
				$$renderer.push(`<!----> `);
				if (child) {
					$$renderer.push("<!--[0-->");
					child($$renderer, { props: restProps });
					$$renderer.push(`<!---->`);
				} else {
					$$renderer.push("<!--[-1-->");
					$$renderer.push(`<div${attributes({ ...mergedProps() })}>`);
					children?.($$renderer);
					$$renderer.push(`<!----></div>`);
				}
				$$renderer.push(`<!--]-->`);
			} else $$renderer.push("<!--[-1-->");
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
//#region node_modules/bits-ui/dist/bits/select/components/select.svelte
function Select$1($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { value = void 0, onValueChange = noop$1, name = "", disabled = false, type, open = false, onOpenChange = noop$1, onOpenChangeComplete = noop$1, loop = false, scrollAlignment = "nearest", required = false, items = [], allowDeselect = false, autocomplete, children } = $$props;
		function handleDefaultValue() {
			if (value !== void 0) return;
			value = type === "single" ? "" : [];
		}
		handleDefaultValue();
		watch$1.pre(() => value, () => {
			handleDefaultValue();
		});
		let inputValue = "";
		const rootState = SelectRootState.create({
			type,
			value: boxWith(() => value, (v) => {
				value = v;
				onValueChange(v);
			}),
			disabled: boxWith(() => disabled),
			required: boxWith(() => required),
			open: boxWith(() => open, (v) => {
				open = v;
				onOpenChange(v);
			}),
			loop: boxWith(() => loop),
			scrollAlignment: boxWith(() => scrollAlignment),
			name: boxWith(() => name),
			isCombobox: false,
			items: boxWith(() => items),
			allowDeselect: boxWith(() => allowDeselect),
			inputValue: boxWith(() => inputValue, (v) => inputValue = v),
			onOpenChangeComplete: boxWith(() => onOpenChangeComplete)
		});
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			Floating_layer($$renderer, {
				children: ($$renderer) => {
					children?.($$renderer);
					$$renderer.push(`<!---->`);
				},
				$$slots: { default: true }
			});
			$$renderer.push(`<!----> `);
			if (Array.isArray(rootState.opts.value.current)) {
				$$renderer.push("<!--[0-->");
				if (rootState.opts.value.current.length === 0) {
					$$renderer.push("<!--[0-->");
					Select_hidden_input($$renderer, { autocomplete });
				} else {
					$$renderer.push("<!--[-1-->");
					$$renderer.push(`<!--[-->`);
					const each_array = ensure_array_like(rootState.opts.value.current);
					for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
						let item = each_array[$$index];
						Select_hidden_input($$renderer, {
							value: item,
							autocomplete
						});
					}
					$$renderer.push(`<!--]-->`);
				}
				$$renderer.push(`<!--]-->`);
			} else {
				$$renderer.push("<!--[-1-->");
				Select_hidden_input($$renderer, {
					autocomplete,
					get value() {
						return rootState.opts.value.current;
					},
					set value($$value) {
						rootState.opts.value.current = $$value;
						$$settled = false;
					}
				});
			}
			$$renderer.push(`<!--]-->`);
		}
		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);
		$$renderer.subsume($$inner_renderer);
		bind_props($$props, {
			value,
			open
		});
	});
}
//#endregion
//#region node_modules/bits-ui/dist/bits/select/components/select-trigger.svelte
function Select_trigger$1($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const uid = props_id($$renderer);
		let { id = createId(uid), ref = null, child, children, type = "button", $$slots, $$events, ...restProps } = $$props;
		const triggerState = SelectTriggerState.create({
			id: boxWith(() => id),
			ref: boxWith(() => ref, (v) => ref = v)
		});
		const mergedProps = derived(() => mergeProps(restProps, triggerState.props, { type }));
		if (Floating_layer_anchor) {
			$$renderer.push("<!--[-->");
			Floating_layer_anchor($$renderer, {
				id,
				ref: triggerState.opts.ref,
				children: ($$renderer) => {
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
				},
				$$slots: { default: true }
			});
			$$renderer.push("<!--]-->");
		} else {
			$$renderer.push("<!--[!-->");
			$$renderer.push("<!--]-->");
		}
		bind_props($$props, { ref });
	});
}
//#endregion
//#region node_modules/@lucide/svelte/dist/icons/chevron-down.svelte
function Chevron_down($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "chevron-down" },
		props,
		{ iconNode: [["path", { "d": "m6 9 6 6 6-6" }]] }
	]));
}
//#endregion
//#region node_modules/@lucide/svelte/dist/icons/chevron-up.svelte
function Chevron_up($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "chevron-up" },
		props,
		{ iconNode: [["path", { "d": "m18 15-6-6-6 6" }]] }
	]));
}
//#endregion
//#region node_modules/@lucide/svelte/dist/icons/file.svelte
function File($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "file" },
		props,
		{ iconNode: [["path", { "d": "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" }], ["path", { "d": "M14 2v5a1 1 0 0 0 1 1h5" }]] }
	]));
}
//#endregion
//#region node_modules/@lucide/svelte/dist/icons/folder.svelte
function Folder($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "folder" },
		props,
		{ iconNode: [["path", { "d": "M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" }]] }
	]));
}
//#endregion
//#region node_modules/@lucide/svelte/dist/icons/globe.svelte
function Globe($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "globe" },
		props,
		{ iconNode: [
			["circle", {
				"cx": "12",
				"cy": "12",
				"r": "10"
			}],
			["path", { "d": "M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" }],
			["path", { "d": "M2 12h20" }]
		] }
	]));
}
//#endregion
//#region node_modules/@lucide/svelte/dist/icons/image.svelte
function Image($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "image" },
		props,
		{ iconNode: [
			["rect", {
				"width": "18",
				"height": "18",
				"x": "3",
				"y": "3",
				"rx": "2",
				"ry": "2"
			}],
			["circle", {
				"cx": "9",
				"cy": "9",
				"r": "2"
			}],
			["path", { "d": "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" }]
		] }
	]));
}
//#endregion
//#region node_modules/@lucide/svelte/dist/icons/shield-plus.svelte
function Shield_plus($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "shield-plus" },
		props,
		{ iconNode: [
			["path", { "d": "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" }],
			["path", { "d": "M9 12h6" }],
			["path", { "d": "M12 9v6" }]
		] }
	]));
}
//#endregion
//#region src/lib/components/transfer/send/add-files.svelte.ts
var AddFiles = class {
	/** Whether the sheet is showing. Only ever true on a phone build. */
	open = false;
	/** Queued until the sheet has finished leaving. See after(). */
	#next = null;
	/** Ask for files: the sheet on a phone, the file picker everywhere else. */
	start() {
		if (app.send.picking) return;
		if (isPhoneChrome) this.open = true;
		else app.send.pickFiles();
	}
	/**
	* Run `next` once the sheet has finished animating out.
	*
	* The native picker is opened from here rather than straight from the row's
	* click handler so the drawer is gone before the OS puts its own surface up,
	* instead of the two being stacked.
	*
	* Closing is not this function's job: the row is a Drawer.Close, because vaul
	* only runs its close path — and so only reports the animation end — when the
	* close comes from the primitive. Writing `open = false` here would slide the
	* sheet away and then never call back.
	*/
	after(next) {
		this.#next = next;
	}
	/**
	* The drawer finished animating. Only the closing end carries a follow-up,
	* and a swipe or overlay dismiss simply has none.
	*/
	settled(open) {
		if (open) return;
		const next = this.#next;
		this.#next = null;
		next?.();
	}
};
var addFiles = new AddFiles();
//#endregion
//#region src/lib/components/transfer/send/AddFilesSheet.svelte
function AddFilesSheet($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (isPhoneChrome) {
				$$renderer.push("<!--[0-->");
				Button($$renderer, {
					size: "icon-lg",
					touch: "grow",
					"aria-label": "Add files",
					class: "absolute right-2 bottom-2 z-10 size-14 shadow-lg",
					onclick: () => addFiles.start(),
					children: ($$renderer) => {
						Plus($$renderer, { class: "size-6" });
					},
					$$slots: { default: true }
				});
				$$renderer.push(`<!----> `);
				Drawer($$renderer, {
					onAnimationEnd: (open) => addFiles.settled(open),
					get open() {
						return addFiles.open;
					},
					set open($$value) {
						addFiles.open = $$value;
						$$settled = false;
					},
					children: ($$renderer) => {
						Drawer_content($$renderer, {
							children: ($$renderer) => {
								Drawer_header($$renderer, {
									children: ($$renderer) => {
										Drawer_title($$renderer, {
											children: ($$renderer) => {
												$$renderer.push(`<!---->Add files`);
											},
											$$slots: { default: true }
										});
										$$renderer.push(`<!----> `);
										Drawer_description($$renderer, {
											children: ($$renderer) => {
												$$renderer.push(`<!---->Pick what you want to send.`);
											},
											$$slots: { default: true }
										});
										$$renderer.push(`<!---->`);
									},
									$$slots: { default: true }
								});
								$$renderer.push(`<!----> <div class="flex flex-col gap-2 px-4 pb-2">`);
								Drawer_close($$renderer, {
									class: cn(buttonVariants({ variant: "outline" }), "h-14 justify-start gap-3 text-base"),
									onclick: () => addFiles.after(() => void app.send.pickFiles()),
									children: ($$renderer) => {
										File($$renderer, { class: "size-5" });
										$$renderer.push(`<!----> Files`);
									},
									$$slots: { default: true }
								});
								$$renderer.push(`<!----> `);
								Drawer_close($$renderer, {
									class: cn(buttonVariants({ variant: "outline" }), "h-14 justify-start gap-3 text-base"),
									onclick: () => addFiles.after(() => void app.send.pickPhotos()),
									children: ($$renderer) => {
										Image($$renderer, { class: "size-5" });
										$$renderer.push(`<!----> Photos`);
									},
									$$slots: { default: true }
								});
								$$renderer.push(`<!----></div>`);
							},
							$$slots: { default: true }
						});
					},
					$$slots: { default: true }
				});
				$$renderer.push(`<!---->`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]-->`);
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
//#region node_modules/motion-sv/dist/vendor/runed/watch.svelte.js
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
//#region node_modules/motion-sv/dist/vendor/runed/context.js
var Context = class {
	#name;
	#key;
	#fallback;
	/**
	* @param name The name of the context.
	* This is used for generating the context key and error messages.
	* @param fallback Optional fallback value to return when context doesn't exist.
	*/
	constructor(name, fallback) {
		this.#name = name;
		this.#key = Symbol(name);
		this.#fallback = fallback;
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
		if (context === void 0) return fallback ?? this.#fallback;
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
//#region node_modules/motion-sv/dist/vendor/runed/index.js
var isDef = (val) => typeof val !== "undefined";
/**
* Converts a style object into a CSS string.
*
* - Filters out properties with `undefined` values.
* - Converts camelCase keys into kebab-case.
* - Appends `px` to numeric values unless the property is unitless.
*
* @param {Record<string, string | number | undefined>} styleObj -
* An object where keys are CSS property names in camelCase and values are
* strings, numbers, or `undefined`.
*
* @returns {string} A CSS string suitable for inline styles or style attributes.
*
* @example
* css({ backgroundColor: "red", width: 100, opacity: 0.5 })
* // "background-color:red;width:100px;opacity:0.5"
*/
function css(styleObj) {
	return Object.entries(styleObj).filter(([, value]) => value !== void 0).map(([key, value]) => {
		const formattedValue = typeof value === "number" && ![
			"opacity",
			"zIndex",
			"fontWeight",
			"lineHeight",
			"order",
			"flexGrow",
			"flexShrink"
		].includes(key) ? `${value}px` : value;
		return `${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}:${formattedValue}`;
	}).join(";");
}
/**
* Returns a new object that copies all properties from the given object `props`
* and adds (or overwrites) a property with the specified `key` and `value`.
*
* @template T - Type of the original object.
* @template K - Type of the property key to add.
* @template V - Type of the property value to add.
*
* @param {T} props - The source object whose properties should be copied.
* @param {K} key - The property key to add or overwrite.
* @param {V} value - The value to associate with the given key.
* @returns {T & Record<K, V>} A new object with all original properties from `props`
* and the additional property `[key]: value`.
*/
function withProp(props, key, value) {
	return Object.defineProperties({}, {
		...Object.getOwnPropertyDescriptors(props),
		[key]: {
			value,
			writable: true,
			enumerable: true,
			configurable: true
		}
	});
}
//#endregion
//#region node_modules/motion-sv/dist/features/feature.js
var Feature = class {
	static key;
	isMount;
	state;
	constructor(state) {
		this.state = state;
	}
	mount() {}
	unmount() {}
	update() {}
};
//#endregion
//#region node_modules/motion-sv/dist/state/utils.js
/**
* Resolve a variant definition to its full target, including `transition`.
* Used by the Svelte exit-transition duration estimator, which needs the
* variant's own transition to size the outro window.
*/
function resolveVariantValue(definition, variants, custom) {
	if (Array.isArray(definition)) return definition.reduce((acc, item) => {
		const resolvedVariant = resolveVariantValue(item, variants, custom);
		return resolvedVariant ? {
			...acc,
			...resolvedVariant
		} : acc;
	}, {});
	else if (typeof definition === "object") return definition;
	else if (definition && variants) {
		const variant = variants[definition];
		return typeof variant === "function" ? variant(custom) : variant;
	}
}
function resolveVariant$1(definition, variants, custom) {
	const resolved = resolveVariantValue(definition, variants, custom);
	if (!resolved) return void 0;
	const { transition, transitionEnd, ...target } = resolved;
	return {
		...target,
		...transitionEnd
	};
}
/**
* Resolve initial latest values from variant sources.
* Shared by MotionState constructor and SSR style resolution.
*
* @param options - Motion options
* @param context - Optional parent context for variant inheritance (MotionState passes this)
*/
function resolveInitialValues(options, context) {
	const sources = (options.initial === void 0 && options.variants ? context?.initial : options.initial) === false ? ["initial", "animate"] : ["initial"];
	const custom = options.custom ?? options.presenceContext?.custom;
	return sources.reduce((acc, variant) => {
		return {
			...acc,
			...resolveVariant$1(options[variant] || context?.[variant], options.variants, custom)
		};
	}, {});
}
function shallowCompare(next, prev) {
	const prevLength = prev?.length;
	if (prevLength !== next.length) return false;
	for (let i = 0; i < prevLength; i++) if (prev[i] !== next[i]) return false;
	return true;
}
var svgElementSet = /* @__PURE__ */ new Set([
	"animate",
	"circle",
	"defs",
	"desc",
	"ellipse",
	"g",
	"image",
	"line",
	"filter",
	"marker",
	"mask",
	"metadata",
	"path",
	"pattern",
	"polygon",
	"polyline",
	"rect",
	"stop",
	"svg",
	"switch",
	"symbol",
	"text",
	"tspan",
	"use",
	"view",
	"clipPath",
	"feBlend",
	"feColorMatrix",
	"feComponentTransfer",
	"feComposite",
	"feConvolveMatrix",
	"feDiffuseLighting",
	"feDisplacementMap",
	"feDistantLight",
	"feDropShadow",
	"feFlood",
	"feFuncA",
	"feFuncB",
	"feFuncG",
	"feFuncR",
	"feGaussianBlur",
	"feImage",
	"feMerge",
	"feMergeNode",
	"feMorphology",
	"feOffset",
	"fePointLight",
	"feSpecularLighting",
	"feSpotLight",
	"feTile",
	"feTurbulence",
	"foreignObject",
	"linearGradient",
	"radialGradient",
	"textPath"
]);
function isSVGElement(as) {
	return svgElementSet.has(as);
}
//#endregion
//#region node_modules/motion-sv/dist/state/utils/variant-props.js
var variantProps = [
	"initial",
	"animate",
	"exit",
	"whileHover",
	"whileDrag",
	"whileFocus",
	"whilePress"
];
//#endregion
//#region node_modules/motion-sv/dist/state/utils/get-variant-context.js
var numVariantProps = variantProps.length;
/**
* Get variant context from a visual element's parent chain.
*/
function getVariantContext(visualElement) {
	if (!visualElement) return void 0;
	if (!visualElement.isControllingVariants) {
		const context = visualElement.parent ? getVariantContext(visualElement.parent) || {} : {};
		if (visualElement.props.initial !== void 0) context.initial = visualElement.props.initial;
		return context;
	}
	const context = {};
	for (let i = 0; i < numVariantProps; i++) {
		const name = variantProps[i];
		const prop = visualElement.props[name];
		if (isVariantLabel(prop) || prop === false) context[name] = prop;
	}
	return context;
}
//#endregion
//#region node_modules/motion-sv/dist/state/animation-state.js
/**
* Animation State Manager
*
* Ported from motion-dom/dist/es/render/utils/animation-state.mjs
* (via motion-vue). Framework-agnostic.
*/
var variantPriorityOrder = [
	"animate",
	"whileInView",
	"whileFocus",
	"whileHover",
	"whilePress",
	"whileDrag",
	"exit"
];
var reversePriorityOrder = [...variantPriorityOrder].reverse();
var numAnimationTypes = variantPriorityOrder.length;
function createTypeState(isActive = false) {
	return {
		isActive,
		protectedKeys: {},
		needsAnimating: {},
		prevResolvedValues: {}
	};
}
function createState() {
	return {
		animate: createTypeState(true),
		whileInView: createTypeState(),
		whileHover: createTypeState(),
		whilePress: createTypeState(),
		whileDrag: createTypeState(),
		whileFocus: createTypeState(),
		exit: createTypeState()
	};
}
function checkVariantsDidChange(prev, next) {
	if (typeof next === "string") return next !== prev;
	else if (Array.isArray(next)) return !shallowCompare(next, prev);
	return false;
}
function isKeyframesTarget(v) {
	return Array.isArray(v);
}
function createAnimateFunction(visualElement) {
	return (animations) => {
		return Promise.all(animations.map(({ animation, options }) => animateVisualElement(visualElement, animation, options)));
	};
}
/**
* Create animation state manager.
*
* Ported from motion-dom's createAnimationState.
* The resolution logic mirrors motion-dom so upstream diffs are easy to apply.
*
* @param visualElement - The visual element instance (aligned with motion-dom signature)
*/
function createAnimationState(visualElement) {
	let animate = createAnimateFunction(visualElement);
	let state = createState();
	let isInitialRender = true;
	/**
	* This function will be used to reduce the animation definitions for
	* each active animation type into an object of resolved values for it.
	*/
	const buildResolvedTypeValues = (type) => (acc, definition) => {
		const resolved = resolveVariant(visualElement, definition, type === "exit" ? visualElement.presenceContext?.custom : void 0);
		if (resolved) {
			const { transition, transitionEnd, ...target } = resolved;
			acc = {
				...acc,
				...target,
				...transitionEnd
			};
		}
		return acc;
	};
	/**
	* This just allows us to inject mocked animation functions
	* @internal
	*/
	function setAnimateFunction(makeAnimator) {
		animate = makeAnimator(visualElement);
	}
	/**
	* When we receive new props, we need to:
	* 1. Create a list of protected keys for each type. This is a directory of
	*    value keys that are currently being "handled" by types of a higher priority
	*    so that whenever an animation is played of a given type, these values are
	*    protected from being animated.
	* 2. Determine if an animation type needs animating.
	* 3. Determine if any values have been removed from a type and figure out
	*    what to animate those to.
	*/
	function animateChanges(changedActiveType) {
		const { props } = visualElement;
		const context = getVariantContext(visualElement.parent) || {};
		/**
		* A list of animations that we'll build into as we iterate through the animation
		* types. This will get executed at the end of the function.
		*/
		const animations = [];
		/**
		* Keep track of which values have been removed. Then, as we hit lower priority
		* animation types, we can check if they contain removed values and animate to that.
		*/
		const removedKeys = /* @__PURE__ */ new Set();
		/**
		* A dictionary of all encountered keys. This is an object to let us build into and
		* copy it without iteration. Each time we hit an animation type we set its protected
		* keys - the keys its not allowed to animate - to the latest version of this object.
		*/
		let encounteredKeys = {};
		/**
		* If a variant has been removed at a given index, and this component is controlling
		* variant animations, we want to ensure lower-priority variants are forced to animate.
		*/
		let removedVariantIndex = Infinity;
		/**
		* Iterate through all animation types in reverse priority order. For each, we want to
		* detect which values it's handling and whether or not they've changed (and therefore
		* need to be animated). If any values have been removed, we want to detect those in
		* lower priority props and flag for animation.
		*/
		for (let i = 0; i < numAnimationTypes; i++) {
			const type = reversePriorityOrder[i];
			const typeState = state[type];
			const prop = props[type] !== void 0 ? props[type] : context[type];
			const propIsVariant = isVariantLabel(prop);
			/**
			* If this type has *just* changed isActive status, set activeDelta
			* to that status. Otherwise set to null.
			*/
			const activeDelta = type === changedActiveType ? typeState.isActive : null;
			if (activeDelta === false) removedVariantIndex = i;
			/**
			* If this prop is an inherited variant, rather than been set directly on the
			* component itself, we want to make sure we allow the parent to trigger animations.
			*/
			let isInherited = prop === context[type] && prop !== props[type] && propIsVariant;
			if (isInherited && isInitialRender && visualElement.manuallyAnimateOnMount) isInherited = false;
			/**
			* Set all encountered keys so far as the protected keys for this type. This will
			* be any key that has been animated or otherwise handled by active, higher-priority types.
			*/
			typeState.protectedKeys = { ...encounteredKeys };
			if (!typeState.isActive && activeDelta === null || !prop && !typeState.prevProp || isAnimationControls(prop) || typeof prop === "boolean") continue;
			/**
			* As we go look through the values defined on this type, if we detect
			* a changed value or a value that was removed in a higher priority, we set
			* this to true and add this prop to the animation list.
			*/
			const variantDidChange = checkVariantsDidChange(typeState.prevProp, prop);
			let shouldAnimateType = variantDidChange || type === changedActiveType && typeState.isActive && !isInherited && propIsVariant || i > removedVariantIndex && propIsVariant;
			let handledRemovedValues = false;
			/**
			* As animations can be set as variant lists, variants or target objects, we
			* coerce everything to an array if it isn't one already
			*/
			const definitionList = Array.isArray(prop) ? prop : [prop];
			/**
			* Build an object of all the resolved values. We'll use this in the subsequent
			* animateChanges calls to determine whether a value has changed.
			*/
			let resolvedValues = definitionList.reduce(buildResolvedTypeValues(type), {});
			if (activeDelta === false) resolvedValues = {};
			/**
			* Now we need to loop through all the keys in the prev prop and this prop,
			* and decide:
			* 1. If the value has changed, and needs animating
			* 2. If it has been removed, and needs adding to the removedKeys set
			* 3. If it has been removed in a higher priority type and needs animating
			* 4. If it hasn't been removed in a higher priority but hasn't changed, and
			*    needs adding to the type's protectedKeys list.
			*/
			const { prevResolvedValues = {} } = typeState;
			const allKeys = {
				...prevResolvedValues,
				...resolvedValues
			};
			const markToAnimate = (key) => {
				shouldAnimateType = true;
				if (removedKeys.has(key)) {
					handledRemovedValues = true;
					removedKeys.delete(key);
				}
				typeState.needsAnimating[key] = true;
				const motionValue = visualElement.getValue(key);
				if (motionValue) motionValue.liveStyle = false;
			};
			for (const key in allKeys) {
				const next = resolvedValues[key];
				const prev = prevResolvedValues[key];
				if (Object.hasOwnProperty.call(encounteredKeys, key)) continue;
				/**
				* If the value has changed, we probably want to animate it.
				*/
				let valueHasChanged = false;
				if (isKeyframesTarget(next) && isKeyframesTarget(prev)) valueHasChanged = !shallowCompare(next, prev);
				else valueHasChanged = next !== prev;
				if (valueHasChanged) if (next !== void 0 && next !== null) markToAnimate(key);
				else removedKeys.add(key);
				else if (next !== void 0 && removedKeys.has(key))
 /**
				* If next hasn't changed and it isn't undefined, we want to check if it's
				* been removed by a higher priority
				*/
				markToAnimate(key);
				else
 /**
				* If it hasn't changed, we add it to the list of protected values
				* to ensure it doesn't get animated.
				*/
				typeState.protectedKeys[key] = true;
			}
			/**
			* Update the typeState so next time animateChanges is called we can compare the
			* latest prop and resolvedValues to these.
			*/
			typeState.prevProp = prop;
			typeState.prevResolvedValues = resolvedValues;
			if (typeState.isActive) encounteredKeys = {
				...encounteredKeys,
				...resolvedValues
			};
			if (isInitialRender && visualElement.blockInitialAnimation) shouldAnimateType = false;
			/**
			* If this is an inherited prop we want to skip this animation
			* unless the inherited variants haven't changed on this render.
			*/
			const willAnimateViaParent = isInherited && variantDidChange;
			if (shouldAnimateType && (!willAnimateViaParent || handledRemovedValues)) animations.push(...definitionList.map((animation) => {
				const options = { type };
				/**
				* If we're performing the initial animation, but we're not
				* rendering at the same time as the variant-controlling parent,
				* we want to use the parent's transition to calculate the stagger.
				*/
				if (typeof animation === "string" && isInitialRender && !willAnimateViaParent && visualElement.manuallyAnimateOnMount && visualElement.parent) {
					const { parent } = visualElement;
					const parentVariant = resolveVariant(parent, animation);
					if (parent.enteringChildren && parentVariant) {
						const { delayChildren } = parentVariant.transition || {};
						options.delay = calcChildStagger(parent.enteringChildren, visualElement, delayChildren);
					}
				}
				return {
					animation,
					options
				};
			}));
		}
		/**
		* If there are some removed values that haven't been dealt with,
		* we need to create a new animation that falls back either to the value
		* defined in the style prop, or the last read value.
		*/
		if (removedKeys.size) {
			const fallbackAnimation = {};
			/**
			* If the initial prop contains a transition we can use that, otherwise
			* allow the animation function to use the visual element's default.
			*/
			if (typeof props.initial !== "boolean") {
				const initialTransition = resolveVariant(visualElement, Array.isArray(props.initial) ? props.initial[0] : props.initial);
				if (initialTransition && initialTransition.transition) fallbackAnimation.transition = initialTransition.transition;
			}
			removedKeys.forEach((key) => {
				const fallbackTarget = visualElement.getBaseTarget(key);
				const motionValue = visualElement.getValue(key);
				if (motionValue) motionValue.liveStyle = true;
				fallbackAnimation[key] = fallbackTarget ?? null;
			});
			animations.push({ animation: fallbackAnimation });
		}
		let shouldAnimate = Boolean(animations.length);
		if (isInitialRender && (props.initial === false || props.initial === props.animate) && !visualElement.manuallyAnimateOnMount) shouldAnimate = false;
		isInitialRender = false;
		return shouldAnimate ? animate(animations) : Promise.resolve();
	}
	/**
	* Change whether a certain animation type is active.
	*/
	function setActive(type, isActive) {
		if (state[type].isActive === isActive) return Promise.resolve();
		visualElement.variantChildren?.forEach((child) => {
			child.animationState?.setActive(type, isActive);
		});
		state[type].isActive = isActive;
		const animations = animateChanges(type);
		for (const key in state) state[key].protectedKeys = {};
		return animations;
	}
	return {
		animateChanges,
		setActive,
		setAnimateFunction,
		getState: () => state,
		reset: () => {
			state = createState();
			isInitialRender = true;
		}
	};
}
//#endregion
//#region node_modules/motion-sv/dist/features/animation/animation.js
var AnimationFeature = class extends Feature {
	static key = "animation";
	unmountControls;
	constructor(state) {
		super(state);
		const ve = state.visualElement;
		ve.animationState ||= createAnimationState(ve);
	}
	updateAnimationControlsSubscription() {
		const { animate } = this.state.options;
		if (isAnimationControls(animate)) this.unmountControls = animate.subscribe(this.state.visualElement);
	}
	/**
	* Subscribe any provided AnimationControls to the component's VisualElement
	*/
	mount() {
		/**
		* Defer the initial animation pass by one microtask so the whole subtree
		* has mounted first. Unlike Vue (children mount before parents), Svelte
		* mounts parents before children, so a variant-controlling parent would
		* otherwise run animateChanges() before its variantChildren have
		* registered — breaking orchestration (staggerChildren, delayChildren,
		* when: "beforeChildren"/"afterChildren").
		*
		* Note: Vue's port also checks `isHidden(element)` here to support
		* v-show. Svelte has no v-show equivalent, and our AnimatePresence
		* wait-mode gate hides entrants with display:none, which must NOT be
		* treated as exiting — so that check is intentionally omitted.
		*/
		microtask.render(() => {
			if (!this.state.isMounted()) return;
			if (this.state.isEnterBlocked?.()) {
				this.state.setActiveNoAnimate("animate", false);
				return;
			}
			this.state.visualElement.animationState?.animateChanges();
		});
		this.updateAnimationControlsSubscription();
	}
	update() {
		this.state.visualElement.animationState?.animateChanges();
		const { animate } = this.state.visualElement.getProps();
		const { animate: prevAnimate } = this.state.visualElement.prevProps || {};
		if (animate !== prevAnimate) this.updateAnimationControlsSubscription();
	}
	unmount() {
		this.state.visualElement.animationState.reset();
		this.unmountControls?.();
	}
};
//#endregion
//#region node_modules/motion-sv/dist/state/create-visual-element.js
function createVisualElement(Component, options) {
	return isSVGElement(Component) ? new SVGVisualElement(options) : new HTMLVisualElement(options);
}
//#endregion
//#region node_modules/motion-sv/dist/features/gestures/press/index.js
function extractEventInfo$1(event) {
	return { point: {
		x: event.pageX,
		y: event.pageY
	} };
}
var PressGesture = class extends Feature {
	static key = "press";
	removePress;
	isActive() {
		const { whilePress, onPress, onPressCancel, onPressStart } = this.state.options;
		return Boolean(whilePress || onPress || onPressCancel || onPressStart);
	}
	register() {
		const element = this.state.element;
		if (!element || !this.isActive()) return;
		this.removePress?.();
		this.removePress = press(element, (_el, startEvent) => {
			const props = this.state.options;
			this.state.setActive("whilePress", true);
			if (props.onPressStart) frame.postRender(() => props.onPressStart(startEvent, extractEventInfo$1(startEvent)));
			return (endEvent, { success }) => {
				this.state.setActive("whilePress", false);
				const callbackName = success ? "onPress" : "onPressCancel";
				const callback = this.state.options[callbackName];
				if (callback) frame.postRender(() => callback(endEvent, extractEventInfo$1(endEvent)));
			};
		}, { useGlobalTarget: this.state.options.globalPressTarget });
	}
	mount() {
		this.register();
	}
	update() {
		const prev = this.state.visualElement.prevProps;
		if (!Boolean(prev?.whilePress || prev?.whileTap || prev?.onPress || prev?.onPressCancel || prev?.onPressStart) && this.isActive()) this.register();
	}
	unmount() {
		this.removePress?.();
		this.removePress = void 0;
	}
};
//#endregion
//#region node_modules/motion-sv/dist/events/utils/is-primary-pointer.js
function isPrimaryPointer(event) {
	if (event.pointerType === "mouse") return typeof event.button !== "number" || event.button <= 0;
	else
 /**
	* isPrimary is true for all mice buttons, whereas every touch point
	* is regarded as its own input. So subsequent concurrent touch points
	* will be false.
	*
	* Specifically match against false here as incomplete versions of
	* PointerEvents in very old browser might have it set as undefined.
	*/
	return event.isPrimary !== false;
}
//#endregion
//#region node_modules/motion-sv/dist/events/event-info.js
function extractEventInfo(event, pointType = "page") {
	return { point: {
		x: event[`${pointType}X`],
		y: event[`${pointType}Y`]
	} };
}
function addPointerInfo(handler) {
	return (event) => isPrimaryPointer(event) && handler(event, extractEventInfo(event));
}
//#endregion
//#region node_modules/motion-sv/dist/features/gestures/hover/index.js
var HoverGesture = class extends Feature {
	static key = "hover";
	removeHover;
	isActive() {
		const { whileHover, onHoverStart, onHoverEnd } = this.state.options;
		return Boolean(whileHover || onHoverStart || onHoverEnd);
	}
	register() {
		const element = this.state.element;
		if (!element || !this.isActive()) return;
		this.removeHover?.();
		this.removeHover = hover(element, (_el, startEvent) => {
			const props = this.state.options;
			this.state.setActive("whileHover", true);
			if (props.onHoverStart) frame.postRender(() => props.onHoverStart(startEvent, extractEventInfo(startEvent)));
			return (endEvent) => {
				this.state.setActive("whileHover", false);
				const callback = this.state.options.onHoverEnd;
				if (callback) frame.postRender(() => callback(endEvent, extractEventInfo(endEvent)));
			};
		});
	}
	mount() {
		this.register();
	}
	update() {
		const prev = this.state.visualElement.prevProps;
		if (!Boolean(prev?.whileHover || prev?.onHoverStart || prev?.onHoverEnd) && this.isActive()) this.register();
	}
	unmount() {
		this.removeHover?.();
		this.removeHover = void 0;
	}
};
//#endregion
//#region node_modules/motion-sv/dist/features/gestures/in-view/index.js
var InViewGesture = class extends Feature {
	static key = "inView";
	removeObserver;
	isActive() {
		const { whileInView, onViewportEnter, onViewportLeave } = this.state.options;
		return Boolean(whileInView || onViewportEnter || onViewportLeave);
	}
	startObserver() {
		const element = this.state.element;
		if (!element || !this.isActive()) return;
		this.removeObserver?.();
		const { once, ...viewOptions } = this.state.options.inViewOptions || {};
		this.removeObserver = inView(element, (_, entry) => {
			const props = this.state.options;
			this.state.setActive("whileInView", true);
			if (props.onViewportEnter) frame.postRender(() => props.onViewportEnter(entry));
			if (!once) return () => {
				this.state.setActive("whileInView", false);
				const leaveCallback = this.state.options.onViewportLeave;
				if (leaveCallback) frame.postRender(() => leaveCallback(entry));
			};
		}, viewOptions);
	}
	mount() {
		this.startObserver();
	}
	update() {
		const { props, prevProps } = this.state.visualElement;
		if ([
			"amount",
			"margin",
			"root"
		].some((name) => {
			return props.inViewOptions?.[name] !== prevProps?.inViewOptions?.[name];
		})) this.startObserver();
	}
	unmount() {
		this.removeObserver?.();
		this.removeObserver = void 0;
	}
};
//#endregion
//#region node_modules/motion-sv/dist/events/add-dom-event.js
function addDomEvent(target, eventName, handler, options = { passive: true }) {
	target.addEventListener(eventName, handler, options);
	return () => target.removeEventListener(eventName, handler);
}
//#endregion
//#region node_modules/motion-sv/dist/events/add-pointer-event.js
function addPointerEvent(target, eventName, handler, options) {
	return addDomEvent(target, eventName, addPointerInfo(handler), options);
}
//#endregion
//#region node_modules/motion-sv/dist/features/gestures/focus/index.js
var FocusGesture = class extends Feature {
	static key = "focus";
	isFocused = false;
	removeFocus;
	onFocus() {
		let isFocusVisible = false;
		/**
		* If this element doesn't match focus-visible then don't
		* apply whileFocus. But, if matches throws that focus-visible
		* is not a valid selector then in that browser outline styles will be applied
		* to the element by default and we want to match that behaviour with whileFocus.
		*/
		try {
			isFocusVisible = this.state.element.matches(":focus-visible");
		} catch {
			isFocusVisible = true;
		}
		if (!isFocusVisible) return;
		this.state.setActive("whileFocus", true);
		this.isFocused = true;
	}
	onBlur() {
		if (!this.isFocused) return;
		this.state.setActive("whileFocus", false);
		this.isFocused = false;
	}
	mount() {
		const element = this.state.element;
		this.removeFocus = pipe(addDomEvent(element, "focus", () => this.onFocus()), addDomEvent(element, "blur", () => this.onBlur()));
	}
	unmount() {
		this.removeFocus?.();
		this.removeFocus = void 0;
	}
};
//#endregion
//#region node_modules/motion-sv/dist/features/layout/utils.js
function getClosestProjectingNode(visualElement) {
	if (!visualElement) return void 0;
	return visualElement.options.allowProjection !== false ? visualElement.projection : getClosestProjectingNode(visualElement.parent);
}
//#endregion
//#region node_modules/motion-sv/dist/features/layout/config.js
var defaultScaleCorrector = {
	borderRadius: {
		...correctBorderRadius,
		applyTo: [
			"borderTopLeftRadius",
			"borderTopRightRadius",
			"borderBottomLeftRadius",
			"borderBottomRightRadius"
		]
	},
	borderTopLeftRadius: correctBorderRadius,
	borderTopRightRadius: correctBorderRadius,
	borderBottomLeftRadius: correctBorderRadius,
	borderBottomRightRadius: correctBorderRadius,
	boxShadow: correctBoxShadow
};
//#endregion
//#region node_modules/motion-sv/dist/features/gestures/drag/utils/is.js
function isHTMLElement(value) {
	return typeof value === "object" && value !== null && "nodeType" in value;
}
//#endregion
//#region node_modules/motion-sv/dist/utils/is.js
var isSSR = typeof window === "undefined";
//#endregion
//#region node_modules/motion-sv/dist/features/layout/projection.js
var ProjectionFeature = class extends Feature {
	static key = "projection";
	projection;
	constructor(state) {
		super(state);
		addScaleCorrector(defaultScaleCorrector);
		if (!isSSR) this.initProjection();
	}
	initProjection() {
		const options = this.state.options;
		this.state.visualElement.projection = new HTMLProjectionNode(this.state.visualElement.latestValues, options["data-framer-portal-id"] ? void 0 : getClosestProjectingNode(this.state.visualElement.parent));
		this.projection = this.state.visualElement.projection;
		this.projection.isPresent = true;
		this.setOptions();
	}
	setOptions() {
		const options = this.state.options;
		const { layoutId, layout, drag = false, dragConstraints = false } = options;
		const shouldDisableInitialCrossfade = this.shouldDisableInitialCrossfade(layoutId);
		this.projection?.setOptions({
			layout,
			layoutId,
			alwaysMeasureLayout: Boolean(layoutId) || Boolean(drag) || dragConstraints && isHTMLElement(dragConstraints),
			visualElement: this.state.visualElement,
			animationType: typeof options.layout === "string" ? options.layout : "both",
			layoutRoot: options.layoutRoot,
			layoutScroll: options.layoutScroll,
			crossfade: options.crossfade ?? (shouldDisableInitialCrossfade ? false : void 0),
			onExitComplete: () => {
				if (!this.projection?.isPresent && this.state.options.layoutId && !this.state.isExiting) queueMicrotask(() => {
					this.state.options.presenceContext?.onMotionExitComplete?.(this.state.presenceContainer, this.state);
				});
			}
		});
	}
	shouldDisableInitialCrossfade(layoutId) {
		if (!layoutId || this.state.options.crossfade !== void 0) return false;
		const lead = this.projection?.root?.sharedNodes.get(layoutId)?.lead;
		return Boolean(lead && (lead.isPresent === false || lead.instance?.isConnected === false));
	}
	update() {
		this.setOptions();
	}
	mount() {
		this.projection?.mount(this.state.element);
	}
};
//#endregion
//#region node_modules/motion-sv/dist/features/gestures/pan/PanSession.js
var overflowStyles = /* #__PURE__ */ new Set(["auto", "scroll"]);
/**
* @internal
*/
var PanSession = class {
	/**
	* @internal
	*/
	history;
	/**
	* @internal
	*/
	startEvent = null;
	/**
	* @internal
	*/
	lastMoveEvent = null;
	/**
	* @internal
	*/
	lastMoveEventInfo = null;
	/**
	* @internal
	*/
	transformPagePoint;
	/**
	* @internal
	*/
	handlers = {};
	/**
	* @internal
	*/
	removeListeners;
	/**
	* For determining if an animation should resume after it is interupted
	*
	* @internal
	*/
	dragSnapToOrigin;
	/**
	* @internal
	*/
	contextWindow = window;
	/**
	* Element being dragged. When provided, scroll events on its
	* ancestors and window are compensated so the gesture continues
	* smoothly during scroll.
	*/
	element;
	/**
	* Track scroll positions of all ancestors when drag starts
	*
	* @internal
	*/
	scrollPositions = /* @__PURE__ */ new Map();
	/**
	* Store cleanup function for scroll listeners
	*
	* @internal
	*/
	removeScrollListeners;
	constructor(event, handlers, { transformPagePoint, contextWindow, dragSnapToOrigin = false, element } = {}) {
		if (!isPrimaryPointer(event)) return;
		this.dragSnapToOrigin = dragSnapToOrigin;
		this.handlers = handlers;
		this.transformPagePoint = transformPagePoint;
		this.contextWindow = contextWindow || window;
		const initialInfo = transformPoint(extractEventInfo(event), this.transformPagePoint);
		const { point } = initialInfo;
		const { timestamp } = frameData;
		this.history = [{
			...point,
			timestamp
		}];
		const { onSessionStart } = handlers;
		onSessionStart && onSessionStart(event, getPanInfo(initialInfo, this.history));
		this.removeListeners = pipe(addPointerEvent(this.contextWindow, "pointermove", this.handlePointerMove), addPointerEvent(this.contextWindow, "pointerup", this.handlePointerUp), addPointerEvent(this.contextWindow, "pointercancel", this.handlePointerUp));
		if (element) this.startScrollTracking(element);
	}
	/**
	* Start tracking scroll on ancestors and window.
	*/
	startScrollTracking(element) {
		let current = element.parentElement;
		while (current) {
			const style = getComputedStyle(current);
			if (overflowStyles.has(style.overflowX) || overflowStyles.has(style.overflowY)) this.scrollPositions.set(current, {
				x: current.scrollLeft,
				y: current.scrollTop
			});
			current = current.parentElement;
		}
		this.scrollPositions.set(window, {
			x: window.scrollX,
			y: window.scrollY
		});
		window.addEventListener("scroll", this.onElementScroll, {
			capture: true,
			passive: true
		});
		window.addEventListener("scroll", this.onWindowScroll, { passive: true });
		this.removeScrollListeners = () => {
			window.removeEventListener("scroll", this.onElementScroll, { capture: true });
			window.removeEventListener("scroll", this.onWindowScroll);
		};
	}
	/**
	* Handle scroll events on elements
	*/
	onElementScroll = (event) => {
		this.handleScroll(event.target);
	};
	/**
	* Handle window scroll
	*/
	onWindowScroll = () => {
		this.handleScroll(window);
	};
	/**
	* Handle scroll compensation during drag.
	*
	* For element scroll: adjusts history origin since pageX/pageY doesn't change.
	* For window scroll: adjusts lastMoveEventInfo since pageX/pageY would change.
	*/
	handleScroll(target) {
		const initial = this.scrollPositions.get(target);
		if (!initial) return;
		const isWindow = target === window;
		const current = isWindow ? {
			x: window.scrollX,
			y: window.scrollY
		} : {
			x: target.scrollLeft,
			y: target.scrollTop
		};
		const delta = {
			x: current.x - initial.x,
			y: current.y - initial.y
		};
		if (delta.x === 0 && delta.y === 0) return;
		if (isWindow) {
			if (this.lastMoveEventInfo) {
				this.lastMoveEventInfo.point.x += delta.x;
				this.lastMoveEventInfo.point.y += delta.y;
			}
		} else if (this.history.length > 0) {
			this.history[0].x -= delta.x;
			this.history[0].y -= delta.y;
		}
		this.scrollPositions.set(target, current);
		frame.update(this.updatePoint, true);
	}
	updatePoint = () => {
		if (!(this.lastMoveEvent && this.lastMoveEventInfo)) return;
		const info = getPanInfo(this.lastMoveEventInfo, this.history);
		const isPanStarted = this.startEvent !== null;
		const isDistancePastThreshold = distance2D(info.offset, {
			x: 0,
			y: 0
		}) >= 3;
		if (!isPanStarted && !isDistancePastThreshold) return;
		const { point } = info;
		const { timestamp } = frameData;
		this.history.push({
			...point,
			timestamp
		});
		const { onStart, onMove } = this.handlers;
		if (!isPanStarted) {
			onStart && onStart(this.lastMoveEvent, info);
			this.startEvent = this.lastMoveEvent;
		}
		onMove && onMove(this.lastMoveEvent, info);
	};
	handlePointerMove = (event, info) => {
		this.lastMoveEvent = event;
		this.lastMoveEventInfo = transformPoint(info, this.transformPagePoint);
		frame.update(this.updatePoint, true);
	};
	handlePointerUp = (event, info) => {
		this.end();
		const { onEnd, onSessionEnd, resumeAnimation } = this.handlers;
		if (this.dragSnapToOrigin || !this.startEvent) resumeAnimation && resumeAnimation();
		if (!(this.lastMoveEvent && this.lastMoveEventInfo)) return;
		const panInfo = getPanInfo(event.type === "pointercancel" ? this.lastMoveEventInfo : transformPoint(info, this.transformPagePoint), this.history);
		if (this.startEvent && onEnd) onEnd(event, panInfo);
		onSessionEnd && onSessionEnd(event, panInfo);
	};
	updateHandlers(handlers) {
		this.handlers = handlers;
	}
	end() {
		this.removeListeners && this.removeListeners();
		this.removeScrollListeners?.();
		this.scrollPositions.clear();
		cancelFrame(this.updatePoint);
	}
};
function transformPoint(info, transformPagePoint) {
	return transformPagePoint ? { point: transformPagePoint(info.point) } : info;
}
function subtractPoint(a, b) {
	return {
		x: a.x - b.x,
		y: a.y - b.y
	};
}
function getPanInfo({ point }, history) {
	return {
		point,
		delta: subtractPoint(point, lastDevicePoint(history)),
		offset: subtractPoint(point, startDevicePoint(history)),
		velocity: getVelocity(history, .1)
	};
}
function startDevicePoint(history) {
	return history[0];
}
function lastDevicePoint(history) {
	return history[history.length - 1];
}
function getVelocity(history, timeDelta) {
	if (history.length < 2) return {
		x: 0,
		y: 0
	};
	let i = history.length - 1;
	let timestampedPoint = null;
	const lastPoint = lastDevicePoint(history);
	while (i >= 0) {
		timestampedPoint = history[i];
		if (lastPoint.timestamp - timestampedPoint.timestamp > secondsToMilliseconds(timeDelta)) break;
		i--;
	}
	if (!timestampedPoint) return {
		x: 0,
		y: 0
	};
	const time = millisecondsToSeconds(lastPoint.timestamp - timestampedPoint.timestamp);
	if (time === 0) return {
		x: 0,
		y: 0
	};
	const currentVelocity = {
		x: (lastPoint.x - timestampedPoint.x) / time,
		y: (lastPoint.y - timestampedPoint.y) / time
	};
	if (currentVelocity.x === Infinity) currentVelocity.x = 0;
	if (currentVelocity.y === Infinity) currentVelocity.y = 0;
	return currentVelocity;
}
//#endregion
//#region node_modules/motion-sv/dist/utils/get-context-window.js
function getContextWindow({ current }) {
	return current ? current.ownerDocument.defaultView : null;
}
//#endregion
//#region node_modules/motion-sv/dist/utils/resolve-motion-props.js
/**
* Merge motion props with context values (layout group, presence, config).
*/
function resolveMotionProps(props, context) {
	const { layoutGroup, presenceContext, config } = context;
	const layoutId = layoutGroup.id && props.layoutId ? `${layoutGroup.id}-${props.layoutId}` : props.layoutId || void 0;
	return {
		...props,
		layoutId,
		transition: props.transition ?? config.transition,
		layoutGroup,
		motionConfig: config,
		inViewOptions: props.inViewOptions ?? config.inViewOptions,
		presenceContext,
		initial: presenceContext.initial === false ? presenceContext.initial : props.initial === true ? void 0 : props.initial
	};
}
//#endregion
//#region node_modules/motion-sv/dist/features/gestures/pan/index.js
function asyncHandler(handler) {
	return (event, info) => {
		if (handler) frame.postRender(() => handler(event, info));
	};
}
var PanGesture = class extends Feature {
	static key = "pan";
	session;
	removePointerDownListener = noop;
	onPointerDown(pointerDownEvent) {
		this.session = new PanSession(pointerDownEvent, this.createPanHandlers(), {
			transformPagePoint: this.state.visualElement.getTransformPagePoint(),
			contextWindow: getContextWindow(this.state.visualElement)
		});
	}
	createPanHandlers() {
		return {
			onSessionStart: asyncHandler((_, info) => {
				const { onPanSessionStart } = this.state.options;
				onPanSessionStart && onPanSessionStart(_, info);
			}),
			onStart: asyncHandler((_, info) => {
				const { onPanStart } = this.state.options;
				onPanStart && onPanStart(_, info);
			}),
			onMove: (event, info) => {
				const { onPan } = this.state.options;
				onPan && onPan(event, info);
			},
			onEnd: (event, info) => {
				const { onPanEnd } = this.state.options;
				delete this.session;
				if (onPanEnd) frame.postRender(() => onPanEnd(event, info));
			}
		};
	}
	mount() {
		this.removePointerDownListener = addPointerEvent(this.state.element, "pointerdown", this.onPointerDown.bind(this));
	}
	update() {}
	unmount() {
		this.removePointerDownListener();
		this.session && this.session.end();
	}
};
//#endregion
//#region node_modules/motion-sv/dist/features/gestures/drag/lock.js
function createLock(name) {
	let lock = null;
	return () => {
		const openLock = () => {
			lock = null;
		};
		if (lock === null) {
			lock = name;
			return openLock;
		}
		return false;
	};
}
var globalHorizontalLock = createLock("dragHorizontal");
var globalVerticalLock = createLock("dragVertical");
function getGlobalLock(drag) {
	let lock = false;
	if (drag === "y") lock = globalVerticalLock();
	else if (drag === "x") lock = globalHorizontalLock();
	else {
		const openHorizontal = globalHorizontalLock();
		const openVertical = globalVerticalLock();
		if (openHorizontal && openVertical) lock = () => {
			openHorizontal();
			openVertical();
		};
		else {
			if (openHorizontal) openHorizontal();
			if (openVertical) openVertical();
		}
	}
	return lock;
}
//#endregion
//#region node_modules/motion-sv/dist/features/gestures/drag/utils/constraints.js
/**
* Apply constraints to a point. These constraints are both physical along an
* axis, and an elastic factor that determines how much to constrain the point
* by if it does lie outside the defined parameters.
*/
function applyConstraints(point, { min, max }, elastic) {
	if (min !== void 0 && point < min) point = elastic ? mixNumber(min, point, elastic.min) : Math.max(point, min);
	else if (max !== void 0 && point > max) point = elastic ? mixNumber(max, point, elastic.max) : Math.min(point, max);
	return point;
}
var defaultElastic = .35;
/**
* Calculate constraints in terms of the viewport when
* defined relatively to the measured bounding box.
*/
function calcRelativeConstraints(layoutBox, { top, left, bottom, right }) {
	return {
		x: calcRelativeAxisConstraints(layoutBox.x, left, right),
		y: calcRelativeAxisConstraints(layoutBox.y, top, bottom)
	};
}
/**
* Calculate constraints in terms of the viewport when defined relatively to the
* measured axis. This is measured from the nearest edge, so a max constraint of 200
* on an axis with a max value of 300 would return a constraint of 500 - axis length
*/
function calcRelativeAxisConstraints(axis, min, max) {
	return {
		min: min !== void 0 ? axis.min + min : void 0,
		max: max !== void 0 ? axis.max + max - (axis.max - axis.min) : void 0
	};
}
/**
* Accepts a dragElastic prop and returns resolved elastic values for each axis.
*/
function resolveDragElastic(dragElastic = defaultElastic) {
	if (dragElastic === false) dragElastic = 0;
	else if (dragElastic === true) dragElastic = defaultElastic;
	return {
		x: resolveAxisElastic(dragElastic, "left", "right"),
		y: resolveAxisElastic(dragElastic, "top", "bottom")
	};
}
function resolveAxisElastic(dragElastic, minLabel, maxLabel) {
	return {
		min: resolvePointElastic(dragElastic, minLabel),
		max: resolvePointElastic(dragElastic, maxLabel)
	};
}
function resolvePointElastic(dragElastic, label) {
	return typeof dragElastic === "number" ? dragElastic : dragElastic[label] || 0;
}
/**
* Rebase the calculated viewport constraints relative to the layout.min point.
*/
function rebaseAxisConstraints(layout, constraints) {
	const relativeConstraints = {};
	if (constraints.min !== void 0) relativeConstraints.min = constraints.min - layout.min;
	if (constraints.max !== void 0) relativeConstraints.max = constraints.max - layout.min;
	return relativeConstraints;
}
/**
* Calculate viewport constraints when defined as another viewport-relative box
*/
function calcViewportConstraints(layoutBox, constraintsBox) {
	return {
		x: calcViewportAxisConstraints(layoutBox.x, constraintsBox.x),
		y: calcViewportAxisConstraints(layoutBox.y, constraintsBox.y)
	};
}
/**
* Calculate viewport constraints when defined as another viewport-relative axis
*/
function calcViewportAxisConstraints(layoutAxis, constraintsAxis) {
	let min = constraintsAxis.min - layoutAxis.min;
	let max = constraintsAxis.max - layoutAxis.max;
	if (constraintsAxis.max - constraintsAxis.min < layoutAxis.max - layoutAxis.min) [min, max] = [max, min];
	return {
		min,
		max
	};
}
/**
* Calculate a transform origin relative to the source axis, between 0-1, that results
* in an asthetically pleasing scale/transform needed to project from source to target.
*/
function calcOrigin(source, target) {
	let origin = .5;
	const sourceLength = calcLength(source);
	const targetLength = calcLength(target);
	if (targetLength > sourceLength) origin = progress(target.min, target.max - sourceLength, source.min);
	else if (sourceLength > targetLength) origin = progress(source.min, source.max - targetLength, target.min);
	return clamp(0, 1, origin);
}
//#endregion
//#region node_modules/motion-sv/dist/features/gestures/drag/VisualElementDragControls.js
var elementDragControls = /* @__PURE__ */ new WeakMap();
/**
*
*/
var VisualElementDragControls = class {
	state;
	panSession;
	openGlobalLock = null;
	isDragging = false;
	currentDirection = null;
	originPoint = {
		x: 0,
		y: 0
	};
	/**
	* The permitted boundaries of travel, in pixels.
	*/
	constraints = false;
	hasMutatedConstraints = false;
	/**
	* The per-axis resolved elastic values.
	*/
	elastic = createBox();
	constructor(state) {
		this.state = state;
	}
	get visualElement() {
		return this.state.visualElement;
	}
	start(originEvent, { snapToCursor = false } = {}) {
		const onSessionStart = (event) => {
			if (snapToCursor) this.stopAnimation();
			else this.pauseAnimation();
			if (snapToCursor) this.snapToCursor(extractEventInfo(event, "page").point);
		};
		const onStart = (event, info) => {
			this.stopAnimation();
			const { drag, dragPropagation, onDragStart } = this.getProps();
			if (drag && !dragPropagation) {
				if (this.openGlobalLock) this.openGlobalLock();
				this.openGlobalLock = getGlobalLock(drag);
				if (!this.openGlobalLock) return;
			}
			this.isDragging = true;
			this.currentDirection = null;
			this.resolveConstraints();
			if (this.visualElement.projection) {
				this.visualElement.projection.isAnimationBlocked = true;
				this.visualElement.projection.target = void 0;
			}
			/**
			* Record gesture origin
			*/
			eachAxis((axis) => {
				let current = this.getAxisMotionValue(axis).get() || 0;
				/**
				* If the MotionValue is a percentage value convert to px
				*/
				if (percent.test(current)) {
					const { projection } = this.visualElement;
					if (projection && projection.layout) {
						const measuredAxis = projection.layout.layoutBox[axis];
						if (measuredAxis) current = calcLength(measuredAxis) * (parseFloat(current) / 100);
					}
				}
				this.originPoint[axis] = current;
			});
			if (onDragStart) frame.postRender(() => onDragStart(event, info));
			addValueToWillChange(this.visualElement, "transform");
			this.state.setActive("whileDrag", true);
		};
		const onMove = (event, info) => {
			const { dragPropagation, dragDirectionLock, onDirectionLock, onDrag } = this.getProps();
			if (!dragPropagation && !this.openGlobalLock) return;
			const { offset } = info;
			if (dragDirectionLock && this.currentDirection === null) {
				this.currentDirection = getCurrentDirection(offset);
				if (this.currentDirection !== null) onDirectionLock && onDirectionLock(this.currentDirection);
				return;
			}
			this.updateAxis("x", info.point, offset);
			this.updateAxis("y", info.point, offset);
			/**
			* Ideally we would leave the renderer to fire naturally at the end of
			* this frame but if the element is about to change layout as the result
			* of a re-render we want to ensure the browser can read the latest
			* bounding box to ensure the pointer and element don't fall out of sync.
			*/
			this.visualElement.render();
			/**
			* This must fire after the render call as it might trigger a state
			* change which itself might trigger a layout update.
			*/
			onDrag && onDrag(event, info);
		};
		const onSessionEnd = (event, info) => this.stop(event, info);
		const resumeAnimation = () => eachAxis((axis) => this.getAnimationState(axis) === "paused" && this.getAxisMotionValue(axis).animation?.play());
		const { dragSnapToOrigin } = this.getProps();
		this.panSession = new PanSession(originEvent, {
			onSessionStart,
			onStart,
			onMove,
			onSessionEnd,
			resumeAnimation
		}, {
			transformPagePoint: this.visualElement.getTransformPagePoint(),
			dragSnapToOrigin,
			contextWindow: getContextWindow(this.visualElement),
			element: this.state.element
		});
	}
	stop(event, info) {
		const isDragging = this.isDragging;
		this.cancel();
		if (!isDragging) return;
		const { velocity } = info;
		this.startAnimation(velocity);
		const { onDragEnd } = this.getProps();
		if (onDragEnd) frame.postRender(() => onDragEnd(event, info));
	}
	cancel() {
		this.isDragging = false;
		const { projection } = this.visualElement;
		if (projection) projection.isAnimationBlocked = false;
		this.panSession && this.panSession.end();
		this.panSession = void 0;
		const { dragPropagation } = this.getProps();
		if (!dragPropagation && this.openGlobalLock) {
			this.openGlobalLock();
			this.openGlobalLock = null;
		}
		this.state.setActive("whileDrag", false);
	}
	updateAxis(axis, _point, offset) {
		const { drag } = this.getProps();
		if (!offset || !shouldDrag(axis, drag, this.currentDirection)) return;
		const axisValue = this.getAxisMotionValue(axis);
		let next = this.originPoint[axis] + offset[axis];
		if (this.constraints && this.constraints[axis]) next = applyConstraints(next, this.constraints[axis], this.elastic[axis]);
		axisValue.set(next);
	}
	resolveConstraints() {
		const { dragConstraints, dragElastic } = this.getProps();
		const layout = this.visualElement.projection && !this.visualElement.projection.layout ? this.visualElement.projection.measure(false) : this.visualElement.projection?.layout;
		const prevConstraints = this.constraints;
		if (dragConstraints && isHTMLElement(dragConstraints)) {
			if (!this.constraints) this.constraints = this.resolveRefConstraints();
		} else if (dragConstraints && layout) this.constraints = calcRelativeConstraints(layout.layoutBox, dragConstraints);
		else this.constraints = false;
		this.elastic = resolveDragElastic(dragElastic);
		/**
		* If we're outputting to external MotionValues, we want to rebase the measured constraints
		* from viewport-relative to component-relative.
		*/
		if (prevConstraints !== this.constraints && layout && this.constraints && !this.hasMutatedConstraints) eachAxis((axis) => {
			if (this.constraints !== false && this.getAxisMotionValue(axis)) this.constraints[axis] = rebaseAxisConstraints(layout.layoutBox[axis], this.constraints[axis]);
		});
	}
	resolveRefConstraints() {
		const { dragConstraints: constraints, onMeasureDragConstraints } = this.getProps();
		if (!constraints || !isHTMLElement(constraints)) return false;
		const constraintsElement = constraints;
		invariant(constraintsElement !== null, "If `dragConstraints` is set as a React ref, that ref must be passed to another component's `ref` prop.");
		const { projection } = this.visualElement;
		if (!projection || !projection.layout) return false;
		const constraintsBox = measurePageBox(constraintsElement, projection.root, this.visualElement.getTransformPagePoint());
		let measuredConstraints = calcViewportConstraints(projection.layout.layoutBox, constraintsBox);
		/**
		* If there's an onMeasureDragConstraints listener we call it and
		* if different constraints are returned, set constraints to that
		*/
		if (onMeasureDragConstraints) {
			const userConstraints = onMeasureDragConstraints(convertBoxToBoundingBox(measuredConstraints));
			this.hasMutatedConstraints = !!userConstraints;
			if (userConstraints) measuredConstraints = convertBoundingBoxToBox(userConstraints);
		}
		return measuredConstraints;
	}
	startAnimation(velocity) {
		const { drag, dragMomentum, dragElastic, dragTransition, dragSnapToOrigin, onDragTransitionEnd } = this.getProps();
		const constraints = this.constraints || {};
		const momentumAnimations = eachAxis((axis) => {
			if (!shouldDrag(axis, drag, this.currentDirection)) return;
			let transition = constraints && constraints[axis] || {};
			if (dragSnapToOrigin) transition = {
				min: 0,
				max: 0
			};
			/**
			* Overdamp the boundary spring if `dragElastic` is disabled. There's still a frame
			* of spring animations so we should look into adding a disable spring option to `inertia`.
			* We could do something here where we affect the `bounceStiffness` and `bounceDamping`
			* using the value of `dragElastic`.
			*/
			const bounceStiffness = dragElastic ? 200 : 1e6;
			const bounceDamping = dragElastic ? 40 : 1e7;
			const inertia = {
				type: "inertia",
				velocity: dragMomentum ? velocity[axis] : 0,
				bounceStiffness,
				bounceDamping,
				timeConstant: 750,
				restDelta: 1,
				restSpeed: 10,
				...dragTransition,
				...transition
			};
			return this.startAxisValueAnimation(axis, inertia);
		});
		return Promise.all(momentumAnimations).then(onDragTransitionEnd);
	}
	startAxisValueAnimation(axis, transition) {
		const axisValue = this.getAxisMotionValue(axis);
		addValueToWillChange(this.visualElement, axis);
		return axisValue.start(animateMotionValue(axis, axisValue, 0, transition, this.visualElement, false));
	}
	stopAnimation() {
		if (!this.visualElement.projection?.isPresent) return;
		eachAxis((axis) => this.getAxisMotionValue(axis).stop());
	}
	pauseAnimation() {
		eachAxis((axis) => this.getAxisMotionValue(axis).animation?.pause());
	}
	getAnimationState(axis) {
		return this.getAxisMotionValue(axis).animation?.state;
	}
	/**
	* Drag works differently depending on which props are provided.
	*
	* - If _dragX and _dragY are provided, we output the gesture delta directly to those motion values.
	* - Otherwise, we apply the delta to the x/y motion values.
	*/
	getAxisMotionValue(axis) {
		const dragKey = `_drag${axis.toUpperCase()}`;
		const props = this.visualElement.getProps();
		return props[dragKey] || this.visualElement.getValue(axis, (props.initial ? props.initial[axis] : void 0) || 0);
	}
	snapToCursor(point) {
		eachAxis((axis) => {
			const { drag } = this.getProps();
			if (!shouldDrag(axis, drag, this.currentDirection)) return;
			const { projection } = this.visualElement;
			const axisValue = this.getAxisMotionValue(axis);
			if (projection && projection.layout) {
				const { min, max } = projection.layout.layoutBox[axis];
				axisValue.set(point[axis] - mixNumber(min, max, .5));
			}
		});
	}
	/**
	* When the viewport resizes we want to check if the measured constraints
	* have changed and, if so, reposition the element within those new constraints
	* relative to where it was before the resize.
	*/
	scalePositionWithinConstraints() {
		if (!this.visualElement.current) return;
		const { drag, dragConstraints } = this.getProps();
		const { projection } = this.visualElement;
		if (!isHTMLElement(dragConstraints) || !projection || !this.constraints) return;
		/**
		* Stop current animations as there can be visual glitching if we try to do
		* this mid-animation
		*/
		this.stopAnimation();
		/**
		* Record the relative position of the dragged element relative to the
		* constraints box and save as a progress value.
		*/
		const boxProgress = {
			x: 0,
			y: 0
		};
		eachAxis((axis) => {
			const axisValue = this.getAxisMotionValue(axis);
			if (axisValue && this.constraints !== false) {
				const latest = axisValue.get();
				boxProgress[axis] = calcOrigin({
					min: latest,
					max: latest
				}, this.constraints[axis]);
			}
		});
		/**
		* Update the layout of this element and resolve the latest drag constraints
		*/
		const { transformTemplate } = this.visualElement.getProps();
		this.state.element.style.transform = transformTemplate ? transformTemplate({}, "") : "none";
		projection.root && projection.root.updateScroll();
		projection.updateLayout();
		this.resolveConstraints();
		/**
		* For each axis, calculate the current progress of the layout axis
		* within the new constraints.
		*/
		eachAxis((axis) => {
			if (!shouldDrag(axis, drag, null)) return;
			/**
			* Calculate a new transform based on the previous box progress
			*/
			const axisValue = this.getAxisMotionValue(axis);
			const { min, max } = this.constraints[axis];
			axisValue.set(mixNumber(min, max, boxProgress[axis]));
		});
	}
	addListeners() {
		if (!this.state.element) return;
		elementDragControls.set(this.visualElement, this);
		const element = this.state.element;
		/**
		* Attach a pointerdown event listener on this DOM element to initiate drag tracking.
		*/
		const stopPointerListener = addPointerEvent(element, "pointerdown", (event) => {
			const { drag, dragListener = true } = this.getProps();
			drag && dragListener && this.start(event);
		});
		const measureDragConstraints = () => {
			const { dragConstraints } = this.getProps();
			if (isHTMLElement(dragConstraints)) this.constraints = this.resolveRefConstraints();
		};
		const { projection } = this.visualElement;
		const stopMeasureLayoutListener = projection.addEventListener("measure", measureDragConstraints);
		if (projection && !projection.layout) {
			projection.root && projection.root.updateScroll();
			projection.updateLayout();
		}
		frame.read(measureDragConstraints);
		/**
		* Attach a window resize listener to scale the draggable target within its defined
		* constraints as the window resizes.
		*/
		const stopResizeListener = addDomEvent(window, "resize", () => this.scalePositionWithinConstraints());
		/**
		* If the element's layout changes, calculate the delta and apply that to
		* the drag gesture's origin point.
		*/
		const stopLayoutUpdateListener = projection.addEventListener("didUpdate", (({ delta, hasLayoutChanged }) => {
			if (this.isDragging && hasLayoutChanged) {
				eachAxis((axis) => {
					const motionValue = this.getAxisMotionValue(axis);
					if (!motionValue) return;
					this.originPoint[axis] += delta[axis].translate;
					motionValue.set(motionValue.get() + delta[axis].translate);
				});
				this.visualElement.render();
			}
		}));
		return () => {
			stopResizeListener();
			stopPointerListener();
			stopMeasureLayoutListener();
			stopLayoutUpdateListener && stopLayoutUpdateListener();
		};
	}
	getProps() {
		const props = this.visualElement.getProps();
		const { drag = false, dragDirectionLock = false, dragPropagation = false, dragConstraints = false, dragElastic = defaultElastic, dragMomentum = true } = props;
		return {
			...props,
			drag,
			dragDirectionLock,
			dragPropagation,
			dragConstraints,
			dragElastic,
			dragMomentum
		};
	}
};
function shouldDrag(direction, drag, currentDirection) {
	return (drag === true || drag === direction) && (currentDirection === null || currentDirection === direction);
}
/**
* Based on an x/y offset determine the current drag direction. If both axis' offsets are lower
* than the provided threshold, return `null`.
*
* @param offset - The x/y offset from origin.
* @param lockThreshold - (Optional) - the minimum absolute offset before we can determine a drag direction.
*/
function getCurrentDirection(offset, lockThreshold = 10) {
	let direction = null;
	if (Math.abs(offset.y) > lockThreshold) direction = "y";
	else if (Math.abs(offset.x) > lockThreshold) direction = "x";
	return direction;
}
//#endregion
//#region node_modules/motion-sv/dist/features/gestures/drag/index.js
var DragGesture = class extends Feature {
	static key = "drag";
	controls;
	removeGroupControls = noop;
	removeListeners = noop;
	constructor(state) {
		super(state);
		this.controls = new VisualElementDragControls(state);
	}
	mount() {
		const { dragControls } = this.state.options;
		if (dragControls) this.removeGroupControls = dragControls.subscribe(this.controls);
		this.removeListeners = this.controls.addListeners() || noop;
	}
	unmount() {
		this.removeGroupControls();
		this.removeListeners();
	}
};
//#endregion
//#region node_modules/motion-sv/dist/utils/is-hidden.js
function isHidden(element) {
	return element.style.display === "none" || element.offsetParent === null && window.getComputedStyle(element).position !== "fixed";
}
//#endregion
//#region node_modules/motion-sv/dist/features/layout/layout.js
var hasLayoutUpdate = false;
var LayoutFeature = class extends Feature {
	static key = "layout";
	hasMountSettled = false;
	constructor(state) {
		super(state);
		addScaleCorrector(defaultScaleCorrector);
		state.getSnapshot = this.getSnapshot.bind(this);
		state.didUpdate = this.didUpdate.bind(this);
	}
	updatePrevLead(projection) {
		const stack = projection.getStack();
		if (stack?.prevLead) {
			if (!stack.prevLead.snapshot) stack.prevLead.willUpdate();
			hasLayoutUpdate = true;
		}
	}
	didUpdate() {
		if (!hasLayoutUpdate) return;
		if (this.state.options.layout || this.state.options.layoutId || this.state.options.drag) {
			hasLayoutUpdate = false;
			this.state.visualElement.projection?.root?.didUpdate();
		}
	}
	mount() {
		const options = this.state.options;
		const layoutGroup = this.state.options.layoutGroup;
		if (options.layout || options.layoutId) {
			const projection = this.state.visualElement.projection;
			if (options.layoutId) {
				const isPresent = !isHidden(this.state.element);
				projection.isPresent = isPresent;
				isPresent ? projection.promote() : projection.relegate();
				this.updatePrevLead(projection);
			}
			layoutGroup?.group?.add(projection);
			globalProjectionState.hasEverUpdated = true;
		}
		this.didUpdate();
		/**
		* Allow one render frame for the projection tree and ancestor animations
		* to settle before accepting layout snapshots. Children can mount before
		* parents, so at this point the projection tree may lack the correct parent
		* link, and ancestor elements may be mid-animation (e.g. scale/position),
		* which would cause incorrect bounding rect measurements and spurious
		* layout deltas.
		*/
		frame.postRender(() => {
			this.hasMountSettled = true;
		});
	}
	unmount() {
		const layoutGroup = this.state.options.layoutGroup;
		const projection = this.state.visualElement.projection;
		if (projection) {
			if (layoutGroup?.group && (this.state.options.layout || this.state.options.layoutId)) layoutGroup.group.remove(projection);
			if (this.state.options.layoutId) projection.scheduleCheckAfterUnmount();
			else this.didUpdate();
		}
	}
	getSnapshot(newOptions, isPresent) {
		const projection = this.state.visualElement.projection;
		const { drag, layout, layoutId } = newOptions;
		if (!projection || !layout && !layoutId && !drag) return;
		/**
		* Skip snapshot capture until the mount has settled.
		*/
		if (!this.hasMountSettled) return;
		hasLayoutUpdate = true;
		/**
		* Snapshot the current layout.
		*
		* Unlike Vue, we can't gate this on a layoutDependency comparison: in the
		* Svelte port, getSnapshot always runs from an *explicit* pre-update trigger
		* (createLayoutMotion().update() or presence transitions) before the state
		* change has been applied, so old and new options are the same object and a
		* dependency comparison can never detect a change. The explicit trigger is
		* itself the opt-in, so snapshot unconditionally.
		*/
		if (drag || !isDef(isPresent) || projection.isPresent !== isPresent) {
			projection.willUpdate();
			if (layoutId && projection.instance?.isConnected) projection.snapshot = projection.measure();
		}
		/**
		* If the isPresent has changed, we need to update the projection
		* and promote or relegate the projection accordingly
		*/
		if (isDef(isPresent) && isPresent !== projection.isPresent) {
			projection.isPresent = isPresent;
			if (isPresent) {
				projection.promote();
				this.updatePrevLead(projection);
			} else projection.relegate();
		}
	}
};
//#endregion
//#region node_modules/motion-sv/dist/features/dom-max.js
var domMax = {
	renderer: createVisualElement,
	features: [
		AnimationFeature,
		PressGesture,
		HoverGesture,
		InViewGesture,
		FocusGesture,
		ProjectionFeature,
		PanGesture,
		DragGesture,
		LayoutFeature
	]
};
//#endregion
//#region node_modules/motion-sv/dist/state/style.js
function camelToDash(str) {
	return str.replace(/([A-Z])/g, (match) => `-${match.toLowerCase()}`);
}
function createHTMLRenderState() {
	return {
		transform: {},
		transformOrigin: {},
		style: {},
		vars: {}
	};
}
function createSVGRenderState() {
	return {
		...createHTMLRenderState(),
		attrs: {}
	};
}
function createStyles(latestValues) {
	const state = createHTMLRenderState();
	buildHTMLStyles(state, latestValues);
	const result = { ...state.style };
	for (const key in state.vars) result[key] = state.vars[key];
	if (Object.keys(result).length === 0) return null;
	return result;
}
function createSVGStyles(latestValues, tag, styleProp) {
	const state = createSVGRenderState();
	buildSVGAttrs(state, latestValues, isSVGTag(tag), void 0, styleProp);
	const attrs = {};
	for (const key in state.attrs) {
		const attrKey = camelCaseAttributes.has(key) ? key : camelToDash(key);
		attrs[attrKey] = state.attrs[key];
	}
	return {
		attrs,
		style: {
			...state.style,
			...state.vars
		}
	};
}
//#endregion
//#region node_modules/motion-sv/dist/components/animate-presence/presence.svelte.js
var AnimatePresenceContext = new Context("AnimatePresenceContext");
//#endregion
//#region node_modules/motion-sv/dist/components/context.js
var MotionStateContext = new Context("MotionState");
var LayoutGroupContext = new Context("LayoutGroup");
//#endregion
//#region node_modules/motion-sv/dist/components/lazy-motion/context.js
var LazyMotionContext = new Context("LazyMotionContext");
//#endregion
//#region node_modules/motion-sv/dist/features/lazy-features.js
/**
* Global lazy-loaded features registry.
* Updated by the Motion component when LazyMotion context provides features.
* Read by MotionState during feature initialization.
*/
var lazyFeatures = [];
/**
* Update the global lazy features array.
* Called from the Motion component when LazyMotion context features change.
*/
function updateLazyFeatures(features) {
	for (const feature of features) if (feature && !lazyFeatures.includes(feature)) lazyFeatures.push(feature);
}
//#endregion
//#region node_modules/motion-sv/dist/config.js
/**
* Global configuration for motion-sv.
*
* @example
* ```ts
* import { motionGlobalConfig } from "motion-sv";
* motionGlobalConfig.motionAttribute = "data-msv";
* ```
*/
var motionGlobalConfig = { 
/**
* The data attribute used to identify motion elements in the DOM.
* Used for AnimatePresence exit detection and VE parent hierarchy resolution.
*/
motionAttribute: "data-ap" };
//#endregion
//#region node_modules/motion-sv/dist/state/motion-state.js
var mountedStates = /* @__PURE__ */ new WeakMap();
/**
* Core class that manages animation state and orchestrates animations.
* Handles component lifecycle methods in the correct order based on component tree position.
*/
var MotionState = class {
	type;
	element = null;
	parent;
	isExiting = false;
	presenceContainer = null;
	/**
	* Svelte-specific: set by the Motion component when inside an AnimatePresence
	* wait-mode gate. While it returns true, the entering element holds its
	* initial values instead of running its mount animation.
	*/
	isEnterBlocked;
	/**
	* Svelte-specific: marked when this element was hidden by the wait-mode gate,
	* so the enter animation is replayed once the gate opens.
	*/
	enterWasGated = false;
	options;
	children = /* @__PURE__ */ new Set();
	latestValues;
	features = /* @__PURE__ */ new Map();
	visualElement;
	constructor(options, parent) {
		this.options = options;
		this.parent = parent;
		parent?.children?.add(this);
		this.latestValues = resolveInitialValues(options, this.context);
		this.type = isSVGElement(this.options.as) ? "svg" : "html";
	}
	_context = null;
	get context() {
		if (!this._context) {
			const handler = { get: (target, prop) => {
				const value = this.options[prop];
				if (isVariantLabel(value) || prop === "initial" && value === false) return value;
				return this.parent?.context[prop];
			} };
			this._context = new Proxy({}, handler);
		}
		return this._context;
	}
	/**
	* Initialize features from options and global lazy features
	* Features are stored by key to avoid duplicate instantiation
	*/
	updateFeatures() {
		if (!this.visualElement) return;
		for (const FeatureCtor of lazyFeatures) {
			if (!this.features.has(FeatureCtor.key)) this.features.set(FeatureCtor.key, new FeatureCtor(this));
			const feature = this.features.get(FeatureCtor.key);
			if (this.isMounted()) if (!feature.isMount) {
				feature.mount();
				feature.isMount = true;
			} else feature.update();
		}
	}
	updateOptions(options) {
		this.options = options;
		this.visualElement?.update({
			...this.options,
			whileTap: this.options.whilePress
		}, this.options.presenceContext ?? null);
	}
	mount(element) {
		invariant(Boolean(element), "Animation state must be mounted with valid Element");
		mountedStates.set(element, this);
		this.element = element;
		const presenceId = this.options.presenceContext?.presenceId;
		if (presenceId !== void 0) element.setAttribute(motionGlobalConfig.motionAttribute, presenceId);
		this.features.get("projection")?.update();
		this.visualElement?.mount(element);
		this.updateFeatures();
	}
	beforeUnmount() {
		this.getSnapshot(this.options, false);
	}
	unmount() {
		this.parent?.children?.delete(this);
		mountedStates.delete(this.element);
		this.features.forEach((f) => f.unmount?.());
		const projection = this.visualElement?.projection;
		const shouldDeferProjectionUnmount = Boolean(this.options.layoutId && projection);
		if (shouldDeferProjectionUnmount) this.visualElement.projection = void 0;
		this.visualElement?.unmount();
		if (shouldDeferProjectionUnmount && projection) {
			this.visualElement.projection = projection;
			frame.postRender(() => projection.unmount());
		}
	}
	beforeUpdate() {
		this.getSnapshot(this.options, void 0);
	}
	update() {
		this.updateFeatures();
		this.didUpdate();
	}
	tryExitComplete() {
		if (this.isExiting) return;
		if (this.options?.layoutId && this.visualElement.projection?.currentAnimation?.state === "running") return;
		this.options.presenceContext?.onMotionExitComplete?.(this.presenceContainer, this);
	}
	setActive(name, isActive) {
		if (name === "exit" && isActive) this.isExiting = true;
		this.visualElement?.animationState?.setActive(name, isActive).then(() => {
			if (name === "exit" && isActive) {
				this.isExiting = false;
				this.options?.layoutId ? frame.postRender(() => this.tryExitComplete()) : this.tryExitComplete();
			}
		});
	}
	/**
	* Svelte-specific: flip an animation type's active flag without triggering animations.
	* Used by AnimatePresence wait-mode gating, where an entering element must not adopt
	* its animate styles until blocking exits have finished.
	*/
	setActiveNoAnimate(name, isActive) {
		const typeState = this.visualElement?.animationState?.getState()?.[name];
		if (typeState) typeState.isActive = isActive;
	}
	/**
	* Svelte-specific: replay the enter animation from initial values.
	* Used by AnimatePresence wait-mode when the gate opens. The element was
	* hidden (display:none) while blocked, and its mount animation may have
	* already started or completed underneath — so we jump back to the resolved
	* initial values, reset the animation state, and run a fresh pass.
	*/
	enterFromInitial() {
		const ve = this.visualElement;
		if (!ve) return;
		ve.values.forEach((value) => value.stop());
		for (const key in this.latestValues) {
			const initial = this.latestValues[key];
			if (initial === void 0) continue;
			ve.getValue(key)?.jump(initial);
			ve.latestValues[key] = initial;
		}
		ve.animationState?.reset();
		ve.animationState?.animateChanges();
	}
	/**
	* Svelte-specific: read whether an animation type is currently active.
	* Replaces the old `activeStates` record.
	*/
	isActive(name) {
		return Boolean(this.visualElement?.animationState?.getState()?.[name]?.isActive);
	}
	isMounted() {
		return Boolean(this.element);
	}
	/**
	* Create and attach a visual element using the given renderer.
	*/
	initVisualElement(renderer) {
		if (this.visualElement) return;
		this.visualElement = renderer(this.options.as, {
			presenceContext: this.options.presenceContext ?? null,
			parent: this.parent?.visualElement,
			props: {
				...this.options,
				whileTap: this.options.whilePress
			},
			visualState: {
				renderState: {
					transform: {},
					transformOrigin: {},
					style: {},
					vars: {},
					attrs: {}
				},
				latestValues: { ...this.latestValues }
			},
			reducedMotionConfig: this.options.motionConfig?.reducedMotion
		});
		this.visualElement.parent?.addChild(this.visualElement);
		if (this.isMounted()) this.visualElement.mount(this.element);
	}
	getSnapshot(options, isPresent) {}
	didUpdate() {}
};
//#endregion
//#region node_modules/motion-sv/dist/components/motion-config/context.js
/**
* Default motion configuration
*/
var defaultConfig = {
	reducedMotion: "never",
	transition: void 0,
	nonce: void 0
};
/**
* Context for sharing motion configuration with child components
*/
var MotionConfigContext = new Context("MotionConfig");
function useMotionConfig() {
	return MotionConfigContext.getOr(() => defaultConfig);
}
//#endregion
//#region node_modules/motion-sv/dist/components/animate-presence/context.js
var PresenceManagerContext = new Context("PresenceManagerContext", {});
//#endregion
//#region node_modules/motion-sv/dist/components/motion/valid-prop.js
/**
* A list of all valid MotionProps.
*
* @privateRemarks
* This doesn't throw if a `MotionProp` name is missing - it should.
*/
var validMotionProps = /* @__PURE__ */ new Set([
	"animate",
	"exit",
	"variants",
	"initial",
	"style",
	"variants",
	"transition",
	"transformTemplate",
	"custom",
	"inherit",
	"onBeforeLayoutMeasure",
	"onAnimationStart",
	"onAnimationComplete",
	"onUpdate",
	"onDragStart",
	"onDrag",
	"onDragEnd",
	"onMeasureDragConstraints",
	"onDirectionLock",
	"onDragTransitionEnd",
	"onHoverStart",
	"onHoverEnd",
	"onViewportEnter",
	"onViewportLeave",
	"ignoreStrict",
	"forwardMotionProps",
	"as",
	"ref"
]);
/**
* Check whether a prop name is a valid `MotionProp` key.
*
* @param key - Name of the property to check
* @returns `true` is key is a valid `MotionProp`.
*
* @public
*/
function isValidMotionProp(key) {
	return key.startsWith("while") || key.startsWith("drag") && key !== "draggable" || key.startsWith("layout") || key.startsWith("onTap") || key.startsWith("onPan") || key.startsWith("onLayout") || validMotionProps.has(key);
}
//#endregion
//#region node_modules/motion-sv/dist/components/motion/motion.svelte
var VOID_TAGS = /* @__PURE__ */ new Set([
	"area",
	"base",
	"br",
	"col",
	"embed",
	"hr",
	"img",
	"input",
	"link",
	"meta",
	"param",
	"source",
	"track",
	"wbr"
]);
function Motion($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { renderer, as: AsComponent, props, ref: externalRef = void 0, forwardMotionProps = false } = $$props;
		const parentState = MotionStateContext.getOr(null);
		const layoutGroup = LayoutGroupContext.getOr({});
		const config = useMotionConfig();
		const presenceContext = AnimatePresenceContext.getOr({});
		const presenceManager = PresenceManagerContext.getOr({});
		const lazyMotionContext = LazyMotionContext.getOr({
			features: () => ({}),
			strict: false
		});
		const layoutMotionScope = LayoutMotionScopeContext.getOr(null);
		/**
		* If we're in development mode, check to make sure we're not rendering a motion component
		* as a child of LazyMotion, as this will break the file-size benefits of using it.
		*/
		if (process.env.NODE_ENV !== "production" && renderer && lazyMotionContext.strict) {
			const strictMessage = "You have rendered a `motion` component within a `LazyMotion` component. This will break tree shaking. Import and render a `m` component instead.";
			props.ignoreStrict ? warning(false, strictMessage) : invariant(false, strictMessage);
		}
		const motionOptions = derived(() => resolveMotionProps(props, {
			layoutGroup,
			presenceContext,
			config: config()
		}));
		const motionState = new MotionState(motionOptions(), parentState);
		MotionStateContext.set(motionState);
		layoutMotionScope?.register(motionState);
		if (renderer) {
			motionState.initVisualElement(renderer);
			motionState.updateFeatures();
		}
		watch.pre(() => lazyMotionContext.features(), (bundle) => {
			if (bundle.features?.length) updateLazyFeatures(bundle.features);
			if (bundle.renderer) motionState.initVisualElement(bundle.renderer);
			motionState.updateFeatures();
		});
		const getAttrs = derived(() => {
			const isSVG = motionState.type === "svg";
			const attrsProps = {};
			for (const key of Reflect.ownKeys(props)) if (typeof key === "string") {
				if (isValidMotionProp(key)) continue;
				const value = props[key];
				attrsProps[key] = isMotionValue(value) ? value.get() : value;
			} else attrsProps[key] = props[key];
			const currentValues = motionState.visualElement?.latestValues || motionState.latestValues;
			let styleSource = isSVG ? {} : currentValues;
			if (props.whileInView && props.inViewOptions?.useClipPathWorkaround && !motionState.isActive("whileInView")) {
				const filtered = {};
				for (const key in styleSource) {
					if (key === "clipPath") {
						const value = styleSource[key];
						if (typeof value === "string" && value.includes("100%")) continue;
					}
					filtered[key] = styleSource[key];
				}
				styleSource = filtered;
			}
			let styleProps = {
				...props.style,
				...styleSource
			};
			for (const key in styleProps) if (isMotionValue(styleProps[key])) styleProps[key] = styleProps[key].get();
			if (presenceManager.isWaitBlocked?.() === true && !motionState.isActive("exit")) {
				styleProps.display = "none";
				motionState.enterWasGated = true;
			}
			if (isSVG) {
				const { attrs: svgAttrs, style: svgStyle } = createSVGStyles({
					...currentValues,
					...styleProps
				}, motionState.options.as, props.style);
				Object.assign(attrsProps, svgAttrs);
				styleProps = svgStyle;
			}
			if (props.drag && props.dragListener !== false) Object.assign(styleProps, {
				userSelect: "none",
				WebkitUserSelect: "none",
				WebkitTouchCallout: "none",
				touchAction: props.drag === true ? "none" : `pan-${props.drag === "x" ? "y" : "x"}`
			});
			const style = createStyles(styleProps);
			if (style) attrsProps.style = css(style);
			return attrsProps;
		});
		derived(() => {
			const customValue = props.custom ?? presenceContext.custom;
			return resolveVariantValue(props.exit, props.variants, customValue);
		});
		watch(() => motionOptions(), (options) => {
			motionState.updateOptions(options);
			motionState.update();
		}, { lazy: true });
		if (presenceManager.isWaitBlocked) motionState.isEnterBlocked = () => run(() => presenceManager.isWaitBlocked() === true && !motionState.isActive("exit"));
		function nodeRef(node) {
			externalRef = node;
			motionState.mount(node);
			return () => {
				motionState.unmount();
			};
		}
		presenceManager.isWaitBlocked?.();
		const isInPresenceContext = AnimatePresenceContext.exists();
		presenceContext.transition;
		const shouldAllowExit = () => !!props.exit && isInPresenceContext;
		const EXITING_KEY = "__motion_exiting__";
		const onintrostart = () => shouldAllowExit() && presenceManager.onIntroStart?.(motionState.element);
		const onoutrostart = () => {
			if (!shouldAllowExit()) return;
			motionState.element[EXITING_KEY] = true;
			presenceManager.onOutroStart?.(motionState.element);
		};
		const onoutroend = () => {
			if (!shouldAllowExit()) return;
			delete motionState.element[EXITING_KEY];
			presenceManager.onOutroEnd?.(motionState.element);
		};
		const key = createAttachmentKey();
		const sharedProps = derived(() => ({
			...getAttrs(),
			[key]: nodeRef,
			onintrostart,
			onoutrostart,
			onoutroend
		}));
		if (typeof AsComponent === "string") {
			$$renderer.push("<!--[0-->");
			if (VOID_TAGS.has(AsComponent)) {
				$$renderer.push("<!--[0-->");
				element($$renderer, AsComponent, () => {
					$$renderer.push(`${attributes({ ...sharedProps() })}`);
				});
			} else {
				$$renderer.push("<!--[-1-->");
				element($$renderer, AsComponent, () => {
					$$renderer.push(`${attributes({
						...sharedProps(),
						xmlns: motionState.type === "svg" ? "http://www.w3.org/2000/svg" : void 0
					})}`);
				}, () => {
					props.children?.($$renderer);
					$$renderer.push(`<!---->`);
				});
			}
			$$renderer.push(`<!--]-->`);
		} else {
			$$renderer.push("<!--[-1-->");
			if (AsComponent) {
				$$renderer.push("<!--[-->");
				AsComponent($$renderer, spread_props([sharedProps()]));
				$$renderer.push("<!--]-->");
			} else {
				$$renderer.push("<!--[!-->");
				$$renderer.push("<!--]-->");
			}
		}
		$$renderer.push(`<!--]-->`);
		bind_props($$props, { ref: externalRef });
	});
}
//#endregion
//#region node_modules/motion-sv/dist/components/motion/utils.js
var componentMaxCache = /* @__PURE__ */ new Map();
var componentMiniCache = /* @__PURE__ */ new Map();
function createMotionComponent(component, options = {}) {
	const isString = typeof component === "string";
	isString || component.name;
	const componentCache = options.renderer ? componentMaxCache : componentMiniCache;
	if (isString && componentCache?.has(component)) return componentCache.get(component);
	const motionComponent = (anchor, props) => {
		const getAs = () => props.as || component || "div";
		return Motion(anchor, {
			renderer: options.renderer,
			get forwardMotionProps() {
				return props.forwardMotionProps || options.forwardMotionProps;
			},
			get as() {
				return getAs();
			},
			get props() {
				return withProp(props, "as", getAs());
			},
			get ref() {
				return props.ref;
			},
			set ref(value) {
				props.ref = value;
			}
		});
	};
	if (isString) componentCache?.set(component, motionComponent);
	return motionComponent;
}
function createMotionComponentWithFeatures(featureBundle) {
	const renderer = featureBundle?.renderer;
	updateLazyFeatures(featureBundle?.features || []);
	return new Proxy({}, { get(_target, key) {
		if (key === "create") return (component, options) => createMotionComponent(component, {
			...options,
			renderer
		});
		return createMotionComponent(key, { renderer });
	} });
}
//#endregion
//#region node_modules/motion-sv/dist/components/motion/instance.js
var motion = createMotionComponentWithFeatures(domMax);
//#endregion
//#region node_modules/motion-sv/dist/components/motion/layout-motion.svelte
var LayoutMotionScopeContext = new Context("LayoutMotionScope");
//#endregion
//#region src/lib/components/magic/border-beam/border-beam.svelte
function Border_beam($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { class: className, size = 50, delay = 0, duration = 6, colorFrom = "#ffaa40", colorTo = "#9c40ff", transition, reverse = false, initialOffset = 0, borderWidth = 1 } = $$props;
		const containerStyle = derived(() => `--border-beam-width: ${borderWidth}px;`);
		const beamStyle = derived(() => ({
			width: size,
			offsetPath: `rect(0 auto auto 0 round ${size}px)`,
			"--color-from": colorFrom,
			"--color-to": colorTo
		}));
		const animateConfig = derived(() => ({ offsetDistance: reverse ? [`${100 - initialOffset}%`, `${-initialOffset}%`] : [`${initialOffset}%`, `${100 + initialOffset}%`] }));
		const transitionConfig = derived(() => ({
			repeat: Infinity,
			ease: "linear",
			duration,
			delay: -delay,
			...transition
		}));
		$$renderer.push(`<div class="pointer-events-none absolute inset-0 rounded-[inherit] border-(length:--border-beam-width) border-transparent mask-[linear-gradient(transparent,transparent),linear-gradient(#000,#000)] mask-intersect [mask-clip:padding-box,border-box]"${attr_style(containerStyle())}>`);
		if (motion.div) {
			$$renderer.push("<!--[-->");
			motion.div($$renderer, {
				class: cn("absolute aspect-square", "bg-linear-to-l from-(--color-from) via-(--color-to) to-transparent", className),
				style: beamStyle(),
				initial: { offsetDistance: `${initialOffset}%` },
				animate: animateConfig(),
				transition: transitionConfig()
			});
			$$renderer.push("<!--]-->");
		} else {
			$$renderer.push("<!--[!-->");
			$$renderer.push("<!--]-->");
		}
		$$renderer.push(`</div>`);
	});
}
//#endregion
//#region src/lib/components/transfer/send/SendCode.svelte
function SendCode($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { code } = $$props;
		$$renderer.push(`<div class="flex flex-1 flex-col items-center justify-center gap-7"><div class="flex flex-col items-center gap-1.5 text-center"><p class="animate-pop text-lg font-bold tracking-tight">Ready to share</p> <p class="max-w-64 text-xs text-muted-foreground">Scan this on the other device, or read the code out to them.</p></div> <div class="flex w-full max-w-md flex-col items-center gap-5 @md:max-w-lg @md:flex-row @md:gap-6"><div class="bg-qr-background relative shrink-0 rounded-2xl border p-4 @md:p-3">`);
		Qrcode($$renderer, {
			value: code,
			class: "size-44 @md:size-32"
		});
		$$renderer.push(`<!----> `);
		if (motionOK()) {
			$$renderer.push("<!--[0-->");
			Border_beam($$renderer, {
				size: 70,
				duration: 5,
				colorFrom: "var(--tint)",
				colorTo: "var(--tint-fg)"
			});
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--></div> <div class="flex w-full min-w-0 flex-col items-center gap-2.5 @md:items-start">`);
		if (Input_group) {
			$$renderer.push("<!--[-->");
			Input_group($$renderer, {
				children: ($$renderer) => {
					if (Input_group_input) {
						$$renderer.push("<!--[-->");
						Input_group_input($$renderer, {
							readonly: true,
							value: code,
							class: "font-mono font-medium"
						});
						$$renderer.push("<!--]-->");
					} else {
						$$renderer.push("<!--[!-->");
						$$renderer.push("<!--]-->");
					}
					$$renderer.push(` `);
					if (Input_group_addon) {
						$$renderer.push("<!--[-->");
						Input_group_addon($$renderer, {
							align: "inline-end",
							children: ($$renderer) => {
								CopyButton($$renderer, {
									text: code,
									variant: "icon"
								});
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
		$$renderer.push(` <p class="text-center text-xs text-muted-foreground @md:text-left">Works until you close Floppy.</p></div></div> `);
		PendingHint($$renderer, { label: "waiting for them" });
		$$renderer.push(`<!----></div>`);
	});
}
//#endregion
//#region src/lib/components/transfer/send/SendDevice.svelte
function SendDevice($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { name, accepted } = $$props;
		$$renderer.push(`<div class="flex flex-1 flex-col items-center justify-center gap-6">`);
		DeviceGlyph($$renderer, {});
		$$renderer.push(`<!----> <div class="flex flex-col items-center gap-1.5 text-center"><p class="animate-pop text-lg font-bold tracking-tight">${escape_html(accepted ? "They said yes" : "Waiting for a yes")}</p> <p class="max-w-64 text-xs text-muted-foreground">`);
		if (accepted) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`Connecting to <span class="font-medium text-foreground">${escape_html(name)}</span>. Your files start moving on
				their own.`);
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<span class="font-medium text-foreground">${escape_html(name)}</span> has to say yes before anything leaves this device.`);
		}
		$$renderer.push(`<!--]--></p></div> `);
		PendingHint($$renderer, { label: accepted ? "connecting" : "waiting for a yes" });
		$$renderer.push(`<!----></div>`);
	});
}
//#endregion
//#region src/lib/components/transfer/files.ts
/** Short uppercase extension for the file-row badge, e.g. "PNG". */
function ext(path) {
	const name = path.split(/[\\/]/).pop() ?? path;
	const dot = name.lastIndexOf(".");
	return dot > 0 ? name.slice(dot + 1, dot + 5).toUpperCase() : "FILE";
}
var PREVIEW_EXTS = /* @__PURE__ */ new Set([
	"png",
	"jpg",
	"jpeg",
	"gif",
	"webp",
	"avif",
	"bmp",
	"svg",
	"ico"
]);
/** Whether this file can be shown as an inline image preview in its tile. */
function isPreviewable(path) {
	const name = path.split(/[\\/]/).pop() ?? path;
	const dot = name.lastIndexOf(".");
	return dot > 0 && PREVIEW_EXTS.has(name.slice(dot + 1).toLowerCase());
}
/**
* URL the webview can load to preview a local file. Served over the `thumb://`
* custom protocol (see src-tauri/src/preview.rs), which decodes and downscales
* png/jpeg/gif to a small thumbnail off the UI thread, streams other image
* types as-is, and caches per session (ETag + max-age).
*/
function previewURL(path) {
	return convertFileSrc(path, "thumb");
}
//#endregion
//#region src/lib/components/transfer/FileCard.svelte
function FileCard($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { file, arrived = false, onremove } = $$props;
		let readyPath = "";
		let failedPath = "";
		const showPreview = derived(() => !file.isDir && isPreviewable(file.path) && failedPath !== file.path);
		const loading = derived(() => showPreview() && readyPath !== file.path);
		$$renderer.push(`<div${attr_class(clsx(cn("group/tile flex h-full flex-col overflow-hidden rounded-2xl border bg-muted/30 transition-colors hover:border-send/40 hover:bg-muted/60", arrived && "animate-arrive")))}><div class="relative flex aspect-4/3 items-center justify-center bg-muted/40"><span${attr_class("flex size-11 items-center justify-center rounded-xl border bg-background/60 font-mono text-[11px] font-bold", void 0, { "animate-pulse": loading() })}>`);
		if (file.isDir) {
			$$renderer.push("<!--[0-->");
			Folder($$renderer, { class: "size-5" });
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`${escape_html(ext(file.path))}`);
		}
		$$renderer.push(`<!--]--></span> `);
		if (showPreview()) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<img${attr("src", previewURL(file.path))} alt="" loading="lazy" decoding="async"${attr_class("absolute inset-0 size-full object-cover transition-opacity", void 0, { "opacity-0": loading() })} onload="this.__e=event" onerror="this.__e=event"/>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> `);
		Button($$renderer, {
			variant: "destructive",
			size: "icon-sm",
			class: "absolute top-1.5 right-1.5 opacity-0 backdrop-blur-sm transition-opacity group-hover/tile:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100",
			onclick: onremove,
			"aria-label": `Remove ${stringify(file.name)}`,
			children: ($$renderer) => {
				X($$renderer, {});
			},
			$$slots: { default: true }
		});
		$$renderer.push(`<!----></div> <div class="flex min-w-0 flex-col border-t px-2.5 py-2"><p class="truncate text-xs font-medium"${attr("title", file.name)}>${escape_html(file.name)}</p> <p class="font-mono text-[10px] text-muted-foreground tabular-nums">${escape_html(formatBytes(file.size))}</p></div></div>`);
	});
}
//#endregion
//#region src/lib/components/transfer/send/SendQueue.svelte
function SendQueue($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const send = app.send;
		const initialPaths = new Set(send.files.map((file) => file.path));
		if (send.files.length === 0) {
			$$renderer.push("<!--[0-->");
			EmptyHero($$renderer, {
				accent: "send",
				role: "button",
				tabindex: 0,
				class: "cursor-pointer border bg-muted/40 transition-all duration-200 hover:border-send/40 hover:bg-muted/60 in-[.file-drop-target-active]:scale-[1.01] in-[.file-drop-target-active]:border-send in-[.file-drop-target-active]:bg-send/5",
				onclick: () => addFiles.start(),
				onkeydown: (e) => (e.key === "Enter" || e.key === " ") && addFiles.start(),
				children: ($$renderer) => {
					$$renderer.push(`<div class="grid *:col-start-1 *:row-start-1">`);
					if (send.picking) {
						$$renderer.push("<!--[0-->");
						$$renderer.push(`<div>`);
						PendingHint($$renderer, {
							variant: "stack",
							label: "getting files ready"
						});
						$$renderer.push(`<!----></div>`);
					} else {
						$$renderer.push("<!--[-1-->");
						$$renderer.push(`<div class="flex min-w-0 flex-col items-center gap-2">`);
						Empty_title($$renderer, {
							children: ($$renderer) => {
								$$renderer.push(`<!---->${escape_html(isPhoneChrome ? "Add files to send" : "Drop your files here")}`);
							},
							$$slots: { default: true }
						});
						$$renderer.push(`<!----> `);
						Empty_description($$renderer, {
							children: ($$renderer) => {
								if (isPhoneChrome) {
									$$renderer.push("<!--[0-->");
									$$renderer.push(`photos or files, your pick`);
								} else {
									$$renderer.push("<!--[-1-->");
									$$renderer.push(`or <span class="underline underline-offset-2">browse</span>`);
								}
								$$renderer.push(`<!--]-->`);
							},
							$$slots: { default: true }
						});
						$$renderer.push(`<!----></div>`);
					}
					$$renderer.push(`<!--]--></div>`);
				},
				$$slots: { default: true }
			});
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<div${attr_class(clsx(cn("grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-2 overflow-y-auto mask-b-from-[calc(100%-0.5rem)] @lg:grid-cols-3 @2xl:grid-cols-4 @3xl:grid-cols-5 @5xl:grid-cols-6", isPhoneChrome && "pb-20")))}><!--[-->`);
			const each_array = ensure_array_like(send.files);
			for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
				let file = each_array[$$index];
				$$renderer.push(`<div class="h-full">`);
				FileCard($$renderer, {
					file,
					arrived: !initialPaths.has(file.path),
					onremove: () => send.removeFile(file.path)
				});
				$$renderer.push(`<!----></div>`);
			}
			$$renderer.push(`<!--]--> <div class="h-full"><button type="button" class="group/add flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-dashed text-muted-foreground transition-colors hover:border-send/40 hover:bg-muted/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"><div class="flex aspect-4/3 items-center justify-center"><span class="flex size-11 items-center justify-center rounded-xl border border-dashed transition-colors group-hover/add:border-send/40">`);
			Plus($$renderer, { class: "size-5" });
			$$renderer.push(`<!----></span></div> <div class="border-t border-dashed px-2.5 py-2 text-left"><p class="truncate text-xs font-medium">Add files</p> <p class="font-mono text-[10px] text-muted-foreground">${escape_html(isPhoneChrome ? "photos or files" : "or drop them")}</p></div></button></div></div>`);
		}
		$$renderer.push(`<!--]-->`);
	});
}
//#endregion
//#region src/lib/components/ui/native-select/native-select-opt-group.svelte
function Native_select_opt_group($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, children, $$slots, $$events, ...restProps } = $$props;
		$$renderer.push(`<optgroup${attributes({
			"data-slot": "native-select-opt-group",
			...restProps
		})}>`);
		children?.($$renderer);
		$$renderer.push(`<!----><!></optgroup>`);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region src/lib/components/ui/native-select/native-select-option.svelte
function Native_select_option($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, children, $$slots, $$events, ...restProps } = $$props;
		$$renderer.option({
			this: ref,
			"data-slot": "native-select-option",
			class: cn("bg-[Canvas] text-[CanvasText]", className),
			...restProps
		}, ($$renderer) => {
			children?.($$renderer);
			$$renderer.push(`<!---->`);
		}, void 0, void 0, void 0, void 0, true);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region src/lib/components/ui/native-select/native-select.svelte
function Native_select($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, value = void 0, class: className, size = "default", children, $$slots, $$events, ...restProps } = $$props;
		$$renderer.push(`<div${attr_class(clsx(cn("cn-native-select-wrapper group/native-select relative w-fit has-[select:disabled]:opacity-50", className)))} data-slot="native-select-wrapper"${attr("data-size", size)}>`);
		$$renderer.select({
			value,
			this: ref,
			"data-slot": "native-select",
			"data-size": size,
			class: "h-9 pointer-coarse:min-h-11 w-full min-w-0 appearance-none rounded-3xl border border-transparent bg-input/50 py-1 pr-8 pl-3 text-base md:not-pointer-coarse:text-sm transition-[color,box-shadow,background-color] select-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-[size=sm]:h-8 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 outline-none disabled:pointer-events-none disabled:cursor-not-allowed",
			...restProps
		}, ($$renderer) => {
			children?.($$renderer);
			$$renderer.push(`<!---->`);
		}, void 0, void 0, void 0, void 0, true);
		$$renderer.push(` `);
		Chevron_down($$renderer, {
			class: "top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none absolute select-none",
			"aria-hidden": true,
			"data-slot": "native-select-icon"
		});
		$$renderer.push(`<!----></div>`);
		bind_props($$props, {
			ref,
			value
		});
	});
}
//#endregion
//#region src/lib/components/ui/select/select.svelte
function Select($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { open = false, value = void 0, $$slots, $$events, ...restProps } = $$props;
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (Select$1) {
				$$renderer.push("<!--[-->");
				Select$1($$renderer, spread_props([restProps, {
					get open() {
						return open;
					},
					set open($$value) {
						open = $$value;
						$$settled = false;
					},
					get value() {
						return value;
					},
					set value($$value) {
						value = $$value;
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
		bind_props($$props, {
			open,
			value
		});
	});
}
//#endregion
//#region src/lib/components/ui/select/select-group.svelte
function Select_group($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, $$slots, $$events, ...restProps } = $$props;
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (Select_group$1) {
				$$renderer.push("<!--[-->");
				Select_group$1($$renderer, spread_props([
					{
						"data-slot": "select-group",
						class: cn("scroll-my-1.5 p-1.5", className)
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
//#region src/lib/components/ui/select/select-item.svelte
function Select_item($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, value, label, children: childrenProp, $$slots, $$events, ...restProps } = $$props;
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			{
				function children($$renderer, { selected, highlighted }) {
					$$renderer.push(`<span class="absolute end-2 flex size-3.5 items-center justify-center">`);
					if (selected) {
						$$renderer.push("<!--[0-->");
						Check($$renderer, { class: "cn-select-item-indicator-icon" });
					} else $$renderer.push("<!--[-1-->");
					$$renderer.push(`<!--]--></span> <span class="flex flex-1 gap-2 shrink-0 whitespace-nowrap">`);
					if (childrenProp) {
						$$renderer.push("<!--[0-->");
						childrenProp($$renderer, {
							selected,
							highlighted
						});
						$$renderer.push(`<!---->`);
					} else {
						$$renderer.push("<!--[-1-->");
						$$renderer.push(`${escape_html(label || value)}`);
					}
					$$renderer.push(`<!--]--></span>`);
				}
				if (Select_item$1) {
					$$renderer.push("<!--[-->");
					Select_item$1($$renderer, spread_props([
						{
							value,
							"data-slot": "select-item",
							class: cn("focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground gap-2.5 rounded-2xl py-2 pr-8 pl-3 text-sm font-medium [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2 focus:bg-accent data-highlighted:bg-accent data-highlighted:text-accent-foreground focus:text-accent-foreground relative flex w-full cursor-default items-center outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0", className)
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
							children,
							$$slots: { default: true }
						}
					]));
					$$renderer.push("<!--]-->");
				} else {
					$$renderer.push("<!--[!-->");
					$$renderer.push("<!--]-->");
				}
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
//#region src/lib/components/ui/select/select-portal.svelte
function Select_portal($$renderer, $$props) {
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
//#region src/lib/components/ui/select/select-scroll-up-button.svelte
function Select_scroll_up_button($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, $$slots, $$events, ...restProps } = $$props;
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (Select_scroll_up_button$1) {
				$$renderer.push("<!--[-->");
				Select_scroll_up_button$1($$renderer, spread_props([
					{
						"data-slot": "select-scroll-up-button",
						class: cn("bg-popover z-10 flex cursor-default items-center justify-center py-1 [&_svg:not([class*='size-'])]:size-4 top-0 w-full", className)
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
							Chevron_up($$renderer, {});
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
//#region src/lib/components/ui/select/select-scroll-down-button.svelte
function Select_scroll_down_button($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, $$slots, $$events, ...restProps } = $$props;
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (Select_scroll_down_button$1) {
				$$renderer.push("<!--[-->");
				Select_scroll_down_button$1($$renderer, spread_props([
					{
						"data-slot": "select-scroll-down-button",
						class: cn("bg-popover z-10 flex cursor-default items-center justify-center py-1 [&_svg:not([class*='size-'])]:size-4 bottom-0 w-full", className)
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
							Chevron_down($$renderer, {});
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
//#region src/lib/components/ui/select/select-content.svelte
function Select_content($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, sideOffset = 4, portalProps, children, preventScroll = true, $$slots, $$events, ...restProps } = $$props;
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			Select_portal($$renderer, spread_props([portalProps, {
				children: ($$renderer) => {
					if (Select_content$1) {
						$$renderer.push("<!--[-->");
						Select_content$1($$renderer, spread_props([
							{
								sideOffset,
								preventScroll,
								"data-slot": "select-content",
								class: cn("text-popover-foreground data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/5 dark:ring-foreground/10 min-w-36 rounded-3xl shadow-lg ring-1 duration-100 data-[side=inline-start]:slide-in-from-right-2 data-[side=inline-end]:slide-in-from-left-2 isolate z-50 overflow-x-hidden overflow-y-auto animate-none! relative bg-popover/70 before:pointer-events-none before:absolute before:inset-0 before:-z-1 before:rounded-[inherit] before:backdrop-blur-2xl before:backdrop-saturate-150 **:data-[slot$=-item]:focus:bg-foreground/10 **:data-[slot$=-item]:data-highlighted:bg-foreground/10 **:data-[slot$=-separator]:bg-foreground/5 **:data-[slot$=-trigger]:focus:bg-foreground/10 **:data-[slot$=-trigger]:aria-expanded:bg-foreground/10! **:data-[variant=destructive]:focus:bg-foreground/10! **:data-[variant=destructive]:text-accent-foreground! **:data-[variant=destructive]:**:text-accent-foreground!", className)
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
									Select_scroll_up_button($$renderer, {});
									$$renderer.push(`<!----> `);
									if (Select_viewport) {
										$$renderer.push("<!--[-->");
										Select_viewport($$renderer, {
											class: cn("h-(--bits-select-anchor-height) w-full min-w-(--bits-select-anchor-width) scroll-my-1"),
											children: ($$renderer) => {
												children?.($$renderer);
												$$renderer.push(`<!---->`);
											},
											$$slots: { default: true }
										});
										$$renderer.push("<!--]-->");
									} else {
										$$renderer.push("<!--[!-->");
										$$renderer.push("<!--]-->");
									}
									$$renderer.push(` `);
									Select_scroll_down_button($$renderer, {});
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
//#region src/lib/components/ui/select/select-trigger.svelte
function Select_trigger($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, children, size = "default", $$slots, $$events, ...restProps } = $$props;
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (Select_trigger$1) {
				$$renderer.push("<!--[-->");
				Select_trigger$1($$renderer, spread_props([
					{
						"data-slot": "select-trigger",
						"data-size": size,
						class: cn("bg-input/50 data-placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/30 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 gap-1.5 rounded-3xl border border-transparent px-3 py-2 text-sm transition-[color,box-shadow,background-color] focus-visible:ring-3 aria-invalid:ring-3 data-[size=default]:h-9 data-[size=sm]:h-8 pointer-coarse:min-h-11 *:data-[slot=select-value]:flex *:data-[slot=select-value]:gap-1.5 [&_svg:not([class*='size-'])]:size-4 flex w-fit items-center justify-between whitespace-nowrap outline-none disabled:cursor-not-allowed disabled:opacity-50 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center [&_svg]:pointer-events-none [&_svg]:shrink-0", className)
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
							Chevron_down($$renderer, { class: "text-muted-foreground size-4 pointer-events-none" });
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
//#region src/lib/components/ui/select/select-separator.svelte
function Select_separator($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, $$slots, $$events, ...restProps } = $$props;
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			Separator($$renderer, spread_props([
				{
					"data-slot": "select-separator",
					class: cn("bg-border -mx-1.5 my-1.5 h-px pointer-events-none", className)
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
//#region src/lib/components/ui/select/select-group-heading.svelte
function Select_group_heading($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, children, $$slots, $$events, ...restProps } = $$props;
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (Select_group_heading$1) {
				$$renderer.push("<!--[-->");
				Select_group_heading$1($$renderer, spread_props([
					{
						"data-slot": "select-group-heading",
						class: cn("text-muted-foreground px-2 py-1.5 text-xs", className)
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
//#region src/lib/components/transfer/send/SendTargetPicker.svelte
function SendTargetPicker($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		/** 'code' for the classic phrase send, otherwise a trusted device's fingerprint. */
		let { value = void 0 } = $$props;
		const CODE_LABEL = "Anyone with a code";
		const DEVICES_LABEL = "Your devices";
		const label = derived(() => value === "code" ? CODE_LABEL : pairing.devices.find((d) => d.fingerprint === value)?.name ?? CODE_LABEL);
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			$$renderer.push(`<div class="flex h-full min-w-0 flex-1 items-center gap-2">`);
			if (pairing.devices.length === 0) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<a${attr("href", resolve("/devices"))}${attr_class(clsx(cn(buttonVariants({
					variant: "link",
					size: "sm"
				}), "min-w-0 shrink justify-start")))}>`);
				Shield_plus($$renderer, { "data-icon": "inline-start" });
				$$renderer.push(`<!----> <span class="truncate">Add a device and skip the code</span></a>`);
			} else {
				$$renderer.push("<!--[-1-->");
				if (isTouch()) {
					$$renderer.push("<!--[0-->");
					if (Native_select) {
						$$renderer.push("<!--[-->");
						Native_select($$renderer, {
							"aria-label": "Send to",
							class: "h-full w-full min-w-0 [&>select]:h-full [&>select]:border-transparent [&>select]:bg-transparent",
							get value() {
								return value;
							},
							set value($$value) {
								value = $$value;
								$$settled = false;
							},
							children: ($$renderer) => {
								if (Native_select_option) {
									$$renderer.push("<!--[-->");
									Native_select_option($$renderer, {
										value: "code",
										children: ($$renderer) => {
											$$renderer.push(`<!---->Anyone with a code`);
										},
										$$slots: { default: true }
									});
									$$renderer.push("<!--]-->");
								} else {
									$$renderer.push("<!--[!-->");
									$$renderer.push("<!--]-->");
								}
								$$renderer.push(` `);
								if (Native_select_opt_group) {
									$$renderer.push("<!--[-->");
									Native_select_opt_group($$renderer, {
										label: DEVICES_LABEL,
										children: ($$renderer) => {
											$$renderer.push(`<!--[-->`);
											const each_array = ensure_array_like(pairing.devices);
											for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
												let device = each_array[$$index];
												if (Native_select_option) {
													$$renderer.push("<!--[-->");
													Native_select_option($$renderer, {
														value: device.fingerprint,
														children: ($$renderer) => {
															$$renderer.push(`<!---->${escape_html(device.name)}`);
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
				} else {
					$$renderer.push("<!--[-1-->");
					if (Select) {
						$$renderer.push("<!--[-->");
						Select($$renderer, {
							type: "single",
							get value() {
								return value;
							},
							set value($$value) {
								value = $$value;
								$$settled = false;
							},
							children: ($$renderer) => {
								if (Select_trigger) {
									$$renderer.push("<!--[-->");
									Select_trigger($$renderer, {
										"aria-label": "Send to",
										class: "w-full min-w-0 border-transparent bg-transparent shadow-none data-[size=default]:h-full",
										children: ($$renderer) => {
											if (value === "code") {
												$$renderer.push("<!--[0-->");
												Globe($$renderer, { class: "text-muted-foreground" });
											} else {
												$$renderer.push("<!--[-1-->");
												Laptop($$renderer, { class: "text-muted-foreground" });
											}
											$$renderer.push(`<!--]--> <span class="truncate">${escape_html(label())}</span>`);
										},
										$$slots: { default: true }
									});
									$$renderer.push("<!--]-->");
								} else {
									$$renderer.push("<!--[!-->");
									$$renderer.push("<!--]-->");
								}
								$$renderer.push(` `);
								if (Select_content) {
									$$renderer.push("<!--[-->");
									Select_content($$renderer, {
										children: ($$renderer) => {
											if (Select_group) {
												$$renderer.push("<!--[-->");
												Select_group($$renderer, {
													children: ($$renderer) => {
														if (Select_item) {
															$$renderer.push("<!--[-->");
															Select_item($$renderer, {
																value: "code",
																label: CODE_LABEL,
																children: ($$renderer) => {
																	Globe($$renderer, { class: "text-muted-foreground" });
																	$$renderer.push(`<!----> Anyone with a code`);
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
											if (Select_separator) {
												$$renderer.push("<!--[-->");
												Select_separator($$renderer, {});
												$$renderer.push("<!--]-->");
											} else {
												$$renderer.push("<!--[!-->");
												$$renderer.push("<!--]-->");
											}
											$$renderer.push(` `);
											if (Select_group) {
												$$renderer.push("<!--[-->");
												Select_group($$renderer, {
													children: ($$renderer) => {
														if (Select_group_heading) {
															$$renderer.push("<!--[-->");
															Select_group_heading($$renderer, {
																children: ($$renderer) => {
																	$$renderer.push(`<!---->Your devices`);
																},
																$$slots: { default: true }
															});
															$$renderer.push("<!--]-->");
														} else {
															$$renderer.push("<!--[!-->");
															$$renderer.push("<!--]-->");
														}
														$$renderer.push(` <!--[-->`);
														const each_array_1 = ensure_array_like(pairing.devices);
														for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
															let device = each_array_1[$$index_1];
															if (Select_item) {
																$$renderer.push("<!--[-->");
																Select_item($$renderer, {
																	value: device.fingerprint,
																	label: device.name,
																	children: ($$renderer) => {
																		Laptop($$renderer, { class: "text-muted-foreground" });
																		$$renderer.push(`<!----> ${escape_html(device.name)}`);
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
				}
				$$renderer.push(`<!--]-->`);
			}
			$$renderer.push(`<!--]--></div>`);
		}
		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);
		$$renderer.subsume($$inner_renderer);
		bind_props($$props, { value });
	});
}
//#endregion
//#region src/lib/components/transfer/send/SendPanel.svelte
function SendPanel($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const send = app.send;
		const selection = derived(() => send.picked !== "code" && !pairing.devices.some((d) => d.fingerprint === send.picked) ? "code" : send.picked);
		const sendLabel = derived(() => selection() === "code" ? "Show the code" : `Send to ${pairing.devices.find((d) => d.fingerprint === selection())?.name ?? "your device"}`);
		const summary = derived(() => send.files.length === 1 ? send.files[0].name : `${send.files.length} files`);
		function dispatchSend() {
			if (selection() === "code") send.start();
			else pairing.sendTo(selection(), send.files.map((file) => file.path));
		}
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			{
				function actions($$renderer) {
					if (send.status === "idle" && send.files.length > 0) {
						$$renderer.push("<!--[0-->");
						$$renderer.push(`<div class="grid *:col-start-1 *:row-start-1">`);
						if (send.picking) {
							$$renderer.push("<!--[0-->");
							$$renderer.push(`<div>`);
							PendingHint($$renderer, {
								variant: "pill",
								label: "getting files ready"
							});
							$$renderer.push(`<!----></div>`);
						} else {
							$$renderer.push("<!--[-1-->");
							var bind_get = () => selection();
							var bind_set = (next) => send.picked = next;
							$$renderer.push(`<div class="flex h-12 items-center gap-1 rounded-full border border-border/60 bg-muted/40 p-1 shadow-sm backdrop-blur-sm pointer-coarse:h-14">`);
							SendTargetPicker($$renderer, {
								get value() {
									return bind_get();
								},
								set value($$value) {
									bind_set($$value);
								}
							});
							$$renderer.push(`<!----> `);
							Button($$renderer, {
								size: "icon-lg",
								touch: "grow",
								"aria-label": sendLabel(),
								onclick: dispatchSend,
								children: ($$renderer) => {
									if (selection() === "code") {
										$$renderer.push("<!--[0-->");
										Qr_code($$renderer, { class: "size-5" });
									} else {
										$$renderer.push("<!--[-1-->");
										Send($$renderer, { class: "size-5" });
									}
									$$renderer.push(`<!--]-->`);
								},
								$$slots: { default: true }
							});
							$$renderer.push(`<!----></div>`);
						}
						$$renderer.push(`<!--]--></div>`);
					} else if (send.status === "starting" || send.status === "waiting" || send.status === "sending") {
						$$renderer.push("<!--[1-->");
						Button($$renderer, {
							variant: "destructive",
							size: "sm",
							onclick: () => send.cancel(),
							children: ($$renderer) => {
								X($$renderer, {});
								$$renderer.push(`<!----> Cancel`);
							},
							$$slots: { default: true }
						});
					} else if (send.status === "done") {
						$$renderer.push("<!--[2-->");
						Button($$renderer, {
							variant: "outline",
							size: "sm",
							touch: "grow",
							onclick: () => send.reset(),
							children: ($$renderer) => {
								$$renderer.push(`<!---->Send something else`);
							},
							$$slots: { default: true }
						});
					} else $$renderer.push("<!--[-1-->");
					$$renderer.push(`<!--]-->`);
				}
				TransferCard($$renderer, {
					accent: "send",
					dropTarget: send.status === "idle",
					actions,
					children: ($$renderer) => {
						if (send.status === "idle") {
							$$renderer.push("<!--[0-->");
							$$renderer.push(`<div class="relative flex min-h-0 flex-1 flex-col">`);
							SendQueue($$renderer, {});
							$$renderer.push(`<!----> `);
							AddFilesSheet($$renderer, {});
							$$renderer.push(`<!----></div>`);
						} else if (send.status === "cancelling") {
							$$renderer.push("<!--[1-->");
							TransferProgress($$renderer, { label: "Stopping…" });
						} else if (send.status === "starting") {
							$$renderer.push("<!--[2-->");
							if (send.target.kind === "device") {
								$$renderer.push("<!--[0-->");
								SendDevice($$renderer, {
									name: send.target.name,
									accepted: false
								});
							} else {
								$$renderer.push("<!--[-1-->");
								TransferProgress($$renderer, { label: "Getting things ready…" });
							}
							$$renderer.push(`<!--]-->`);
						} else if (send.status === "waiting") {
							$$renderer.push("<!--[3-->");
							if (send.target.kind === "device") {
								$$renderer.push("<!--[0-->");
								SendDevice($$renderer, {
									name: send.target.name,
									accepted: true
								});
							} else {
								$$renderer.push("<!--[-1-->");
								SendCode($$renderer, { code: send.code });
							}
							$$renderer.push(`<!--]-->`);
						} else if (send.status === "sending") {
							$$renderer.push("<!--[4-->");
							TransferProgress($$renderer, {
								progress: send.progress,
								stats: send.stats,
								label: currentFile(send.stats) || summary()
							});
						} else {
							$$renderer.push("<!--[-1-->");
							TransferComplete($$renderer, {
								title: `Sent ${stringify(summary())}`,
								description: send.target.kind === "device" ? `to ${send.target.name}` : ""
							});
						}
						$$renderer.push(`<!--]-->`);
					},
					$$slots: {
						actions: true,
						default: true
					}
				});
			}
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
//#region src/lib/components/transfer/send/labels.ts
/**
* The send panel's state table, in one place.
*
* Every screen is a cell of (status × target): the statuses come from the core and
* the pairing layer, and the target decides what two of them *mean* — see
* SendTarget. Reading the flows top to bottom:
*
*   code:   idle → starting (core serving) → waiting (phrase is up, anyone may
*           bring it) → sending → done
*   device: idle → starting (offered, peer has not answered) → waiting (peer
*           accepted, transfer connecting) → sending → done
*
* Cancelling can interrupt any of the middle three and lands back on idle with
* the queue intact.
*/
/** Lowercase status line in the top bar: what is happening right now. */
function sendHeadline(status, target, fileCount) {
	switch (status) {
		case "cancelling": return "stopping";
		case "starting": return target.kind === "device" ? "waiting for a yes" : "connecting";
		case "waiting": return target.kind === "device" ? "connecting" : "waiting for pickup";
		case "sending": return "sending";
		case "done": return "all done";
		default: return fileCount ? "ready to send" : "pick your files";
	}
}
//#endregion
//#region src/routes/send/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		/** Above this, a transfer is long enough that leaving the app matters. */
		const LARGE_TRANSFER = 2e9;
		const send = app.send;
		const status = derived(() => sendHeadline(send.status, send.target, send.files.length));
		function largeTransferWarning($$renderer) {
			if (send.status === "idle" && send.totalSize > LARGE_TRANSFER) {
				$$renderer.push("<!--[0-->");
				if (Tooltip_provider) {
					$$renderer.push("<!--[-->");
					Tooltip_provider($$renderer, {
						delayDuration: 150,
						children: ($$renderer) => {
							if (Tooltip) {
								$$renderer.push("<!--[-->");
								Tooltip($$renderer, {
									children: ($$renderer) => {
										if (Tooltip_trigger) {
											$$renderer.push("<!--[-->");
											Tooltip_trigger($$renderer, {
												"aria-label": "Big transfer warning",
												class: "flex text-amber-500",
												children: ($$renderer) => {
													Triangle_alert($$renderer, { class: "size-4" });
												},
												$$slots: { default: true }
											});
											$$renderer.push("<!--]-->");
										} else {
											$$renderer.push("<!--[!-->");
											$$renderer.push("<!--]-->");
										}
										$$renderer.push(` `);
										if (Tooltip_content) {
											$$renderer.push("<!--[-->");
											Tooltip_content($$renderer, {
												class: "max-w-56 text-center",
												children: ($$renderer) => {
													$$renderer.push(`<!---->This one is big. Keep both devices awake and Floppy open until it finishes.`);
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
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]-->`);
		}
		PageShell($$renderer, {
			width: "wide",
			pad: "tight",
			gap: "none",
			children: ($$renderer) => {
				$$renderer.push(`<div class="flex min-h-0 flex-1 flex-col gap-3">`);
				PageHeader($$renderer, {
					title: "Send",
					accent: "send",
					status: status(),
					action: largeTransferWarning
				});
				$$renderer.push(`<!----> `);
				TransferError($$renderer, {
					error: send.error,
					ondismiss: () => send.error = null
				});
				$$renderer.push(`<!----> <div class="min-h-0 flex-1">`);
				SendPanel($$renderer, {});
				$$renderer.push(`<!----></div></div>`);
			},
			$$slots: { default: true }
		});
	});
}
//#endregion
export { _page as default };
