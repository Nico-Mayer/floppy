import { C as attr, T as escape_html, _ as stringify, c as attributes, g as spread_props, l as bind_props, m as props_id, o as attr_class, s as attr_style, u as derived, w as clsx } from "./index-server.js";
import { n as X, r as Check, s as Spring } from "./transfer-app.svelte.js";
import { K as cn, S as boxWith, U as Icon, V as Spinner, W as Button, c as createBitsAttrs, m as mergeProps, p as attachRef, r as createId } from "./StubMark.js";
import { i as formatRate, n as formatBytes, r as formatDuration } from "./format.js";
import { a as Empty_header, i as Empty_media, n as Empty_description, o as Empty, r as Empty_title } from "./empty.js";
import { t as Laptop } from "./laptop.js";
import { tv } from "tailwind-variants";
//#region node_modules/bits-ui/dist/bits/progress/progress.svelte.js
var progressAttrs = createBitsAttrs({
	component: "progress",
	parts: ["root"]
});
var ProgressRootState = class ProgressRootState {
	static create(opts) {
		return new ProgressRootState(opts);
	}
	opts;
	attachment;
	constructor(opts) {
		this.opts = opts;
		this.attachment = attachRef(this.opts.ref);
	}
	#props = derived(() => ({
		role: "progressbar",
		value: this.opts.value.current,
		"aria-valuemin": this.opts.min.current,
		"aria-valuemax": this.opts.max.current,
		"aria-valuenow": this.opts.value.current === null ? void 0 : this.opts.value.current,
		"data-value": this.opts.value.current === null ? void 0 : this.opts.value.current,
		"data-state": getProgressDataState(this.opts.value.current, this.opts.max.current),
		"data-max": this.opts.max.current,
		"data-min": this.opts.min.current,
		"data-indeterminate": this.opts.value.current === null ? "" : void 0,
		[progressAttrs.root]: "",
		...this.attachment
	}));
	get props() {
		return this.#props();
	}
	set props($$value) {
		return this.#props($$value);
	}
};
function getProgressDataState(value, max) {
	if (value === null) return "indeterminate";
	return value === max ? "loaded" : "loading";
}
//#endregion
//#region node_modules/bits-ui/dist/bits/progress/components/progress.svelte
function Progress$1($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const uid = props_id($$renderer);
		let { child, children, value = 0, max = 100, min = 0, id = createId(uid), ref = null, $$slots, $$events, ...restProps } = $$props;
		const rootState = ProgressRootState.create({
			value: boxWith(() => value),
			max: boxWith(() => max),
			min: boxWith(() => min),
			id: boxWith(() => id),
			ref: boxWith(() => ref, (v) => ref = v)
		});
		const mergedProps = derived(() => mergeProps(restProps, rootState.props));
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
//#region node_modules/@lucide/svelte/dist/icons/circle-alert.svelte
function Circle_alert($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "circle-alert" },
		props,
		{ iconNode: [
			["circle", {
				"cx": "12",
				"cy": "12",
				"r": "10"
			}],
			["line", {
				"x1": "12",
				"x2": "12",
				"y1": "8",
				"y2": "12"
			}],
			["line", {
				"x1": "12",
				"x2": "12.01",
				"y1": "16",
				"y2": "16"
			}]
		] }
	]));
}
//#endregion
//#region src/lib/components/ui/card/card.svelte
function Card($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, children, size = "default", $$slots, $$events, ...restProps } = $$props;
		$$renderer.push(`<div${attributes({
			"data-slot": "card",
			"data-size": size,
			class: clsx(cn("bg-card text-card-foreground ring-foreground/5 dark:ring-foreground/10 gap-(--card-spacing) overflow-hidden rounded-4xl py-(--card-spacing) text-sm shadow-md ring-1 [--card-spacing:--spacing(6)] has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(4)] *:[img:first-child]:rounded-t-4xl *:[img:last-child]:rounded-b-4xl group/card flex flex-col", className)),
			...restProps
		})}>`);
		children?.($$renderer);
		$$renderer.push(`<!----></div>`);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region src/lib/components/ui/card/card-content.svelte
function Card_content($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, children, $$slots, $$events, ...restProps } = $$props;
		$$renderer.push(`<div${attributes({
			"data-slot": "card-content",
			class: clsx(cn("px-(--card-spacing)", className)),
			...restProps
		})}>`);
		children?.($$renderer);
		$$renderer.push(`<!----></div>`);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region src/lib/components/transfer/TransferCard.svelte
var transferCardVariants = tv({
	base: "h-full transition-colors duration-200 [&.file-drop-target-active]:bg-(--tint)/5 [&.file-drop-target-active]:ring-2 [&.file-drop-target-active]:ring-(--tint)",
	variants: { chrome: {
		card: "",
		bleed: "max-sm:rounded-none max-sm:bg-transparent max-sm:py-2 max-sm:shadow-none max-sm:ring-0"
	} },
	defaultVariants: { chrome: "bleed" }
});
var slotPadding = {
	card: "",
	bleed: "max-sm:px-0"
};
function TransferCard($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { accent, dropTarget = false, chrome = "bleed", children, actions } = $$props;
		if (Card) {
			$$renderer.push("<!--[-->");
			Card($$renderer, {
				class: transferCardVariants({ chrome }),
				size: "sm",
				style: `--tint: var(--${stringify(accent)}); --tint-fg: var(--${stringify(accent)}-foreground)`,
				"data-file-drop-target": dropTarget ? "" : void 0,
				children: ($$renderer) => {
					if (Card_content) {
						$$renderer.push("<!--[-->");
						Card_content($$renderer, {
							class: cn("@container flex min-h-0 flex-1 flex-col gap-3", slotPadding[chrome]),
							children: ($$renderer) => {
								$$renderer.push(`<div class="flex min-h-0 flex-1 flex-col gap-3">`);
								children($$renderer);
								$$renderer.push(`<!----></div> `);
								if (actions) {
									$$renderer.push("<!--[0-->");
									$$renderer.push(`<div class="flex shrink-0 flex-col gap-2 [&amp;:not(:has(*))]:hidden">`);
									actions($$renderer);
									$$renderer.push(`<!----></div>`);
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
//#region src/lib/components/ui/progress/progress.svelte
function Progress($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, max = 100, value, $$slots, $$events, ...restProps } = $$props;
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (Progress$1) {
				$$renderer.push("<!--[-->");
				Progress$1($$renderer, spread_props([
					{
						"data-slot": "progress",
						class: cn("bg-muted h-3 rounded-full relative flex w-full items-center overflow-x-hidden", className),
						value,
						max
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
							$$renderer.push(`<div data-slot="progress-indicator" class="bg-primary size-full flex-1 transition-all"${attr_style(`transform: translateX(-${stringify(100 - 100 * (value ?? 0) / (max ?? 1))}%)`)}></div>`);
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
//#region src/lib/components/transfer/TransferProgress.svelte
function TransferProgress($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { progress = null, stats = null, label } = $$props;
		const eased = Spring.of(() => progress ?? 0, {
			stiffness: .08,
			damping: .9
		});
		const value = derived(() => Math.min(100, Math.max(0, eased.current)));
		let shown = derived(() => Math.round(value()));
		let detail = derived(() => {
			if (!stats) return "";
			const parts = [`${formatBytes(stats.sent)} / ${formatBytes(stats.total)}`];
			if (stats.bps > 0) parts.push(formatRate(stats.bps));
			if (stats.eta >= 0) parts.push(`${formatDuration(stats.eta)} left`);
			return parts.join(" · ");
		});
		$$renderer.push(`<div class="flex flex-1 flex-col items-center justify-center gap-4">`);
		if (progress !== null) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<p class="text-4xl font-bold tracking-tight tabular-nums">${escape_html(shown())}<span class="text-xl">%</span></p> `);
			Progress($$renderer, {
				value: value(),
				class: "w-2/3 *:data-[slot=progress-indicator]:bg-(--tint)"
			});
			$$renderer.push(`<!----> `);
			if (detail()) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<p class="font-mono text-xs tabular-nums">${escape_html(detail())}</p>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]-->`);
		} else {
			$$renderer.push("<!--[-1-->");
			Spinner($$renderer, {
				size: "panel",
				class: "text-(--tint-fg)"
			});
		}
		$$renderer.push(`<!--]--> <p class="font-mono text-xs text-muted-foreground">${escape_html(label)}</p></div>`);
	});
}
//#endregion
//#region src/lib/components/feedback/TransferComplete.svelte
function TransferComplete($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { title, description = "", mono = false } = $$props;
		$$renderer.push(`<div class="flex min-h-0 flex-1 flex-col">`);
		if (Empty) {
			$$renderer.push("<!--[-->");
			Empty($$renderer, {
				children: ($$renderer) => {
					if (Empty_header) {
						$$renderer.push("<!--[-->");
						Empty_header($$renderer, {
							children: ($$renderer) => {
								if (Empty_media) {
									$$renderer.push("<!--[-->");
									Empty_media($$renderer, {
										variant: "icon",
										class: "animate-pop",
										children: ($$renderer) => {
											Check($$renderer, { class: "text-(--tint-fg)" });
										},
										$$slots: { default: true }
									});
									$$renderer.push("<!--]-->");
								} else {
									$$renderer.push("<!--[!-->");
									$$renderer.push("<!--]-->");
								}
								$$renderer.push(` `);
								if (Empty_title) {
									$$renderer.push("<!--[-->");
									Empty_title($$renderer, {
										children: ($$renderer) => {
											$$renderer.push(`<!---->${escape_html(title)}`);
										},
										$$slots: { default: true }
									});
									$$renderer.push("<!--]-->");
								} else {
									$$renderer.push("<!--[!-->");
									$$renderer.push("<!--]-->");
								}
								$$renderer.push(` `);
								if (description) {
									$$renderer.push("<!--[0-->");
									if (mono) {
										$$renderer.push("<!--[0-->");
										if (Empty_description) {
											$$renderer.push("<!--[-->");
											Empty_description($$renderer, {
												class: "w-full truncate font-mono text-xs",
												title: description,
												children: ($$renderer) => {
													$$renderer.push(`<!---->${escape_html(description)}`);
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
										if (Empty_description) {
											$$renderer.push("<!--[-->");
											Empty_description($$renderer, {
												children: ($$renderer) => {
													$$renderer.push(`<!---->${escape_html(description)}`);
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
				},
				$$slots: { default: true }
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
//#region src/lib/components/feedback/PendingHint.svelte
function PendingHint($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { label, variant = "hint", class: className } = $$props;
		if (variant === "pill") {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div role="status"${attr_class(clsx(cn("flex h-12 w-full items-center justify-center gap-2 rounded-full border border-(--tint)/30 bg-(--tint)/10 px-4 text-sm font-medium text-(--tint) pointer-coarse:h-14", className)))}>`);
			Spinner($$renderer, { "aria-hidden": "true" });
			$$renderer.push(`<!----> ${escape_html(label)}</div>`);
		} else if (variant === "stack") {
			$$renderer.push("<!--[1-->");
			$$renderer.push(`<div role="status"${attr_class(clsx(cn("flex min-w-0 flex-col items-center gap-2", className)))}>`);
			Spinner($$renderer, {
				"aria-hidden": "true",
				size: "control",
				class: "text-muted-foreground"
			});
			$$renderer.push(`<!----> <p class="text-sm text-muted-foreground">${escape_html(label)}</p></div>`);
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<div role="status"${attr_class(clsx(cn("flex items-center gap-2 font-mono text-[11px] tracking-wider text-muted-foreground uppercase", className)))}>`);
			Spinner($$renderer, { "aria-hidden": "true" });
			$$renderer.push(`<!----> ${escape_html(label)}</div>`);
		}
		$$renderer.push(`<!--]-->`);
	});
}
//#endregion
//#region src/lib/components/transfer/DeviceGlyph.svelte
function DeviceGlyph($$renderer) {
	$$renderer.push(`<div class="flex size-20 items-center justify-center rounded-2xl border bg-muted/40">`);
	Laptop($$renderer, { class: "size-9 text-(--tint-fg)" });
	$$renderer.push(`<!----></div>`);
}
//#endregion
//#region src/lib/components/transfer/Mascot.svelte
function Mascot($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const shared = {
			ink: "#000000",
			shutter: "#A5B7C1",
			shutterLight: "#CDDCE5",
			shutterDark: "#718895",
			paper: "#FFFFFF",
			paperShade: "#D3D3D3",
			figure: "#222034",
			figureLight: "#2F2D46",
			blush: "#E5A6D1"
		};
		const shells = {
			send: {
				body: "#E2711D",
				bodyLight: "#F79D3C",
				bodyDark: "#A84B0C",
				band: "#1F4E9C",
				bandDark: "#12315F"
			},
			receive: {
				body: "#2D8BE0",
				bodyLight: "#69B1F2",
				bodyDark: "#0F5FA7",
				band: "#C62828",
				bandDark: "#911313"
			}
		};
		let { accent, class: className } = $$props;
		let c = derived(() => ({
			...shared,
			...shells[accent]
		}));
		$$renderer.push(`<div${attr_class(clsx(cn("size-16 animate-bob transition-all duration-400", className)))} aria-hidden="true"><svg version="1.1" viewBox="0 0 128 128" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><rect x="8" y="0" width="100" height="4"${attr("fill", c().ink)}></rect><rect x="6" y="2" width="2" height="6"${attr("fill", c().ink)}></rect><rect x="108" y="2" width="2" height="6"${attr("fill", c().ink)}></rect><rect x="4" y="4" width="2" height="6"${attr("fill", c().ink)}></rect><rect x="8" y="4" width="2" height="2"${attr("fill", c().ink)}></rect><rect x="10" y="4" width="18" height="2"${attr("fill", c().bodyLight)}></rect><rect x="28" y="4" width="4" height="40"${attr("fill", c().ink)}></rect><rect x="32" y="4" width="62" height="2"${attr("fill", c().shutterLight)}></rect><rect x="94" y="4" width="2" height="38"${attr("fill", c().shutterDark)}></rect><rect x="96" y="4" width="4" height="40"${attr("fill", c().ink)}></rect><rect x="100" y="4" width="4" height="2"${attr("fill", c().bodyLight)}></rect><rect x="104" y="4" width="2" height="2"${attr("fill", c().bodyDark)}></rect><rect x="106" y="4" width="2" height="2"${attr("fill", c().ink)}></rect><rect x="110" y="4" width="2" height="6"${attr("fill", c().ink)}></rect><rect x="2" y="6" width="2" height="116"${attr("fill", c().ink)}></rect><rect x="8" y="6" width="4" height="2"${attr("fill", c().bodyLight)}></rect><rect x="12" y="6" width="16" height="56"${attr("fill", c().body)}></rect><rect x="32" y="6" width="4" height="2"${attr("fill", c().shutterLight)}></rect><rect x="36" y="6" width="42" height="2"${attr("fill", c().shutter)}></rect><rect x="78" y="6" width="8" height="2"${attr("fill", c().shutterLight)}></rect><rect x="86" y="6" width="2" height="2"${attr("fill", c().shutterDark)}></rect><rect x="88" y="6" width="6" height="2"${attr("fill", c().shutter)}></rect><rect x="100" y="6" width="4" height="56"${attr("fill", c().body)}></rect><rect x="104" y="6" width="2" height="2"${attr("fill", c().bodyLight)}></rect><rect x="106" y="6" width="2" height="2"${attr("fill", c().bodyDark)}></rect><rect x="112" y="6" width="2" height="6"${attr("fill", c().ink)}></rect><rect x="0" y="8" width="2" height="112"${attr("fill", c().ink)}></rect><rect x="6" y="8" width="4" height="2"${attr("fill", c().bodyLight)}></rect><rect x="10" y="8" width="2" height="114"${attr("fill", c().body)}></rect><rect x="32" y="8" width="2" height="32"${attr("fill", c().shutterLight)}></rect><rect x="34" y="8" width="42" height="2"${attr("fill", c().shutter)}></rect><rect x="76" y="8" width="2" height="2"${attr("fill", c().shutterLight)}></rect><rect x="78" y="8" width="8" height="4"${attr("fill", c().ink)}></rect><rect x="86" y="8" width="2" height="2"${attr("fill", c().shutterLight)}></rect><rect x="88" y="8" width="2" height="2"${attr("fill", c().shutterDark)}></rect><rect x="90" y="8" width="4" height="2"${attr("fill", c().shutter)}></rect><rect x="104" y="8" width="2" height="54"${attr("fill", c().body)}></rect><rect x="106" y="8" width="2" height="2"${attr("fill", c().bodyLight)}></rect><rect x="108" y="8" width="2" height="2"${attr("fill", c().bodyDark)}></rect><rect x="114" y="8" width="2" height="6"${attr("fill", c().ink)}></rect><rect x="4" y="10" width="4" height="108"${attr("fill", c().bodyLight)}></rect><rect x="8" y="10" width="2" height="110"${attr("fill", c().body)}></rect><rect x="34" y="10" width="40" height="2"${attr("fill", c().shutter)}></rect><rect x="74" y="10" width="2" height="2"${attr("fill", c().shutterLight)}></rect><rect x="76" y="10" width="2" height="28"${attr("fill", c().ink)}></rect><rect x="86" y="10" width="2" height="28"${attr("fill", c().ink)}></rect><rect x="88" y="10" width="2" height="2"${attr("fill", c().shutterLight)}></rect><rect x="90" y="10" width="2" height="26"${attr("fill", c().shutterDark)}></rect><rect x="92" y="10" width="2" height="30"${attr("fill", c().shutter)}></rect><rect x="106" y="10" width="2" height="54"${attr("fill", c().body)}></rect><rect x="108" y="10" width="2" height="2"${attr("fill", c().bodyLight)}></rect><rect x="110" y="10" width="2" height="2"${attr("fill", c().bodyDark)}></rect><rect x="116" y="10" width="2" height="6"${attr("fill", c().ink)}></rect><rect x="34" y="12" width="38" height="28"${attr("fill", c().shutter)}></rect><rect x="72" y="12" width="2" height="24"${attr("fill", c().shutterLight)}></rect><rect x="74" y="12" width="2" height="24"${attr("fill", c().ink)}></rect><rect x="78" y="12" width="2" height="2"${attr("fill", c().ink)}></rect><rect x="80" y="12" width="4" height="24"${attr("fill", c().body)}></rect><rect x="84" y="12" width="2" height="2"${attr("fill", c().ink)}></rect><rect x="88" y="12" width="2" height="24"${attr("fill", c().ink)}></rect><rect x="108" y="12" width="2" height="54"${attr("fill", c().body)}></rect><rect x="110" y="12" width="2" height="2"${attr("fill", c().bodyLight)}></rect><rect x="112" y="12" width="2" height="2"${attr("fill", c().bodyDark)}></rect><rect x="118" y="12" width="2" height="6"${attr("fill", c().ink)}></rect><rect x="78" y="14" width="2" height="20"${attr("fill", c().body)}></rect><rect x="84" y="14" width="2" height="20"${attr("fill", c().body)}></rect><rect x="110" y="14" width="2" height="108"${attr("fill", c().body)}></rect><rect x="112" y="14" width="2" height="2"${attr("fill", c().bodyLight)}></rect><rect x="114" y="14" width="2" height="2"${attr("fill", c().bodyDark)}></rect><rect x="120" y="14" width="2" height="6"${attr("fill", c().ink)}></rect><rect x="112" y="16" width="2" height="93"${attr("fill", c().body)}></rect><rect x="114" y="16" width="2" height="2"${attr("fill", c().bodyLight)}></rect><rect x="116" y="16" width="2" height="2"${attr("fill", c().bodyDark)}></rect><rect x="122" y="16" width="2" height="6"${attr("fill", c().ink)}></rect><rect x="114" y="18" width="2" height="91"${attr("fill", c().body)}></rect><rect x="116" y="18" width="2" height="2"${attr("fill", c().bodyLight)}></rect><rect x="118" y="18" width="2" height="2"${attr("fill", c().bodyDark)}></rect><rect x="124" y="18" width="2" height="104"${attr("fill", c().ink)}></rect><rect x="116" y="20" width="2" height="100"${attr("fill", c().body)}></rect><rect x="118" y="20" width="2" height="2"${attr("fill", c().bodyLight)}></rect><rect x="120" y="20" width="2" height="100"${attr("fill", c().bodyDark)}></rect><rect x="126" y="20" width="2" height="100"${attr("fill", c().ink)}></rect><rect x="118" y="22" width="2" height="96"${attr("fill", c().body)}></rect><rect x="122" y="22" width="2" height="96"${attr("fill", c().bodyDark)}></rect><rect x="78" y="34" width="2" height="6"${attr("fill", c().ink)}></rect><rect x="84" y="34" width="2" height="6"${attr("fill", c().ink)}></rect><rect x="72" y="36" width="2" height="6"${attr("fill", c().shutter)}></rect><rect x="74" y="36" width="2" height="2"${attr("fill", c().shutterDark)}></rect><rect x="80" y="36" width="4" height="4"${attr("fill", c().ink)}></rect><rect x="88" y="36" width="2" height="2"${attr("fill", c().shutterDark)}></rect><rect x="90" y="36" width="2" height="6"${attr("fill", c().shutter)}></rect><rect x="74" y="38" width="2" height="4"${attr("fill", c().shutter)}></rect><rect x="76" y="38" width="2" height="2"${attr("fill", c().shutterDark)}></rect><rect x="86" y="38" width="2" height="2"${attr("fill", c().shutterDark)}></rect><rect x="88" y="38" width="2" height="4"${attr("fill", c().shutter)}></rect><rect x="32" y="40" width="4" height="2"${attr("fill", c().shutterDark)}></rect><rect x="36" y="40" width="36" height="2"${attr("fill", c().shutter)}></rect><rect x="76" y="40" width="2" height="2"${attr("fill", c().shutter)}></rect><rect x="78" y="40" width="8" height="4"${attr("fill", c().shutterDark)}></rect><rect x="86" y="40" width="2" height="2"${attr("fill", c().shutter)}></rect><rect x="92" y="40" width="2" height="4"${attr("fill", c().shutterDark)}></rect><rect x="32" y="42" width="2" height="6"${attr("fill", c().ink)}></rect><rect x="34" y="42" width="44" height="2"${attr("fill", c().shutterDark)}></rect><rect x="86" y="42" width="6" height="2"${attr("fill", c().shutterDark)}></rect><rect x="94" y="42" width="2" height="6"${attr("fill", c().ink)}></rect><rect x="28" y="44" width="2" height="18"${attr("fill", c().body)}></rect><rect x="30" y="44" width="2" height="2"${attr("fill", c().ink)}></rect><rect x="34" y="44" width="60" height="4"${attr("fill", c().ink)}></rect><rect x="96" y="44" width="2" height="2"${attr("fill", c().ink)}></rect><rect x="98" y="44" width="2" height="2"${attr("fill", c().bodyDark)}></rect><rect x="30" y="46" width="2" height="16"${attr("fill", c().body)}></rect><rect x="96" y="46" width="2" height="2"${attr("fill", c().bodyDark)}></rect><rect x="98" y="46" width="2" height="16"${attr("fill", c().body)}></rect><rect x="32" y="48" width="66" height="14"${attr("fill", c().body)}></rect><rect x="12" y="62" width="12" height="2"${attr("fill", c().body)}></rect><rect x="24" y="62" width="80" height="2"${attr("fill", c().bodyLight)}></rect><rect x="104" y="62" width="2" height="2"${attr("fill", c().bodyDark)}></rect><rect x="12" y="64" width="10" height="2"${attr("fill", c().body)}></rect><rect x="22" y="64" width="2" height="2"${attr("fill", c().bodyLight)}></rect><rect x="24" y="64" width="80" height="4"${attr("fill", c().ink)}></rect><rect x="104" y="64" width="2" height="2"${attr("fill", c().bodyLight)}></rect><rect x="106" y="64" width="2" height="2"${attr("fill", c().bodyDark)}></rect><rect x="12" y="66" width="8" height="2"${attr("fill", c().body)}></rect><rect x="20" y="66" width="2" height="2"${attr("fill", c().bodyLight)}></rect><rect x="22" y="66" width="2" height="52"${attr("fill", c().ink)}></rect><rect x="104" y="66" width="2" height="52"${attr("fill", c().ink)}></rect><rect x="106" y="66" width="2" height="2"${attr("fill", c().bodyLight)}></rect><rect x="108" y="66" width="2" height="50"${attr("fill", c().bodyDark)}></rect><rect x="12" y="68" width="6" height="41"${attr("fill", c().body)}></rect><rect x="18" y="68" width="2" height="48"${attr("fill", c().bodyLight)}></rect><rect x="20" y="68" width="2" height="48"${attr("fill", c().ink)}></rect><rect x="24" y="68" width="2" height="2"${attr("fill", c().ink)}></rect><rect x="26" y="68" width="76" height="2"${attr("fill", c().paper)}></rect><rect x="102" y="68" width="2" height="2"${attr("fill", c().ink)}></rect><rect x="106" y="68" width="2" height="48"${attr("fill", c().ink)}></rect><rect x="24" y="70" width="2" height="34"${attr("fill", c().paper)}></rect><rect x="26" y="70" width="76" height="2"${attr("fill", c().paperShade)}></rect><rect x="102" y="70" width="2" height="34"${attr("fill", c().paper)}></rect><rect x="26" y="72" width="76" height="1"${attr("fill", c().paper)}></rect><rect x="26" y="73" width="17" height="1"${attr("fill", c().paper)}></rect><rect x="43" y="73" width="4" height="2"${attr("fill", c().ink)}></rect><rect x="47" y="73" width="34" height="1"${attr("fill", c().paper)}></rect><rect x="81" y="73" width="4" height="2"${attr("fill", c().ink)}></rect><rect x="85" y="73" width="17" height="1"${attr("fill", c().paper)}></rect><rect x="26" y="74" width="15" height="1"${attr("fill", c().paper)}></rect><rect x="41" y="74" width="2" height="2"${attr("fill", c().ink)}></rect><rect x="47" y="74" width="2" height="2"${attr("fill", c().ink)}></rect><rect x="49" y="74" width="30" height="1"${attr("fill", c().paper)}></rect><rect x="79" y="74" width="2" height="2"${attr("fill", c().ink)}></rect><rect x="85" y="74" width="2" height="2"${attr("fill", c().ink)}></rect><rect x="87" y="74" width="15" height="1"${attr("fill", c().paper)}></rect><rect x="26" y="75" width="13" height="1"${attr("fill", c().paper)}></rect><rect x="39" y="75" width="2" height="2"${attr("fill", c().ink)}></rect><rect x="43" y="75" width="4" height="4"${attr("fill", c().figure)}></rect><rect x="49" y="75" width="2" height="2"${attr("fill", c().ink)}></rect><rect x="51" y="75" width="26" height="1"${attr("fill", c().paper)}></rect><rect x="77" y="75" width="2" height="2"${attr("fill", c().ink)}></rect><rect x="81" y="75" width="4" height="4"${attr("fill", c().figure)}></rect><rect x="87" y="75" width="2" height="2"${attr("fill", c().ink)}></rect><rect x="89" y="75" width="13" height="1"${attr("fill", c().paper)}></rect><rect x="26" y="76" width="12" height="2"${attr("fill", c().paper)}></rect><rect x="38" y="76" width="1" height="4"${attr("fill", c().ink)}></rect><rect x="41" y="76" width="2" height="2"${attr("fill", c().figure)}></rect><rect x="47" y="76" width="2" height="8"${attr("fill", c().figure)}></rect><rect x="51" y="76" width="1" height="4"${attr("fill", c().ink)}></rect><rect x="52" y="76" width="24" height="2"${attr("fill", c().paper)}></rect><rect x="76" y="76" width="1" height="4"${attr("fill", c().ink)}></rect><rect x="79" y="76" width="2" height="2"${attr("fill", c().figure)}></rect><rect x="85" y="76" width="2" height="8"${attr("fill", c().figure)}></rect><rect x="89" y="76" width="1" height="4"${attr("fill", c().ink)}></rect><rect x="90" y="76" width="12" height="2"${attr("fill", c().paper)}></rect><rect x="39" y="77" width="1" height="1"${attr("fill", c().ink)}></rect><rect x="40" y="77" width="1" height="2"${attr("fill", c().figure)}></rect><rect x="49" y="77" width="1" height="10"${attr("fill", c().figure)}></rect><rect x="50" y="77" width="1" height="1"${attr("fill", c().ink)}></rect><rect x="77" y="77" width="1" height="1"${attr("fill", c().ink)}></rect><rect x="78" y="77" width="1" height="2"${attr("fill", c().figure)}></rect><rect x="87" y="77" width="1" height="10"${attr("fill", c().figure)}></rect><rect x="88" y="77" width="1" height="1"${attr("fill", c().ink)}></rect><rect x="26" y="78" width="11" height="2"${attr("fill", c().paper)}></rect><rect x="37" y="78" width="1" height="8"${attr("fill", c().ink)}></rect><rect x="39" y="78" width="1" height="8"${attr("fill", c().figure)}></rect><rect x="41" y="78" width="2" height="4"${attr("fill", c().paper)}></rect><rect x="50" y="78" width="1" height="8"${attr("fill", c().figure)}></rect><rect x="52" y="78" width="1" height="8"${attr("fill", c().ink)}></rect><rect x="53" y="78" width="22" height="2"${attr("fill", c().paper)}></rect><rect x="75" y="78" width="1" height="8"${attr("fill", c().ink)}></rect><rect x="77" y="78" width="1" height="8"${attr("fill", c().figure)}></rect><rect x="79" y="78" width="2" height="4"${attr("fill", c().paper)}></rect><rect x="88" y="78" width="1" height="8"${attr("fill", c().figure)}></rect><rect x="90" y="78" width="1" height="8"${attr("fill", c().ink)}></rect><rect x="91" y="78" width="11" height="2"${attr("fill", c().paper)}></rect><rect x="40" y="79" width="1" height="2"${attr("fill", c().paper)}></rect><rect x="43" y="79" width="1" height="2"${attr("fill", c().paper)}></rect><rect x="44" y="79" width="3" height="5"${attr("fill", c().figure)}></rect><rect x="78" y="79" width="1" height="2"${attr("fill", c().paper)}></rect><rect x="81" y="79" width="1" height="2"${attr("fill", c().paper)}></rect><rect x="82" y="79" width="3" height="5"${attr("fill", c().figure)}></rect><rect x="26" y="80" width="8" height="2"${attr("fill", c().paperShade)}></rect><rect x="34" y="80" width="2" height="10"${attr("fill", c().paper)}></rect><rect x="36" y="80" width="1" height="4"${attr("fill", c().ink)}></rect><rect x="38" y="80" width="1" height="4"${attr("fill", c().figure)}></rect><rect x="51" y="80" width="1" height="4"${attr("fill", c().figure)}></rect><rect x="53" y="80" width="1" height="4"${attr("fill", c().ink)}></rect><rect x="54" y="80" width="2" height="20"${attr("fill", c().paper)}></rect><rect x="56" y="80" width="16" height="2"${attr("fill", c().paperShade)}></rect><rect x="72" y="80" width="2" height="20"${attr("fill", c().paper)}></rect><rect x="74" y="80" width="1" height="4"${attr("fill", c().ink)}></rect><rect x="76" y="80" width="1" height="4"${attr("fill", c().figure)}></rect><rect x="89" y="80" width="1" height="4"${attr("fill", c().figure)}></rect><rect x="91" y="80" width="1" height="4"${attr("fill", c().ink)}></rect><rect x="92" y="80" width="2" height="10"${attr("fill", c().paper)}></rect><rect x="94" y="80" width="8" height="2"${attr("fill", c().paperShade)}></rect><rect x="40" y="81" width="1" height="6"${attr("fill", c().figure)}></rect><rect x="43" y="81" width="1" height="3"${attr("fill", c().figure)}></rect><rect x="78" y="81" width="1" height="6"${attr("fill", c().figure)}></rect><rect x="81" y="81" width="1" height="3"${attr("fill", c().figure)}></rect><rect x="26" y="82" width="8" height="8"${attr("fill", c().paper)}></rect><rect x="41" y="82" width="2" height="2"${attr("fill", c().figure)}></rect><rect x="56" y="82" width="16" height="6"${attr("fill", c().paper)}></rect><rect x="79" y="82" width="2" height="2"${attr("fill", c().figure)}></rect><rect x="94" y="82" width="8" height="8"${attr("fill", c().paper)}></rect><rect x="36" y="84" width="1" height="7"${attr("fill", c().paper)}></rect><rect x="38" y="84" width="1" height="4"${attr("fill", c().ink)}></rect><rect x="41" y="84" width="1" height="4"${attr("fill", c().figure)}></rect><rect x="42" y="84" width="2" height="2"${attr("fill", c().figureLight)}></rect><rect x="44" y="84" width="2" height="5"${attr("fill", c().figure)}></rect><rect x="46" y="84" width="2" height="2"${attr("fill", c().paper)}></rect><rect x="48" y="84" width="1" height="4"${attr("fill", c().figure)}></rect><rect x="51" y="84" width="1" height="4"${attr("fill", c().ink)}></rect><rect x="53" y="84" width="1" height="16"${attr("fill", c().paper)}></rect><rect x="74" y="84" width="1" height="16"${attr("fill", c().paper)}></rect><rect x="76" y="84" width="1" height="4"${attr("fill", c().ink)}></rect><rect x="79" y="84" width="1" height="4"${attr("fill", c().figure)}></rect><rect x="80" y="84" width="2" height="2"${attr("fill", c().figureLight)}></rect><rect x="82" y="84" width="2" height="5"${attr("fill", c().figure)}></rect><rect x="84" y="84" width="2" height="2"${attr("fill", c().paper)}></rect><rect x="86" y="84" width="1" height="4"${attr("fill", c().figure)}></rect><rect x="89" y="84" width="1" height="4"${attr("fill", c().ink)}></rect><rect x="91" y="84" width="1" height="7"${attr("fill", c().paper)}></rect><rect x="37" y="86" width="1" height="6"${attr("fill", c().paper)}></rect><rect x="39" y="86" width="1" height="3"${attr("fill", c().ink)}></rect><rect x="42" y="86" width="2" height="2"${attr("fill", c().figure)}></rect><rect x="46" y="86" width="2" height="2"${attr("fill", c().figure)}></rect><rect x="50" y="86" width="1" height="3"${attr("fill", c().ink)}></rect><rect x="52" y="86" width="1" height="14"${attr("fill", c().paper)}></rect><rect x="75" y="86" width="1" height="14"${attr("fill", c().paper)}></rect><rect x="77" y="86" width="1" height="3"${attr("fill", c().ink)}></rect><rect x="80" y="86" width="2" height="2"${attr("fill", c().figure)}></rect><rect x="84" y="86" width="2" height="2"${attr("fill", c().figure)}></rect><rect x="88" y="86" width="1" height="3"${attr("fill", c().ink)}></rect><rect x="90" y="86" width="1" height="6"${attr("fill", c().paper)}></rect><rect x="40" y="87" width="1" height="2"${attr("fill", c().ink)}></rect><rect x="49" y="87" width="1" height="2"${attr("fill", c().ink)}></rect><rect x="78" y="87" width="1" height="2"${attr("fill", c().ink)}></rect><rect x="87" y="87" width="1" height="2"${attr("fill", c().ink)}></rect><rect x="38" y="88" width="1" height="12"${attr("fill", c().paper)}></rect><rect x="41" y="88" width="2" height="2"${attr("fill", c().ink)}></rect><rect x="43" y="88" width="1" height="1"${attr("fill", c().figure)}></rect><rect x="46" y="88" width="1" height="1"${attr("fill", c().figure)}></rect><rect x="47" y="88" width="2" height="2"${attr("fill", c().ink)}></rect><rect x="51" y="88" width="1" height="12"${attr("fill", c().paper)}></rect><rect x="56" y="88" width="2" height="4"${attr("fill", c().ink)}></rect><rect x="58" y="88" width="12" height="3"${attr("fill", c().paper)}></rect><rect x="70" y="88" width="2" height="4"${attr("fill", c().ink)}></rect><rect x="76" y="88" width="1" height="12"${attr("fill", c().paper)}></rect><rect x="79" y="88" width="2" height="2"${attr("fill", c().ink)}></rect><rect x="81" y="88" width="1" height="1"${attr("fill", c().figure)}></rect><rect x="84" y="88" width="1" height="1"${attr("fill", c().figure)}></rect><rect x="85" y="88" width="2" height="2"${attr("fill", c().ink)}></rect><rect x="89" y="88" width="1" height="12"${attr("fill", c().paper)}></rect><rect x="39" y="89" width="2" height="11"${attr("fill", c().paper)}></rect><rect x="43" y="89" width="4" height="2"${attr("fill", c().ink)}></rect><rect x="49" y="89" width="2" height="11"${attr("fill", c().paper)}></rect><rect x="77" y="89" width="2" height="11"${attr("fill", c().paper)}></rect><rect x="81" y="89" width="4" height="2"${attr("fill", c().ink)}></rect><rect x="87" y="89" width="2" height="11"${attr("fill", c().paper)}></rect><rect x="26" y="90" width="4" height="2"${attr("fill", c().paperShade)}></rect><rect x="30" y="90" width="4" height="1"${attr("fill", c().paper)}></rect><rect x="34" y="90" width="2" height="6"${attr("fill", c().blush)}></rect><rect x="41" y="90" width="2" height="10"${attr("fill", c().paper)}></rect><rect x="47" y="90" width="2" height="10"${attr("fill", c().paper)}></rect><rect x="79" y="90" width="2" height="10"${attr("fill", c().paper)}></rect><rect x="85" y="90" width="2" height="10"${attr("fill", c().paper)}></rect><rect x="92" y="90" width="2" height="6"${attr("fill", c().blush)}></rect><rect x="94" y="90" width="4" height="1"${attr("fill", c().paper)}></rect><rect x="98" y="90" width="4" height="2"${attr("fill", c().paperShade)}></rect><rect x="30" y="91" width="3" height="1"${attr("fill", c().paper)}></rect><rect x="33" y="91" width="1" height="4"${attr("fill", c().blush)}></rect><rect x="36" y="91" width="1" height="4"${attr("fill", c().blush)}></rect><rect x="43" y="91" width="4" height="9"${attr("fill", c().paper)}></rect><rect x="58" y="91" width="1" height="3"${attr("fill", c().ink)}></rect><rect x="59" y="91" width="10" height="1"${attr("fill", c().paper)}></rect><rect x="69" y="91" width="1" height="3"${attr("fill", c().ink)}></rect><rect x="81" y="91" width="4" height="9"${attr("fill", c().paper)}></rect><rect x="91" y="91" width="1" height="4"${attr("fill", c().blush)}></rect><rect x="94" y="91" width="1" height="4"${attr("fill", c().blush)}></rect><rect x="95" y="91" width="3" height="1"${attr("fill", c().paper)}></rect><rect x="26" y="92" width="6" height="8"${attr("fill", c().paper)}></rect><rect x="32" y="92" width="1" height="2"${attr("fill", c().blush)}></rect><rect x="37" y="92" width="1" height="2"${attr("fill", c().blush)}></rect><rect x="56" y="92" width="1" height="8"${attr("fill", c().paper)}></rect><rect x="57" y="92" width="1" height="1"${attr("fill", c().ink)}></rect><rect x="59" y="92" width="10" height="2"${attr("fill", c().ink)}></rect><rect x="70" y="92" width="1" height="1"${attr("fill", c().ink)}></rect><rect x="71" y="92" width="1" height="8"${attr("fill", c().paper)}></rect><rect x="90" y="92" width="1" height="2"${attr("fill", c().blush)}></rect><rect x="95" y="92" width="1" height="2"${attr("fill", c().blush)}></rect><rect x="96" y="92" width="6" height="8"${attr("fill", c().paper)}></rect><rect x="57" y="93" width="1" height="7"${attr("fill", c().paper)}></rect><rect x="70" y="93" width="1" height="7"${attr("fill", c().paper)}></rect><rect x="32" y="94" width="1" height="6"${attr("fill", c().paper)}></rect><rect x="37" y="94" width="1" height="6"${attr("fill", c().paper)}></rect><rect x="58" y="94" width="12" height="6"${attr("fill", c().paper)}></rect><rect x="90" y="94" width="1" height="6"${attr("fill", c().paper)}></rect><rect x="95" y="94" width="1" height="6"${attr("fill", c().paper)}></rect><rect x="33" y="95" width="1" height="5"${attr("fill", c().paper)}></rect><rect x="36" y="95" width="1" height="5"${attr("fill", c().paper)}></rect><rect x="91" y="95" width="1" height="5"${attr("fill", c().paper)}></rect><rect x="94" y="95" width="1" height="5"${attr("fill", c().paper)}></rect><rect x="34" y="96" width="2" height="4"${attr("fill", c().paper)}></rect><rect x="92" y="96" width="2" height="4"${attr("fill", c().paper)}></rect><rect x="26" y="100" width="76" height="2"${attr("fill", c().paperShade)}></rect><rect x="26" y="102" width="76" height="2"${attr("fill", c().paper)}></rect><rect x="24" y="104" width="80" height="4"${attr("fill", c().ink)}></rect><rect x="24" y="108" width="2" height="6"${attr("fill", c().bandDark)}></rect><rect x="26" y="108" width="76" height="6"${attr("fill", c().band)}></rect><rect x="102" y="108" width="2" height="6"${attr("fill", c().bandDark)}></rect><rect x="12" y="109" width="1" height="1"${attr("fill", c().body)}></rect><rect x="13" y="109" width="2" height="1"${attr("fill", c().bodyLight)}></rect><rect x="15" y="109" width="3" height="2"${attr("fill", c().body)}></rect><rect x="112" y="109" width="1" height="1"${attr("fill", c().body)}></rect><rect x="113" y="109" width="2" height="1"${attr("fill", c().bodyLight)}></rect><rect x="115" y="109" width="1" height="2"${attr("fill", c().body)}></rect><rect x="12" y="110" width="1" height="1"${attr("fill", c().bodyLight)}></rect><rect x="13" y="110" width="2" height="8"${attr("fill", c().ink)}></rect><rect x="112" y="110" width="1" height="1"${attr("fill", c().bodyLight)}></rect><rect x="113" y="110" width="2" height="8"${attr("fill", c().ink)}></rect><rect x="12" y="111" width="1" height="6"${attr("fill", c().ink)}></rect><rect x="15" y="111" width="1" height="6"${attr("fill", c().ink)}></rect><rect x="16" y="111" width="2" height="11"${attr("fill", c().body)}></rect><rect x="112" y="111" width="1" height="6"${attr("fill", c().ink)}></rect><rect x="115" y="111" width="1" height="6"${attr("fill", c().ink)}></rect><rect x="24" y="114" width="2" height="6"${attr("fill", c().ink)}></rect><rect x="26" y="114" width="76" height="2"${attr("fill", c().bandDark)}></rect><rect x="102" y="114" width="2" height="6"${attr("fill", c().ink)}></rect><rect x="18" y="116" width="2" height="6"${attr("fill", c().body)}></rect><rect x="20" y="116" width="2" height="2"${attr("fill", c().bodyDark)}></rect><rect x="26" y="116" width="76" height="4"${attr("fill", c().ink)}></rect><rect x="106" y="116" width="2" height="2"${attr("fill", c().bodyDark)}></rect><rect x="108" y="116" width="2" height="6"${attr("fill", c().body)}></rect><rect x="12" y="117" width="1" height="5"${attr("fill", c().body)}></rect><rect x="15" y="117" width="1" height="1"${attr("fill", c().bodyDark)}></rect><rect x="112" y="117" width="1" height="5"${attr("fill", c().body)}></rect><rect x="115" y="117" width="1" height="1"${attr("fill", c().bodyDark)}></rect><rect x="4" y="118" width="2" height="6"${attr("fill", c().ink)}></rect><rect x="6" y="118" width="2" height="2"${attr("fill", c().bodyLight)}></rect><rect x="13" y="118" width="2" height="1"${attr("fill", c().bodyDark)}></rect><rect x="15" y="118" width="1" height="4"${attr("fill", c().body)}></rect><rect x="20" y="118" width="2" height="4"${attr("fill", c().body)}></rect><rect x="22" y="118" width="2" height="2"${attr("fill", c().bodyDark)}></rect><rect x="104" y="118" width="2" height="2"${attr("fill", c().bodyDark)}></rect><rect x="106" y="118" width="2" height="4"${attr("fill", c().body)}></rect><rect x="113" y="118" width="2" height="1"${attr("fill", c().bodyDark)}></rect><rect x="115" y="118" width="1" height="4"${attr("fill", c().body)}></rect><rect x="118" y="118" width="2" height="4"${attr("fill", c().bodyDark)}></rect><rect x="122" y="118" width="2" height="6"${attr("fill", c().ink)}></rect><rect x="13" y="119" width="2" height="3"${attr("fill", c().body)}></rect><rect x="113" y="119" width="2" height="3"${attr("fill", c().body)}></rect><rect x="6" y="120" width="2" height="6"${attr("fill", c().ink)}></rect><rect x="8" y="120" width="2" height="2"${attr("fill", c().bodyDark)}></rect><rect x="22" y="120" width="2" height="2"${attr("fill", c().body)}></rect><rect x="24" y="120" width="80" height="4"${attr("fill", c().bodyDark)}></rect><rect x="104" y="120" width="2" height="2"${attr("fill", c().body)}></rect><rect x="116" y="120" width="2" height="4"${attr("fill", c().bodyDark)}></rect><rect x="120" y="120" width="2" height="6"${attr("fill", c().ink)}></rect><rect x="8" y="122" width="2" height="6"${attr("fill", c().ink)}></rect><rect x="10" y="122" width="14" height="2"${attr("fill", c().bodyDark)}></rect><rect x="104" y="122" width="12" height="2"${attr("fill", c().bodyDark)}></rect><rect x="118" y="122" width="2" height="6"${attr("fill", c().ink)}></rect><rect x="10" y="124" width="108" height="4"${attr("fill", c().ink)}></rect></svg></div>`);
	});
}
//#endregion
//#region src/lib/components/feedback/EmptyHero.svelte
function EmptyHero($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { accent, class: className, children, $$slots, $$events, ...rest } = $$props;
		if (Empty) {
			$$renderer.push("<!--[-->");
			Empty($$renderer, spread_props([
				{ class: cn("p-6 @md:p-8", className) },
				rest,
				{
					children: ($$renderer) => {
						if (Empty_header) {
							$$renderer.push("<!--[-->");
							Empty_header($$renderer, {
								class: "@md:max-w-none @md:gap-6",
								children: ($$renderer) => {
									if (Empty_media) {
										$$renderer.push("<!--[-->");
										Empty_media($$renderer, {
											class: "@md:mb-0",
											children: ($$renderer) => {
												Mascot($$renderer, {
													accent,
													class: "size-20 @md:size-24"
												});
											},
											$$slots: { default: true }
										});
										$$renderer.push("<!--]-->");
									} else {
										$$renderer.push("<!--[!-->");
										$$renderer.push("<!--]-->");
									}
									$$renderer.push(` `);
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
					},
					$$slots: { default: true }
				}
			]));
			$$renderer.push("<!--]-->");
		} else {
			$$renderer.push("<!--[!-->");
			$$renderer.push("<!--]-->");
		}
	});
}
//#endregion
//#region src/lib/components/ui/alert/alert.svelte
var alertVariants = tv({
	base: "grid gap-0.5 rounded-2xl border px-4 py-3 text-left text-sm has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2.5 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current *:[svg:not([class*='size-'])]:size-4 group/alert relative w-full",
	variants: { variant: {
		default: "bg-card text-card-foreground",
		destructive: "text-destructive bg-card *:data-[slot=alert-description]:text-destructive/90 *:[svg]:text-current"
	} },
	defaultVariants: { variant: "default" }
});
function Alert($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, variant = "default", children, $$slots, $$events, ...restProps } = $$props;
		$$renderer.push(`<div${attributes({
			"data-slot": "alert",
			role: "alert",
			class: clsx(cn(alertVariants({ variant }), className)),
			...restProps
		})}>`);
		children?.($$renderer);
		$$renderer.push(`<!----></div>`);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region src/lib/components/ui/alert/alert-description.svelte
function Alert_description($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, children, $$slots, $$events, ...restProps } = $$props;
		$$renderer.push(`<div${attributes({
			"data-slot": "alert-description",
			class: clsx(cn("text-muted-foreground text-sm text-balance md:text-pretty [&_p:not(:last-child)]:mb-4 [&_a]:hover:text-foreground [&_a]:underline [&_a]:underline-offset-3", className)),
			...restProps
		})}>`);
		children?.($$renderer);
		$$renderer.push(`<!----></div>`);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region src/lib/components/ui/alert/alert-title.svelte
function Alert_title($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, children, $$slots, $$events, ...restProps } = $$props;
		$$renderer.push(`<div${attributes({
			"data-slot": "alert-title",
			class: clsx(cn("font-heading font-medium group-has-[>svg]/alert:col-start-2 [&_a]:hover:text-foreground [&_a]:underline [&_a]:underline-offset-3", className)),
			...restProps
		})}>`);
		children?.($$renderer);
		$$renderer.push(`<!----></div>`);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region src/lib/components/ui/alert/alert-action.svelte
function Alert_action($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, children, $$slots, $$events, ...restProps } = $$props;
		$$renderer.push(`<div${attributes({
			"data-slot": "alert-action",
			class: clsx(cn("absolute top-2.5 right-3", className)),
			...restProps
		})}>`);
		children?.($$renderer);
		$$renderer.push(`<!----></div>`);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region src/lib/components/transfer/TransferError.svelte
function TransferError($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { error, ondismiss } = $$props;
		if (error) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div>`);
			if (Alert) {
				$$renderer.push("<!--[-->");
				Alert($$renderer, {
					variant: "destructive",
					class: "animate-shake",
					children: ($$renderer) => {
						Circle_alert($$renderer, {});
						$$renderer.push(`<!----> `);
						if (Alert_title) {
							$$renderer.push("<!--[-->");
							Alert_title($$renderer, {
								children: ($$renderer) => {
									$$renderer.push(`<!---->${escape_html(error.title)}`);
								},
								$$slots: { default: true }
							});
							$$renderer.push("<!--]-->");
						} else {
							$$renderer.push("<!--[!-->");
							$$renderer.push("<!--]-->");
						}
						$$renderer.push(` `);
						if (Alert_description) {
							$$renderer.push("<!--[-->");
							Alert_description($$renderer, {
								title: error.detail,
								children: ($$renderer) => {
									$$renderer.push(`<!---->${escape_html(error.message)}`);
								},
								$$slots: { default: true }
							});
							$$renderer.push("<!--]-->");
						} else {
							$$renderer.push("<!--[!-->");
							$$renderer.push("<!--]-->");
						}
						$$renderer.push(` `);
						if (Alert_action) {
							$$renderer.push("<!--[-->");
							Alert_action($$renderer, {
								children: ($$renderer) => {
									Button($$renderer, {
										variant: "ghost",
										size: "icon-xs",
										onclick: ondismiss,
										"aria-label": "Dismiss",
										children: ($$renderer) => {
											X($$renderer, {});
										},
										$$slots: { default: true }
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
			$$renderer.push(`</div>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
	});
}
//#endregion
export { TransferComplete as a, PendingHint as i, EmptyHero as n, TransferProgress as o, DeviceGlyph as r, TransferCard as s, TransferError as t };
