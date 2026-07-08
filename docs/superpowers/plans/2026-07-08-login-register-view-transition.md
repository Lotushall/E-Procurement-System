# Login ↔ Register Shared-Card View Transition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make navigating between `/login` and `/register` visibly resize the shared auth card (103↔120) and cross-fade its content, using Next.js 16's native `<ViewTransition>` instead of the currently-inert `transition-[max-width]` class.

**Architecture:** Enable `experimental.viewTransition` in `next.config.ts`. Wrap the `Card` on both pages in `<ViewTransition name="auth-card">` — matching names across the navigation make the browser's View Transitions API auto-animate size/position and cross-fade differing content, no custom CSS animation needed. Add a `prefers-reduced-motion` guard and a register→login back-link so both directions are reachable.

**Tech Stack:** Next.js 16.2.10 (App Router, static export), React 19 canary `ViewTransition` component, Tailwind CSS v4.

## Global Constraints

- Spec source: `docs/superpowers/specs/2026-07-08-login-register-view-transition-design.md`
- No custom `::view-transition-*` keyframes are added — rely on the browser's default crossfade/resize behavior for the `auth-card` name (per spec Architecture §2/§3).
- Project builds with `output: "export"` (static export) — every task must keep `npm run build` passing.
- No automated test framework exists in `frontend/` (no jest/vitest/playwright in `package.json`) — verification is `npx tsc --noEmit`, `npm run build`, and explicit manual browser steps, not unit tests.
- Thai-language UI copy stays consistent with existing strings (e.g. footer link style already used on the login page).

---

### Task 1: Enable the View Transitions experimental flag

**Files:**
- Modify: `frontend/next.config.ts`

**Interfaces:**
- Produces: `experimental.viewTransition: true` in the exported Next config, which later tasks depend on for `<ViewTransition>` to actually animate navigations.

- [ ] **Step 1: Add the experimental flag**

Current file:
```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "export",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
```

New file:
```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "export",
  images: {
    unoptimized: true,
  },
  experimental: {
    viewTransition: true,
  },
};

export default nextConfig;
```

- [ ] **Step 2: Verify the project still builds**

Run: `cd frontend && npx tsc --noEmit && npm run build`
Expected: both commands exit 0. The static export must succeed with the flag enabled — if `next build` errors specifically about `experimental.viewTransition` and `output: "export"` being incompatible, stop and report this back rather than working around it (this is the risk flagged in the spec).

- [ ] **Step 3: Commit**

```bash
git add frontend/next.config.ts
git commit -m "Enable experimental View Transitions for route navigation"
```

---

### Task 2: Wrap the login page's Card in a named ViewTransition

**Files:**
- Modify: `frontend/app/login/page.tsx`

**Interfaces:**
- Consumes: `experimental.viewTransition` from Task 1 (must be enabled for this to animate).
- Produces: a `<ViewTransition name="auth-card">` wrapper that Task 3's register page must reuse with the exact same `name` string (`"auth-card"`) for the browser to treat them as the same shared element.

- [ ] **Step 1: Import `ViewTransition` from `react`**

In `frontend/app/login/page.tsx`, change:
```tsx
import { ReactNode, useState } from "react";
```
to:
```tsx
import { ReactNode, useState, ViewTransition } from "react";
```

- [ ] **Step 2: Wrap the Card and drop the dead transition class**

Change:
```tsx
            <Card className="max-w-103 w-full py-6 px-5 transition-[max-width] duration-200">
```
to:
```tsx
            <ViewTransition name="auth-card">
            <Card className="max-w-103 w-full py-6 px-5">
```

And change the matching closing tag at the end of the component (currently `</Card>` immediately before the closing `</div>`):
```tsx
            </Card>
        </div>
    )
```
to:
```tsx
            </Card>
            </ViewTransition>
        </div>
    )
```

- [ ] **Step 3: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: exits 0, no errors about `ViewTransition` (it's exported from React 19's canary release, which Next.js 16's App Router already uses per `node_modules/next/dist/docs/01-app/02-guides/view-transitions.md`).

- [ ] **Step 4: Commit**

```bash
git add frontend/app/login/page.tsx
git commit -m "Wrap login card in named ViewTransition"
```

---

### Task 3: Wrap the register page's Card in the same named ViewTransition, add back-link

**Files:**
- Modify: `frontend/app/register/page.tsx`

**Interfaces:**
- Consumes: `ViewTransition name="auth-card"` convention from Task 2 — must match exactly for the shared-element effect to work.
- Produces: `/register` becomes reachable back to `/login` via a visible link, needed to manually verify the register→login direction in Task 4.

- [ ] **Step 1: Replace the file contents**

Current file:
```tsx
import { Card } from "@/components/ui/card";

export default function Register() {
    return (
        <div className="flex justify-center items-center bg-background min-h-dvh p-8">
            <Card className="max-w-120 w-full py-6 px-5 transition-[max-width] duration-200">

            </Card>
        </div>
    )
}
```

New file:
```tsx
import { Card } from "@/components/ui/card";
import { routes } from "@/lib/routes";
import Link from "next/link";
import { ViewTransition } from "react";

export default function Register() {
    return (
        <div className="flex justify-center items-center bg-background min-h-dvh p-8">
            <ViewTransition name="auth-card">
            <Card className="max-w-120 w-full py-6 px-5 flex flex-col items-center justify-center gap-4">
                <div className="flex gap-1 text-sm tracking-wider">
                    <p className="font-light">มีบัญชีอยู่แล้ว?</p>
                    <Link href={routes.login} className="font-bold text-red-700">
                        เข้าสู่ระบบที่นี่
                    </Link>
                </div>
            </Card>
            </ViewTransition>
        </div>
    )
}
```

Note: the register form itself is still unbuilt (tracked separately — see spec's Out of Scope). This step only adds the minimum content needed to make the reverse navigation direction reachable and visible for testing; the `flex flex-col items-center justify-center gap-4` classes just center that single link inside the otherwise-empty card.

- [ ] **Step 2: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/register/page.tsx
git commit -m "Wrap register card in named ViewTransition, add back-link to login"
```

---

### Task 4: Add reduced-motion guard and verify both directions end-to-end

**Files:**
- Modify: `frontend/app/globals.css`

**Interfaces:**
- Consumes: the `auth-card` ViewTransition from Tasks 2 and 3 (this task's CSS selectors target the browser's auto-generated `::view-transition-*` pseudo-elements, which exist for any active named transition — no dependency on the specific name).

- [ ] **Step 1: Append the reduced-motion guard**

At the end of `frontend/app/globals.css` (after the closing `}` of the `@layer base` block on line 143), add:
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

- [ ] **Step 2: Run the full build**

Run: `cd frontend && npx tsc --noEmit && npm run build`
Expected: both exit 0.

- [ ] **Step 3: Manual verification — forward direction**

Run: `cd frontend && npm run dev`, open `http://localhost:3000/login` in a browser that supports the View Transitions API (Chrome/Edge; Safari behavior may differ per the Next.js guide's note).

Click "ลงทะเบียนที่นี่". Confirm:
- The card visibly resizes from the login width toward the wider register width (not an instant swap).
- The login form content cross-fades out as the (currently mostly-empty) register content fades in.

- [ ] **Step 4: Manual verification — reverse direction**

From `/register`, click "เข้าสู่ระบบที่นี่". Confirm:
- The card visibly resizes back down toward the login width.
- Content cross-fades in the reverse direction.

- [ ] **Step 5: Manual verification — reduced motion**

In Chrome DevTools: Cmd/Ctrl+Shift+P → "Rendering" → enable "Emulate CSS media feature prefers-reduced-motion" → set to "reduce". Repeat Steps 3 and 4. Confirm the card size/content swap is instant with no animation.

- [ ] **Step 6: Verify static export still serves correctly**

Run: `cd frontend && npm run build && npx serve out` (or equivalent static file server for the `out/` directory). Repeat Step 3 against the served static build. This directly checks the spec's flagged risk — that View Transitions still activate under `output: "export"`. If it does not animate under the static-served build but does under `npm run dev`, report this discrepancy rather than silently working around it — it means the risk in the spec materialized and needs a decision from the user.

- [ ] **Step 7: Commit**

```bash
git add frontend/app/globals.css
git commit -m "Add prefers-reduced-motion guard for view transitions"
```
