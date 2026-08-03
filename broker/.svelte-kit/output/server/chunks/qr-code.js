import { C as attr, c as attributes, f as ensure_array_like, g as spread_props, u as derived, w as clsx } from "./index-server.js";
import { i as haptics, r as Check } from "./transfer-app.svelte.js";
import { K as cn, U as Icon, W as Button } from "./StubMark.js";
import { S as Clipboard } from "./ipc.js";
import { r as toast } from "./pairing-app.svelte.js";
import { c as Input_group_button } from "./empty.js";
import QRCodePackage from "qrcode";
//#region node_modules/@lucide/svelte/dist/icons/copy.svelte
function Copy($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "copy" },
		props,
		{ iconNode: [["rect", {
			"width": "14",
			"height": "14",
			"x": "8",
			"y": "8",
			"rx": "2",
			"ry": "2"
		}], ["path", { "d": "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" }]] }
	]));
}
//#endregion
//#region src/lib/components/feedback/CopyButton.svelte
function CopyButton($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { text, variant = "label", disabled = false } = $$props;
		let copied = false;
		let resetTimer;
		async function copy() {
			try {
				await Clipboard.SetText(text);
			} catch {
				try {
					await navigator.clipboard.writeText(text);
				} catch {
					toast.error("Couldn't copy that.");
					return;
				}
			}
			copied = true;
			haptics.copied();
			clearTimeout(resetTimer);
			resetTimer = setTimeout(() => copied = false, 2e3);
		}
		if (variant === "icon") {
			$$renderer.push("<!--[0-->");
			if (Input_group_button) {
				$$renderer.push("<!--[-->");
				Input_group_button($$renderer, {
					size: "icon-xs",
					disabled,
					onclick: copy,
					"aria-label": "Copy code",
					children: ($$renderer) => {
						if (copied) {
							$$renderer.push("<!--[0-->");
							$$renderer.push(`<span>`);
							Check($$renderer, { class: "text-(--tint-fg)" });
							$$renderer.push(`<!----></span>`);
						} else {
							$$renderer.push("<!--[-1-->");
							$$renderer.push(`<span>`);
							Copy($$renderer, {});
							$$renderer.push(`<!----></span>`);
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
		} else {
			$$renderer.push("<!--[-1-->");
			Button($$renderer, {
				variant: "secondary",
				class: "flex-1",
				disabled,
				onclick: copy,
				children: ($$renderer) => {
					if (copied) {
						$$renderer.push("<!--[0-->");
						Check($$renderer, { "data-icon": "inline-start" });
						$$renderer.push(`<!----> Copied`);
					} else {
						$$renderer.push("<!--[-1-->");
						Copy($$renderer, { "data-icon": "inline-start" });
						$$renderer.push(`<!----> Copy code`);
					}
					$$renderer.push(`<!--]-->`);
				},
				$$slots: { default: true }
			});
		}
		$$renderer.push(`<!--]-->`);
	});
}
//#endregion
//#region src/lib/components/spell/qrcode/qrcode.svelte
function Qrcode($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const QRCodeLib = QRCodePackage;
		function isInFinderPattern(row, col, size) {
			return row < 7 && col < 7 || row < 7 && col >= size - 7 || row >= size - 7 && col < 7;
		}
		let { value, size = 268, fgColor = "var(--card-foreground)", bgColor = "var(--card)", errorCorrectionLevel = "M", class: className, $$slots, $$events, ...restProps } = $$props;
		let qrData = derived(() => {
			try {
				return QRCodeLib.create(value, { errorCorrectionLevel });
			} catch {
				return null;
			}
		});
		let moduleCount = derived(() => qrData()?.modules.size ?? 0);
		let moduleSize = derived(() => moduleCount() ? size / moduleCount() : 0);
		let totalSize = derived(() => size);
		let circleRadius = derived(() => moduleSize() / 3);
		let finderPositions = derived(() => [
			[0, 0],
			[0, moduleCount() - 7],
			[moduleCount() - 7, 0]
		]);
		let finderSize = derived(() => 7 * moduleSize());
		let innerPadding = derived(moduleSize);
		let innerWhiteSize = derived(() => 5 * moduleSize());
		let innerBlackSize = derived(() => 3 * moduleSize());
		let dots = derived(() => {
			if (!qrData()) return "";
			const r = circleRadius();
			let path = "";
			for (let row = 0; row < moduleCount(); row++) for (let col = 0; col < moduleCount(); col++) if (qrData().modules.get(row, col) && !isInFinderPattern(row, col, moduleCount())) {
				const cx = (col + .5) * moduleSize();
				const cy = (row + .5) * moduleSize();
				path += `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0`;
			}
			return path;
		});
		if (qrData()) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<svg${attributes({
				width: totalSize(),
				height: totalSize(),
				viewBox: `0 0 ${totalSize()} ${totalSize()}`,
				xmlns: "http://www.w3.org/2000/svg",
				"aria-label": `QR code for ${value}`,
				class: clsx(cn("block", className)),
				...restProps
			}, void 0, void 0, void 0, 3)}><rect${attr("width", totalSize())}${attr("height", totalSize())}${attr("fill", bgColor)} rx="12" ry="12"></rect><!--[-->`);
			const each_array = ensure_array_like(finderPositions());
			for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
				let [row, col] = each_array[$$index];
				const x = col * moduleSize();
				const y = row * moduleSize();
				$$renderer.push(`<g><rect${attr("x", x)}${attr("y", y)}${attr("width", finderSize())}${attr("height", finderSize())}${attr("fill", fgColor)} rx="12" ry="12"></rect><rect${attr("x", x + innerPadding())}${attr("y", y + innerPadding())}${attr("width", innerWhiteSize())}${attr("height", innerWhiteSize())}${attr("fill", bgColor)} rx="8" ry="8"></rect><rect${attr("x", x + innerPadding() * 2)}${attr("y", y + innerPadding() * 2)}${attr("width", innerBlackSize())}${attr("height", innerBlackSize())}${attr("fill", fgColor)} rx="3" ry="3"></rect></g>`);
			}
			$$renderer.push(`<!--]--><path${attr("d", dots())}${attr("fill", fgColor)}></path></svg>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
	});
}
//#endregion
//#region node_modules/@lucide/svelte/dist/icons/plus.svelte
function Plus($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "plus" },
		props,
		{ iconNode: [["path", { "d": "M5 12h14" }], ["path", { "d": "M12 5v14" }]] }
	]));
}
//#endregion
//#region node_modules/@lucide/svelte/dist/icons/qr-code.svelte
function Qr_code($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "qr-code" },
		props,
		{ iconNode: [
			["rect", {
				"width": "5",
				"height": "5",
				"x": "3",
				"y": "3",
				"rx": "1"
			}],
			["rect", {
				"width": "5",
				"height": "5",
				"x": "16",
				"y": "3",
				"rx": "1"
			}],
			["rect", {
				"width": "5",
				"height": "5",
				"x": "3",
				"y": "16",
				"rx": "1"
			}],
			["path", { "d": "M21 16h-3a2 2 0 0 0-2 2v3" }],
			["path", { "d": "M21 21v.01" }],
			["path", { "d": "M12 7v3a2 2 0 0 1-2 2H7" }],
			["path", { "d": "M3 12h.01" }],
			["path", { "d": "M12 3h.01" }],
			["path", { "d": "M12 16v.01" }],
			["path", { "d": "M16 12h1" }],
			["path", { "d": "M21 12v.01" }],
			["path", { "d": "M12 21v-1" }]
		] }
	]));
}
//#endregion
export { CopyButton as i, Plus as n, Qrcode as r, Qr_code as t };
