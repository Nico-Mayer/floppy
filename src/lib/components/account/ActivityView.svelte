<script lang="ts">
	import { Badge } from '$lib/components/ui/badge'
	import * as Empty from '$lib/components/ui/empty'
	import { Spinner } from '$lib/components/ui/spinner'
	import { formatBytes } from '$lib/components/transfer/format'
	import { cn } from '$lib/utils'
	import CheckIcon from '@lucide/svelte/icons/check'
	import Clock3Icon from '@lucide/svelte/icons/clock-3'
	import DownloadIcon from '@lucide/svelte/icons/download'
	import GlobeIcon from '@lucide/svelte/icons/globe'
	import LaptopIcon from '@lucide/svelte/icons/laptop'
	import SendIcon from '@lucide/svelte/icons/send'
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert'
	import XIcon from '@lucide/svelte/icons/x'
	import { onMount } from 'svelte'
	import { formatTime, groupByDay, loadActivity, type ActivityEntry, type ActivityStatus } from './activity'

	let entries = $state<ActivityEntry[] | null>(null)

	// Loaded on mount rather than at module scope so reopening the sheet shows
	// what has happened since — the sheet destroys its body on close.
	// `entries === null` is "still loading", distinct from an empty history.
	onMount(async () => {
		entries = await loadActivity()
	})

	let days = $derived(entries ? groupByDay(entries) : [])

	const statusLabels: Record<ActivityStatus, string> = {
		completed: 'Completed',
		failed: 'Failed',
		cancelled: 'Cancelled'
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
	<div class="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
		<Spinner />
		Loading activity
	</div>
{:else if entries.length === 0}
	<Empty.Root class="border border-dashed py-8">
		<Empty.Header>
			<Empty.Media variant="icon">
				<Clock3Icon />
			</Empty.Media>
			<Empty.Title>No transfers yet</Empty.Title>
			<Empty.Description>Sent and received files show up here.</Empty.Description>
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
							class="relative flex gap-3 pb-4 before:absolute before:top-8 before:bottom-0 before:left-[15px] before:w-px before:bg-border last:pb-0 last:before:hidden"
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
										{entry.kind === 'send' ? 'Sent to' : 'Received from'}
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
