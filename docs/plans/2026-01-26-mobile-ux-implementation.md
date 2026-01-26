# Mobile UX & Tap Feedback Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add premium tap feedback to all interactive elements and improve mobile usability across the nail salon POS app.

**Architecture:** CSS-first approach for tap feedback using `:active` states and keyframe animations. Mobile improvements via Tailwind responsive classes and CSS media queries. Double-tap prevention via a reusable React hook.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, shadcn/ui components

---

## Task 1: Add Shimmer Sweep Animation

**Files:**
- Modify: `src/app/globals.css:185-188` (add new keyframes near existing shimmer)

**Step 1: Add the shimmer-sweep keyframe**

Add this after the existing `@keyframes shimmer` (around line 188):

```css
@keyframes shimmer-sweep {
  0% { background-position: -100% 0; }
  100% { background-position: 200% 0; }
}

.tap-shimmer {
  position: relative;
  overflow: hidden;
}

.tap-shimmer::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    120deg,
    transparent 0%,
    rgba(247, 231, 206, 0.4) 50%,
    transparent 100%
  );
  background-size: 50% 100%;
  opacity: 0;
  pointer-events: none;
}

.tap-shimmer.shimmer-active::after {
  animation: shimmer-sweep 0.4s ease-out;
  opacity: 1;
}
```

**Step 2: Verify CSS compiles**

Run: `cd .worktrees/mobile-ux && npm run build`
Expected: Build succeeds without CSS errors

**Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add shimmer-sweep animation for tap feedback"
```

---

## Task 2: Add Soft Press Styles to Button Component

**Files:**
- Modify: `src/components/ui/button.tsx:7-8` (update base CVA classes)

**Step 1: Update the buttonVariants base classes**

Change line 8 from:
```typescript
"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
```

To:
```typescript
"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-100 ease-out active:scale-[0.97] active:shadow-inner active:shadow-[#b76e79]/20 active:translate-y-[1px] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive touch-action-manipulation",
```

Key additions:
- `duration-100 ease-out` - smooth quick transition
- `active:scale-[0.97]` - subtle press-down scale
- `active:shadow-inner active:shadow-[#b76e79]/20` - rose gold inner shadow
- `active:translate-y-[1px]` - slight downward press
- `touch-action-manipulation` - prevent double-tap zoom

**Step 2: Verify the component renders**

Run: `cd .worktrees/mobile-ux && npm run dev`
Open browser, click buttons, verify the soft press effect works.

**Step 3: Commit**

```bash
git add src/components/ui/button.tsx
git commit -m "feat: add soft press tap feedback to Button component"
```

---

## Task 3: Create useDebounceClick Hook for Double-Tap Prevention

**Files:**
- Create: `src/lib/hooks/use-debounce-click.ts`

**Step 1: Create the hook file**

```typescript
import { useCallback, useRef } from 'react';

/**
 * Wraps a click handler to prevent double-clicks/double-taps.
 * Ignores clicks within the debounce period after the last click.
 */
export function useDebounceClick<T extends (...args: unknown[]) => unknown>(
  handler: T,
  delay: number = 400
): T {
  const lastClickRef = useRef<number>(0);
  const pendingRef = useRef<boolean>(false);

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();

      // If we're in the debounce period, ignore
      if (now - lastClickRef.current < delay) {
        return;
      }

      // If already processing, ignore
      if (pendingRef.current) {
        return;
      }

      lastClickRef.current = now;

      // Handle async handlers
      const result = handler(...args);

      if (result instanceof Promise) {
        pendingRef.current = true;
        result.finally(() => {
          pendingRef.current = false;
        });
      }

      return result;
    }) as T,
    [handler, delay]
  );
}
```

**Step 2: Export from hooks index**

Add to `src/lib/hooks/index.ts`:
```typescript
export { useDebounceClick } from './use-debounce-click';
```

**Step 3: Verify TypeScript compiles**

Run: `cd .worktrees/mobile-ux && npx tsc --noEmit`
Expected: No TypeScript errors

**Step 4: Commit**

```bash
git add src/lib/hooks/use-debounce-click.ts src/lib/hooks/index.ts
git commit -m "feat: add useDebounceClick hook for double-tap prevention"
```

---

## Task 4: Add Tap Feedback to Service Cards

**Files:**
- Modify: `src/app/page.tsx:463-489` (service card buttons)

**Step 1: Update service card button classes**

Find the service card button (around line 465-488) and update the className:

From:
```typescript
className={`service-card relative p-4 rounded-xl border-2 text-left opacity-0 animate-scale-in ${
  service.is_half_turn
    ? 'service-card-half border-[#f7e7ce]'
    : 'service-card-full border-[#e8e4df] hover:border-[#b76e79]'
}`}
```

To:
```typescript
className={`service-card relative p-4 rounded-xl border-2 text-left opacity-0 animate-scale-in
  active:scale-[0.97] active:shadow-inner active:shadow-[#b76e79]/20
  transition-all duration-100 ease-out touch-action-manipulation ${
  service.is_half_turn
    ? 'service-card-half border-[#f7e7ce]'
    : 'service-card-full border-[#e8e4df] hover:border-[#b76e79]'
}`}
```

**Step 2: Wrap handleServiceTap with debounce**

At the top of the component, import and use the hook:

```typescript
import { useDebounceClick } from "@/lib/hooks";
```

Then wrap the handler (after line 231):
```typescript
const debouncedServiceTap = useDebounceClick(handleServiceTap, 400);
```

Update the onClick to use `debouncedServiceTap` instead of `handleServiceTap`.

**Step 3: Test manually**

Run dev server, tap service cards rapidly, verify:
- Visual press feedback appears
- Only one service gets assigned (no double-tap)

**Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add tap feedback and debounce to service cards"
```

---

## Task 5: Add Tap Feedback to Employee Avatars

**Files:**
- Modify: `src/app/page.tsx:371-426` (employee avatar buttons)

**Step 1: Update avatar button classes**

Find the employee avatar button (around line 374) and add active states:

Update the className to include:
```typescript
className={`relative flex flex-col items-center gap-1 p-2 rounded-xl
  active:scale-[0.95] active:shadow-inner active:shadow-[#b76e79]/20
  transition-all touch-action-manipulation ${
  isCurrentlySwiping ? 'duration-0' : 'duration-200'
} ${
  isActive
    ? 'bg-[#f7e7ce]/30'
    : isInactive
    ? 'bg-[#f5f0eb]/50'
    : 'hover:bg-[#f5f0eb]'
}`}
```

**Step 2: Wrap handleClockIn with debounce**

Add after existing handlers:
```typescript
const debouncedClockIn = useDebounceClick(handleClockIn, 400);
```

Update onClick to use `debouncedClockIn`.

**Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add tap feedback and debounce to employee avatars"
```

---

## Task 6: Add Mobile Touch Target Sizes

**Files:**
- Modify: `src/app/globals.css` (add mobile breakpoint styles at end)

**Step 1: Add mobile touch target styles**

Add at the end of globals.css:

```css
/* Mobile Touch Targets */
@media (max-width: 768px) {
  /* Larger touch targets on mobile */
  .service-card {
    min-height: 60px;
    padding: 16px;
  }

  /* Employee avatars larger on mobile */
  .employee-avatar-mobile {
    min-width: 56px;
    min-height: 56px;
  }

  /* Queue items taller */
  .queue-item-mobile {
    min-height: 64px;
    padding: 14px;
  }

  /* Minimum button sizes */
  button:not([class*="icon"]) {
    min-height: 44px;
  }

  /* Touch-friendly gaps */
  .touch-gap {
    gap: 12px;
  }

  /* Visual affordance - subtle shadows on tappable items */
  .tappable-mobile {
    box-shadow: 0 2px 8px rgba(45, 45, 45, 0.08);
  }
}

/* Extended hit areas */
.hit-area-extended {
  position: relative;
}

.hit-area-extended::before {
  content: '';
  position: absolute;
  inset: -8px;
}
```

**Step 2: Verify CSS compiles**

Run: `cd .worktrees/mobile-ux && npm run build`

**Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add mobile touch target size styles"
```

---

## Task 7: Apply Touch Target Classes to Employee Avatars

**Files:**
- Modify: `src/app/page.tsx:355-429`

**Step 1: Update avatar container flex gap**

Find the employee avatar flex container (around line 355):

From:
```typescript
<div className="flex flex-wrap gap-3">
```

To:
```typescript
<div className="flex flex-wrap gap-3 md:gap-3 gap-4">
```

**Step 2: Update avatar inner circle size on mobile**

Find the avatar circle div (around line 391):

From:
```typescript
className={`relative w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold transition-all duration-300 ${
```

To:
```typescript
className={`relative w-12 h-12 md:w-12 md:h-12 w-14 h-14 rounded-full flex items-center justify-center text-lg font-semibold transition-all duration-300 ${
```

**Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: increase employee avatar touch targets on mobile"
```

---

## Task 8: Update Service Grid for Mobile

**Files:**
- Modify: `src/app/page.tsx:463` (service grid)

**Step 1: Make service grid responsive**

Find the service grid (around line 463):

From:
```typescript
<div className="grid grid-cols-3 gap-3 mb-4">
```

To:
```typescript
<div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-3 gap-2.5 mb-4">
```

This gives:
- 2 columns on phones (< 640px)
- 3 columns on tablets and up
- Slightly tighter gap on phones

**Step 2: Test on mobile viewport**

Open dev tools, resize to phone width, verify 2-column layout.

**Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: make service grid 2 columns on mobile"
```

---

## Task 9: Add Mobile Typography Scaling

**Files:**
- Modify: `src/app/globals.css` (add to mobile media query)

**Step 1: Add typography scaling rules**

Add inside the existing `@media (max-width: 768px)` block:

```css
  /* Typography scaling for mobile */
  body {
    font-size: 16px; /* Prevent iOS zoom on input focus */
  }

  /* Employee names */
  .employee-name-mobile {
    font-size: 14px;
    font-weight: 600;
  }

  /* Service labels */
  .service-label-mobile {
    font-size: 15px;
    line-height: 1.3;
  }

  /* Prices - larger for quick scanning */
  .price-mobile {
    font-size: 17px;
    font-weight: 600;
  }

  /* Queue text */
  .queue-text-mobile {
    font-size: 15px;
  }
```

**Step 2: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add mobile typography scaling"
```

---

## Task 10: Add Swipe Gesture Visual Improvements

**Files:**
- Modify: `src/components/queue/swipeable-queue-item.tsx:99-128`

**Step 1: Add progressive visual feedback during swipe**

Update the swipe reveal background div (around line 101-128):

Replace the style calculation with CSS custom properties:

```typescript
<div
  className="absolute inset-0 flex items-center justify-end pr-4"
  style={{
    background: isNearThreshold
      ? 'linear-gradient(90deg, transparent 0%, #b76e79 50%, #d4a5ab 100%)'
      : `linear-gradient(90deg, transparent 0%, rgba(247, 231, 206, ${0.3 + swipeProgress * 0.5}) 50%, rgba(183, 110, 121, ${swipeProgress * 0.3}) 100%)`,
    transition: isSwiping ? 'none' : 'background 0.3s ease-out',
  }}
>
```

**Step 2: Update the skip icon scaling**

Update the icon container (around line 110-127):

```typescript
<div
  className="flex items-center gap-2"
  style={{
    opacity: Math.min(1, swipeProgress * 1.5),
    transform: `scale(${0.8 + swipeProgress * 0.4}) translateX(${(1 - swipeProgress) * 10}px)`,
    transition: isSwiping ? 'none' : 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
  }}
>
```

**Step 3: Commit**

```bash
git add src/components/queue/swipeable-queue-item.tsx
git commit -m "feat: improve swipe gesture visual feedback"
```

---

## Task 11: Add Snap-Back Animation for Cancelled Swipes

**Files:**
- Modify: `src/components/queue/swipeable-queue-item.tsx:143-145`

**Step 1: Update the transition for snap-back**

Find the main content div transition (around line 144):

From:
```typescript
transition: isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
```

To:
```typescript
transition: isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
```

This uses a bouncy easing for a more satisfying snap-back feel.

**Step 2: Commit**

```bash
git add src/components/queue/swipeable-queue-item.tsx
git commit -m "feat: add bouncy snap-back animation for cancelled swipes"
```

---

## Task 12: Add Queue Item Touch Target Improvements

**Files:**
- Modify: `src/components/queue/swipeable-queue-item.tsx:131-153`

**Step 1: Update main content div classes**

Find the main content div (around line 131-141) and update className:

From:
```typescript
className={`relative flex items-center gap-3 p-3 rounded-xl transition-all cursor-grab active:cursor-grabbing select-none ${
```

To:
```typescript
className={`relative flex items-center gap-3 p-3 sm:p-3 p-4 min-h-[56px] sm:min-h-0 rounded-xl transition-all cursor-grab active:cursor-grabbing select-none touch-action-pan-y ${
```

Key additions:
- `p-4` on mobile, `sm:p-3` on larger screens
- `min-h-[56px]` on mobile for touch target
- `touch-action-pan-y` to allow vertical scroll while capturing horizontal swipe

**Step 2: Commit**

```bash
git add src/components/queue/swipeable-queue-item.tsx
git commit -m "feat: increase queue item touch targets on mobile"
```

---

## Task 13: Add Action Button Tap Feedback

**Files:**
- Modify: `src/components/queue/swipeable-queue-item.tsx:196-214`

**Step 1: Update Resume button classes**

Find the Resume button (around line 196-204):

From:
```typescript
className="h-7 px-3 rounded-lg text-[#d4a574] hover:text-[#b76e79] hover:bg-[#f7e7ce]/50 text-xs font-medium"
```

To:
```typescript
className="h-7 sm:h-7 h-9 px-3 sm:px-3 px-4 rounded-lg text-[#d4a574] hover:text-[#b76e79] hover:bg-[#f7e7ce]/50 active:scale-[0.95] active:shadow-inner transition-all duration-100 text-xs font-medium touch-action-manipulation"
```

**Step 2: Update Done button classes**

Find the Done button (around line 206-213):

From:
```typescript
className="h-7 px-2 rounded-lg bg-[#9caf88] hover:bg-[#8a9d78] text-white text-xs"
```

To:
```typescript
className="h-7 sm:h-7 h-9 px-2 sm:px-2 px-3 rounded-lg bg-[#9caf88] hover:bg-[#8a9d78] active:scale-[0.95] active:shadow-inner active:shadow-[#9caf88]/30 transition-all duration-100 text-white text-xs touch-action-manipulation"
```

**Step 3: Commit**

```bash
git add src/components/queue/swipeable-queue-item.tsx
git commit -m "feat: add tap feedback to queue action buttons"
```

---

## Task 14: Final Integration Test

**Files:** None (testing only)

**Step 1: Start development server**

Run: `cd .worktrees/mobile-ux && npm run dev`

**Step 2: Test on desktop**

- Click all buttons - verify soft press effect
- Click rapidly on service cards - verify only one assigns
- Swipe queue items - verify smooth feedback

**Step 3: Test on mobile viewport**

Open Chrome DevTools, enable device toolbar, test at 375px width:
- Verify 2-column service grid
- Verify larger touch targets
- Verify tap feedback works
- Verify swipe gestures work

**Step 4: Test on actual mobile device (optional)**

Access dev server from phone on same network.

---

## Task 15: Final Commit and Summary

**Step 1: Verify all changes**

Run: `cd .worktrees/mobile-ux && git status`

**Step 2: Run build to verify no errors**

Run: `cd .worktrees/mobile-ux && npm run build`
Expected: Build succeeds

**Step 3: Create summary commit if needed**

If any uncommitted changes remain:
```bash
git add -A
git commit -m "chore: final cleanup for mobile UX improvements"
```

---

## Files Modified Summary

| File | Changes |
|------|---------|
| `src/app/globals.css` | Shimmer animation, mobile touch targets, typography |
| `src/components/ui/button.tsx` | Soft press active states |
| `src/lib/hooks/use-debounce-click.ts` | New file - double-tap prevention |
| `src/lib/hooks/index.ts` | Export new hook |
| `src/app/page.tsx` | Service cards, avatars - tap feedback + mobile sizing |
| `src/components/queue/swipeable-queue-item.tsx` | Gesture improvements, touch targets |

---

## Rollback Plan

If issues arise, revert to the commit before Task 1:
```bash
git reset --hard HEAD~N  # where N is number of commits to undo
```

Or cherry-pick specific commits to keep.
