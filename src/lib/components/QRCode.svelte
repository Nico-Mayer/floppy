<script lang="ts">
	import { cn } from '$lib/utils.js'
	import type { SVGAttributes } from 'svelte/elements'
	import { encode } from 'uqr'

	type PixelStyle = 'square' | 'rounded' | 'dot' | 'squircle' | 'row' | 'column'
	type MarkerShape = 'auto' | 'square' | 'rounded' | 'circle'

	interface Props extends SVGAttributes<SVGSVGElement> {
		value: string
		/** Rendered edge length in px. A `class` with its own width/height wins over it. */
		size?: number
		/** Quiet zone, in modules. */
		margin?: number
		errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
		pixelStyle?: PixelStyle
		/** 0 = hard corners, 1 = fully round. Applies to modules and markers alike. */
		roundness?: number
		/** Fraction of its cell each module fills. Below 1 the modules separate. */
		pixelScale?: number
		markerShape?: MarkerShape
		fgColor?: string
		/**
		 * Paint the negative: the light modules carry the ink and the dark ones are
		 * punched out. Scanners have to detect an inverted code to read it — most
		 * phones do, but not all, so this is opt-in.
		 */
		invert?: boolean
		class?: string
	}

	let {
		value,
		size = 268,
		margin = 1,
		errorCorrectionLevel = 'M',
		pixelStyle = 'rounded',
		roundness = 1,
		pixelScale = 1,
		markerShape = 'auto',
		fgColor = 'var(--card-foreground)',
		invert = false,
		class: className,
		...restProps
	}: Props = $props()

	// The code is laid out in *module* units and scaled by the viewBox, so nothing
	// here has to know the pixel size — a code can be sized with a class like any
	// other box, and every radius stays proportional.
	function f(n: number): number {
		return Math.round(n * 1000) / 1000
	}

	function rectPath(x: number, y: number, w: number, h: number): string {
		return `M${f(x)} ${f(y)}h${f(w)}v${f(h)}h${f(-w)}z`
	}

	function roundedPath(
		x: number,
		y: number,
		w: number,
		h: number,
		corners: [number, number, number, number]
	): string {
		const cap = Math.min(w, h) / 2
		const [tl, tr, br, bl] = corners.map((r) => Math.min(r, cap))
		let d = `M${f(x + tl)} ${f(y)}H${f(x + w - tr)}`
		if (tr) d += `A${f(tr)} ${f(tr)} 0 0 1 ${f(x + w)} ${f(y + tr)}`
		d += `V${f(y + h - br)}`
		if (br) d += `A${f(br)} ${f(br)} 0 0 1 ${f(x + w - br)} ${f(y + h)}`
		d += `H${f(x + bl)}`
		if (bl) d += `A${f(bl)} ${f(bl)} 0 0 1 ${f(x)} ${f(y + h - bl)}`
		d += `V${f(y + tl)}`
		if (tl) d += `A${f(tl)} ${f(tl)} 0 0 1 ${f(x + tl)} ${f(y)}`
		return `${d}z`
	}

	function circlePath(cx: number, cy: number, r: number): string {
		// Two half-arcs: the path equivalent of <circle cx cy r>.
		return `M${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 0 ${f(r * 2)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-r * 2)} 0`
	}

	function squirclePath(x: number, y: number, s: number): string {
		// Superellipse-ish: a rounded square whose curvature never breaks, which is
		// what keeps a field of them from reading as a grid of pills.
		const k = 0.11 * s
		const m = 0.5 * s
		return (
			`M${f(x)} ${f(y + m)}C${f(x)} ${f(y + k)} ${f(x + k)} ${f(y)} ${f(x + m)} ${f(y)}` +
			`C${f(x + s - k)} ${f(y)} ${f(x + s)} ${f(y + k)} ${f(x + s)} ${f(y + m)}` +
			`C${f(x + s)} ${f(y + s - k)} ${f(x + s - k)} ${f(y + s)} ${f(x + m)} ${f(y + s)}` +
			`C${f(x + k)} ${f(y + s)} ${f(x)} ${f(y + s - k)} ${f(x)} ${f(y + m)}z`
		)
	}

	let qr = $derived.by(() => {
		try {
			return encode(value, { ecc: errorCorrectionLevel, border: margin })
		} catch {
			return null
		}
	})

	let count = $derived(qr?.size ?? 0)

	// x/y are the top-left module of each 7x7 finder pattern.
	let markers = $derived([
		{ x: margin, y: margin },
		{ x: count - margin - 7, y: margin },
		{ x: margin, y: count - margin - 7 }
	])

	function isMarker(row: number, col: number): boolean {
		return markers.some((m) => col >= m.x && col < m.x + 7 && row >= m.y && row < m.y + 7)
	}

	// 'auto' follows the modules, so one prop restyles the whole code.
	let marker = $derived<Exclude<MarkerShape, 'auto'>>(
		markerShape !== 'auto'
			? markerShape
			: pixelStyle === 'square'
				? 'square'
				: pixelStyle === 'dot'
					? 'circle'
					: 'rounded'
	)

	// The whole code is one <path>, markers included, rather than a node per shape.
	// A code this size is a few hundred modules, and a few hundred SVG nodes are a
	// few hundred nodes the browser lays out while whatever surface holds the code
	// is still animating open — which is what made the Devices dialog hitch. Same
	// picture, two DOM nodes.
	//
	// It leans on `fill-rule="evenodd"` throughout: nesting subpaths punches holes,
	// so the finder pattern is an outer ring, a genuinely transparent gap and a
	// core — no background-coloured rect to punch it out with. That matters because
	// this component sits on more than one surface (TransferCard bleeds to the page
	// below `sm` and wears bg-card above it, and those two tokens differ in dark
	// mode), and a hole matches whatever is behind it. `invert` is the same trick
	// one level up: wrap everything in a full-canvas subpath and every shape that
	// was ink becomes a hole.
	let path = $derived.by(() => {
		if (!qr) return ''

		const s = Math.min(Math.max(pixelScale, 0.1), 1)
		const inset = (1 - s) / 2
		const r = (Math.min(Math.max(roundness, 0), 1) * s) / 2
		const dark = (row: number, col: number) => (qr.data[row]?.[col] ?? false) && !isMarker(row, col)

		// The inverted field is rounded off at the corners, which only ever eats into
		// the quiet zone diagonally — scanners read the code off its straight edges.
		const field = Math.min(margin, 2) * Math.min(Math.max(roundness, 0), 1)
		let d = invert ? roundedPath(0, 0, count, count, [field, field, field, field]) : ''

		if (pixelStyle === 'row' || pixelStyle === 'column') {
			// Runs merge into one bar, which is the whole point of these two styles:
			// the seams between neighbours disappear.
			const horizontal = pixelStyle === 'row'
			for (let line = 0; line < count; line++) {
				let run = 0
				for (let i = 0; i <= count; i++) {
					const on = i < count && (horizontal ? dark(line, i) : dark(i, line))
					if (on) {
						run++
						continue
					}
					if (run) {
						const start = i - run
						const long = run - 2 * inset
						const [x, y, w, h] = horizontal
							? [start + inset, line + inset, long, s]
							: [line + inset, start + inset, s, long]
						d += roundedPath(x, y, w, h, [r, r, r, r])
					}
					run = 0
				}
			}
		} else {
			for (let row = 0; row < count; row++) {
				for (let col = 0; col < count; col++) {
					if (!dark(row, col)) continue

					const x = col + inset
					const y = row + inset

					switch (pixelStyle) {
						case 'square':
							d += rectPath(x, y, s, s)
							break
						case 'dot':
							d += circlePath(col + 0.5, row + 0.5, s / 2)
							break
						case 'squircle':
							d += squirclePath(x, y, s)
							break
						case 'rounded':
							// A corner is only rounded where nothing joins it, so runs of
							// modules fuse into blobs instead of a chain of beads. Once the
							// modules are shrunk apart there is nothing to fuse, so every
							// corner rounds.
							d += roundedPath(x, y, s, s, [
								inset || (!dark(row - 1, col) && !dark(row, col - 1)) ? r : 0,
								inset || (!dark(row - 1, col) && !dark(row, col + 1)) ? r : 0,
								inset || (!dark(row + 1, col) && !dark(row, col + 1)) ? r : 0,
								inset || (!dark(row + 1, col) && !dark(row, col - 1)) ? r : 0
							])
							break
					}
				}
			}
		}

		// A finder pattern is a 1-module ring, a 1-module gap, then a 3x3 core.
		for (const { x, y } of markers) {
			if (marker === 'circle') {
				d += circlePath(x + 3.5, y + 3.5, 3.5)
				d += circlePath(x + 3.5, y + 3.5, 2.5)
				d += circlePath(x + 3.5, y + 3.5, 1.5)
				continue
			}

			const outer = marker === 'rounded' ? roundness * 2.5 : 0
			const gap = marker === 'rounded' ? roundness * 1.75 : 0
			const core = marker === 'rounded' ? roundness * 0.75 : 0
			d += roundedPath(x, y, 7, 7, [outer, outer, outer, outer])
			d += roundedPath(x + 1, y + 1, 5, 5, [gap, gap, gap, gap])
			d += roundedPath(x + 2, y + 2, 3, 3, [core, core, core, core])
		}

		return d
	})
</script>

{#if qr}
	<svg
		width={size}
		height={size}
		viewBox={`0 0 ${count} ${count}`}
		xmlns="http://www.w3.org/2000/svg"
		role="img"
		aria-label={`QR code for ${value}`}
		class={cn('block', className)}
		{...restProps}
	>
		<path d={path} fill={fgColor} fill-rule="evenodd" />
	</svg>
{/if}
