<script lang="ts">
    import {
        CancelReceive,
        CancelSend,
        Receive,
        Send,
    } from "$bindings/bibor/crocservice";
    import { SelectFiles } from "$bindings/bibor/fileservice";
    import TitleBar from "$lib/components/TitleBar.svelte";
    import ErrorBanner from "$lib/components/transfer/ErrorBanner.svelte";
    import ReceivePanel from "$lib/components/transfer/ReceivePanel.svelte";
    import SendPanel from "$lib/components/transfer/SendPanel.svelte";
    import type {
        ReceiveStatus,
        SendStatus,
    } from "$lib/components/transfer/types";
    import * as Tabs from "$lib/components/ui/tabs";
    import { IconDownload, IconLoader2, IconSend } from "@tabler/icons-svelte";
    import { Events } from "@wailsio/runtime";
    import { ModeWatcher } from "mode-watcher";
    import { onMount } from "svelte";
    import "./app.css";

    let tab = $state("send");

    let files: string[] = $state([]);
    let sendStatus: SendStatus = $state("idle");
    let code = $state("");
    let sendProgress = $state(0);

    let receiveCode = $state("");
    let receiveStatus: ReceiveStatus = $state("idle");
    let receivedTo = $state("");
    let receiveProgress: number | null = $state(null);

    let error = $state("");

    let sendBusy = $derived(sendStatus !== "idle" && sendStatus !== "done");
    let receiveBusy = $derived(
        (receiveStatus as ReceiveStatus) === "receiving",
    );

    onMount(() => {
        const unsubs = [
            Events.On("files-dropped", (ev: { data: string[] | null }) => {
                for (const path of ev.data ?? []) addFile(path);
            }),
            Events.On("croc:code", (ev: { data: string }) => {
                code = ev.data;
                sendStatus = "waiting";
            }),
            Events.On("croc:send:progress", (ev: { data: string }) => {
                // Progress only makes sense once the code phrase exists — never
                // let a stray progress line hide the code screen.
                if (sendStatus === "waiting" || sendStatus === "sending") {
                    sendProgress = Number(ev.data);
                    sendStatus = "sending";
                }
            }),
            Events.On("croc:recv:progress", (ev: { data: string }) => {
                receiveProgress = Number(ev.data);
            }),
            Events.On("croc:sent", () => {
                sendStatus = "done";
            }),
            Events.On("croc:received", (ev: { data: string }) => {
                receivedTo = ev.data;
                receiveStatus = "done";
            }),
            Events.On("croc:error", (ev: { data: string }) => {
                error = ev.data;
                if (sendStatus !== "done") sendStatus = "idle";
                if (receiveStatus !== "done") receiveStatus = "idle";
            }),
        ];
        return () => unsubs.forEach((unsub) => unsub());
    });

    function addFile(path: string) {
        if (sendStatus === "idle" && !files.includes(path)) files.push(path);
    }

    async function pickFiles() {
        const paths = await SelectFiles();
        for (const path of paths ?? []) addFile(path);
    }

    async function startSend() {
        error = "";
        sendProgress = 0;
        sendStatus = "starting";
        try {
            await Send(files);
        } catch (e) {
            error = String(e);
            sendStatus = "idle";
        }
    }

    async function cancelSend() {
        await CancelSend();
        resetSend();
    }

    function resetSend() {
        files = [];
        code = "";
        sendProgress = 0;
        sendStatus = "idle";
    }

    async function startReceive() {
        error = "";
        receiveProgress = null;
        receiveStatus = "receiving";
        try {
            await Receive(receiveCode);
        } catch (e) {
            error = String(e);
            receiveStatus = "idle";
        }
    }

    async function cancelReceive() {
        await CancelReceive();
        resetReceive();
    }

    function resetReceive() {
        receiveCode = "";
        receivedTo = "";
        receiveProgress = null;
        receiveStatus = "idle";
    }
</script>

<ModeWatcher />

<div class="flex h-svh flex-col [--header-height:calc(--spacing(13))]">
    <TitleBar />

    <main class="flex min-h-0 flex-1 flex-col p-6" data-file-drop-target>
        <Tabs.Root
            bind:value={tab}
            class="flex min-h-0 w-full flex-1 flex-col gap-3"
        >
            <Tabs.List class="w-full">
                <Tabs.Trigger
                    value="send"
                    class="gap-1.5 data-[state=active]:text-send"
                >
                    {#if sendBusy}
                        <IconLoader2 class="animate-spin" />
                    {:else}
                        <IconSend />
                    {/if}
                    Send
                </Tabs.Trigger>
                <Tabs.Trigger
                    value="receive"
                    class="gap-1.5 data-[state=active]:text-receive"
                >
                    {#if receiveBusy}
                        <IconLoader2 class="animate-spin" />
                    {:else}
                        <IconDownload />
                    {/if}
                    Receive
                </Tabs.Trigger>
            </Tabs.List>

            {#if error}
                <ErrorBanner message={error} ondismiss={() => (error = "")} />
            {/if}

            <Tabs.Content value="send" class="min-h-0 flex-1">
                <SendPanel
                    status={sendStatus}
                    bind:files
                    {code}
                    progress={sendProgress}
                    onpick={pickFiles}
                    onstart={startSend}
                    oncancel={cancelSend}
                    onreset={resetSend}
                />
            </Tabs.Content>

            <Tabs.Content value="receive" class="min-h-0 flex-1">
                <ReceivePanel
                    status={receiveStatus}
                    progress={receiveProgress}
                    savedTo={receivedTo}
                    bind:code={receiveCode}
                    onstart={startReceive}
                    oncancel={cancelReceive}
                    onreset={resetReceive}
                />
            </Tabs.Content>
        </Tabs.Root>
    </main>
</div>
