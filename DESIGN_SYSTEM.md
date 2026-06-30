# Design System

Source of truth for visual tokens and component conventions in labmate. Stack: Tailwind v4 (`app/globals.css`), Radix UI primitives, CVA for variants.

This doc reflects what the codebase **should** converge on. Items marked `⚠️ MIGRATE` describe places that currently violate the spec and need a follow-up pass — see [Open Migration Items](#open-migration-items).

---

## 1. Color

### 1.1 Semantic tokens (existing, keep)

Defined as HSL triples in `:root` / `.dark` in [app/globals.css](app/globals.css), consumed via `@theme inline` as `--color-*`. Use these via Tailwind classes (`bg-primary`, `text-muted-foreground`, etc.) — never hardcode hex for anything these cover.

| Token | Role |
|---|---|
| `background` / `foreground` | Page base |
| `card` / `card-foreground` | Card surfaces |
| `popover` / `popover-foreground` | Dropdowns, popovers, dialogs |
| `primary` / `primary-foreground` | Primary actions |
| `secondary` / `secondary-foreground` | Secondary actions |
| `muted` / `muted-foreground` | De-emphasized text/surfaces |
| `accent` / `accent-foreground` | Hover/selected states |
| `destructive` / `destructive-foreground` | Destructive actions |
| `border` / `input` / `ring` | Structural lines, focus rings |

### 1.2 Surface scale (existing, keep)

`--surface-1` through `--surface-8`, light mode #FAFAFA → #FFFFFF, dark mode #171717 → #484848. Use for layered/elevated panels where a flat `card` token isn't granular enough (e.g. nested panels, calendar canvas).

### 1.3 Status tokens — NEW

`SyncBadge.tsx` hand-picked five bg/fg pairs for sync states. Per decision, these are promoted to **global, reusable status tokens** — any feature needing status coloring (toasts, alerts, badges) uses these instead of inventing new hex pairs.

Add to `:root` in `app/globals.css`:

```css
--status-success-bg: #e8f5eb;
--status-success-fg: #1a5232;
--status-warning-bg: #fff4df;
--status-warning-fg: #7a4d00;
--status-warning-bg-hover: #ffe8bf;
--status-info-bg: #eef2ff;
--status-info-fg: #334155;
--status-error-bg: #fdecec;
--status-error-fg: #9b1c1c;
--status-error-border: #f5c2c2;     /* from PushPreviewDialog error box */
--status-neutral-bg: #f3f4f6;
--status-neutral-fg: #4b5563;
--status-neutral-bg-hover: #e5e7eb;
```

Dark-mode equivalents (derived, not pulled from an existing design — dark mode isn't shipped yet so these are best-effort and should be revisited once dark mode is actually used):

```css
--status-success-bg: #16261c;
--status-success-fg: #5fbf86;
--status-warning-bg: #2e2410;
--status-warning-fg: #e2a83d;
--status-warning-bg-hover: #3a2e14;
--status-info-bg: #1f2333;
--status-info-fg: #93a5e8;
--status-error-bg: #2e1717;
--status-error-fg: #e2726e;
--status-error-bg-hover: #3a1c1c;
--status-error-border: #5c2a2a;
--status-error-bg-subtle: #261414;
--status-neutral-bg: #232323;
--status-neutral-fg: #b0b0b0;
--status-neutral-bg-hover: #2a2a2a;
```

Implemented in `app/globals.css` `:root` / `.dark`, mapped into `@theme inline` as `--color-status-*`, usable as `bg-status-success-bg text-status-success-fg`.

**Mapping table** (semantic meaning → existing usage):

| Status | Used for |
|---|---|
| `success` | synced |
| `warning` | unsynced / ready-to-publish |
| `info` | syncing (in progress) |
| `error` | sync failed, validation errors |
| `neutral` | queued |

### 1.4 Hardcoded colors retired ✅ done

- [components/calendar/SyncBadge.tsx](components/calendar/SyncBadge.tsx) — now uses `status-*` tokens
- [components/calendar/PushPreviewDialog.tsx](components/calendar/PushPreviewDialog.tsx) — error text/box now use `status-error-*`; the result-summary box's stray `bg-white` was also swapped for `bg-card`
- [components/ui/button.tsx](components/ui/button.tsx) — toolbar variant now uses `text-foreground` / `hover:bg-accent hover:text-accent-foreground` (tied to the semantic token, per your call)
- [components/calendar/CalendarHeader.tsx](components/calendar/CalendarHeader.tsx) — now uses `text-foreground`, `hover:bg-accent`, `border-border`
- [components/ui/calendar.tsx](components/ui/calendar.tsx) — outside-day color now `text-muted-foreground opacity-60` (shadcn date-picker, generic UI — tokenized)

**Left as-is:** [components/calendar/CalendarPreview.tsx:355](components/calendar/CalendarPreview.tsx) `text-[#cdcac5]` disabled-cell color — this is part of the Figma-matched `@ilamy/calendar` canvas styling (see exception below), passed through `classesOverride`, not a generic UI surface.

**Exception — keep as-is:** the calendar-canvas CSS in `app/globals.css` (`.calendar-event-chip*`, `[data-testid="ilamy-calendar"] ...` overrides, lines ~193–575). These hex values exist to pixel-match a third-party calendar library to a Figma spec and using semantic tokens there would be misleading (they're event-accent-color-derived, not theme colors). Leave alone, but don't copy this pattern elsewhere.

---

## 2. Typography

**Font:** Inter / InterVariable, defined once in `app/globals.css` body rule. Don't redeclare font-family elsewhere.

### 2.1 Scale (formalizing existing de-facto usage)

| Token | Size | Tailwind class | Use |
|---|---|---|---|
| `2xs` | 11px | `text-2xs` ✅ added | Micro labels (sync badge text, "+N more") |
| `xs` | 12px | `text-xs` | Secondary labels, menu items, calendar time labels |
| `sm` | 14px | `text-sm` | Default body/UI text, descriptions |
| `base` | 16px | `text-base` | Buttons, primary content |
| `lg` | 18px | `text-lg` | Section headings |

`--text-2xs: 0.6875rem` added to `@theme inline` in `app/globals.css`; `SyncBadge.tsx` now uses `text-2xs` instead of `text-[11px]`. The `"+N more"` calendar-canvas label (`globals.css` line ~541) was left alone — it's part of the ilamy Figma-match exception (§1.4).

### 2.2 Weights

- `font-normal` (400) — body copy
- `font-medium` (500) — default for UI labels/buttons (most common weight in the app — treat as the default, not an exception)
- `font-semibold` (600) — card/section titles only

### 2.3 Letter-spacing ✅ done

Was inlined per-component via `style={{ letterSpacing: ... }}` in `CalendarHeader.tsx`. Now tokenized in `app/globals.css`:

```css
--tracking-tight-heading: -0.24px;  /* month/year header */
--tracking-wide-label: 0.16px;      /* nav buttons, view-select */
```

`CalendarHeader.tsx` and the `toolbar` button variant now use the `tracking-tight-heading` / `tracking-wide-label` Tailwind utilities instead of inline styles.

---

## 3. Spacing

No project-specific spacing scale — uses Tailwind's default (0.25rem increments). This is fine as-is; no token gap here. Observed conventions worth documenting (not enforcing):

- `p-2` / `gap-2` (8px) — compact controls, menu items
- `p-6` (24px) — card/dialog body padding
- `px-3 py-2` — form control internal padding

---

## 4. Border Radius

### 4.1 Tier definitions

Existing Tailwind theme already derives three steps from `--radius: 0.5rem` (8px): `--radius-sm` (4px), `--radius-md` (6px), `--radius-lg` (8px, = base). Formalize a 4-tier scale by adding an explicit `xl` step (currently used un-tokenized as a literal Tailwind default):

| Tier | Value | Use |
|---|---|---|
| `sm` | 4px | Menu items, calendar header nav buttons (after fix below) |
| `md` | 6px | **Default for interactive controls**: buttons, inputs, selects, dropdown/popover content |
| `lg` | 8px | Cards |
| `xl` | 12px | Dialogs, sheets, toolbar-variant buttons |

### 4.2 Fixes ✅ done

- [components/calendar/CalendarHeader.tsx](components/calendar/CalendarHeader.tsx) used `rounded-sm` on Today/prev/next/view-select buttons (confirmed bug) — now `rounded-md`, matching every other button in the app.
- [components/ui/button.tsx](components/ui/button.tsx) toolbar variant used arbitrary `rounded-[12px]` — now `rounded-xl`, tied to the named `--radius-xl` step (`calc(var(--radius) + 4px)`, added to `@theme inline`) instead of a magic number.
- Menu items in `dropdown-menu.tsx` already correctly use `rounded-sm` — no change needed.

**Exception — keep as-is:** calendar event-chip radii (2px/3px/4px in `globals.css`) — these are part of the Figma-matched calendar canvas styling noted in §1.4 and operate on their own micro-scale.

---

## 5. Shadows / Elevation

### 5.1 Existing system (currently unused — wire it up)

`app/globals.css` defines a well-built 8-step elevation scale (`--shadow-1` ... `--shadow-8`) with separate light/dark compositions (inset highlight + ring + drop shadow, increasing in depth). It's exposed via `@theme` as `shadow-1` through `shadow-8` Tailwind utilities but **no component currently uses it** — components use generic Tailwind `shadow-sm/md/lg` instead, which don't share the same visual language (no inset highlight, flat single drop-shadow).

Per decision: wire components to the existing scale rather than dropping it.

### 5.2 Mapping ✅ applied

| Component | Was | Now |
|---|---|---|
| Card (`card.tsx`) | `shadow-sm` | `shadow-2` |
| Dropdown/Select content | `shadow-md` | `shadow-3` |
| Dropdown sub-menu | `shadow-lg` | `shadow-4` |
| Popover | `shadow-md` | `shadow-3` |
| Sheet | `shadow-lg` | `shadow-5` |
| Dialog | `ring-1 ring-foreground/10` (no shadow) | `shadow-6` (the separate ring was dropped — `shadow-6` already includes an inset ring) |
| Sidebar (floating + inset) | `shadow` | `shadow-3` |

Applied directly; flag if any of these read wrong once you see them rendered (elevation scales are easy to get wrong without eyes on it) and we'll adjust the tier.

---

## 6. Icons

**Library:** `lucide-react`, default stroke width (2px) — keep default, don't override per-instance.

### 6.1 Size scale (formalize existing usage)

| Token | Size | Class | Use |
|---|---|---|---|
| `xs` | 12px | `h-3 w-3` | Inline spinners (sync badge), checkbox marks |
| `sm` | 16px | `h-4 w-4` | **Default** — dropdown items, dialog close, most icon buttons |
| `md` | 20px | `h-5 w-5` | Calendar nav chevrons |

No `lg` tier currently in use — don't invent one until something needs it.

No token enforcement needed here (Tailwind sizing utilities are already consistent enough); this table is documentation, not a migration target.

---

## 7. Components

Base primitives live in `components/ui/` (Radix + CVA), feature components in `components/`. No duplication found between the two — feature components compose `ui/` primitives rather than reimplementing them. No action needed here beyond the radius/shadow/color fixes above.

**Button variants** (`components/ui/button.tsx`): `default`, `destructive`, `outline`, `secondary`, `ghost`, `toolbar`. The `toolbar` variant is the one outlier with hand-rolled colors (§1.4) and radius (§4.2) — once fixed it should read as just another variant, not a special case.

---

## 8. Dark Mode

Implemented via `.dark` class + `next-themes`, colors fully defined for semantic tokens, surfaces, and shadows. Status tokens (§1.3) now have derived dark values too, though they're unvalidated since dark mode isn't in active use yet. No visible in-app theme toggle was found — confirm whether that's intentional (OS-preference-only) or a missing feature before relying on dark mode in production.

---

## Migration status

All items from the initial audit have been applied:

1. ✅ `--status-*` tokens added (light + derived dark values)
2. ✅ Hardcoded hex in `SyncBadge.tsx`, `PushPreviewDialog.tsx` replaced with status tokens
3. ✅ Hardcoded hex in `button.tsx` (toolbar variant) and `CalendarHeader.tsx` replaced with `text-foreground` / `hover:bg-accent` / `border-border`
4. ✅ `CalendarHeader.tsx` radius fixed: `rounded-sm` → `rounded-md`
5. ✅ `xl` radius step added to theme; `rounded-[12px]` in `button.tsx` → `rounded-xl`
6. ✅ `2xs` text size step added; `SyncBadge.tsx` ad hoc `text-[11px]` replaced
7. ✅ Letter-spacing tokenized in `CalendarHeader.tsx` / toolbar button (`tracking-tight-heading`, `tracking-wide-label`)
8. ✅ `shadow-1..8` wired into Card/Dropdown/Select/Popover/Sheet/Dialog/Sidebar per §5.2 — **needs a visual pass**, elevation values weren't eyeballed before committing

**Still open:**
- Validate the shadow-tier mapping (§5.2) visually — adjust tiers if any component reads too heavy/light
- Decide on a dark-mode toggle, or confirm OS-preference-only is intentional
- `CalendarPreview.tsx`'s disabled-cell color remains a deliberate exception (ilamy canvas, §1.4) — not a gap, just noting it wasn't touched
