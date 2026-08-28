# Vercel-core Launcher Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the launcher's cyan neon-glow theme with a neutral zinc + single-emerald-accent "Vercel-core" visual language, changing no functionality.

**Architecture:** Define one semantic color/typography token set in `app/globals.css` (Tailwind v4 `@theme inline`, which auto-generates `bg-*`/`text-*`/`border-*` utilities from `--color-*` variables), then sweep each component replacing hardcoded neon hex values and glow classes with those tokens. Component structure, props, state, and all IPC calls stay byte-for-byte identical in behavior.

**Tech Stack:** Next.js 16.2.6 (Turbopack, static export), React 19, Tailwind CSS v4, framer-motion, lucide-react, Electron 42.

## Global Constraints

- **Pure re-skin.** No changes to `main.js`, `preload.js`, `global.d.ts`, or any IPC handler/channel. No new features, pages, or navigation changes. No component prop or state-shape changes.
- **Single accent.** Emerald `#3fae7a` is the ONLY accent color. No cyan, no fuchsia, no rose, no per-server-type color coding.
- **No glow.** No `box-shadow` or `text-shadow` that carries a hue. Neutral low-opacity black shadows only.
- **Preserve third-party brand marks.** The Google `<svg>` fills (`#EA4335`, `#4285F4`, `#FBBC05`, `#34A853`) and Telegram (`#229ED9`) in `home-view.tsx` must stay exactly as-is — they are trademarks, not theme colors.
- **Preserve existing motion.** `MagneticButton` physics, spring `whileHover`/`whileTap` on nav-rail icons and buttons, the asymmetric `[2fr_1fr_1fr_1fr]` bento grid, and `AnimatePresence` tab transitions all stay. Only their visual output (colors/shadows) changes.
- **Uzbek UI copy is unchanged.** Do not translate, reword, or "improve" any user-facing string.
- **No test framework exists in this repo** (no `test` script, no jest/vitest in `package.json`). The verification cycle for every task is: `npx tsc --noEmit` must be clean, plus a live browser check. Do not add a test framework.

### Canonical token mapping (used by every component task)

Apply this table mechanically. Left column = what's in the code today, right column = what replaces it.

| Old value / class | New value / class | Role |
|---|---|---|
| `#070b10`, `#080d13`, `#080d14`, `#0a0e14` | `#09090b` | app / header / nav background |
| `#101822`, `#0e141f` | `#111113` | raised panel, card |
| `#0d1219`, `#0b1016` | `#0f0f11` | inset surface, input background |
| `#1c2738`, `#1f2a3d` | `#27272a` | progress track, divider |
| `#263246` | `#27272a` | default border |
| `#2b3950` | `#3f3f46` | emphasized border |
| `#8ba0b8`, `#c7d4e6` | `#a1a1aa` | muted / body text |
| `#dfeaff`, `#ffffff` | `#fafafa` | primary text |
| `#071017` | `#09090b` | text on an accent-filled surface |
| `text-cyan-300`, `#00f0ff`, `#22ff91`, `text-emerald-300/400` (as accent) | `#3fae7a` | the single accent |
| `#ff4444`, `#ff4d6d`, `text-red-400`, `text-red-300`, `text-red-200` | `#ef4444` | destructive / offline |
| `#ffaa00` | `#d99a3d` | warning (offline-cache state) |
| `text-glow`, `neon-*`, `glow-box*`, `gradient-text` | *(delete the class entirely)* | — |
| `shadow-[0_0_Npx_rgba(<hue>,...)]` (any hued glow) | *(delete, or `shadow-md` where elevation is genuinely needed)* | — |
| `rounded-3xl` | `rounded-xl` | panels |
| `rounded-2xl` | `rounded-lg` | cards, inputs |
| `font-display` | `font-semibold tracking-tight` (Geist) | wordmark / headings |
| `font-black` | `font-semibold` (or `font-bold` for the largest headings) | weight restraint |

---

### Task 1: Token system in `globals.css`

**Files:**
- Modify: `app/globals.css` (whole file — replace lines 1–240)
- Modify: `app/layout.tsx:2,10-14,34` (drop the Audiowide font)

**Interfaces:**
- Consumes: nothing (first task).
- Produces: Tailwind utility classes generated from `@theme inline` that every later task uses — `bg-background`, `bg-surface`, `bg-surface-2`, `bg-surface-3`, `border-border`, `border-strong`, `text-foreground`, `text-muted-foreground`, `text-subtle-foreground`, `bg-primary`, `bg-primary-hover`, `text-primary`, `text-primary-foreground`, `bg-destructive`/`text-destructive`/`border-destructive`, `text-warning`/`bg-warning`. Also the rewritten (non-neon) `.cyber-btn`, `.cyber-card`, `.scrollbar-thin`, `.glass` classes, which keep their names so existing `className` references keep working.

- [ ] **Step 1: Replace `app/globals.css` entirely**

```css
@import 'tailwindcss';
@import 'tw-animate-css';

/* ─── Theme tokens ─── */
@theme inline {
  --font-heading: var(--font-geist-sans), 'Geist', 'Segoe UI', sans-serif;
  --font-sans:    var(--font-geist-sans), 'Geist', 'Segoe UI', sans-serif;
  --font-mono:    var(--font-geist-mono), 'Geist Mono', monospace;

  /* Surfaces */
  --color-background:  var(--background);
  --color-surface:     var(--surface);
  --color-surface-2:   var(--surface-2);
  --color-surface-3:   var(--surface-3);

  /* Text */
  --color-foreground:        var(--foreground);
  --color-muted-foreground:  var(--muted-foreground);
  --color-subtle-foreground: var(--subtle-foreground);

  /* Borders */
  --color-border: var(--border);
  --color-strong: var(--border-strong);

  /* Accent + status */
  --color-primary:            var(--primary);
  --color-primary-hover:      var(--primary-hover);
  --color-primary-foreground: var(--primary-foreground);
  --color-destructive:        var(--destructive);
  --color-warning:            var(--warning);
  --color-ring:               var(--primary);

  /* shadcn-compatible aliases (components/ui/button.tsx reads these) */
  --color-card:              var(--surface);
  --color-card-foreground:   var(--foreground);
  --color-popover:           var(--surface);
  --color-popover-foreground:var(--foreground);
  --color-secondary:         var(--surface-3);
  --color-secondary-foreground: var(--foreground);
  --color-muted:             var(--surface-3);
  --color-accent:            var(--primary);
  --color-accent-foreground: var(--primary-foreground);
  --color-input:             var(--surface-2);

  --radius-sm:  calc(var(--radius) - 4px);
  --radius-md:  calc(var(--radius) - 2px);
  --radius-lg:  var(--radius);
  --radius-xl:  calc(var(--radius) + 4px);
  --radius-2xl: calc(var(--radius) + 8px);
  --radius-3xl: calc(var(--radius) + 12px);
}

/* ─── CyberCraft design tokens (Vercel-core) ─── */
:root {
  color-scheme: dark;

  /* Surfaces — zinc scale */
  --background: #09090b;
  --surface:    #111113;
  --surface-2:  #0f0f11;
  --surface-3:  #18181b;

  /* Text */
  --foreground:        #fafafa;
  --muted-foreground:  #a1a1aa;
  --subtle-foreground: #71717a;

  /* Borders */
  --border:        #27272a;
  --border-strong: #3f3f46;

  /* Accent — emerald, the only accent in the product */
  --primary:            #3fae7a;
  --primary-hover:      #4ec98d;
  --primary-foreground: #09090b;

  /* Status */
  --destructive: #ef4444;
  --warning:     #d99a3d;

  --radius: 0.625rem;
}

/* ─── Base ─── */
@layer base {
  * {
    @apply border-border outline-ring/50;
    box-sizing: border-box;
  }
  body {
    background: var(--background);
    color: var(--foreground);
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
}

/* ─── Scrollbar ─── */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: var(--subtle-foreground); }

/* ─── Utilities ─── */
@layer utilities {
  /* Frosted panel — neutral, no hue */
  .glass {
    background: rgba(17, 17, 19, 0.85);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border: 1px solid var(--border);
  }

  /* Card surface — border-first, no glow */
  .cyber-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    transition: border-color 0.2s ease, background-color 0.2s ease;
  }
  .cyber-card:hover {
    border-color: var(--border-strong);
    background: var(--surface-3);
  }

  /* Primary button — solid accent, tactile press, no glow */
  .cyber-btn {
    background: var(--primary);
    color: var(--primary-foreground);
    font-weight: 600;
    border: none;
    transition: background-color 0.15s ease, transform 0.1s ease;
  }
  .cyber-btn:hover { background: var(--primary-hover); }
  .cyber-btn:active { transform: translateY(1px); }

  /* Status dots — flat fills */
  .status-online  { background: var(--primary); }
  .status-offline { background: var(--destructive); }

  /* Thin scrollbar */
  .scrollbar-thin {
    scrollbar-width: thin;
    scrollbar-color: var(--border-strong) transparent;
  }
  .scrollbar-thin::-webkit-scrollbar { width: 6px; height: 6px; }
  .scrollbar-thin::-webkit-scrollbar-thumb {
    background: var(--border-strong);
    border-radius: 9999px;
  }
  .scrollbar-thin::-webkit-scrollbar-thumb:hover {
    background: var(--subtle-foreground);
  }
}
```

Everything deleted relative to the old file: `--font-display`, all `*-neon` and `--glow-color` variables, `.neon-cyan`/`.neon-pink`/`.neon-green`, `.text-glow`, `.gradient-text`, `.glow-box`/`.glow-box-pink`/`.glow-box-green`, `.animate-pulse-glow`, `.animate-float`, `.animate-spin-slow`, `.glitch` and its `::before`/`::after`, and the `glitch-1`/`glitch-2`/`shine`/`pulse-glow`/`float`/`cyber-scan`/`border-glow` keyframes. All of those are either unused or exist only to produce neon.

- [ ] **Step 2: Drop the Audiowide font from `app/layout.tsx`**

Change the import line and the font declarations. Before:

```tsx
import { Geist, Geist_Mono, Audiowide } from 'next/font/google'
```

After:

```tsx
import { Geist, Geist_Mono } from 'next/font/google'
```

Delete this whole declaration:

```tsx
const audiowide = Audiowide({
  variable: '--font-audiowide',
  subsets: ['latin'],
  weight: '400',
})
```

And change the `<html>` className from:

```tsx
className={`dark ${geistSans.variable} ${geistMono.variable} ${audiowide.variable}`}
```

to:

```tsx
className={`dark ${geistSans.variable} ${geistMono.variable}`}
```

- [ ] **Step 3: Verify the build compiles and no `font-display`/glow class is still referenced**

Run: `npx tsc --noEmit`
Expected: only the 6 known pre-existing errors in `utils/auto-updater.ts`, `utils/cache-manager.ts`, `utils/game-launcher.ts`. Zero errors in `app/` or `components/`.

Run: `grep -rn "font-display\|text-glow\|neon-\|glow-box\|gradient-text\|animate-float\|animate-pulse-glow" app/ components/`
Expected: matches ONLY in `components/*.tsx` (those get fixed in Tasks 2–6). Zero matches in `app/`.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css app/layout.tsx
git commit -m "refactor(ui): replace neon tokens with zinc + emerald design system"
```

---

### Task 2: App shell — `launcher.tsx`

**Files:**
- Modify: `components/launcher.tsx`

**Interfaces:**
- Consumes: the token utilities from Task 1.
- Produces: nothing consumed by later tasks (leaf styling).

- [ ] **Step 1: Retokenize the shell background layers**

The root `<main>` currently stacks a `#070b10` base, a `/launcher-bg.png` image at `opacity-10`, a white grid overlay, and two large blurred cyan/emerald radial blobs. Replace the base with `bg-background`, keep the background image but drop its opacity to `opacity-[0.04]`, keep the grid at `opacity-[0.04]`, and delete BOTH blurred color blobs entirely (`bg-cyan-300/12 blur-[140px]` and `bg-emerald-300/10 blur-[150px]`) — ambient colored glow is exactly what this redesign removes.

- [ ] **Step 2: Retokenize the header**

- Header bar: `border-b border-[#1f2a3d] bg-[#080d13]/95` → `border-b border-border bg-background/95`.
- Logo tile: replace `bg-gradient-to-br from-cyan-300 to-emerald-300 shadow-[0_0_18px_rgba(0,240,255,0.38)]` with `bg-primary` (no gradient, no glow). The `Cuboid` icon inside becomes `text-primary-foreground`. Delete the yellow `absolute -right-0.5 -top-0.5 size-2 rounded-full bg-yellow-300 shadow-[...]` notification dot — it's a stray third color with no meaning.
- Wordmark: `<span className="font-display text-base tracking-[0.18em]">` → `<span className="text-base font-semibold tracking-tight">`; inner `<span className="text-cyan-300 text-glow">CYBER</span>` → `<span className="text-primary">CYBER</span>`; the `CRAFT` span → `text-foreground`.
- Connection-status badge (the `{user && (...)}` block): dot colors become `bg-primary` (connected) / `bg-warning` (offline) / `bg-destructive` (disconnected), each with NO `shadow-[...]` and NO `animate-pulse`. Text wrapper → `text-muted-foreground`.
- Profile button: `border-cyan-300/25 bg-[#0e141f]/95 ... hover:border-cyan-300/60 hover:shadow-[0_0_12px_rgba(0,240,255,0.18)]` → `border-border bg-surface hover:border-strong`, drop the shadow. The fallback avatar `bg-gradient-to-br from-cyan-300 to-emerald-300 font-display ... text-[#071017]` → `bg-primary font-semibold text-primary-foreground`.
- Minimize/close buttons: `text-[#8ba0b8] hover:bg-cyan-300/10 hover:text-cyan-300` → `text-muted-foreground hover:bg-surface-3 hover:text-foreground`; close keeps a red hover: `hover:bg-destructive/15 hover:text-destructive`.

- [ ] **Step 3: Retokenize the nav rail**

- Rail container: `rounded-3xl border border-white/8 bg-[#080d14]/95 ... shadow-[0_16px_48px_rgba(0,0,0,0.4)]` → `rounded-xl border border-border bg-surface ... shadow-md`.
- Server buttons (active state): `border-cyan-300 bg-cyan-300/[0.08] text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.25)]` → `border-primary bg-primary/10 text-primary` (drop the shadow). Inactive: `border-[#263246] bg-[#0d1219]/90 text-[#8ba0b8] hover:border-cyan-300/40 hover:text-white` → `border-border bg-surface-2 text-muted-foreground hover:border-strong hover:text-foreground`.
- The active-marker bar `bg-cyan-300 shadow-[0_0_8px_rgba(0,240,255,0.8)]` → `bg-primary` (no shadow).
- Online/offline corner dot: `bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]` → `bg-primary`; offline `bg-red-400` → `bg-destructive`. Border ring `border-[#080d14]` → `border-surface`.
- Tooltips: `bg-[#101822] border-[#263246]` → `bg-surface border-border`.
- Divider `bg-[#1f2a3d]` → `bg-border`.
- Settings button: same active/inactive treatment as server buttons. Its `motion.span` `layoutId="nav-active"` overlay `bg-cyan-300/[0.06]` → `bg-primary/10`.
- Logout button: `border-[#263246] bg-red-500/5 text-[#8ba0b8] hover:border-red-400/30 hover:text-red-400` → `border-border bg-transparent text-muted-foreground hover:border-destructive/40 hover:text-destructive`.

Keep every `whileHover`/`whileTap`/`transition` spring prop exactly as it is.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: clean (only the 3 known `utils/*.ts` files).

Run: `grep -n "cyan\|text-glow\|font-display\|#0[0-9a-f]\{5\}" components/launcher.tsx`
Expected: no matches.

- [ ] **Step 5: Commit**

```bash
git add components/launcher.tsx
git commit -m "refactor(ui): retokenize app shell to zinc + emerald"
```

---

### Task 3: Login screen — `home-view.tsx` (`LoginPanel` + `LoginHero`)

**Files:**
- Modify: `components/home-view.tsx` (the `LoginPanel` and `LoginHero` functions and the `!user && !loadingSession` return block only)

**Interfaces:**
- Consumes: token utilities from Task 1.
- Produces: nothing — `LoginPanel`/`LoginHero` signatures and props are unchanged.

- [ ] **Step 1: Retokenize `LoginPanel`**

- Heading `text-2xl font-black tracking-tight text-white` → `text-2xl font-semibold tracking-tight text-foreground`.
- Sub-paragraph and field labels `text-[#8ba0b8]` → `text-muted-foreground`.
- Both `<input>` elements: `rounded-xl border border-[#263246] bg-[#0d1219] ... text-white ... focus:border-cyan-300 focus:shadow-[0_0_0_2px_rgba(0,240,255,0.14)]` → `rounded-lg border border-border bg-surface-2 ... text-foreground ... focus:border-primary focus:ring-1 focus:ring-primary` (a 1px ring instead of a colored box-shadow halo).
- Error box: `border-red-400/25 bg-red-500/10 text-red-200` → `border-destructive/30 bg-destructive/10 text-destructive`.
- Submit button: keep the `cyber-btn` class (Task 1 rewrote it to a solid emerald with no glow); change `rounded-xl ... font-black` → `rounded-lg ... font-semibold`.
- The "Yoki tezkor kirish" divider rules `bg-[#263246]` → `bg-border`; its label → `text-muted-foreground`.
- Google button: `border-white/10 bg-white/5 ... hover:border-white/25 hover:bg-white/[0.08]` → `border-border bg-surface-2 hover:border-strong hover:bg-surface-3`. **Leave the four `<path fill="#EA4335|#4285F4|#FBBC05|#34A853">` values untouched.**
- Telegram button: `border-sky-500/20 bg-sky-500/5 hover:border-sky-500/35 hover:bg-sky-500/10` → `border-border bg-surface-2 hover:border-strong hover:bg-surface-3`. **Leave `text-[#229ED9]` on the Telegram glyph untouched.**

- [ ] **Step 2: Retokenize `LoginHero`**

- Panel: `border-r border-white/5 bg-[#0a0e14]` → `border-r border-border bg-surface-2`.
- Keep both blurred blobs as a depth device (this panel is the one branded surface where a soft gradient earns its place), but recolor them to near-neutral so they read as depth, not glow: `bg-cyan-300/10 blur-[110px]` → `bg-primary/[0.06] blur-[110px]`, and `bg-emerald-300/10 blur-[120px]` → `bg-white/[0.03] blur-[120px]`. Keep the grid overlay, at `opacity-[0.04]`.
- Logo tile: `bg-gradient-to-br from-cyan-300 to-emerald-300 shadow-[0_0_18px_rgba(0,240,255,0.38)]` → `bg-primary`; `Cuboid` → `text-primary-foreground`.
- Wordmark: `font-display text-sm tracking-[0.18em]` → `text-sm font-semibold tracking-tight`; `text-cyan-300 text-glow` → `text-primary`.
- Headline `<h1 className="font-display text-[2.6rem] leading-[1.05] tracking-tight text-white">` → `<h1 className="text-[2.4rem] font-semibold leading-[1.08] tracking-tight text-foreground">`; the inner `<span className="text-cyan-300 text-glow">bir bosishda</span>` → `<span className="text-primary">bir bosishda</span>`.
- Body paragraph `text-[#8ba0b8]` → `text-muted-foreground`.
- Feature list items: text `text-[#c7d4e6]` → `text-muted-foreground`; each icon tile `border-cyan-300/20 bg-cyan-300/[0.06]` → `border-border bg-surface-3`, icon `text-cyan-300` → `text-primary`. Keep the staggered `motion.li` entrance animation.

- [ ] **Step 3: Retokenize the login container**

`rounded-3xl border border-white/5 bg-[#0d1219]` → `rounded-xl border border-border bg-surface`.

- [ ] **Step 4: Verify in the browser**

Run the launcher renderer and confirm the login screen renders with no neon:

```bash
npx next dev -p 3001
```

Then open `http://localhost:3001`, confirm: split-screen intact, emerald accent only, Google/Telegram brand colors still correct on their glyphs, no console errors. Stop the server when done.

- [ ] **Step 5: Commit**

```bash
git add components/home-view.tsx
git commit -m "refactor(ui): retokenize login screen to zinc + emerald"
```

---

### Task 4: Server dashboard — `home-view.tsx` (`getServerStyles`, `ServerDetail`, skeleton, `LaunchModal`)

**Files:**
- Modify: `components/home-view.tsx:68-107` (`getServerStyles`), plus `ServerDetailSkeleton`, `ServerDetail`, and `LaunchModal`

**Interfaces:**
- Consumes: token utilities from Task 1.
- Produces: `getServerStyles(server: LauncherServer)` keeps its exported shape — it must still return an object with the keys `gradient`, `glow`, `border`, `accent`, `accentGlow`, `playBtn`, because `ServerDetail` destructures `styles.playBtn` and `styles.glow`. Only the VALUES change.

- [ ] **Step 1: Collapse `getServerStyles` to a single neutral style**

The current function returns four different color themes (emerald/cyan/rose/fuchsia) keyed off `server_type`. That per-type color coding contradicts the single-accent constraint. Replace the entire function body with one constant return, keeping the same keys so no call site breaks:

```tsx
function getServerStyles(_server: LauncherServer) {
  return {
    gradient: 'from-surface to-surface-2',
    glow: '',
    border: 'border-border',
    accent: '#3fae7a',
    accentGlow: 'rgba(63, 174, 122, 0.4)',
    playBtn: 'bg-primary hover:bg-primary-hover text-primary-foreground',
  };
}
```

Note `playBtn` no longer contains `from-*`/`to-*` classes, so in `ServerDetail` the Play button's `bg-gradient-to-br ${styles.playBtn}` must drop the `bg-gradient-to-br` prefix — see Step 3.

- [ ] **Step 2: Retokenize `ServerDetailSkeleton`**

Replace `border-white/5 bg-[#101822]/50` → `border-border bg-surface`, `bg-white/[0.02]`/`bg-white/[0.01]` → `bg-surface-2`, `bg-white/10` → `bg-surface-3`, `bg-white/5` → `bg-surface-3`, `border-[#263246]/50` → `border-border`, `rounded-3xl` → `rounded-xl`, `rounded-2xl` → `rounded-lg`. Keep `animate-pulse` — a skeleton shimmer is functional feedback, not ambiance.

- [ ] **Step 3: Retokenize `ServerDetail`**

- Section wrapper: `rounded-3xl border border-cyan-300/20 bg-[#101822]/90 p-5 shadow-[0_24px_80px_rgba(0,240,255,0.08)]` → `rounded-xl border border-border bg-surface p-5`.
- Header: `<h2 className="text-4xl font-black text-white leading-none tracking-wide">` → `<h2 className="text-3xl font-semibold tracking-tight text-foreground">`. Description `text-[#c7d4e6]` → `text-muted-foreground`. Bottom rule `border-[#263246]/50` → `border-border`.
- Play button (`MagneticButton`): change `bg-gradient-to-br ${styles.playBtn} ${styles.glow} cursor-pointer` → `${styles.playBtn} cursor-pointer` (no gradient wrapper, `styles.glow` is now an empty string but leave the interpolation in place so the shape is unchanged). Running state: `bg-gradient-to-br from-red-500 to-pink-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-pulse` → `bg-destructive text-foreground` (drop gradient, shadow, and pulse). Offline state `bg-[#263246] text-[#8ba0b8]` → `bg-surface-3 text-subtle-foreground`. Change `font-black tracking-widest` → `font-semibold tracking-wide`.
- "Sozlamalarni sozlash" link: `text-[#8ba0b8] hover:text-cyan-300` → `text-muted-foreground hover:text-primary`.
- Bento tiles: keep the `grid-cols-[2fr_1fr_1fr_1fr]` asymmetry and the `featured` sizing logic. Replace each tile's per-card `color`/`border` gradient values — set every tile to `color: 'bg-surface-2'` and `border: 'border-border'` in the array, and change the JSX from `bg-gradient-to-br ${card.color}` to just `${card.color}`. Icon tiles `bg-white/5 border-white/5` → `bg-surface-3 border-border`; icons `text-white` → `text-primary`. Title `font-black` → `font-semibold`, desc `text-[#8ba0b8]` → `text-muted-foreground`. `rounded-2xl` → `rounded-lg`.
- Big stat panels: `border-white/5 bg-[#0d1219]/40 ... hover:bg-[#0d1219]/60` → `border-border bg-surface-2 hover:bg-surface-3`. Player value `text-4xl font-black text-cyan-300 tracking-wide text-glow` → `text-3xl font-semibold tracking-tight text-foreground font-mono`. Ping value `text-4xl font-black text-emerald-400 tracking-wide text-glow` → `text-3xl font-semibold tracking-tight text-foreground font-mono`. Labels → `text-muted-foreground`.
- Delete the now-unused `pingAccent` variable and its `if (online) {...}` color-threshold block — with a single-accent palette, ping is no longer color-coded. (`pingValue` stays; only the color logic goes.)
- Bottom two detail cards: `border-[#263246]/60 bg-[#0d1219]/40 hover:border-white/5` → `border-border bg-surface-2 hover:border-strong`; headings `font-black text-white` → `font-semibold text-foreground`; body `text-[#8ba0b8]` → `text-muted-foreground`; `<strong className="text-white">` → `<strong className="text-foreground">`; the `text-emerald-400` "Faol 🛡️" value → `text-primary`, and **remove the 🛡️ emoji** (leave the word "Faol").

- [ ] **Step 4: Retokenize `LaunchModal`**

- Backdrop `bg-black/55 backdrop-blur-sm` → keep as-is (neutral).
- Dialog: `rounded-3xl border ... bg-[#101822] shadow-[0_28px_90px_rgba(0,0,0,0.45)]`, border `border-red-300/35`/`border-cyan-300/35` → `rounded-xl bg-surface shadow-md` with `border-destructive/40` / `border-border`.
- Title `text-2xl font-black text-white` → `text-2xl font-semibold text-foreground`. Message `text-red-200`/`text-[#8ba0b8]` → `text-destructive`/`text-muted-foreground`.
- Close button `text-[#8ba0b8] hover:bg-white/5 hover:text-white` → `text-muted-foreground hover:bg-surface-3 hover:text-foreground`.
- Progress track `bg-[#1c2738]` → `bg-surface-3`; fill `bg-gradient-to-r from-cyan-300 to-emerald-300 shadow-[0_0_18px_rgba(0,240,255,0.45)]` → `bg-primary` (solid, no glow).
- Percent readout `text-3xl font-black text-cyan-300` → `text-2xl font-semibold text-foreground font-mono`; speed/ETA `text-[#dfeaff]` → `text-muted-foreground`.
- Cancel button `border-[#2b3950] text-[#dfeaff] hover:border-cyan-300/40` → `border-border text-foreground hover:border-strong`, `rounded-xl` → `rounded-lg`.
- Retry button `bg-gradient-to-br from-red-400 to-orange-400 text-[#071017] font-black` → `bg-destructive text-foreground font-semibold`.

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit`
Expected: clean apart from the 3 known `utils/*.ts` files.

Run: `grep -n "cyan\|fuchsia\|rose-\|text-glow\|font-display\|font-black" components/home-view.tsx`
Expected: no matches.

- [ ] **Step 6: Commit**

```bash
git add components/home-view.tsx
git commit -m "refactor(ui): retokenize server dashboard, drop per-type color coding"
```

---

### Task 5: Settings — `settings-view.tsx`

**Files:**
- Modify: `components/settings-view.tsx`

**Interfaces:**
- Consumes: token utilities from Task 1.
- Produces: nothing.

- [ ] **Step 1: Retokenize the shared sub-components**

- `SettingsCard`: `rounded-3xl border border-[#263246] bg-[#101822]/92 shadow-[0_16px_48px_rgba(0,0,0,0.16)]` → `rounded-xl border border-border bg-surface`. Icon tile `rounded-2xl border-cyan-300/25 bg-cyan-300/10` → `rounded-lg border-border bg-surface-3`; icon `text-cyan-300` → `text-primary`. Title `font-black text-white` → `font-semibold text-foreground`; description `text-[#8ba0b8]` → `text-muted-foreground`.
- `ToggleRow`: row `rounded-2xl border-[#263246] bg-[#0d1219]/95 hover:border-cyan-300/35` → `rounded-lg border-border bg-surface-2 hover:border-strong`; label `text-white` → `text-foreground`; desc → `text-muted-foreground`. Track `bg-cyan-300/25` / `bg-[#263246]` → `bg-primary/30` / `bg-surface-3`; knob `bg-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.65)]` / `bg-[#8ba0b8]` → `bg-primary` (no shadow) / `bg-subtle-foreground`. Keep the spring animation.
- `PathRow`: container `rounded-2xl border-[#263246] bg-[#0d1219]/95` → `rounded-lg border-border bg-surface-2`; `FolderOpen` icon `text-cyan-300` → `text-primary`; label `text-white` → `text-foreground`; path `text-[#8ba0b8]` → `text-muted-foreground`; action button `rounded-xl border-[#2b3950] text-[#dfeaff] hover:border-cyan-300/40` → `rounded-lg border-border text-foreground hover:border-strong`.

- [ ] **Step 2: Retokenize the page header and Save button**

- `<h1 className="text-4xl font-black text-white">` → `<h1 className="text-3xl font-semibold tracking-tight text-foreground">`, and the inner `<span className="text-cyan-300 text-glow">Soz</span>` → `<span className="text-primary">Soz</span>`.
- Save `motion.button`: saved state `bg-gradient-to-br from-emerald-300 to-green-500 text-[#071017]` → `bg-primary text-primary-foreground`; default `bg-gradient-to-br from-cyan-300 to-emerald-300 text-[#071017] shadow-[0_0_24px_rgba(0,240,255,0.28)]` → `bg-primary text-primary-foreground hover:bg-primary-hover` (no glow); `rounded-2xl font-black` → `rounded-lg font-semibold`. Keep the `whileTap` spring.

- [ ] **Step 3: Retokenize the RAM, Java, and API-URL cards**

- RAM readout `font-mono text-2xl font-black text-cyan-300 text-glow` → `font-mono text-2xl font-semibold text-foreground`. Slider track `bg-[#1c2738]` → `bg-surface-3`; fill `bg-gradient-to-r from-cyan-300 to-emerald-300 shadow-[0_0_14px_rgba(0,240,255,0.45)]` → `bg-primary`. Min/max labels → `text-muted-foreground`. Recommendation line → `text-muted-foreground`.
- Java card: inner box `rounded-2xl border-[#263246] bg-[#0d1219]/95` → `rounded-lg border-border bg-surface-2`; `ShieldCheck` tile `bg-emerald-300/10` → `bg-surface-3`, icon `text-emerald-300` → `text-primary`; version `text-white` → `text-foreground`; vendor/path `text-[#8ba0b8]` → `text-muted-foreground`; re-detect button `rounded-xl border-[#2b3950] text-[#dfeaff] hover:border-cyan-300/40` → `rounded-lg border-border text-foreground hover:border-strong`.
- API base URL card: label → `text-muted-foreground`; the input's `rounded-xl border-[#263246] bg-[#0d1219] text-white focus:border-cyan-300 focus:shadow-[0_0_0_2px_rgba(0,240,255,0.14)]` → `rounded-lg border-border bg-surface-2 text-foreground focus:border-primary focus:ring-1 focus:ring-primary`; helper line → `text-muted-foreground`.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: clean apart from the 3 known `utils/*.ts` files.

Run: `grep -n "cyan\|text-glow\|font-black\|#0[0-9a-f]\{5\}" components/settings-view.tsx`
Expected: no matches.

- [ ] **Step 5: Commit**

```bash
git add components/settings-view.tsx
git commit -m "refactor(ui): retokenize settings screen to zinc + emerald"
```

---

### Task 6: Update banner — `update-banner.tsx`

**Files:**
- Modify: `components/update-banner.tsx`

**Interfaces:**
- Consumes: token utilities from Task 1.
- Produces: nothing. The `UpdatePhase` state machine (`idle`/`available`/`downloading`/`downloaded`) and all `window.electronAPI` calls stay exactly as they are.

- [ ] **Step 1: Retokenize the banner**

- Pill container: `rounded-2xl border border-cyan-300/20 bg-[#101822]/95 shadow-[0_16px_48px_rgba(0,0,0,0.45)] backdrop-blur` → `rounded-lg border border-border bg-surface shadow-md backdrop-blur`.
- Icon tile: `border-cyan-300/25 bg-cyan-300/10` → `border-border bg-surface-3`. The three phase icons: `Sparkles` `text-emerald-300` → `text-primary`; `DownloadCloud` `animate-pulse text-cyan-300` → `text-primary` (drop `animate-pulse`); `Download` `text-cyan-300` → `text-primary`.
- Titles `text-white` → `text-foreground`; the version spans `text-cyan-300` / `text-emerald-300` → `text-primary`; sub-labels `text-[#8ba0b8]` → `text-muted-foreground`.
- Progress track `bg-[#1f2a3d]` → `bg-surface-3`; fill `bg-gradient-to-r from-cyan-300 to-emerald-300 shadow-[0_0_8px_rgba(0,240,255,0.6)]` → `bg-primary`. Percent text → `text-muted-foreground font-mono`.
- Download button: `border-cyan-300/30 bg-cyan-300/10 text-cyan-200 hover:border-cyan-300/60 hover:bg-cyan-300/15 hover:text-white` → `border-border bg-surface-2 text-foreground hover:border-strong hover:bg-surface-3`, `rounded-xl` → `rounded-lg`.
- Restart button: `border-emerald-300/30 bg-emerald-300/10 text-emerald-200 hover:border-emerald-300/60 hover:bg-emerald-300/15 hover:text-white` → `bg-primary text-primary-foreground hover:bg-primary-hover border-transparent`, `rounded-xl` → `rounded-lg`.
- Dismiss button: `text-[#8ba0b8] hover:bg-white/5 hover:text-white` → `text-muted-foreground hover:bg-surface-3 hover:text-foreground`.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: clean apart from the 3 known `utils/*.ts` files.

Run: `grep -rn "cyan\|emerald-[0-9]\|text-glow\|font-display\|glow-box\|neon-" components/ app/`
Expected: **zero matches across the entire codebase.** This is the final sweep — every neon remnant is now gone.

- [ ] **Step 3: Commit**

```bash
git add components/update-banner.tsx
git commit -m "refactor(ui): retokenize update banner to zinc + emerald"
```

---

### Task 7: Full-app visual verification

**Files:**
- Modify: none (verification only; fix-ups land in whichever file needs them)

**Interfaces:**
- Consumes: everything from Tasks 1–6.
- Produces: a verified build.

- [ ] **Step 1: Start the renderer at the app's real window size**

```bash
npx next dev -p 3001
```

Open `http://localhost:3001` and emulate a 960×600 viewport (the launcher's fixed `BrowserWindow` size from `main.js`).

- [ ] **Step 2: Check the login screen**

Confirm: split-screen holds at 960×600, no horizontal scroll, emerald is the only accent, Google/Telegram glyphs keep their brand colors, no colored glow anywhere, no console errors.

- [ ] **Step 3: Check the dashboard, settings, and banner**

The dev server has no Electron bridge, so `window.electronAPI` is undefined and the app renders the login screen only. To inspect the authenticated screens, run the real app instead:

```bash
PORT=3001 npx electron .
```

with the backend on `:8000` and the website on `:3000` (the OAuth handoff needs both). Log in, then check: nav rail active/hover states, the bento stat grid, the Play button's magnetic pull and press, Settings cards + RAM slider, and the update banner if one is offered.

- [ ] **Step 4: Confirm no regressions in behavior**

Verify these still work exactly as before the redesign: server switching via the nav rail, Settings save (`Saqlash` → `Saqlandi`), directory pickers, Java re-detect, logout. None of these were touched, so any breakage means a class swap damaged markup — fix it in the owning component.

- [ ] **Step 5: Final typecheck and commit any fix-ups**

Run: `npx tsc --noEmit`
Expected: only the 3 known pre-existing `utils/*.ts` files.

```bash
git add -A
git commit -m "fix(ui): resolve issues found in redesign verification pass"
```

(Skip the commit if verification found nothing to fix.)

---

## Notes for the implementer

- **Read before you edit.** Every task says "replace X with Y" against the file's current state. If a class string doesn't match what's described, read the surrounding code and apply the mapping table's intent rather than forcing a literal match — the file may have shifted.
- **`text-primary` vs `bg-primary`.** Tailwind v4 generates both from `--color-primary`. Use `text-primary` for accent text/icons, `bg-primary` for filled surfaces, and `text-primary-foreground` for text sitting on top of a filled accent.
- **Don't "improve" while you're in there.** No copy edits, no layout changes, no added features. If you spot a real bug, note it in the commit body or flag it — don't fix it silently inside a re-skin commit.
