import { T as escape_html, _ as stringify, o as attr_class, s as attr_style, u as derived, w as clsx } from "./index-server.js";
import { K as cn, V as Spinner, t as StubMark } from "./StubMark.js";
//#region src/lib/components/shell/PageHeader.svelte
function PageHeader($$renderer, $$props) {
	let { title, description, stub = false, accent, status, action } = $$props;
	$$renderer.push(`<div class="flex flex-col gap-1"><div class="flex items-center justify-between gap-3"><div class="flex min-w-0 items-center gap-2">`);
	if (accent) {
		$$renderer.push("<!--[0-->");
		$$renderer.push(`<span class="size-3 shrink-0 rounded-full bg-(--tint)"${attr_style(`--tint: var(--${stringify(accent)})`)}></span>`);
	} else $$renderer.push("<!--[-1-->");
	$$renderer.push(`<!--]--> <h1 class="truncate text-lg font-semibold tracking-tight sm:text-2xl">${escape_html(title)}</h1> `);
	if (stub) {
		$$renderer.push("<!--[0-->");
		StubMark($$renderer, {});
	} else $$renderer.push("<!--[-1-->");
	$$renderer.push(`<!--]--> `);
	if (status) {
		$$renderer.push("<!--[0-->");
		$$renderer.push(`<span aria-live="polite" class="shrink-0 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">${escape_html(status)}</span>`);
	} else $$renderer.push("<!--[-1-->");
	$$renderer.push(`<!--]--></div> `);
	if (action) {
		$$renderer.push("<!--[0-->");
		action($$renderer);
		$$renderer.push(`<!---->`);
	} else $$renderer.push("<!--[-1-->");
	$$renderer.push(`<!--]--></div> `);
	if (description) {
		$$renderer.push("<!--[0-->");
		$$renderer.push(`<p class="text-sm text-muted-foreground max-sm:hidden">${escape_html(description)}</p>`);
	} else $$renderer.push("<!--[-1-->");
	$$renderer.push(`<!--]--></div>`);
}
//#endregion
//#region src/lib/components/shell/PageShell.svelte
function PageShell($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { scroll = false, width = "prose", pad = "default", gap = "section", onrefresh, class: className, children } = $$props;
		let pull = 0;
		const shift = derived(() => pull);
		const padding = {
			default: "p-4 sm:p-6",
			tight: "px-4 py-2 sm:p-6"
		};
		const maxWidth = {
			prose: "max-w-xl",
			wide: "max-w-3xl md:max-w-4xl lg:max-w-5xl"
		};
		const gaps = {
			section: "gap-6",
			none: ""
		};
		$$renderer.push(`<div${attr_class(clsx(cn(scroll ? "relative h-full overflow-y-auto overscroll-contain" : "flex min-h-0 flex-1 flex-col", className)))}>`);
		if (onrefresh && shift() > 0) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div class="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-center"${attr_style(`height: ${stringify(shift())}px`)}>`);
			Spinner($$renderer, {
				size: "control",
				class: cn("text-muted-foreground", "animate-none")
			});
			$$renderer.push(`<!----></div>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> <div${attr_class(clsx(cn("mx-auto flex w-full flex-col", !scroll && "min-h-0 flex-1", "transition-transform", maxWidth[width], padding[pad], gaps[gap])))}${attr_style(shift() ? `transform: translateY(${shift()}px)` : void 0)}>`);
		children($$renderer);
		$$renderer.push(`<!----></div></div>`);
	});
}
//#endregion
export { PageHeader as n, PageShell as t };
