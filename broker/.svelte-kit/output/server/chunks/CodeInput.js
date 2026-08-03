import { l as bind_props } from "./index-server.js";
import { n as X } from "./transfer-app.svelte.js";
import { K as cn } from "./StubMark.js";
import { c as Input_group_button, l as Input_group_addon, s as Input_group_input, u as Input_group } from "./empty.js";
//#region src/lib/code.ts
/** A complete, well-formed code: leading digits then three lowercase words. */
var CODE_PATTERN = /^\d+-[a-z]+-[a-z]+-[a-z]+$/;
/** Whether `value` is a complete code (used to gate the submit button). */
function isCompleteCode(value) {
	return CODE_PATTERN.test(value.trim());
}
/**
* Keep an in-progress code to characters a real code can contain: lowercase it,
* turn any run of spaces or stray characters into a single hyphen, and drop a
* leading hyphen. A trailing hyphen is kept so the next word can be typed. This
* mirrors the backend's `code::normalize`, so unsupported input never reaches a
* command.
*/
function sanitizeCodeInput(raw) {
	return raw.toLowerCase().replace(/[^0-9a-z-]+/g, "-").replace(/-{2,}/g, "-").replace(/^-/, "");
}
//#endregion
//#region src/lib/components/CodeInput.svelte
function CodeInput($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { value = void 0, id, placeholder = "1234-word-word-word", disabled = false, class: className, onsubmit } = $$props;
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (Input_group) {
				$$renderer.push("<!--[-->");
				Input_group($$renderer, {
					children: ($$renderer) => {
						if (Input_group_input) {
							$$renderer.push("<!--[-->");
							Input_group_input($$renderer, {
								id,
								placeholder,
								disabled,
								oninput: () => value = sanitizeCodeInput(value ?? ""),
								onkeydown: (e) => e.key === "Enter" && isCompleteCode(value) && onsubmit?.(),
								class: cn("font-mono", className),
								autocomplete: "off",
								autocapitalize: "none",
								spellcheck: "false",
								maxlength: 32,
								get value() {
									return value;
								},
								set value($$value) {
									value = $$value;
									$$settled = false;
								}
							});
							$$renderer.push("<!--]-->");
						} else {
							$$renderer.push("<!--[!-->");
							$$renderer.push("<!--]-->");
						}
						$$renderer.push(` `);
						if (value) {
							$$renderer.push("<!--[0-->");
							if (Input_group_addon) {
								$$renderer.push("<!--[-->");
								Input_group_addon($$renderer, {
									align: "inline-end",
									children: ($$renderer) => {
										if (Input_group_button) {
											$$renderer.push("<!--[-->");
											Input_group_button($$renderer, {
												size: "icon-xs",
												onclick: () => value = "",
												"aria-label": "Clear code",
												children: ($$renderer) => {
													X($$renderer, {});
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
export { isCompleteCode as n, CodeInput as t };
