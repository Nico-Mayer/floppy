<script lang="ts" module>
	import { type VariantProps, tv } from "tailwind-variants";
	import { cn, type WithElementRef } from "$lib/utils.js";
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from "svelte/elements";

	export const buttonVariants = tv({
		base: "rounded-4xl border border-transparent bg-clip-padding text-sm font-medium focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 active:not-aria-[haspopup]:translate-y-px aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg:not([class*='size-'])]:size-4 group/button inline-flex shrink-0 items-center justify-center whitespace-nowrap transition-all outline-none select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
		variants: {
			variant: {
				default: "bg-primary text-primary-foreground hover:bg-primary/80",
				outline: "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:bg-transparent dark:hover:bg-input/30",
				secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
				ghost: "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
				destructive: "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
				link: "text-primary underline-offset-4 hover:underline",
			},
			size: {
				default: "h-9 gap-1.5 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
				xs: "h-6 gap-1 px-2.5 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
				sm: "h-8 gap-1 px-3 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
				lg: "h-10 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
				icon: "size-9",
				"icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
				"icon-sm": "size-8",
				"icon-lg": "size-10",
			},
			// PATCHED (not from the shadcn-svelte registry): coarse-pointer hit areas.
			//
			// Every control needs a 44px minimum hit area on a touch screen, and doing
			// that per call site is what let it drift out of compliance before. So it
			// is derived here from the size a call site already chose, because picking
			// `icon-xs` for a clear button versus `default` for a submit button is
			// already the role judgement. `auto` is the default; the compound rules
			// below turn it into the right treatment. Pass `touch` explicitly to
			// override.
			touch: {
				// Grow the visible box. For destructive, primary, and navigation
				// controls: someone aiming at a destructive action has to be able to
				// see the target they are hitting.
				grow: "pointer-coarse:min-h-11 pointer-coarse:min-w-11",
				// Keep the visible box, expand only what receives the pointer. A
				// centered box that is at least 48px in each axis and never smaller
				// than the button itself, so this works at any size without knowing
				// which one it is — the reason it is not a negative inset, which would
				// expand by a fixed amount and leave a 24px control at 36px.
				slop:
					"relative pointer-coarse:after:absolute pointer-coarse:after:top-1/2 pointer-coarse:after:left-1/2 pointer-coarse:after:h-full pointer-coarse:after:w-full pointer-coarse:after:min-h-12 pointer-coarse:after:min-w-12 pointer-coarse:after:-translate-x-1/2 pointer-coarse:after:-translate-y-1/2 pointer-coarse:after:content-['']",
				auto: "",
				none: "",
			},
		},
		compoundVariants: [
			// Sizes a call site picks for a primary or navigation control.
			{
				touch: "auto",
				size: ["default", "lg", "icon", "icon-lg"],
				class: "pointer-coarse:min-h-11 pointer-coarse:min-w-11",
			},
			// Destructive escalates to grow at every size. Listed before the slop rule
			// and with the other variants enumerated there, so the two can never both
			// apply to one button.
			{
				touch: "auto",
				variant: "destructive",
				class: "pointer-coarse:min-h-11 pointer-coarse:min-w-11",
			},
			// Sizes a call site picks for something incidental and reversible.
			{
				touch: "auto",
				size: ["xs", "sm", "icon-xs", "icon-sm"],
				variant: ["default", "outline", "secondary", "ghost", "link"],
				class:
					"relative pointer-coarse:after:absolute pointer-coarse:after:top-1/2 pointer-coarse:after:left-1/2 pointer-coarse:after:h-full pointer-coarse:after:w-full pointer-coarse:after:min-h-12 pointer-coarse:after:min-w-12 pointer-coarse:after:-translate-x-1/2 pointer-coarse:after:-translate-y-1/2 pointer-coarse:after:content-['']",
			},
		],
		defaultVariants: {
			variant: "default",
			size: "default",
			touch: "auto",
		},
	});

	export type ButtonVariant = VariantProps<typeof buttonVariants>["variant"];
	export type ButtonSize = VariantProps<typeof buttonVariants>["size"];
	export type ButtonTouch = VariantProps<typeof buttonVariants>["touch"];

	export type ButtonProps = WithElementRef<HTMLButtonAttributes> &
		WithElementRef<HTMLAnchorAttributes> & {
			variant?: ButtonVariant;
			size?: ButtonSize;
			/**
			 * Overrides the hit-area treatment inferred from `size`/`variant`.
			 * `grow` when a slopped control gains an interactive neighbour within 8px
			 * or sits inside a clipping ancestor; `none` to opt out entirely.
			 */
			touch?: ButtonTouch;
		};
</script>

<script lang="ts">
	let {
		class: className,
		variant = "default",
		size = "default",
		touch = "auto",
		ref = $bindable(null),
		href = undefined,
		type = "button",
		disabled,
		children,
		...restProps
	}: ButtonProps = $props();
</script>

{#if href}
	<a
		bind:this={ref}
		data-slot="button"
		class={cn(buttonVariants({ variant, size, touch }), className)}
		href={disabled ? undefined : href}
		aria-disabled={disabled}
		role={disabled ? "link" : undefined}
		tabindex={disabled ? -1 : undefined}
		{...restProps}
	>
		{@render children?.()}
	</a>
{:else}
	<button
		bind:this={ref}
		data-slot="button"
		class={cn(buttonVariants({ variant, size, touch }), className)}
		{type}
		{disabled}
		{...restProps}
	>
		{@render children?.()}
	</button>
{/if}
