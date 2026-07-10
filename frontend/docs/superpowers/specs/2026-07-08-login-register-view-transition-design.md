# Login ↔ Register Shared-Card View Transition

Date: 2026-07-08

## Context

`frontend/app/login/page.tsx` and `frontend/app/register/page.tsx` each render an auth form inside a `Card` (`max-w-103` on login, `max-w-120` on register). Both currently carry a `transition-[max-width] duration-200` class left over from an earlier attempt to animate the width change between the two pages. That class is inert for this purpose: navigating from `/login` to `/register` unmounts one page's React tree and mounts the other's, so there is no persisting DOM node for a CSS `transition` to animate across — this is the root cause of "ไม่เห็นเป็นเลย" (no animation at all).

This Next.js version (16.2.10) ships first-class support for React's `<ViewTransition>` component integrated with the browser's View Transitions API (`node_modules/next/dist/docs/01-app/02-guides/view-transitions.md`), gated behind `experimental.viewTransition` in `next.config.ts` (currently unset). When two elements across a navigation share the same `name`, the browser automatically interpolates their size/position and cross-fades their differing content — no manual JS/CSS animation code needed. This matches the desired effect exactly: the card visually resizes 103↔120 while the differing form content cross-fades.

Out of scope: directional slide navigation, shared-element morphing of individual fields, and building out the actual register form (the register page currently renders an empty `Card` — that stays empty here; only a back-link to `/login` is added so the reverse direction is reachable for testing).

## Architecture

### 1. `frontend/next.config.ts` (modify)
Add `experimental: { viewTransition: true }` alongside the existing `output: "export"` / `images.unoptimized` options.

### 2. `frontend/app/login/page.tsx` (modify)
Import `ViewTransition` from `react`. Wrap the existing `<Card className="max-w-103 ...">` in `<ViewTransition name="auth-card">`, dropping the now-dead `transition-[max-width] duration-200` class from the Card's `className`.

### 3. `frontend/app/register/page.tsx` (modify)
Same wrap: `<ViewTransition name="auth-card">` around the `<Card className="max-w-120 ...">`, same class cleanup. Add a minimal back-link inside the Card, matching the login page's existing "ยังไม่มีบัญชี? ลงทะเบียนที่นี่" footer pattern:

```tsx
<div className="flex gap-1 text-sm tracking-wider">
  <p className="font-light">มีบัญชีอยู่แล้ว?</p>
  <Link href={routes.login} className="font-bold text-red-700">เข้าสู่ระบบที่นี่</Link>
</div>
```

### 4. `frontend/app/globals.css` (modify)
Add the standard reduced-motion guard from Next's own view-transitions guide, scoped to not require any named keyframes since we're relying on the browser's default crossfade/resize (no custom `::view-transition-*` rules are being added):

```css
@media (prefers-reduced-motion: reduce) {
  ::view-transition-old(*),
  ::view-transition-new(*),
  ::view-transition-group(*) {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
  }
}
```

## Risk

The project builds with `output: "export"` (static export). View Transitions activate on client-side navigation (post-hydration router transitions), which static export does not disable — but this hasn't been verified hands-on for this specific Next.js version yet. Verification step below covers this directly; if it doesn't fire under static export, the fallback is confirming the behavior under `next dev` (which does not use static export) and documenting the export-mode gap separately.

## Testing / Verification

Manual, in-browser (`npm run dev`, since static export requires a build+serve cycle to test client routing realistically — fall back to a built+served static output if dev-mode behavior diverges):
1. Load `/login`, click "ลงทะเบียนที่นี่" → confirm the card visibly resizes toward `max-w-120` while the content cross-fades, rather than an instant swap.
2. From `/register`, click the new "เข้าสู่ระบบที่นี่" link → confirm the reverse resize/crossfade back to `max-w-103`.
3. In DevTools, enable "Emulate CSS prefers-reduced-motion: reduce" → repeat both directions and confirm the swap is instant (no animation).
4. `npx tsc --noEmit` and `npm run build` both still pass with `experimental.viewTransition` enabled under static export.
