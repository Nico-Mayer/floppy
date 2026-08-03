import { g as spread_props } from "./index-server.js";
import { U as Icon } from "./StubMark.js";
//#region node_modules/@lucide/svelte/dist/icons/laptop.svelte
function Laptop($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "laptop" },
		props,
		{ iconNode: [["path", { "d": "M18 5a2 2 0 0 1 2 2v8.526a2 2 0 0 0 .212.897l1.068 2.127a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45l1.068-2.127A2 2 0 0 0 4 15.526V7a2 2 0 0 1 2-2z" }], ["path", { "d": "M20.054 15.987H3.946" }]] }
	]));
}
//#endregion
export { Laptop as t };
