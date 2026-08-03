import { g as spread_props } from "./index-server.js";
import { U as Icon } from "./StubMark.js";
//#region node_modules/@lucide/svelte/dist/icons/folder-open.svelte
function Folder_open($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "folder-open" },
		props,
		{ iconNode: [["path", { "d": "m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2" }]] }
	]));
}
//#endregion
export { Folder_open as t };
