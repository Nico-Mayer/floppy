import { n as resolve } from "../../chunks/paths.js";
import { redirect } from "@sveltejs/kit";
//#region src/routes/+page.ts
var load = () => {
	redirect(307, resolve("/send"));
};
//#endregion
export { load };
