import { T as escape_html, u as derived } from "../../../chunks/index-server.js";
import { n as X, t as app } from "../../../chunks/transfer-app.svelte.js";
import { W as Button, j as isPhoneChrome } from "../../../chunks/StubMark.js";
import { d as OpenPath } from "../../../chunks/ipc.js";
import { a as TransferComplete, i as PendingHint, n as EmptyHero, o as TransferProgress, r as DeviceGlyph, s as TransferCard, t as TransferError } from "../../../chunks/TransferError.js";
import { n as formatBytes, t as currentFile } from "../../../chunks/format.js";
import { t as Download } from "../../../chunks/download.js";
import { n as PageHeader, t as PageShell } from "../../../chunks/PageShell.js";
import { n as Empty_description, r as Empty_title } from "../../../chunks/empty.js";
import { n as isCompleteCode, t as CodeInput } from "../../../chunks/CodeInput.js";
import { t as Folder_open } from "../../../chunks/folder-open.js";
//#region src/lib/components/transfer/receive/ReceiveCodeForm.svelte
function ReceiveCodeForm($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const receive = app.receive;
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			$$renderer.push(`<div class="flex w-full flex-col gap-2 @sm:mx-auto @sm:max-w-sm">`);
			CodeInput($$renderer, {
				class: "text-center",
				onsubmit: () => receive.start(),
				get value() {
					return receive.code;
				},
				set value($$value) {
					receive.code = $$value;
					$$settled = false;
				}
			});
			$$renderer.push(`<!----> `);
			Button($$renderer, {
				class: "w-full",
				onclick: () => receive.start(),
				disabled: !isCompleteCode(receive.code),
				children: ($$renderer) => {
					Download($$renderer, {});
					$$renderer.push(`<!----> Get the files`);
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
	});
}
//#endregion
//#region src/lib/components/transfer/receive/labels.ts
/**
* The receive panel's state table, in one place — the mirror of ../send/labels.ts.
*
* Every screen is a cell of (status × target): the statuses come from the core and
* the pairing layer, and the target decides what 'connecting' *means* — see
* ReceiveTarget. Reading the flows top to bottom:
*
*   code:   idle (enter a phrase) → connecting (hunting for the peer; after
*           15s it admits the code may be wrong) → receiving → done
*   device: connecting (offer accepted, sender is serving) → receiving
*           → done. There is no idle: the flow starts from the offer prompt.
*
* Cancelling can interrupt connecting or receiving and lands back on idle with
* the code intact — the usual reason to cancel is a typo in it.
*/
/** Lowercase status line in the top bar: what is happening right now. */
function receiveHeadline(status, target) {
	switch (status) {
		case "cancelling": return "stopping";
		case "connecting": return target.kind === "device" ? "incoming" : "connecting";
		case "receiving": return "getting files";
		case "done": return "all done";
		default: return "type your code";
	}
}
/** "3 files" / "1 file" — a count with the right plural. */
function fileCount(n) {
	return `${n} ${n === 1 ? "file" : "files"}`;
}
//#endregion
//#region src/lib/components/transfer/receive/ReceiveDevice.svelte
function ReceiveDevice($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { name, files, totalBytes } = $$props;
		$$renderer.push(`<div class="flex flex-1 flex-col items-center justify-center gap-6">`);
		DeviceGlyph($$renderer, {});
		$$renderer.push(`<!----> <div class="flex flex-col items-center gap-1.5 text-center"><p class="animate-pop text-lg font-bold tracking-tight">Files on the way</p> <p class="max-w-64 text-xs text-muted-foreground"><span class="font-medium text-foreground">${escape_html(name)}</span> is sending ${escape_html(fileCount(files))}`);
		if (totalBytes > 0) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(` · ${escape_html(formatBytes(totalBytes))}`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->.</p></div> `);
		PendingHint($$renderer, { label: "waiting for sender" });
		$$renderer.push(`<!----></div>`);
	});
}
//#endregion
//#region src/lib/components/transfer/receive/ReceiveIdle.svelte
function ReceiveIdle($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		$$renderer.push(`<div class="flex min-h-0 flex-1 flex-col">`);
		EmptyHero($$renderer, {
			accent: "receive",
			children: ($$renderer) => {
				$$renderer.push(`<div class="flex min-w-0 flex-col items-center gap-2">`);
				Empty_title($$renderer, {
					children: ($$renderer) => {
						$$renderer.push(`<!---->Got a code?`);
					},
					$$slots: { default: true }
				});
				$$renderer.push(`<!----> `);
				Empty_description($$renderer, {
					children: ($$renderer) => {
						$$renderer.push(`<!---->Type or paste the code the sender gave you.`);
					},
					$$slots: { default: true }
				});
				$$renderer.push(`<!----></div>`);
			},
			$$slots: { default: true }
		});
		$$renderer.push(`<!----></div>`);
	});
}
//#endregion
//#region src/lib/components/transfer/receive/ReceiveSearching.svelte
function ReceiveSearching($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const receive = app.receive;
		TransferProgress($$renderer, { label: "Looking for the sender…" });
		$$renderer.push(`<!----> `);
		if (receive.tooSlow) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<p class="text-center text-xs text-muted-foreground">Still nothing. Check that <span class="font-mono text-foreground">${escape_html(receive.code)}</span> matches what the sender is showing.</p>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
	});
}
//#endregion
//#region src/lib/components/transfer/receive/ReceivePanel.svelte
function ReceivePanel($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const receive = app.receive;
		{
			function actions($$renderer) {
				if (receive.status === "done") {
					$$renderer.push("<!--[0-->");
					if (!isPhoneChrome) {
						$$renderer.push("<!--[0-->");
						Button($$renderer, {
							onclick: () => OpenPath(receive.savedTo),
							children: ($$renderer) => {
								Folder_open($$renderer, {});
								$$renderer.push(`<!----> Open folder`);
							},
							$$slots: { default: true }
						});
					} else $$renderer.push("<!--[-1-->");
					$$renderer.push(`<!--]--> `);
					Button($$renderer, {
						variant: "outline",
						size: "sm",
						touch: "grow",
						onclick: () => receive.reset(),
						children: ($$renderer) => {
							$$renderer.push(`<!---->Get more files`);
						},
						$$slots: { default: true }
					});
					$$renderer.push(`<!---->`);
				} else if (receive.status === "connecting" || receive.status === "receiving") {
					$$renderer.push("<!--[1-->");
					Button($$renderer, {
						variant: "destructive",
						size: "sm",
						onclick: () => receive.cancel(),
						children: ($$renderer) => {
							X($$renderer, {});
							$$renderer.push(`<!----> Cancel`);
						},
						$$slots: { default: true }
					});
				} else if (receive.status === "idle") {
					$$renderer.push("<!--[2-->");
					ReceiveCodeForm($$renderer, {});
				} else $$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]-->`);
			}
			TransferCard($$renderer, {
				accent: "receive",
				actions,
				children: ($$renderer) => {
					if (receive.status === "cancelling") {
						$$renderer.push("<!--[0-->");
						TransferProgress($$renderer, { label: "Stopping…" });
					} else if (receive.status === "connecting") {
						$$renderer.push("<!--[1-->");
						if (receive.target.kind === "device") {
							$$renderer.push("<!--[0-->");
							ReceiveDevice($$renderer, {
								name: receive.target.name,
								files: receive.target.fileCount,
								totalBytes: receive.target.totalBytes
							});
						} else {
							$$renderer.push("<!--[-1-->");
							ReceiveSearching($$renderer, {});
						}
						$$renderer.push(`<!--]-->`);
					} else if (receive.status === "receiving") {
						$$renderer.push("<!--[2-->");
						TransferProgress($$renderer, {
							progress: receive.progress,
							stats: receive.stats,
							label: currentFile(receive.stats) || "Getting your files…"
						});
					} else if (receive.status === "done") {
						$$renderer.push("<!--[3-->");
						TransferComplete($$renderer, {
							title: receive.target.kind === "device" ? `Got them from ${receive.target.name}` : "All done",
							description: receive.savedTo,
							mono: true
						});
					} else {
						$$renderer.push("<!--[-1-->");
						ReceiveIdle($$renderer, {});
					}
					$$renderer.push(`<!--]-->`);
				},
				$$slots: {
					actions: true,
					default: true
				}
			});
		}
	});
}
//#endregion
//#region src/routes/receive/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const receive = app.receive;
		const status = derived(() => receiveHeadline(receive.status, receive.target));
		PageShell($$renderer, {
			width: "wide",
			pad: "tight",
			gap: "none",
			children: ($$renderer) => {
				$$renderer.push(`<div class="flex min-h-0 flex-1 flex-col gap-3">`);
				PageHeader($$renderer, {
					title: "Receive",
					accent: "receive",
					status: status()
				});
				$$renderer.push(`<!----> `);
				TransferError($$renderer, {
					error: receive.error,
					ondismiss: () => receive.error = null
				});
				$$renderer.push(`<!----> <div class="min-h-0 flex-1">`);
				ReceivePanel($$renderer, {});
				$$renderer.push(`<!----></div></div>`);
			},
			$$slots: { default: true }
		});
	});
}
//#endregion
export { _page as default };
