import { g as spread_props } from "./index-server.js";
import { U as Icon } from "./StubMark.js";
//#region node_modules/@lucide/svelte/dist/icons/download.svelte
function Download($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "download" },
		props,
		{ iconNode: [
			["path", { "d": "M12 15V3" }],
			["path", { "d": "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }],
			["path", { "d": "m7 10 5 5 5-5" }]
		] }
	]));
}
//#endregion
export { Download as t };
