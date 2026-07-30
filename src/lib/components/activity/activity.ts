/**
 * Transfer history — the data behind the Activity timeline.
 *
 * Nothing here is persisted yet: `loadActivity` hands back a fixed sample so the
 * view can be built and reviewed. The shape is the contract, and it is
 * deliberately a flat, already-finished record — the timeline only ever shows
 * transfers that have *ended*, so there is no progress, no rate, no ETA. Live
 * ones belong to the transfer panels.
 *
 * When history graduates to the Go side, `loadActivity` becomes a single call to
 * the generated binding (`Recent(limit)`), `ActivityEntry` is replaced by the
 * generated model, and every helper below keeps working unchanged.
 */

/** Which direction the bytes went. Matches `transfer.Kind` on the Go side. */
export type ActivityKind = 'send' | 'receive'

/**
 * How a transfer ended. Cancelled is its own outcome rather than a failure:
 * the Manager emits no terminal event for a cancel, so it is the user's doing,
 * not an error, and the timeline should not shout about it.
 */
export type ActivityStatus = 'completed' | 'failed' | 'cancelled'

/** Whether the peer was found by code phrase or was an already-trusted device. */
export type ActivityVia = 'code' | 'device'

export type ActivityEntry = {
	/** The transfer id every `croc:*` event already carries. */
	id: string
	kind: ActivityKind
	status: ActivityStatus
	via: ActivityVia
	/** Unix millis at which the transfer ended. */
	endedAt: number
	/**
	 * Who it was with: a trusted device's name, or the code phrase for a code
	 * transfer. Codes are shown because they are single-use and already spent.
	 */
	peer: string
	/** First file in the manifest — the timeline's one-line "what". */
	file: string
	fileCount: number
	/** Size of the whole manifest, as announced. */
	totalBytes: number
	/**
	 * Bytes actually moved. Equal to `totalBytes` when completed, short of it
	 * when the transfer broke off — which is what makes a partial visible.
	 */
	transferredBytes: number
	/** Set for `failed` entries: the `croc:error` message, verbatim. */
	error?: string
}

/**
 * Recent transfers, newest first.
 *
 * @param limit how many entries to return at most
 */
export async function loadActivity(limit = 20): Promise<ActivityEntry[]> {
	// TODO: replace with the history binding once it exists —
	// `return (await Recent(limit)) ?? []`.
	return sampleActivity().slice(0, limit)
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** Fake history, spread over the last few days so the day grouping shows up. */
function sampleActivity(): ActivityEntry[] {
	const now = Date.now()
	return [
		{
			id: 'a1',
			kind: 'send',
			status: 'completed',
			via: 'device',
			endedAt: now - 8 * MINUTE,
			peer: "Nico's MacBook",
			file: 'holiday-photos.zip',
			fileCount: 1,
			totalBytes: 248_300_000,
			transferredBytes: 248_300_000
		},
		{
			id: 'a2',
			kind: 'receive',
			status: 'completed',
			via: 'code',
			endedAt: now - 2 * HOUR,
			peer: 'quiet-mango-river',
			file: 'invoice-2026-07.pdf',
			fileCount: 3,
			totalBytes: 1_840_000,
			transferredBytes: 1_840_000
		},
		{
			id: 'a3',
			kind: 'send',
			status: 'failed',
			via: 'code',
			endedAt: now - 5 * HOUR,
			peer: 'brave-copper-tiger',
			file: 'backup.tar.gz',
			fileCount: 1,
			totalBytes: 4_100_000_000,
			transferredBytes: 1_230_000_000,
			error: 'connection reset by peer'
		},
		{
			id: 'a4',
			kind: 'receive',
			status: 'cancelled',
			via: 'device',
			endedAt: now - DAY - 3 * HOUR,
			peer: 'Workshop PC',
			file: 'dataset.csv',
			fileCount: 12,
			totalBytes: 92_000_000,
			transferredBytes: 31_500_000
		},
		{
			id: 'a5',
			kind: 'send',
			status: 'completed',
			via: 'device',
			endedAt: now - DAY - 9 * HOUR,
			peer: 'Workshop PC',
			file: 'slides.key',
			fileCount: 1,
			totalBytes: 18_700_000,
			transferredBytes: 18_700_000
		},
		{
			id: 'a6',
			kind: 'receive',
			status: 'completed',
			via: 'code',
			endedAt: now - 4 * DAY,
			peer: 'small-velvet-comet',
			file: 'firmware.bin',
			fileCount: 2,
			totalBytes: 6_400_000,
			transferredBytes: 6_400_000
		}
	]
}

export type ActivityDay = { label: string; entries: ActivityEntry[] }

/**
 * Bucket entries into day sections, newest first, so the timeline reads as
 * "Today / Yesterday / <date>" rather than one undifferentiated run of rows.
 * Grouping happens here rather than in the view because it depends only on the
 * data, and the view should stay a renderer.
 */
export function groupByDay(entries: ActivityEntry[]): ActivityDay[] {
	const days: ActivityDay[] = []
	for (const entry of [...entries].sort((a, b) => b.endedAt - a.endedAt)) {
		const label = dayLabel(entry.endedAt)
		// Sorted input means same-day entries are always adjacent, so comparing
		// against the last bucket is enough — no map, and order is preserved.
		const last = days.at(-1)
		if (last?.label === label) last.entries.push(entry)
		else days.push({ label, entries: [entry] })
	}
	return days
}

/** "Today", "Yesterday", or a locale date for anything older. */
function dayLabel(at: number): string {
	const midnight = startOfDay(Date.now())
	if (at >= midnight) return 'Today'
	if (at >= midnight - DAY) return 'Yesterday'
	return new Date(at).toLocaleDateString(undefined, {
		day: 'numeric',
		month: 'short',
		// Drop the year while it is the current one — it is noise 11 months of 12.
		year: new Date(at).getFullYear() === new Date().getFullYear() ? undefined : 'numeric'
	})
}

function startOfDay(at: number): number {
	const d = new Date(at)
	d.setHours(0, 0, 0, 0)
	return d.getTime()
}

/** Clock time within the day — the day itself is already the section heading. */
export function formatTime(at: number): string {
	return new Date(at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}
