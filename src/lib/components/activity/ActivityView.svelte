<script lang="ts">
	import { formatBytes } from '$lib/components/transfer/format'
	import { Badge } from '$lib/components/ui/badge'
	import * as Empty from '$lib/components/ui/empty'
	import { Skeleton } from '$lib/components/ui/skeleton'
	import { cn } from '$lib/utils'
	import CheckIcon from '@lucide/svelte/icons/check'
	import Clock3Icon from '@lucide/svelte/icons/clock-3'
	import DownloadIcon from '@lucide/svelte/icons/download'
	import GlobeIcon from '@lucide/svelte/icons/globe'
	import LaptopIcon from '@lucide/svelte/icons/laptop'
	import SendIcon from '@lucide/svelte/icons/send'
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert'
	import XIcon from '@lucide/svelte/icons/x'
	import { formatTime, groupByDay, type ActivityEntry, type ActivityStatus } from './activity'

	// A renderer, nothing more: the route owns loading, so it can also own the
	// pull-to-refresh that reloads. `entries === null` is "still loading", which is
	// distinct from an empty history.
	let { entries }: { entries: ActivityEntry[] | null } = $props()

	let days = $derived(entries ? groupByDay(entries) : [])

	const statusLabels: Record<ActivityStatus, string> = {
		completed: 'Done',
		failed: 'Went wrong',
		cancelled: 'Stopped'
	}

	/**
	 * Node colour. A transfer that finished wears its direction's accent — the
	 * same orange/blue the send and receive panels use — so the timeline can be
	 * skimmed for direction. Anything that did not finish stays neutral or red,
	 * which is why this is keyed on status first.
	 */
	function nodeClass(entry: ActivityEntry): string {
		if (entry.status === 'failed') return 'border-destructive/40 text-destructive'
		if (entry.status === 'cancelled') return 'text-muted-foreground'
		return entry.kind === 'send'
			? 'border-send/40 text-send dark:text-send-foreground'
			: 'border-receive/40 text-receive dark:text-receive-foreground'
	}

	/** "3 files · 1.8 MB", or the partial share when the transfer broke off. */
	function summary(entry: ActivityEntry): string {
		const files = entry.fileCount === 1 ? entry.file : `${entry.fileCount} files`
		const size =
			entry.status === 'completed'
				? formatBytes(entry.totalBytes)
				: `${formatBytes(entry.transferredBytes)} of ${formatBytes(entry.totalBytes)}`
		return `${files} · ${size}`
	}
</script>

{#if entries === null}
	<!-- Placeholders shaped like the rows they stand in for, rather than a spinner
	     in the middle of an empty page: the layout does not jump when the real
	     entries arrive, and the shape says what is coming. -->
	<div class="flex flex-col gap-4" aria-busy="true" aria-label="Loading your transfers">
		{#each { length: 3 }}
			<div class="flex gap-3">
				<Skeleton class="size-8 shrink-0 rounded-full" />
				<div class="flex min-w-0 flex-1 flex-col gap-2 pt-1">
					<Skeleton class="h-3.5 w-40 max-w-full" />
					<Skeleton class="h-3 w-28 max-w-full" />
					<Skeleton class="mt-1 h-5 w-20 rounded-xl" />
				</div>
			</div>
		{/each}
	</div>
{:else if entries.length === 0}
	<Empty.Root class="border border-dashed py-8">
		<Empty.Header>
			<Empty.Media variant="icon">
				<Clock3Icon />
			</Empty.Media>
			<Empty.Title>Nothing here yet</Empty.Title>
			<Empty.Description>Everything you send and get shows up here.</Empty.Description>
		</Empty.Header>
	</Empty.Root>
{:else}
	<div class="flex flex-col gap-6">
		{#each days as day (day.label)}
			<section class="flex flex-col gap-3">
				<h3 class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
					{day.label}
				</h3>

				<!-- The rail is a pseudo-element on each row rather than one line behind
				     the list: rows have different heights, and a single absolute line
				     would have to guess where the first and last node sit. Drawn from
				     the node's centre downwards, hidden on the last row so it stops at
				     the final node instead of trailing into the gap. -->
				<ol class="flex flex-col">
					{#each day.entries as entry (entry.id)}
						<li
							class="relative flex gap-3 pb-4 before:absolute before:top-8 before:bottom-0 before:left-3.75 before:w-px before:bg-border last:pb-0 last:before:hidden"
						>
							<!-- Node: direction is the icon, outcome is the colour. bg-background
							     keeps the rail from showing through the round node. -->
							<span
								class={cn(
									'z-10 flex size-8 shrink-0 items-center justify-center rounded-full border bg-background',
									nodeClass(entry)
								)}
							>
								{#if entry.kind === 'send'}
									<SendIcon class="size-4" />
								{:else}
									<DownloadIcon class="size-4" />
								{/if}
							</span>

							<div class="flex min-w-0 flex-1 flex-col gap-0.5 pt-1">
								<div class="flex items-baseline gap-2">
									<p class="truncate text-sm font-medium">
										{entry.kind === 'send' ? 'Sent to' : 'Got from'}
										{entry.peer}
									</p>
									<span class="ml-auto shrink-0 text-xs text-muted-foreground tabular-nums">
										{formatTime(entry.endedAt)}
									</span>
								</div>

								<p class="truncate text-xs text-muted-foreground">{summary(entry)}</p>

								<div class="flex flex-wrap items-center gap-1.5 pt-1">
									<!-- How the peer was found: a paired device, or a code phrase. -->
									<Badge variant="outline" class="text-muted-foreground">
										{#if entry.via === 'device'}
											<LaptopIcon data-icon="inline-start" />
											Device
										{:else}
											<GlobeIcon data-icon="inline-start" />
											Code
										{/if}
									</Badge>

									{#if entry.status === 'failed'}
										<Badge variant="destructive">
											<TriangleAlertIcon data-icon="inline-start" />
											{statusLabels.failed}
										</Badge>
									{:else if entry.status === 'cancelled'}
										<Badge variant="secondary">
											<XIcon data-icon="inline-start" />
											{statusLabels.cancelled}
										</Badge>
									{:else}
										<Badge variant="secondary" class="text-muted-foreground">
											<CheckIcon data-icon="inline-start" />
											{statusLabels.completed}
										</Badge>
									{/if}
								</div>

								{#if entry.error}
									<p class="truncate pt-1 text-xs text-destructive" title={entry.error}>
										{entry.error}
									</p>
								{/if}
							</div>
						</li>
					{/each}
				</ol>
			</section>
		{/each}
	</div>
{/if}
