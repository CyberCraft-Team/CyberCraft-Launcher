# Launcher visual redesign: Vercel-core minimal

## Context

The launcher's current UI (cyan/emerald "cyber-neon" theme — glow-box shadows, neon text-shadow, gradient buttons, `rounded-3xl` panels) was polished earlier in this project's history, but the direction itself no longer fits what's wanted. This spec covers a full visual rebuild: same pages, same functionality, entirely new visual language.

Explored via the brainstorming visual companion (4 direction options, then 4 accent options, then 3 layout options), the user selected:

- **Direction:** Vercel-core Minimal — neutral zinc/slate surfaces, a single desaturated accent, restrained motion, no neon glow.
- **Accent:** Emerald (`#3fae7a` family), replacing cyan as the sole brand accent.
- **Layout skeleton:** keep the current structure — header bar + left icon-rail server switcher + content area. Only the visual treatment changes, not the page/navigation architecture.
- **Scope:** pure re-skin. No feature, page, or behavior changes of any kind.

## Goals

- Replace every neon/glow-based visual treatment with the Vercel-core token system below.
- Preserve 100% of existing functionality, IPC contracts, and component structure/props.
- Keep the motion polish already built (spring physics on nav/buttons, the magnetic Play button, the asymmetric bento stat grid) — restyle it, don't remove it.

## Non-goals

- No changes to `main.js`, `preload.js`, `global.d.ts`, or any IPC handler.
- No new pages, no new features, no navigation restructuring.
- No changes to the website or backend (this spec is launcher-repo only).

## Design system

### Color tokens (`app/globals.css`)

Replace the `:root` brand tokens with a zinc + single-emerald-accent palette:

| Token | Old (cyan-neon) | New (Vercel-core) |
|---|---|---|
| `--background` | `#0a0a0f` | `#09090b` (zinc-950) |
| `--bg-card` / `--card` | `#12121a` | `#111113` |
| `--bg-sidebar` | `#0d0d14` | `#0f0f11` |
| `--border` / `--border-color` | `#1a1a2e` | `#27272a` (zinc-800) |
| `--primary` (accent) | `#00f0ff` cyan | `#3fae7a` emerald |
| `--primary-foreground` | `#0a0a0f` | `#09090b` |
| `--foreground` | `#ffffff` | `#fafafa` |
| `--muted-foreground` | `#8888aa` | `#a1a1aa` (zinc-400), `#71717a` for tertiary |
| `--destructive` | `#ff4444` | `#ef4444` (neutral red, unchanged in spirit) |
| `--ring` | `#00f0ff` | `#3fae7a` |

Remove entirely: `--secondary-neon`, `--accent-neon`, `--warning-neon`, `--glow-color`, the `.neon-cyan`/`.neon-pink`/`.neon-green` utilities, `.text-glow`, `.gradient-text`, `.glow-box*`, the `.glitch` effect and its keyframes, `pulse-glow`/`border-glow` keyframes. `.cyber-card`/`.cyber-btn` are rewritten to the neutral treatment described below rather than deleted outright, since they're referenced by class name in a few places — same class names, non-neon implementation (border + subtle `translateY` on hover/active, no colored glow).

### Typography

- `--font-sans` / `--font-heading`: `var(--font-geist-sans)` (already loaded via `next/font/google` in `app/layout.tsx`, currently unused — this redesign is what finally wires it up correctly).
- `--font-mono`: `var(--font-geist-mono)`, for numeric/technical values (RAM, ping, versions) — same usage pattern already established.
- Drop `--font-display` (Audiowide) entirely — the "CYBERCRAFT" wordmark becomes plain `Geist` at `font-semibold`/`font-bold`, no glow, no separate display face.
- Headings: `tracking-tight`, weight carries hierarchy instead of oversized scale + glow.

### Shape & elevation

- Corner radius drops from `rounded-3xl`/`rounded-2xl` to `rounded-xl`/`rounded-lg` across panels, cards, and buttons.
- Shadows: neutral, low-contrast (`shadow-sm`/`shadow-md`), never accent-tinted. Borders (`border-zinc-800`) are the primary separator, not shadow or glow.
- Active/selected states use a solid `border-emerald-*` + faint `bg-emerald-*/10` fill instead of a glow ring.

### Motion (unchanged in kind, restyled in appearance)

Keep as-is, functionally: `MagneticButton` physics on the Play button, spring `whileHover`/`whileTap` on nav-rail icons and primary buttons (already added in the prior polish pass), the asymmetric `[2fr_1fr_1fr_1fr]` bento grid in the server detail view. Only their *visual* output changes (neutral card backgrounds instead of colored gradients, no glow shadow on hover/active).

Remove: `animate-pulse-glow`, `animate-float`/`.animate-float` where used purely for neon ambiance (the `LoginHero` background blur blobs stay as a layout device but recolor to a very low-opacity zinc/emerald tint instead of cyan/emerald glow blur).

## Per-screen treatment

- **`components/launcher.tsx`** (header + nav rail): window-control buttons, connection-status dot, nav-rail icons — all retokenized. Structure unchanged (icon-rail nav, confirmed as the kept layout direction).
- **`components/home-view.tsx`**: `LoginHero` + `LoginPanel` split-screen structure unchanged; `ServerDetail`'s bento stat tiles keep their asymmetric sizing but move to neutral zinc cards with emerald-only accents on icons/numbers; `LaunchModal` progress bar becomes solid emerald instead of cyan-to-emerald gradient.
- **`components/settings-view.tsx`**: `SettingsCard`/`ToggleRow`/`PathRow` retokenized; RAM slider fill becomes solid emerald.
- **`components/update-banner.tsx`**: same state machine (available/downloading/downloaded), retokenized to zinc/emerald.
- **`components/magnetic-button.tsx`**: no change (it's unstyled — styling is passed in via `className` from callers).

## Technical approach

This is a token-and-class-level restyle, not a rewrite:

1. Redefine the color/typography tokens in `app/globals.css` (single source of truth for hex values used throughout via CSS variables and Tailwind arbitrary-value classes).
2. Sweep each component file and replace hardcoded cyan/emerald-gradient/glow Tailwind classes (`text-cyan-300`, `shadow-[0_0_...rgba(0,240,255...)]`, `from-cyan-300 to-emerald-300`, `text-glow`, etc.) with the new zinc/emerald equivalents.
3. Update `app/layout.tsx` only if the Audiowide font import needs removing (it does, per "drop `--font-display`" above).
4. No changes to component props, state, IPC calls, or file structure — this keeps the diff reviewable and low-risk.

## Testing / verification

- `npx tsc --noEmit` in the launcher repo after each major file — must stay clean.
- Live browser check via the launcher's Next dev server (port 3001) at the app's real 960×600 size, same as the previous polish pass: verify the login split-screen, server dashboard bento grid, settings cards, and update banner all render with no neon remnants and no console errors.
- Spot-check hover/active states (nav icons, Play button, Save button) for the retained spring motion.
