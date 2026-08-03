export const SIDEBAR_COOKIE_NAME = "sidebar_state";
export const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
export const SIDEBAR_WIDTH = "16rem";
export const SIDEBAR_WIDTH_MOBILE = "18rem";
// PATCHED (registry default is 3rem): a 4rem rail. The app has four destinations
// plus a brand and an account row, so there is room to breathe and the cramped
// 48px rail read as a toolbar rather than navigation. The number is load-bearing
// with the rail tile size in sidebar-menu-button.svelte: the header, group, and
// footer each pad by 2 (8px), so 4rem leaves a 48px content box and the tile is
// `size-12`. Change one and change the other.
export const SIDEBAR_WIDTH_ICON = "4rem";
export const SIDEBAR_KEYBOARD_SHORTCUT = "b";
