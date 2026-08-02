# Tasks: unify-top-bar

## 1. Shared heading grows up

- [x] 1.1 `PageHeader.svelte`: add `accent?: 'send' | 'receive'` (tint dot before the
      title, via the `--send`/`--receive` tokens) and `status?: string` (mono lowercase
      line on the title row, `aria-live="polite"`, `shrink-0`)
- [x] 1.2 `PageHeader.svelte`: compact below `sm` — title `max-sm:text-lg`, description
      not rendered below `sm`; `sm`+ unchanged
- [x] 1.3 `PageHeader.svelte`: title row reserves the icon-action height
      (`min-h-9 pointer-coarse:min-h-11`) so pages with and without an action match
- [x] 1.4 `PageShell.svelte`: `tight` keeps the default top (`pt-4`) and shaves only the
      bottom, so the heading sits at one vertical position on every destination

## 2. Transfer card loses its header

- [x] 2.1 `TransferCard.svelte`: delete the `Card.Header` block and the `title`,
      `headline`, `badge`, and `alert` props; keep chrome variants, drop-target, content
      and action zones
- [x] 2.2 `send/labels.ts` and `receive/labels.ts`: delete `sendBadge` / `receiveBadge`
- [x] 2.3 `SendPanel.svelte` / `ReceivePanel.svelte`: stop computing badge and headline;
      stop passing header props; move the large-transfer warning snippet out of the card

## 3. Transfer pages adopt the top bar

- [x] 3.1 `send/+page.svelte`: render `PageHeader` with title "Send", `accent="send"`,
      live `status` from `sendHeadline(...)`, and the large-transfer warning as the action
- [x] 3.2 `receive/+page.svelte`: render `PageHeader` with title "Receive",
      `accent="receive"`, live `status` from `receiveHeadline(...)`
- [x] 3.3 Check the vertical budget on a phone: the card's `min-h-0 flex-1` column plus the
      new heading still fits without the action zone leaving the viewport

## 4. Verify

- [x] 4.1 `npx svelte-check` green; `npm run build` green
- [ ] 4.2 Desktop smoke: all five destinations show identical heading rhythm; Send/Receive
      show dot + live status; no badge anywhere; queue, progress, and warning still present
- [ ] 4.3 Phone (or narrow window) smoke: heading is one compact row, no description; send
      flow states read correctly from the status line
