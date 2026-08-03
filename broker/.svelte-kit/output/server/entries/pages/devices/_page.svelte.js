import { C as attr, T as escape_html, _ as stringify, c as attributes, f as ensure_array_like, g as spread_props, l as bind_props, o as attr_class, u as derived, w as clsx } from "../../../chunks/index-server.js";
import { n as X, r as Check } from "../../../chunks/transfer-app.svelte.js";
import { K as cn, U as Icon, V as Spinner, W as Button, n as Input } from "../../../chunks/StubMark.js";
import { D as errorText } from "../../../chunks/ipc.js";
import { a as Responsive_dialog_title, c as Responsive_dialog_header, d as canScan, f as openSettings, i as Responsive_dialog_description, l as Responsive_dialog_content, n as Skeleton, o as Responsive_dialog_footer, p as scanner, r as BusyButton, s as Responsive_dialog_body, t as Info, u as Responsive_dialog } from "../../../chunks/info.js";
import "../../../chunks/separator.js";
import { r as toast, t as pairing } from "../../../chunks/pairing-app.svelte.js";
import { c as Field, r as Field_label } from "../../../chunks/field.js";
import { t as Monitor_smartphone } from "../../../chunks/monitor-smartphone.js";
import { n as PageHeader, t as PageShell } from "../../../chunks/PageShell.js";
import { a as Empty_header, i as Empty_media, n as Empty_description, o as Empty, r as Empty_title, t as Empty_content } from "../../../chunks/empty.js";
import { i as CopyButton, n as Plus, r as Qrcode, t as Qr_code } from "../../../chunks/qr-code.js";
import { t as Laptop } from "../../../chunks/laptop.js";
import { n as isCompleteCode, t as CodeInput } from "../../../chunks/CodeInput.js";
import { tv } from "tailwind-variants";
import { funEmoji } from "@dicebear/collection";
import { createAvatar } from "@dicebear/core";
//#region node_modules/@lucide/svelte/dist/icons/refresh-cw.svelte
function Refresh_cw($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "refresh-cw" },
		props,
		{ iconNode: [
			["path", { "d": "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" }],
			["path", { "d": "M21 3v5h-5" }],
			["path", { "d": "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" }],
			["path", { "d": "M8 16H3v5" }]
		] }
	]));
}
//#endregion
//#region src/lib/components/devices/CodePanel.svelte
function CodePanel($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { open = false } = $$props;
		let code = null;
		let making = false;
		/** Minting failed. Reported inline — the panel is the flow the user is inside. */
		let failed = false;
		/** Whole seconds since this code was shown, ticked by the interval below. */
		let elapsed = 0;
		/** The other device redeemed this code, so it is gone whatever the clock says. */
		let used = false;
		const remaining = derived(() => code ? Math.max(0, code.seconds - elapsed) : 0);
		const spent = derived(() => code !== null && (used || remaining() === 0));
		const clock = derived(() => `${Math.floor(remaining() / 60)}:${String(remaining() % 60).padStart(2, "0")}`);
		async function showCode() {
			making = true;
			failed = false;
			used = false;
			elapsed = 0;
			try {
				code = await pairing.showCode();
			} catch {
				failed = true;
			} finally {
				making = false;
			}
		}
		pairing.paired;
		async function newCode() {
			await showCode();
		}
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (Responsive_dialog) {
				$$renderer.push("<!--[-->");
				Responsive_dialog($$renderer, {
					get open() {
						return open;
					},
					set open($$value) {
						open = $$value;
						$$settled = false;
					},
					children: ($$renderer) => {
						if (Responsive_dialog_content) {
							$$renderer.push("<!--[-->");
							Responsive_dialog_content($$renderer, {
								class: "sm:max-w-lg",
								children: ($$renderer) => {
									if (Responsive_dialog_header) {
										$$renderer.push("<!--[-->");
										Responsive_dialog_header($$renderer, {
											children: ($$renderer) => {
												if (Responsive_dialog_title) {
													$$renderer.push("<!--[-->");
													Responsive_dialog_title($$renderer, {
														children: ($$renderer) => {
															$$renderer.push(`<!---->Your code`);
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
															$$renderer.push(`<!---->Scan or type it on the device you want to add.`);
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
									if (Responsive_dialog_body) {
										$$renderer.push("<!--[-->");
										Responsive_dialog_body($$renderer, {
											class: "flex flex-col gap-3",
											children: ($$renderer) => {
												$$renderer.push(`<div class="relative flex h-64 items-center justify-center">`);
												if (failed) {
													$$renderer.push("<!--[0-->");
													$$renderer.push(`<p class="max-w-64 text-center text-sm text-destructive">Couldn't make a code. Try again in a moment.</p>`);
												} else if (spent()) {
													$$renderer.push("<!--[1-->");
													$$renderer.push(`<p class="text-sm text-muted-foreground">${escape_html(used ? "That code has been used." : "That code has run out.")}</p>`);
												} else {
													$$renderer.push("<!--[-1-->");
													$$renderer.push(`<div class="flex w-full flex-col items-center"><div class="bg-qr-background rounded-2xl border p-3">`);
													if (code) {
														$$renderer.push("<!--[0-->");
														Qrcode($$renderer, {
															value: code.code,
															class: "size-36"
														});
													} else {
														$$renderer.push("<!--[-1-->");
														$$renderer.push(`<div class="flex size-36 items-center justify-center">`);
														if (making) {
															$$renderer.push("<!--[0-->");
															Spinner($$renderer, {
																size: "control",
																class: "text-muted-foreground"
															});
														} else $$renderer.push("<!--[-1-->");
														$$renderer.push(`<!--]--></div>`);
													}
													$$renderer.push(`<!--]--></div> <p class="flex h-14 items-center justify-center px-2 text-center font-mono text-base font-medium sm:text-lg">${escape_html(code?.code ?? "")}</p></div> `);
													if (code) {
														$$renderer.push("<!--[0-->");
														$$renderer.push(`<span class="pointer-events-none absolute top-3 right-3 rounded-full bg-background/90 px-2 py-0.5 font-mono text-xs text-muted-foreground">${escape_html(clock())}</span>`);
													} else $$renderer.push("<!--[-1-->");
													$$renderer.push(`<!--]-->`);
												}
												$$renderer.push(`<!--]--></div> <div class="flex items-center gap-2">`);
												if (failed || spent()) {
													$$renderer.push("<!--[0-->");
													BusyButton($$renderer, {
														class: "flex-1",
														pending: making,
														pendingLabel: "Making a code…",
														onclick: newCode,
														children: ($$renderer) => {
															Refresh_cw($$renderer, { "data-icon": "inline-start" });
															$$renderer.push(`<!----> Show a new code`);
														},
														$$slots: { default: true }
													});
												} else {
													$$renderer.push("<!--[-1-->");
													CopyButton($$renderer, {
														text: code?.code ?? "",
														disabled: !code
													});
												}
												$$renderer.push(`<!--]--></div>`);
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
//#region src/lib/components/InlineRename.svelte
function InlineRename($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { value = "", label, maxlength, class: className, onsave, oncancel } = $$props;
		let input = null;
		function save() {
			const name = value.trim();
			if (!name) {
				oncancel();
				return;
			}
			onsave(name);
		}
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			$$renderer.push(`<div${attr_class(clsx(cn("flex items-center gap-2", className)))}>`);
			Input($$renderer, {
				"aria-label": label,
				maxlength,
				onkeydown: (e) => {
					if (e.key === "Enter") save();
					if (e.key === "Escape") oncancel();
				},
				get ref() {
					return input;
				},
				set ref($$value) {
					input = $$value;
					$$settled = false;
				},
				get value() {
					return value;
				},
				set value($$value) {
					value = $$value;
					$$settled = false;
				}
			});
			$$renderer.push(`<!----> `);
			Button($$renderer, {
				variant: "ghost",
				size: "icon",
				"aria-label": "Cancel rename",
				onclick: oncancel,
				children: ($$renderer) => {
					X($$renderer, {});
				},
				$$slots: { default: true }
			});
			$$renderer.push(`<!----> `);
			Button($$renderer, {
				variant: "secondary",
				size: "icon",
				"aria-label": "Save name",
				onclick: save,
				children: ($$renderer) => {
					Check($$renderer, {});
				},
				$$slots: { default: true }
			});
			$$renderer.push(`<!----></div>`);
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
//#region src/lib/components/ui/item/item.svelte
var itemVariants = tv({
	base: "[a]:hover:bg-muted rounded-2xl border text-sm group/item focus-visible:border-ring focus-visible:ring-ring/50 flex w-full flex-wrap items-center transition-colors duration-100 outline-none focus-visible:ring-[3px] [a]:transition-colors",
	variants: {
		variant: {
			default: "border-transparent",
			outline: "border-border",
			muted: "bg-muted/50 border-transparent"
		},
		size: {
			default: "gap-3.5 px-4 py-3.5",
			sm: "gap-3.5 px-3.5 py-3",
			xs: "gap-2.5 px-3 py-2.5 in-data-[slot=dropdown-menu-content]:p-0"
		}
	},
	defaultVariants: {
		variant: "default",
		size: "default"
	}
});
function Item($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, child, variant, size, $$slots, $$events, ...restProps } = $$props;
		const mergedProps = derived(() => ({
			class: cn(itemVariants({
				variant,
				size
			}), className),
			"data-slot": "item",
			"data-variant": variant,
			"data-size": size,
			...restProps
		}));
		if (child) {
			$$renderer.push("<!--[0-->");
			child($$renderer, { props: mergedProps() });
			$$renderer.push(`<!---->`);
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<div${attributes({ ...mergedProps() })}>`);
			mergedProps().children?.($$renderer);
			$$renderer.push(`<!----></div>`);
		}
		$$renderer.push(`<!--]-->`);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region src/lib/components/ui/item/item-group.svelte
function Item_group($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, children, $$slots, $$events, ...restProps } = $$props;
		$$renderer.push(`<div${attributes({
			role: "list",
			"data-slot": "item-group",
			class: clsx(cn("gap-4 has-data-[size=sm]:gap-2.5 has-data-[size=xs]:gap-2 group/item-group flex w-full flex-col", className)),
			...restProps
		})}>`);
		children?.($$renderer);
		$$renderer.push(`<!----></div>`);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region src/lib/components/ui/item/item-content.svelte
function Item_content($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, children, $$slots, $$events, ...restProps } = $$props;
		$$renderer.push(`<div${attributes({
			"data-slot": "item-content",
			class: clsx(cn("gap-1 group-data-[size=xs]/item:gap-0.5 flex flex-1 flex-col [&+[data-slot=item-content]]:flex-none", className)),
			...restProps
		})}>`);
		children?.($$renderer);
		$$renderer.push(`<!----></div>`);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region src/lib/components/ui/item/item-title.svelte
function Item_title($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, children, $$slots, $$events, ...restProps } = $$props;
		$$renderer.push(`<div${attributes({
			"data-slot": "item-title",
			class: clsx(cn("font-heading gap-2 text-sm leading-snug font-medium underline-offset-4 line-clamp-1 flex w-fit items-center", className)),
			...restProps
		})}>`);
		children?.($$renderer);
		$$renderer.push(`<!----></div>`);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region src/lib/components/ui/item/item-actions.svelte
function Item_actions($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, children, $$slots, $$events, ...restProps } = $$props;
		$$renderer.push(`<div${attributes({
			"data-slot": "item-actions",
			class: clsx(cn("gap-2 flex items-center", className)),
			...restProps
		})}>`);
		children?.($$renderer);
		$$renderer.push(`<!----></div>`);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region src/lib/components/ui/item/item-media.svelte
var itemMediaVariants = tv({
	base: "gap-2 group-has-data-[slot=item-description]/item:translate-y-0.5 group-has-data-[slot=item-description]/item:self-start flex shrink-0 items-center justify-center [&_svg]:pointer-events-none",
	variants: { variant: {
		default: "bg-transparent",
		icon: "[&_svg:not([class*='size-'])]:size-4",
		image: "size-10 overflow-hidden rounded-xl group-data-[size=sm]/item:size-8 group-data-[size=xs]/item:size-6 group-data-[size=xs]/item:rounded-lg [&_img]:size-full [&_img]:object-cover"
	} },
	defaultVariants: { variant: "default" }
});
function Item_media($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, children, variant = "default", $$slots, $$events, ...restProps } = $$props;
		$$renderer.push(`<div${attributes({
			"data-slot": "item-media",
			"data-variant": variant,
			class: clsx(cn(itemMediaVariants({ variant }), className)),
			...restProps
		})}>`);
		children?.($$renderer);
		$$renderer.push(`<!----></div>`);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region node_modules/@lucide/svelte/dist/icons/pencil.svelte
function Pencil($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "pencil" },
		props,
		{ iconNode: [["path", { "d": "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" }], ["path", { "d": "m15 5 4 4" }]] }
	]));
}
//#endregion
//#region node_modules/@lucide/svelte/dist/icons/trash-2.svelte
function Trash_2($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "trash-2" },
		props,
		{ iconNode: [
			["path", { "d": "M10 11v6" }],
			["path", { "d": "M14 11v6" }],
			["path", { "d": "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" }],
			["path", { "d": "M3 6h18" }],
			["path", { "d": "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" }]
		] }
	]));
}
//#endregion
//#region src/lib/components/devices/DeviceRow.svelte
function DeviceRow($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { device, renaming = false, arrived = false, onrename, onrenamestart, onrenamecancel, onremove } = $$props;
		const renamePending = derived(() => pairing.isPending(`rename:${device.fingerprint}`));
		const removePending = derived(() => pairing.isPending(`untrust:${device.fingerprint}`));
		let draft = "";
		function startRename() {
			draft = device.name;
			onrenamestart();
		}
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (Item) {
				$$renderer.push("<!--[-->");
				Item($$renderer, {
					variant: "outline",
					size: "sm",
					class: cn(arrived && "animate-arrive"),
					children: ($$renderer) => {
						if (Item_media) {
							$$renderer.push("<!--[-->");
							Item_media($$renderer, {
								variant: "icon",
								children: ($$renderer) => {
									Laptop($$renderer, {});
								},
								$$slots: { default: true }
							});
							$$renderer.push("<!--]-->");
						} else {
							$$renderer.push("<!--[!-->");
							$$renderer.push("<!--]-->");
						}
						$$renderer.push(` `);
						if (renaming) {
							$$renderer.push("<!--[0-->");
							if (Item_content) {
								$$renderer.push("<!--[-->");
								Item_content($$renderer, {
									children: ($$renderer) => {
										InlineRename($$renderer, {
											label: `Rename ${stringify(device.name)}`,
											onsave: onrename,
											oncancel: onrenamecancel,
											get value() {
												return draft;
											},
											set value($$value) {
												draft = $$value;
												$$settled = false;
											}
										});
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
							if (Item_content) {
								$$renderer.push("<!--[-->");
								Item_content($$renderer, {
									children: ($$renderer) => {
										if (Item_title) {
											$$renderer.push("<!--[-->");
											Item_title($$renderer, {
												class: "truncate",
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
									},
									$$slots: { default: true }
								});
								$$renderer.push("<!--]-->");
							} else {
								$$renderer.push("<!--[!-->");
								$$renderer.push("<!--]-->");
							}
							$$renderer.push(` `);
							if (Item_actions) {
								$$renderer.push("<!--[-->");
								Item_actions($$renderer, {
									children: ($$renderer) => {
										Button($$renderer, {
											variant: "ghost",
											size: "icon",
											"aria-label": `Rename ${stringify(device.name)}`,
											disabled: renamePending(),
											onclick: startRename,
											children: ($$renderer) => {
												if (renamePending()) {
													$$renderer.push("<!--[0-->");
													Spinner($$renderer, {});
												} else {
													$$renderer.push("<!--[-1-->");
													Pencil($$renderer, {});
												}
												$$renderer.push(`<!--]-->`);
											},
											$$slots: { default: true }
										});
										$$renderer.push(`<!----> `);
										Button($$renderer, {
											variant: "destructive",
											size: "icon",
											"aria-label": `Remove ${stringify(device.name)}`,
											disabled: removePending(),
											onclick: onremove,
											children: ($$renderer) => {
												Trash_2($$renderer, {});
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
//#region node_modules/@lucide/svelte/dist/icons/camera.svelte
function Camera($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "camera" },
		props,
		{ iconNode: [["path", { "d": "M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z" }], ["circle", {
			"cx": "12",
			"cy": "13",
			"r": "3"
		}]] }
	]));
}
//#endregion
//#region src/lib/components/devices/EnterCodeDialog.svelte
function EnterCodeDialog($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { open = false, onscan } = $$props;
		let typed = "";
		let connecting = false;
		/** The last attempt's failure. Inline — this surface is the flow the user is inside. */
		let error = "";
		pairing.paired;
		async function connect() {
			const value = typed.trim();
			if (!isCompleteCode(value) || connecting) return;
			connecting = true;
			error = "";
			try {
				await pairing.redeemCode(value, "code");
			} catch (e) {
				error = errorText(e);
			} finally {
				typed = "";
				connecting = false;
			}
		}
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (Responsive_dialog) {
				$$renderer.push("<!--[-->");
				Responsive_dialog($$renderer, {
					get open() {
						return open;
					},
					set open($$value) {
						open = $$value;
						$$settled = false;
					},
					children: ($$renderer) => {
						if (Responsive_dialog_content) {
							$$renderer.push("<!--[-->");
							Responsive_dialog_content($$renderer, {
								class: "sm:max-w-sm",
								children: ($$renderer) => {
									if (Responsive_dialog_header) {
										$$renderer.push("<!--[-->");
										Responsive_dialog_header($$renderer, {
											children: ($$renderer) => {
												if (Responsive_dialog_title) {
													$$renderer.push("<!--[-->");
													Responsive_dialog_title($$renderer, {
														children: ($$renderer) => {
															$$renderer.push(`<!---->Use their code`);
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
															$$renderer.push(`<!---->Type the code your other device is showing.`);
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
									if (Responsive_dialog_body) {
										$$renderer.push("<!--[-->");
										Responsive_dialog_body($$renderer, {
											class: "flex flex-col gap-2",
											children: ($$renderer) => {
												if (Field) {
													$$renderer.push("<!--[-->");
													Field($$renderer, {
														children: ($$renderer) => {
															if (Field_label) {
																$$renderer.push("<!--[-->");
																Field_label($$renderer, {
																	for: "pair-code",
																	class: "sr-only",
																	children: ($$renderer) => {
																		$$renderer.push(`<!---->Their code`);
																	},
																	$$slots: { default: true }
																});
																$$renderer.push("<!--]-->");
															} else {
																$$renderer.push("<!--[!-->");
																$$renderer.push("<!--]-->");
															}
															$$renderer.push(` <div class="flex items-center gap-2"><div class="flex-1">`);
															CodeInput($$renderer, {
																id: "pair-code",
																disabled: connecting,
																onsubmit: connect,
																get value() {
																	return typed;
																},
																set value($$value) {
																	typed = $$value;
																	$$settled = false;
																}
															});
															$$renderer.push(`<!----></div> `);
															BusyButton($$renderer, {
																pending: connecting,
																pendingLabel: "Linking…",
																disabled: !isCompleteCode(typed),
																onclick: connect,
																children: ($$renderer) => {
																	$$renderer.push(`<!---->Connect`);
																},
																$$slots: { default: true }
															});
															$$renderer.push(`<!----></div>`);
														},
														$$slots: { default: true }
													});
													$$renderer.push("<!--]-->");
												} else {
													$$renderer.push("<!--[!-->");
													$$renderer.push("<!--]-->");
												}
												$$renderer.push(` `);
												if (error) {
													$$renderer.push("<!--[0-->");
													$$renderer.push(`<p class="text-sm text-destructive">${escape_html(error)}</p>`);
												} else $$renderer.push("<!--[-1-->");
												$$renderer.push(`<!--]--> `);
												if (canScan() && onscan) {
													$$renderer.push("<!--[0-->");
													Button($$renderer, {
														variant: "ghost",
														size: "sm",
														class: "self-start",
														onclick: () => {
															open = false;
															onscan?.();
														},
														children: ($$renderer) => {
															Camera($$renderer, { "data-icon": "inline-start" });
															$$renderer.push(`<!----> Scan it instead`);
														},
														$$slots: { default: true }
													});
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
					},
					$$slots: { default: true }
				});
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
//#region src/lib/components/feedback/BlockedReason.svelte
function BlockedReason($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { label, class: className } = $$props;
		$$renderer.push(`<p${attr_class(clsx(cn("flex items-center gap-1.5 text-sm text-muted-foreground", className)))}>`);
		Info($$renderer, {
			"aria-hidden": "true",
			class: "size-3.5 shrink-0"
		});
		$$renderer.push(`<!----> ${escape_html(label)}</p>`);
	});
}
//#endregion
//#region node_modules/@lucide/svelte/dist/icons/scan-qr-code.svelte
function Scan_qr_code($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "scan-qr-code" },
		props,
		{ iconNode: [
			["path", { "d": "M17 12v4a1 1 0 0 1-1 1h-4" }],
			["path", { "d": "M17 3h2a2 2 0 0 1 2 2v2" }],
			["path", { "d": "M17 8V7" }],
			["path", { "d": "M21 17v2a2 2 0 0 1-2 2h-2" }],
			["path", { "d": "M3 7V5a2 2 0 0 1 2-2h2" }],
			["path", { "d": "M7 17h.01" }],
			["path", { "d": "M7 21H5a2 2 0 0 1-2-2v-2" }],
			["rect", {
				"x": "7",
				"y": "7",
				"width": "5",
				"height": "5",
				"rx": "1"
			}]
		] }
	]));
}
//#endregion
//#region src/lib/components/devices/DeviceList.svelte
function DeviceList($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { renaming = null, onremove } = $$props;
		let entering = false;
		function arrived(fingerprint) {
			return false;
		}
		async function rename(fingerprint, name) {
			renaming = null;
			await pairing.rename(fingerprint, name);
		}
		/**
		* Add a device: the camera on a phone, the code field everywhere else.
		*
		* Every way the camera can end without a pairing lands on the field, so there is
		* no dead end to back out of — a refusal and a cancel are both just "type it
		* instead", with a word about the camera in the case the user did not choose.
		*/
		async function add() {
			if (!canScan()) {
				entering = true;
				return;
			}
			const outcome = await scanner.run((content) => pairing.redeemCode(content, "qr"));
			switch (outcome.kind) {
				case "type":
					entering = true;
					return;
				case "denied":
					entering = true;
					toast.info("The camera is off. Type their code instead, or turn it on in Settings.", { action: {
						label: "Settings",
						onClick: () => void openSettings()
					} });
					return;
				case "failed":
					entering = true;
					toast.error(outcome.message);
					return;
				default: return;
			}
		}
		function addButton($$renderer, variant) {
			Button($$renderer, {
				variant,
				size: "sm",
				disabled: !pairing.available || scanner.active,
				onclick: add,
				children: ($$renderer) => {
					if (canScan()) {
						$$renderer.push("<!--[0-->");
						Scan_qr_code($$renderer, {
							class: "mr-1",
							"data-icon": "inline-start"
						});
					} else {
						$$renderer.push("<!--[-1-->");
						Plus($$renderer, { "data-icon": "inline-start" });
					}
					$$renderer.push(`<!--]--> Add Device`);
				},
				$$slots: { default: true }
			});
		}
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			$$renderer.push(`<section class="flex flex-col gap-3"><div class="flex items-start justify-between gap-3"><div class="flex min-w-0 flex-col gap-1"><h2 class="text-base font-medium">Your devices</h2> `);
			if (pairing.loaded && !pairing.available) {
				$$renderer.push("<!--[0-->");
				BlockedReason($$renderer, { label: "Floppy can't add a device right now. Check your connection, then reopen the app." });
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--></div> `);
			if (pairing.devices.length > 0) {
				$$renderer.push("<!--[0-->");
				addButton($$renderer, "outline");
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--></div> `);
			if (!pairing.loaded) {
				$$renderer.push("<!--[0-->");
				if (Item_group) {
					$$renderer.push("<!--[-->");
					Item_group($$renderer, {
						"aria-hidden": "true",
						children: ($$renderer) => {
							$$renderer.push(`<!--[-->`);
							const each_array = ensure_array_like([0, 1]);
							for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
								each_array[$$index];
								if (Item) {
									$$renderer.push("<!--[-->");
									Item($$renderer, {
										variant: "outline",
										size: "sm",
										children: ($$renderer) => {
											Skeleton($$renderer, { class: "size-8 rounded-lg" });
											$$renderer.push(`<!----> `);
											if (Item_content) {
												$$renderer.push("<!--[-->");
												Item_content($$renderer, {
													children: ($$renderer) => {
														Skeleton($$renderer, { class: "h-4 w-36 max-w-full" });
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
						},
						$$slots: { default: true }
					});
					$$renderer.push("<!--]-->");
				} else {
					$$renderer.push("<!--[!-->");
					$$renderer.push("<!--]-->");
				}
			} else if (pairing.devices.length === 0) {
				$$renderer.push("<!--[1-->");
				if (Empty) {
					$$renderer.push("<!--[-->");
					Empty($$renderer, {
						class: "border border-dashed py-8",
						children: ($$renderer) => {
							if (Empty_header) {
								$$renderer.push("<!--[-->");
								Empty_header($$renderer, {
									children: ($$renderer) => {
										if (Empty_media) {
											$$renderer.push("<!--[-->");
											Empty_media($$renderer, {
												variant: "icon",
												children: ($$renderer) => {
													Monitor_smartphone($$renderer, {});
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
													$$renderer.push(`<!---->No devices yet`);
												},
												$$slots: { default: true }
											});
											$$renderer.push("<!--]-->");
										} else {
											$$renderer.push("<!--[!-->");
											$$renderer.push("<!--]-->");
										}
										$$renderer.push(` `);
										if (Empty_description) {
											$$renderer.push("<!--[-->");
											Empty_description($$renderer, {
												children: ($$renderer) => {
													$$renderer.push(`<!---->Add one and you can send to it without a code.`);
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
							if (Empty_content) {
								$$renderer.push("<!--[-->");
								Empty_content($$renderer, {
									children: ($$renderer) => {
										addButton($$renderer, "default");
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
				if (Item_group) {
					$$renderer.push("<!--[-->");
					Item_group($$renderer, {
						children: ($$renderer) => {
							$$renderer.push(`<!--[-->`);
							const each_array_1 = ensure_array_like(pairing.devices);
							for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
								let device = each_array_1[$$index_1];
								DeviceRow($$renderer, {
									device,
									arrived: arrived(device.fingerprint),
									renaming: renaming === device.fingerprint,
									onrenamestart: () => renaming = device.fingerprint,
									onrenamecancel: () => renaming = null,
									onrename: (name) => rename(device.fingerprint, name),
									onremove: () => onremove(device)
								});
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
			}
			$$renderer.push(`<!--]--></section> `);
			EnterCodeDialog($$renderer, {
				onscan: add,
				get open() {
					return entering;
				},
				set open($$value) {
					entering = $$value;
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
		bind_props($$props, { renaming });
	});
}
//#endregion
//#region src/lib/components/devices/DeviceAvatar.svelte
function DeviceAvatar($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { name, class: className } = $$props;
		const src = derived(() => createAvatar(funEmoji, { seed: name }).toDataUri());
		$$renderer.push(`<span${attr_class(clsx(cn("flex size-9 shrink-0 overflow-hidden rounded-xl bg-background", className)))}><img${attr("src", src())} alt="" class="size-full"/></span>`);
	});
}
//#endregion
//#region src/lib/components/devices/SelfDeviceCard.svelte
function SelfDeviceCard($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { editing = false } = $$props;
		let draft = "";
		const renamePending = derived(() => pairing.isPending("rename:self"));
		function startEdit() {
			draft = pairing.selfName;
			editing = true;
		}
		async function save(name) {
			editing = false;
			await pairing.setSelfName(name);
		}
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			$$renderer.push(`<section class="flex items-center gap-3.5 rounded-2xl bg-muted/60 px-3.5 py-3">`);
			DeviceAvatar($$renderer, { name: pairing.selfName });
			$$renderer.push(`<!----> <div class="flex min-h-10 min-w-0 flex-1 items-center gap-2 pointer-coarse:min-h-11">`);
			if (editing) {
				$$renderer.push("<!--[0-->");
				InlineRename($$renderer, {
					label: "Rename this device",
					maxlength: 40,
					class: "flex-1",
					onsave: save,
					oncancel: () => editing = false,
					get value() {
						return draft;
					},
					set value($$value) {
						draft = $$value;
						$$settled = false;
					}
				});
			} else {
				$$renderer.push("<!--[-1-->");
				$$renderer.push(`<div class="flex min-w-0 flex-1 flex-col"><p class="text-xs text-muted-foreground">Other devices see you as</p> <p class="truncate font-medium">${escape_html(pairing.selfName)}</p></div> `);
				Button($$renderer, {
					variant: "ghost",
					size: "icon",
					"aria-label": "Rename this device",
					disabled: renamePending(),
					onclick: startEdit,
					children: ($$renderer) => {
						if (renamePending()) {
							$$renderer.push("<!--[0-->");
							Spinner($$renderer, {});
						} else {
							$$renderer.push("<!--[-1-->");
							Pencil($$renderer, {});
						}
						$$renderer.push(`<!--]-->`);
					},
					$$slots: { default: true }
				});
				$$renderer.push(`<!---->`);
			}
			$$renderer.push(`<!--]--></div></section>`);
		}
		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);
		$$renderer.subsume($$inner_renderer);
		bind_props($$props, { editing });
	});
}
//#endregion
//#region src/routes/devices/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		/** Which row is showing its rename field, and whether this device's is open. */
		let renaming = null;
		let renamingSelf = false;
		/** This device's code, opened from the heading rather than sitting on the page. */
		let showingCode = false;
		let removing = null;
		const removePending = derived(() => removing !== null && pairing.isPending(`untrust:${removing.fingerprint}`));
		async function confirmRemove() {
			const device = removing;
			if (!device || removePending()) return;
			await pairing.untrust(device.fingerprint);
			removing = null;
		}
		/**
		* A pull means "reload this screen", so the screen's transient state goes with
		* the data: an open inline rename is stale by then, and leaving it sitting there
		* is what makes the gesture look like it did nothing.
		*
		* There is no code state to reason about here any more: a shown code lives in the
		* panel, which a pull cannot reach.
		*/
		async function refresh() {
			renaming = null;
			renamingSelf = false;
			await pairing.refresh();
		}
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			PageShell($$renderer, {
				scroll: true,
				onrefresh: refresh,
				children: ($$renderer) => {
					{
						function action($$renderer) {
							Button($$renderer, {
								variant: "outline",
								size: "icon",
								"aria-label": "Show your code",
								disabled: !pairing.available,
								onclick: () => showingCode = true,
								children: ($$renderer) => {
									Qr_code($$renderer, {});
								},
								$$slots: { default: true }
							});
						}
						PageHeader($$renderer, {
							title: "Devices",
							description: "The devices you trust, and the name they see you by.",
							action,
							$$slots: { action: true }
						});
					}
					$$renderer.push(`<!----> `);
					SelfDeviceCard($$renderer, {
						get editing() {
							return renamingSelf;
						},
						set editing($$value) {
							renamingSelf = $$value;
							$$settled = false;
						}
					});
					$$renderer.push(`<!----> `);
					DeviceList($$renderer, {
						onremove: (device) => removing = device,
						get renaming() {
							return renaming;
						},
						set renaming($$value) {
							renaming = $$value;
							$$settled = false;
						}
					});
					$$renderer.push(`<!---->`);
				},
				$$slots: { default: true }
			});
			$$renderer.push(`<!----> `);
			CodePanel($$renderer, {
				get open() {
					return showingCode;
				},
				set open($$value) {
					showingCode = $$value;
					$$settled = false;
				}
			});
			$$renderer.push(`<!----> `);
			if (Responsive_dialog) {
				$$renderer.push("<!--[-->");
				Responsive_dialog($$renderer, {
					open: removing !== null,
					onOpenChange: (next) => !next && !removePending() && (removing = null),
					children: ($$renderer) => {
						if (Responsive_dialog_content) {
							$$renderer.push("<!--[-->");
							Responsive_dialog_content($$renderer, {
								class: "sm:max-w-sm",
								children: ($$renderer) => {
									if (Responsive_dialog_header) {
										$$renderer.push("<!--[-->");
										Responsive_dialog_header($$renderer, {
											children: ($$renderer) => {
												if (Responsive_dialog_title) {
													$$renderer.push("<!--[-->");
													Responsive_dialog_title($$renderer, {
														children: ($$renderer) => {
															$$renderer.push(`<!---->Remove ${escape_html(removing?.name)}?`);
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
															$$renderer.push(`<!---->You'll need a new code to send to it again.`);
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
									if (Responsive_dialog_footer) {
										$$renderer.push("<!--[-->");
										Responsive_dialog_footer($$renderer, {
											children: ($$renderer) => {
												Button($$renderer, {
													variant: "outline",
													disabled: removePending(),
													onclick: () => removing = null,
													children: ($$renderer) => {
														$$renderer.push(`<!---->Keep`);
													},
													$$slots: { default: true }
												});
												$$renderer.push(`<!----> `);
												BusyButton($$renderer, {
													variant: "destructive",
													pending: removePending(),
													pendingLabel: "Removing…",
													onclick: confirmRemove,
													children: ($$renderer) => {
														Trash_2($$renderer, { "data-icon": "inline-start" });
														$$renderer.push(`<!----> Remove`);
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
export { _page as default };
