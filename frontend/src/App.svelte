<script lang="ts">
    import TitleBar from "$lib/components/TitleBar.svelte";
    import ErrorBanner from "$lib/components/transfer/ErrorBanner.svelte";
    import ReceivePanel from "$lib/components/transfer/ReceivePanel.svelte";
    import SendPanel from "$lib/components/transfer/SendPanel.svelte";
    import * as Tabs from "$lib/components/ui/tabs";
    import { app, type Mode } from "$lib/transfer-app.svelte";
    import {
        IconDeviceFloppy,
        IconDownload,
        IconLoader2,
        IconSend,
    } from "@tabler/icons-svelte";
    import { ModeWatcher } from "mode-watcher";
    import { onMount } from "svelte";
    import "./app.css";

    onMount(() => app.listen());

    // Dev-only escape hatch: lets the browser preview (no Wails bindings)
    // drive app state from the console to debug UI in isolation.
    if (import.meta.env.DEV) {
        (window as unknown as Record<string, unknown>).__app = app;
    }
</script>

<ModeWatcher />

<div class="flex h-svh flex-col [--header-height:calc(--spacing(13))]">
    <TitleBar />

    <main
        class="flex min-h-0 flex-1 flex-col gap-3 p-4 sm:p-6"
        data-file-drop-target
    >
        <div
            class="mx-auto flex w-full max-w-2xl sm:max-w-3xl md:max-w-4xl lg:max-w-7xl items-center gap-2.5 px-1"
        >
            <IconDeviceFloppy
                size={32}
                class={app.mode === "send" ? "stroke-send" : "stroke-receive"}
            />
            <h1 class="font-heading text-lg font-bold tracking-tight">
                Floppy
            </h1>
            <p
                class="truncate font-mono text-[9px] tracking-wider uppercase text-muted-foreground"
            >
                no cloud · direct device to device
            </p>
        </div>

        <Tabs.Root
            value={app.mode}
            onValueChange={(value) => (app.mode = value as Mode)}
            class="mx-auto flex min-h-0 w-full flex-1 flex-col gap-3 max-w-2xl sm:max-w-3xl md:max-w-4xl lg:max-w-7xl"
        >
            <Tabs.List class="w-full">
                <Tabs.Trigger value="send" class="gap-1.5">
                    {#if app.send.busy}
                        <IconLoader2 class="animate-spin" />
                    {:else}
                        <IconSend />
                    {/if}
                    Send
                </Tabs.Trigger>
                <Tabs.Trigger value="receive" class="gap-1.5">
                    {#if app.receive.busy}
                        <IconLoader2 class="animate-spin" />
                    {:else}
                        <IconDownload />
                    {/if}
                    Receive
                </Tabs.Trigger>
            </Tabs.List>

            {#if app.error}
                <ErrorBanner
                    message={app.error}
                    ondismiss={() => (app.error = "")}
                />
            {/if}

            <Tabs.Content value="send" class="min-h-0 flex-1">
                <SendPanel />
            </Tabs.Content>

            <Tabs.Content value="receive" class="min-h-0 flex-1">
                <ReceivePanel />
            </Tabs.Content>
        </Tabs.Root>
    </main>
</div>
