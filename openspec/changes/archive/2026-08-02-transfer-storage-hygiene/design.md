## Context

Three defaults, each reasonable alone, compound into a permanent second copy of everything
the app has ever moved.

**What is on disk today.** Sending a 100 MB video picked from an Android gallery:

```
                                            ours?   freed when?
MediaStore original          100 MB          no      —
floppy-queue cache copy      100 MB          yes     manual reset() only
blob store copy              100 MB          yes     never
                             ══════
                             200 MB ours
```

iOS is the same shape with a worse ending: the dialog plugin's `saveTemporaryFile` writes the
PHPicker result into the app Caches *root*, and `fileinput::reap` only ever removes
`floppy-queue`, so that copy is not merely retained — it is unreachable. Receiving is the
mirror image: the store keeps the fetched bytes forever, `export` writes a second copy into
the destination, and on Android `android_publish` writes a third into public Downloads before
deleting the staging folder.

**Why nothing reclaims it.** `Blobs::add_path` defaults to `ImportMode::Copy`
(`iroh-blobs/api/blobs.rs:265-268`); `Blobs::export` defaults to `ExportMode::Copy`. Both are
the safe defaults, chosen so a store cannot be corrupted by someone editing the source file
underneath it. `build_collection` holds `TempTag`s to pin content for the send's lifetime and
drops them at the end — which frees nothing, because dropping a temp tag only *unprotects*
content, and no garbage collector runs. `iroh_blobs::api::Blobs::delete` is deliberately
`pub(crate)`: the crate's position is that users delete by dropping tags and letting GC do the
work. There is no GC anywhere in `src-tauri/`.

**The one thing standing on the store.** `file-transfer`'s **Content-addressed resume**
requirement says re-initiating the same transfer reuses locally held partial content, keyed by
BLAKE3 hash. That partial content *is* the store. Collecting aggressively and resuming
reliably are the same knob turned in opposite directions, which is the real decision this
design has to make rather than dodge.

## Goals / Non-Goals

**Goals:**

- A completed transfer leaves behind only the bytes the user asked for: the received files in
  their destination, and nothing app-private.
- Sending costs no copy of the payload beyond what the OS forced on us at pick time.
- Resume keeps working for the case it exists for — a dropped connection, retried soon.
- No new IPC surface, no new dependency, no second implementation of anything.

**Non-Goals:**

- Eliminating the mobile picker copy. On Android `add_path` needs a real path and a
  `content://` URI is not one; on iOS the PHPicker item URL is deleted the moment the
  completion handler returns and Apple requires persisting it. One copy at pick time is the
  floor on both platforms, and it also pays for `thumb://` previews, which need a real path.
- Streaming a receive straight into Android's MediaStore, skipping the private staging folder.
  Worth doing and it would take Android from two writes to one, but it means rebuilding the
  export loop on `export_ranges` and is a change of its own.
- A background GC timer. Collection is tied to transfer lifecycle events, which is both
  cheaper and easier to reason about.
- Any change to what the receiver ends up with, or where.

## Decisions

### Import by reference on send

`build_collection` switches from `store.blobs().add_path(path)` to `add_path_with_opts` with
`ImportMode::TryReference`. The store records the path and computes the outboard from it
instead of copying the file in first. Files under the store's inline threshold are still read
into the database, which is correct and irrelevant at those sizes.

*Why this over collecting after the send instead:* collecting still means the copy exists for
the duration of the send, which on a phone sending a 4 GB video is exactly when the storage
pressure is fatal. Not making the copy is strictly better than making it and cleaning up.

*What we accept:* the safety `ImportMode::Copy` was buying. If the source file changes between
import and the receiver fetching it, the served bytes stop matching the hash. That failure is
loud — the receiver's BLAKE3 verification rejects the data and the transfer errors — not
silent corruption. On mobile the source is our own cache copy, which nothing else can reach.
On desktop it is the user's file, and editing a file while watching it upload is a rare and
self-inflicted case that now fails cleanly instead of sending stale bytes.

### Export by reference on receive

`do_receive`'s export loop switches to `ExportMode::TryReference`, which moves the file out of
the store into the destination rather than copying it, leaving the store referencing the
exported path.

*Ordering constraint, Android only:* `android_publish` copies the exported folder into public
Downloads and then `remove_dir_all`s it. With `TryReference`, that deletes files the store now
points at. So collection must run **after** the publish hook, never before, and the publish
hook keeps its own copy step. On desktop and iOS the export path is final and there is nothing
to sequence around.

### Clear the store at launch, and nothing else

`remove_dir_all(store_path)` in `Manager::new_with_publish`, immediately before
`FsStore::load`. No collector, no timer, no tags, no retention window, no `Config` field.

*This is not the design we started with, and the reason is an API wall.* The plan was one call
to `gc_run_once` on each terminal path. That function is private: `store/mod.rs` declares
`mod gc` and re-exports only `GcConfig`, `ProtectCb`, and `ProtectOutcome`. `Blobs::delete` is
`pub(crate)` for the same stated reason ("users should rely only on garbage collection for
blob deletion"). 0.103.0 is the latest release, so there is no upgrade out of it. The only
collection iroh-blobs offers is a background timer configured when the store is opened, and it
cannot be triggered at an event.

Wiping the directory before the store opens does the same job with nothing to run. It is also
*more* complete than GC would have been — outboards, entries, and partials all go, rather than
whatever the mark phase decides is unreachable.

**What this gives up, and why that is the right trade.** Once import and export are both by
reference, what a finished transfer leaves behind is small:

| leftover | size | reclaimed by |
| --- | --- | --- |
| outboard (BLAKE3 tree) | ~1/256 of content, 4 MB per GB | launch |
| inlined small files | full, but only below the inline threshold | launch |
| partial of a failed receive | full | launch |

Only the third is big, and it is exactly the content **Content-addressed resume** exists to
reuse. Wiping at launch rather than at a terminal event keeps that: the store accumulates
normally for the whole session, so a receive that dies and is retried a minute later still
resumes from what it already fetched. What is given up is resume *across an app restart* —
and nobody quits the app and comes back to resume a transfer. The case people hit is the
connection dropping and tapping retry, which still works.

*Alternatives considered.* A `GcConfig` timer, alone or on top of the launch wipe: reclaims
mid-session too, at the cost of a permanent background task for leftovers that are usually a
few MB. Worth revisiting only if long desktop sessions turn out to accumulate meaningfully.
Dropping resume entirely: identical code, but it would mean deleting the requirement rather
than narrowing it, and in-session resume is free — the store is simply not wiped mid-session.
A stamp file gating the wipe on a 24-hour retention window: buys cross-restart resume for a
retain/release/sweep module, a `Config` field, and a window nobody can justify picking.

**A thing checked rather than assumed:** GC and blob deletion never unlink data an entry only
*references*. `fs/meta.rs` skips `DataLocation::External` on delete, so exporting by reference
cannot lead to a received file being removed from the user's Downloads. That also makes the
Android publish-then-delete sequencing harmless rather than dangerous — the store is left
holding an entry that points at a path the publish hook removed, and the launch wipe takes it.

### Reap sandbox copies when a send completes

`clear_input_cache` is invoked from exactly one place today — `reset()` — so copies survive
until the user empties the queue by hand. It gains a second caller on the send's done path,
sequenced after collection so the store is not referencing what is about to be deleted.

Not on cancel: cancelling deliberately keeps the queue, because "picking the same files again
by hand is the tedious part", and reaping the copies would leave queue entries pointing at
nothing.

### Fold the iOS picker copy into the reaped directory

On iOS, `fileinput::classify` sees a `file://` URL and returns `Plain`, so the dialog plugin's
copy in the Caches root passes straight through and is never reaped. The fix is a rename into
`floppy-queue` — same volume, zero bytes moved — after which the existing reaping covers it.

*The guard is the whole design here.* `fileAccessMode: 'scoped'` makes the iOS document picker
open a file in place rather than copying it, and renaming *that* would move the user's real
file out from under them. So the rename is conditional on the path being inside the app's own
caches or temp directory, checked by prefix, not on the platform alone. A path that fails the
check is left exactly where it is.

## Risks / Trade-offs

- **A source file edited mid-send now fails the transfer** → BLAKE3 verification catches it on
  the receiving side, so the failure is a clean typed error rather than corrupt output. Mobile
  sources are app-private copies and cannot be touched. Accepted.
- **Resume gets quietly weaker and the config context still promises it** → the spec change
  and `openspec/config.yaml`'s context block both say "within a session" rather than leaving
  "resumes by hash" to imply forever.
- **A long desktop session accumulates until the next launch** → the only real gap in the
  launch-wipe design. Bounded by how many transfers fail in one sitting, and each one costs
  its partial rather than a full duplicate. If it bites, the fix is additive: turn on
  `GcConfig` alongside the wipe.
- **The iOS rename guard is wrong and moves a real user file** → prefix check against the
  app's caches and temp dirs, with unit tests for both directions. This is the one change here
  that could destroy something the user owns, so it fails closed twice over: `cfg(mobile)` and
  an unknown location means leave it alone. No scratch roots at all also reads as "adopt
  nothing".
- **`TryReference` is a hint the store may ignore** → both modes are documented as advisory,
  and `iroh-blobs` honours reference mode for anything above the inline threshold
  (`store/fs/import.rs:469`). The two storage tests fail loudly if a future version stops
  honouring it: with `Copy` they measured 5.06 MB stored for a 4 MB payload, against a 2 MB
  ceiling. That is a saving verified by reverting, not assumed.

## Migration Plan

No data migration. An existing install's accumulated store is deleted wholesale by the first
launch after the upgrade, which is the point. Nothing user-visible changes: no file moves, no
destination changes, no re-pairing.

Rollback is reverting the change. A store written by the new code is readable by the old code
— reference-mode entries are an ordinary store feature, not a format change.

## Open Questions

- Should the launch wipe also run when the app returns to the foreground on mobile, where a
  process can live for days and "launch" is rarer than it looks?
- Android's receive still costs two writes (store, then public Downloads). Worth its own
  change to stream `export_ranges` straight into the MediaStore URI, or is one extra write
  acceptable there?
- The send side no longer copies, so a phone sending a 4 GB video from its gallery still pays
  one full copy — the picker's, which neither platform lets us avoid. Is a `content://` stream
  import worth asking iroh-blobs for upstream?
