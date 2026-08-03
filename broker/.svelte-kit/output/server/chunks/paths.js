import { c as initial_base, o as assets, s as base } from "./internal.js";
import "./internal2.js";
import { n as resolve_route, u as add_data_suffix } from "./routing.js";
import { try_get_request_store } from "@sveltejs/kit/internal/server";
//#region node_modules/@sveltejs/kit/src/runtime/app/paths/server.js
/** @type {import('./client.js').asset} */
function asset(file) {
	return assets && assets !== base ? assets + file : resolve(file);
}
/** @type {import('./client.js').resolve} */
function resolve(id, params) {
	if (!id.startsWith("/")) throw new Error(`Cannot use \`resolve(...)\` with a non-absolute pathname or route ID (got "${id}"). \`resolve\` is only for internal pathnames and route IDs; external URLs should be used directly.`);
	const resolved = resolve_route(id, params);
	{
		const store = try_get_request_store();
		if (store && !store.state.prerendering?.fallback) return ((store.event.isDataRequest ? add_data_suffix(store.event.url.pathname) : store.event.url.pathname).slice(initial_base.length).split("/").slice(2).map(() => "..").join("/") || ".") + resolved;
	}
	return base + resolved;
}
//#endregion
export { resolve as n, asset as t };
