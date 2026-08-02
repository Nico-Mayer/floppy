## Why

An app whose whole point is moving a file from one device to another currently keeps a
permanent second copy of everything that ever passed through it. Sending a 100 MB video from
a phone writes 200 MB of app-private data — a picker copy plus a blob-store copy — and only
the picker copy is ever deleted, by hand. Nothing in the repo runs iroh-blobs garbage
collection, so the store at `app_data_dir()/blobs` grows for the life of the install.

Three defaults compound it: `add_path` imports with `ImportMode::Copy`, `export` writes with
`ExportMode::Copy`, and no GC ever reclaims either. On desktop this is a slow leak nobody
notices. On a phone it is the difference between the app working and the OS killing it for
storage, and the photo library entry point (a separate change) makes multi-gigabyte videos a
one-tap operation.

## What Changes

- Send imports files **by reference** (`ImportMode::TryReference`) instead of copying them
  into the blob store. A send stops costing a second copy of its own payload.
- Receive exports **by reference** (`ExportMode::TryReference`), moving each file out of the
  store into its destination rather than copying it.
- The blob store is **cleared at launch**, not left to grow. It is scratch space for a
  transfer, not an archive. (iroh-blobs 0.103 keeps `gc_run_once` and `Blobs::delete` private,
  so collecting at a terminal event is not on offer; wiping the directory before the store
  opens does the same job with nothing to run. See design.md.)
- The store still accumulates **within a session**, so content-addressed resume keeps working
  for the case it exists for: a receive that drops and is retried. Resume across an app
  restart is what this gives up.
- Sandbox copies made for the send queue are reaped **when a send completes**, not only when
  the user empties the queue by hand. This closes an existing gap: the spec already promises
  reaping "when the send queue is cleared or the transfer ends", and only the first half is
  built.
- iOS photo/document picker copies, which the dialog plugin writes to the app Caches root and
  which `reap()` has never seen, are folded into the reaped queue directory by a rename — no
  bytes moved, no more leak.
- **BREAKING (behavioural, not API):** resume no longer survives a restart. Within a session
  it is unchanged.

## Capabilities

### New Capabilities

None. This tightens existing behaviour rather than adding a surface.

### Modified Capabilities

- `file-transfer`: adds a no-second-copy requirement and a store-lifecycle requirement (the
  store is scratch space, cleared at launch), and narrows **Content-addressed resume** from
  "forever" to "within a session".
- `app-platform`: extends the sandbox-copy requirement so a completed send reaps its copies,
  and so copies the platform's own picker made outside the app's queue directory are covered
  too.

## Impact

- `src-tauri/src/transport/manager.rs` — `build_collection` import options, the export call in
  `do_receive`, and clearing the store directory before `FsStore::load`.
- `src-tauri/src/fileinput.rs` — a mobile rename-into-queue-dir step, guarded so it can only
  ever move a file that is already inside the app's own scratch roots.
- `src/lib/transfer-app.svelte.ts` — reap on done as well as on `reset()`.
- No IPC change: no new command, no new event, `bindings.ts` unaffected.
- No `Config` change and no new dependency. Notably `iroh_blobs::store::gc::gc_run_once` is
  **not** public in the pinned 0.103, which is why the store is cleared rather than collected.
