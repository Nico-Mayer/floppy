<script lang="ts">
	import type { PairingPreview } from '$bindings/floppy/internal/services/models'
	import { Button } from '$lib/components/ui/button'
	import * as Field from '$lib/components/ui/field'
	import { Input } from '$lib/components/ui/input'
	import * as ResponsiveDialog from '$lib/components/ui/responsive-dialog'
	import { Textarea } from '$lib/components/ui/textarea'
	import { pairing } from '$lib/pairing-app.svelte'
	import { IconShieldCheck } from '@tabler/icons-svelte'

	let { open = $bindable() }: { open: boolean } = $props()

	// The add flow is two steps: paste an identity, then confirm the SAS matches
	// on both screens before trusting.
	let pasteBlob = $state('')
	let pasteName = $state('')
	let preview = $state<PairingPreview | null>(null)
	let previewError = $state('')

	async function continuePairing() {
		previewError = ''
		try {
			preview = await pairing.preview(pasteBlob)
		} catch (e) {
			previewError = String(e)
		}
	}

	async function confirmPairing() {
		await pairing.trust(pasteBlob, pasteName)
		open = false
	}

	function reset() {
		pasteBlob = ''
		pasteName = ''
		preview = null
		previewError = ''
	}

	// Closing (backdrop, Esc, swipe, or after trusting) always clears the draft
	// so the next open starts fresh on the paste step.
	function onOpenChange(next: boolean) {
		open = next
		if (!next) reset()
	}
</script>

<ResponsiveDialog.Root bind:open {onOpenChange}>
	<ResponsiveDialog.Content class="sm:max-w-md">
		<ResponsiveDialog.Header>
			<ResponsiveDialog.Title>Add a device</ResponsiveDialog.Title>
			<ResponsiveDialog.Description>
				Both devices must add each other before a transfer can be sent.
			</ResponsiveDialog.Description>
		</ResponsiveDialog.Header>

		{#if preview}
			<ResponsiveDialog.Body>
				<div class="flex flex-col items-center gap-2 text-center">
					<IconShieldCheck class="size-8 text-muted-foreground" />
					<p class="text-sm text-muted-foreground">
						This code also shows on
						<span class="font-medium">{pasteName.trim() || 'the other device'}</span>
						when it pastes <span class="font-medium">your</span> pairing code. Trust only if both screens show the
						same digits.
					</p>
					<p class="font-mono text-3xl font-bold tracking-widest tabular-nums">
						{preview.sas}
					</p>
					<p class="max-w-full font-mono text-[10px] break-all text-muted-foreground">
						{preview.fingerprint}
					</p>
				</div>
			</ResponsiveDialog.Body>
			<ResponsiveDialog.Footer>
				<Button variant="outline" onclick={() => (preview = null)}>Back</Button>
				<Button onclick={confirmPairing}>
					<IconShieldCheck data-icon="inline-start" />
					Trust
				</Button>
			</ResponsiveDialog.Footer>
		{:else}
			<ResponsiveDialog.Body>
				<Field.FieldGroup>
					<Field.Field>
						<Field.FieldLabel for="paste-name">Name</Field.FieldLabel>
						<Input id="paste-name" bind:value={pasteName} placeholder="e.g. Bob's laptop" />
					</Field.Field>
					<Field.Field>
						<Field.FieldLabel for="paste-blob">Pairing code</Field.FieldLabel>
						<Textarea
							id="paste-blob"
							bind:value={pasteBlob}
							placeholder="Paste the other device's pairing code"
							class="w-full resize-none font-mono text-xs break-all"
							rows={3}
						/>
					</Field.Field>

					{#if previewError}
						<Field.FieldDescription class="text-destructive">
							{previewError}
						</Field.FieldDescription>
					{/if}
				</Field.FieldGroup>
			</ResponsiveDialog.Body>
			<ResponsiveDialog.Footer>
				<Button disabled={!pasteBlob.trim()} onclick={continuePairing}>Continue</Button>
			</ResponsiveDialog.Footer>
		{/if}
	</ResponsiveDialog.Content>
</ResponsiveDialog.Root>
