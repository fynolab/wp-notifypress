# UI Parity Report — NotifyPress Plugin vs SaaS App

Method: Playwright screenshots of the app content region (`main`, 1380×835 @ 1440×900
viewport, light mode) vs the plugin SPA at a 1380×835 viewport with WP admin chrome
hidden at capture time. Pixel diff via `pixelmatch` (threshold 0.1). Both UIs point at
the same local app site (site 3) so data is identical. Screenshots in `screenshots/parity/`.

Target: ≥98% match per view (≤2% pixel diff). Small residuals are anti-aliasing,
transient counters/spinners, and live data drift between the two captures.

## Global fixes applied (affect all views)

- `tailwind.config.js`: restored default container max-width breakpoints (only `2xl`
  was configured, so `.container` had no max-width below 1400px while the app caps at
  1280px at `xl`).
- `assets/src/scss/style.scss`: scoped (zero-specificity) preflight subset inside
  `#notifypress` — heading/paragraph/list margin reset, border reset
  (`border-style: solid; border-width: 0`), `img/svg` display block; base font
  normalized to the app's rendered stack at `16px/1.5` with antialiasing.
- `style.scss` button reset: replaced `border: 0` (shorthand resets border-style to
  `none`, killing `.border` on shadcn RadioGroupItem etc.) with longhands.
- `style.scss` WP forms.css counter: WP styles typed text inputs at (0,1,1)
  (`padding: 0 12px; min-height: 40px; border: 1px solid #8c8f94; border-radius: 4px`)
  which outranks one-class utilities — restored shadcn Input metrics at `#notifypress`
  scope, with explicit exceptions for `pl-9` / `px-1` / `py-2` / `min-h-11` inputs.
- `style.scss` Tailwind v4 parity: the app (v4) puts `space-y-*` margins on the label
  itself (a no-op on inline elements); our v3 puts `margin-top` on the next sibling,
  which applies. Cancelled after inline labels so both collapse identically.
- `style.scss`: `label { vertical-align: baseline }` (WP sets `middle`, nudging every
  inline label ~1px off the app's baseline).
- `style.scss`: `th, td { padding: 0 }` at zero specificity (UA gives them 1px).
- `components/ui/card.tsx`: synced Card base to app (`border-dashed`).
- `components/shell.tsx`: removed plugin-only page header and shell padding.
- View transitions: `App.tsx` wraps route swaps in `document.startViewTransition()`
  (same cross-fade as the app's Inertia `viewTransition: true`).

## View status (final capture, 2026-07-09)

| View | Diff | Match |
|---|---|---|
| Dashboard | 0.00–0.36% (animated counters) | ✅ |
| Notifications list | 0.04–0.68% (live data drift) | ✅ |
| Notification editor | 1.29% | ✅ |
| Automations | 0.20% | ✅ |
| Automations → Messages | 0.14% | ✅ |
| Subscribers | 2.38% | ⚠️ slightly over (residual ~6px table offset + AA text) |
| Segments | 0.98% | ✅ |
| Segment editor (new) | 1.94% | ✅ |
| Analytics | 1.66% | ✅ |
| Reports | 0.00% | ✅ |

### Editor details
- Default icon: copied app `public/images/notification-icon.png` → `assets/images/notification-icon.png`
  (plugin was showing the N logo).
- Preview cards: fixed broken `new URL(...)` svg resolution → webpack import of the
  shared `bell.svg` (byte-identical to the app's).
- Target URL now prefills from `connectedSite.site_url` like the app.

## Feature parity added in this pass (beyond pixels)

- **Messages tab** (`#/automations/messages`): full port of the app's Messages library.
  New API: `GET /api/v1/automations/messages` (logic extracted to
  `App\Actions\Automations\ListLibraryMessages`, shared with the web controller).
  Editor supports message mode (`?message=1` → purpose `automation_message`, hidden
  Audience/Send tabs, "Create message" flow).
- **Opt-in Prompt settings** (Settings → Opt-in Prompt): full port of the app's
  `/sites/{id}/edit` Opt-in Prompt tab (content, layout style pickers with mini
  previews, accent color, timing) persisted via `PUT /api/v1/sites/current`
  (API + `SiteResource` extended with the `prompt_*` fields; site_details now merge
  instead of overwrite).
- **Live Activity** (dashboard + notifications list): port of the app's
  `LiveActivityPanel`, fed by polling `GET /api/v1/notifications/live-activity`
  every 1.5s (`assets/src/lib/use-live-activity.ts`) — the app uses Reverb
  websockets, which the plugin cannot auth against.
- **View transitions** on SPA navigation (see global fixes).
