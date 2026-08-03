import { g as spread_props } from "./index-server.js";
import { U as Icon } from "./StubMark.js";
//#region node_modules/@lucide/svelte/dist/icons/monitor-smartphone.svelte
function Monitor_smartphone($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "monitor-smartphone" },
		props,
		{ iconNode: [
			["path", { "d": "M18 8V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h8" }],
			["path", { "d": "M10 19v-3.96 3.15" }],
			["path", { "d": "M7 19h5" }],
			["rect", {
				"width": "6",
				"height": "10",
				"x": "16",
				"y": "12",
				"rx": "2"
			}]
		] }
	]));
}
//#endregion
export { Monitor_smartphone as t };
