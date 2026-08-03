import "../../../chunks/index-server.js";
import { W as Button, n as Input } from "../../../chunks/StubMark.js";
import { a as Avatar, i as Avatar_fallback, n as isStub, t as User } from "../../../chunks/user.js";
import { a as Field_group, c as Field, n as Field_description, o as Field_legend, r as Field_label, s as Field_set, t as Field_separator } from "../../../chunks/field.js";
import { n as PageHeader, t as PageShell } from "../../../chunks/PageShell.js";
//#region src/lib/components/auth/LoginView.svelte
function LoginView($$renderer) {
	Field_group($$renderer, {
		children: ($$renderer) => {
			Field($$renderer, {
				children: ($$renderer) => {
					Field_label($$renderer, {
						for: "email",
						children: ($$renderer) => {
							$$renderer.push(`<!---->Email`);
						},
						$$slots: { default: true }
					});
					$$renderer.push(`<!----> `);
					Input($$renderer, {
						id: "email",
						type: "email",
						placeholder: "you@example.com"
					});
					$$renderer.push(`<!---->`);
				},
				$$slots: { default: true }
			});
			$$renderer.push(`<!----> `);
			Field($$renderer, {
				children: ($$renderer) => {
					Field_label($$renderer, {
						for: "password",
						children: ($$renderer) => {
							$$renderer.push(`<!---->Password`);
						},
						$$slots: { default: true }
					});
					$$renderer.push(`<!----> `);
					Input($$renderer, {
						id: "password",
						type: "password",
						placeholder: "••••••••"
					});
					$$renderer.push(`<!---->`);
				},
				$$slots: { default: true }
			});
			$$renderer.push(`<!----> `);
			Button($$renderer, {
				class: "w-full",
				disabled: true,
				children: ($$renderer) => {
					$$renderer.push(`<!---->Sign in`);
				},
				$$slots: { default: true }
			});
			$$renderer.push(`<!----> `);
			Field_separator($$renderer, {
				children: ($$renderer) => {
					$$renderer.push(`<!---->or`);
				},
				$$slots: { default: true }
			});
			$$renderer.push(`<!----> `);
			Button($$renderer, {
				variant: "outline",
				class: "w-full",
				disabled: true,
				children: ($$renderer) => {
					$$renderer.push(`<!---->Continue with Google`);
				},
				$$slots: { default: true }
			});
			$$renderer.push(`<!----> `);
			Field_description($$renderer, {
				class: "text-center",
				children: ($$renderer) => {
					$$renderer.push(`<!---->Accounts are not ready yet. This is just a preview.`);
				},
				$$slots: { default: true }
			});
			$$renderer.push(`<!---->`);
		},
		$$slots: { default: true }
	});
}
//#endregion
//#region src/lib/components/account/AccountView.svelte
function AccountView($$renderer) {
	$$renderer.push(`<section class="flex items-center gap-3.5 rounded-2xl bg-muted/60 px-3.5 py-3">`);
	Avatar($$renderer, {
		class: "size-10 rounded-lg",
		children: ($$renderer) => {
			Avatar_fallback($$renderer, {
				class: "rounded-lg",
				children: ($$renderer) => {
					User($$renderer, { class: "size-5" });
				},
				$$slots: { default: true }
			});
		},
		$$slots: { default: true }
	});
	$$renderer.push(`<!----> <div class="flex min-w-0 flex-1 flex-col"><p class="truncate font-medium">Not signed in</p> <p class="truncate text-xs text-muted-foreground">Sign in to keep your devices together.</p></div></section> `);
	Field_group($$renderer, {
		children: ($$renderer) => {
			Field_set($$renderer, {
				children: ($$renderer) => {
					Field_legend($$renderer, {
						children: ($$renderer) => {
							$$renderer.push(`<!---->Sign in`);
						},
						$$slots: { default: true }
					});
					$$renderer.push(`<!----> `);
					Field_description($$renderer, {
						children: ($$renderer) => {
							$$renderer.push(`<!---->Keep your paired devices in sync across installs.`);
						},
						$$slots: { default: true }
					});
					$$renderer.push(`<!----> `);
					LoginView($$renderer, {});
					$$renderer.push(`<!---->`);
				},
				$$slots: { default: true }
			});
		},
		$$slots: { default: true }
	});
	$$renderer.push(`<!---->`);
}
//#endregion
//#region src/routes/account/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		PageShell($$renderer, {
			scroll: true,
			children: ($$renderer) => {
				PageHeader($$renderer, {
					title: "Account",
					description: "Your devices, wherever you sign in.",
					stub: isStub("/account")
				});
				$$renderer.push(`<!----> `);
				AccountView($$renderer, {});
				$$renderer.push(`<!---->`);
			},
			$$slots: { default: true }
		});
	});
}
//#endregion
export { _page as default };
