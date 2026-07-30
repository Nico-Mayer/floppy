<script lang="ts">
	import ModeSwitcher from '$lib/components/transfer/ModeSwitcher.svelte'
	import ReceivePanel from '$lib/components/transfer/receive/ReceivePanel.svelte'
	import SendPanel from '$lib/components/transfer/send/SendPanel.svelte'
	import * as Alert from '$lib/components/ui/alert'
	import { Button } from '$lib/components/ui/button'
	import * as Tabs from '$lib/components/ui/tabs'
	import { normal, shift } from '$lib/motion'
	import { app, type Mode } from '$lib/transfer-app.svelte'
	import CircleAlertIcon from '@lucide/svelte/icons/circle-alert'
	import XIcon from '@lucide/svelte/icons/x'
	import { fly } from 'svelte/transition'
</script>

<!-- data-tabbar-clearance: on mobile this pads out from under the tab bar and
     the gesture bar below it (layout.css). It sits on <main> rather than inside
     it because this page does not scroll — the send/receive switch is pinned to
     the bottom of the column and has to stay above the bar, not slide under. -->
<main class="flex min-h-0 flex-1 flex-col gap-3 p-4 sm:p-6" data-tabbar-clearance>
	<div
		class="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col gap-3 sm:max-w-3xl md:max-w-4xl lg:max-w-5xl"
	>
		<Tabs.Root
			value={app.mode}
			onValueChange={(value) => (app.mode = value as Mode)}
			class="flex min-h-0 flex-1 flex-col gap-3"
		>
			<ModeSwitcher />

			{#if app.error}
				<div transition:fly={{ y: -shift(), duration: normal() }}>
					<Alert.Root variant="destructive" class="animate-shake">
						<CircleAlertIcon />
						<Alert.Title>{app.error.title}</Alert.Title>
						<!-- detail holds the transport's original wording whenever we replaced
						     it with something friendlier; surface it on hover rather than
						     throwing raw text at the user. -->
						<Alert.Description title={app.error.detail}>
							{app.error.message}
						</Alert.Description>
						<Alert.Action>
							<Button variant="ghost" size="icon-xs" onclick={() => (app.error = null)} aria-label="Dismiss">
								<XIcon />
							</Button>
						</Alert.Action>
					</Alert.Root>
				</div>
			{/if}

			<Tabs.Content value="send" class="min-h-0 flex-1">
				<SendPanel />
			</Tabs.Content>

			<Tabs.Content value="receive" class="min-h-0 flex-1">
				<ReceivePanel />
			</Tabs.Content>
		</Tabs.Root>
	</div>
</main>
