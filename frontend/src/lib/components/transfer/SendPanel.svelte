<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import {
        IconCheck,
        IconCopy,
        IconLoader2,
        IconPlus,
        IconSend,
    } from "@tabler/icons-svelte";
    import { Clipboard } from "@wailsio/runtime";
    import CancelButton from "./CancelButton.svelte";
    import FileRow from "./FileRow.svelte";
    import { basename } from "./files";
    import Mascot from "./Mascot.svelte";
    import TransferCard from "./TransferCard.svelte";
    import TransferProgress from "./TransferProgress.svelte";
    import type { SendStatus } from "./types";

    let {
        status,
        files = $bindable(),
        code,
        progress,
        onpick,
        onstart,
        oncancel,
        onreset,
    }: {
        status: SendStatus;
        files: string[];
        code: string;
        progress: number;
        onpick: () => void;
        onstart: () => void;
        oncancel: () => void;
        onreset: () => void;
    } = $props();

    let summary = $derived(
        files.length === 1 ? basename(files[0]) : `${files.length} files`,
    );
    let headline = $derived(
        status === "idle"
            ? files.length
                ? "review"
                : "select files"
            : status === "starting"
              ? "connecting"
              : status === "waiting"
                ? "awaiting peer"
                : status === "sending"
                  ? "transferring"
                  : "complete",
    );
    let badge = $derived(
        status === "idle"
            ? `${files.length} selected`
            : status === "starting"
              ? "…"
              : status === "waiting"
                ? "ready"
                : status === "sending"
                  ? `${progress}%`
                  : "sent",
    );

    let dragOver = $state(false);
    let copied = $state(false);
    let copyResetTimer: ReturnType<typeof setTimeout>;

    async function copyCode() {
        try {
            // Native clipboard via the Go side — reliable in every webview,
            // unlike navigator.clipboard (secure-context/permission quirks).
            await Clipboard.SetText(code);
        } catch {
            await navigator.clipboard.writeText(code);
        }
        copied = true;
        clearTimeout(copyResetTimer);
        copyResetTimer = setTimeout(() => (copied = false), 2000);
    }
</script>

<TransferCard accent="send" title="Send" {headline} {badge}>
    {#if status === "idle"}
        {#if files.length === 0}
            <button
                type="button"
                onclick={onpick}
                ondragover={(e) => {
                    e.preventDefault();
                    dragOver = true;
                }}
                ondragleave={() => (dragOver = false)}
                ondrop={() => (dragOver = false)}
                class="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed p-6 text-center transition-colors hover:cursor-pointer {dragOver
                    ? 'border-send bg-send/5'
                    : 'border-input bg-muted/40 hover:border-send'}"
            >
                <Mascot accent="send" />
                <span class="text-lg font-bold tracking-tight">
                    Drag files here
                </span>
                <span class="max-w-72 text-xs text-muted-foreground">
                    Drop them anywhere in this pane, or <span
                        class="text-foreground underline underline-offset-2"
                        >browse your files</span
                    >. Transfers are peer-to-peer — nothing is uploaded to a
                    server.
                </span>
            </button>
        {:else}
            <ul class="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
                {#each files as path (path)}
                    <FileRow
                        {path}
                        onremove={() => (files = files.filter((f) => f !== path))}
                    />
                {/each}
            </ul>
            <div class="flex gap-2">
                <Button variant="outline" onclick={onpick}>
                    <IconPlus />
                    Add
                </Button>
                <Button class="flex-1" onclick={onstart}>
                    <IconSend />
                    Send {summary}
                </Button>
            </div>
        {/if}
    {:else if status === "starting"}
        <TransferProgress accent="send" label="Connecting to peer…" />
    {:else if status === "waiting"}
        <div class="flex flex-1 flex-col items-center justify-center gap-4">
            <p class="animate-pop text-lg font-bold tracking-tight">
                Ready to share
            </p>
            <button
                type="button"
                onclick={copyCode}
                class="border-l-send flex max-w-full items-center gap-3 rounded-xl border border-l-[3px] bg-card px-4 py-3 text-left transition-colors hover:cursor-pointer hover:bg-muted/50"
                title="Click to copy"
            >
                <span class="min-w-0 font-mono text-[15px] font-medium break-all">
                    {code}
                </span>
                {#if copied}
                    <IconCheck class="text-send-foreground size-4 shrink-0" />
                {:else}
                    <IconCopy class="size-4 shrink-0 text-muted-foreground" />
                {/if}
            </button>
            <p class="max-w-64 text-center text-xs text-muted-foreground">
                Share the code. It expires when you quit the app.
            </p>
            <div
                class="flex items-center gap-2 font-mono text-[11px] tracking-wider uppercase text-muted-foreground"
            >
                <IconLoader2 class="size-3.5 shrink-0 animate-spin" />
                awaiting peer
            </div>
        </div>
        <CancelButton onclick={oncancel} />
    {:else if status === "sending"}
        <TransferProgress
            accent="send"
            {progress}
            label="Encrypted · direct peer · {summary}"
        />
        <CancelButton onclick={oncancel} />
    {:else}
        <div class="flex flex-1 flex-col items-center justify-center gap-3">
            <div
                class="animate-pop flex size-12 items-center justify-center rounded-full border"
            >
                <IconCheck class="text-send-foreground size-6" />
            </div>
            <p class="text-base font-bold tracking-tight">Sent {summary}</p>
        </div>
        <Button variant="outline" size="sm" onclick={onreset}>
            New transfer
        </Button>
    {/if}
</TransferCard>
