# Performance Optimization Design

**Date:** 2026-01-30
**Problem:** App stuck loading, actions feel slow (11+ second Supabase cold starts on free tier)
**Goal:** Instant perceived performance without upgrading Supabase plan

---

## Overview

Three changes to make the app feel instant:

1. **Server-side caching** for employees/services (static data)
2. **Optimistic updates** for all user actions
3. **Tap-to-clock-out** with confirmation dialog (UX simplification)

---

## 1. Server-Side Caching for Static Data

### Rationale
Employees and services rarely change. Fetching them from Supabase on every page load wastes time, especially with cold starts.

### Implementation
- Create cached server functions using Next.js `unstable_cache`
- Cache duration: 5 minutes (300 seconds)
- Revalidate on admin changes via `revalidatePath`

### Files Changed
- `src/app/page.tsx` → Split into server wrapper + client component
- `src/lib/supabase/server.ts` → Add `getCachedEmployees()`, `getCachedServices()`
- `src/lib/hooks/use-employees.ts` → Delete or keep for admin pages only
- `src/lib/hooks/use-services.ts` → Delete or keep for admin pages only

### Data Flow
```
Request → Server component → Check cache → Hit: return cached | Miss: fetch + cache → Pass to client
```

---

## 2. Optimistic Updates for Actions

### Rationale
UI currently waits for Supabase response before updating. This creates perceived lag of 1-11 seconds per action.

### Implementation Pattern
```typescript
// 1. Update UI immediately with temporary data
const tempId = `temp-${Date.now()}`;
setState(prev => [...prev, { id: tempId, ...optimisticData }]);

// 2. Send to server
const { data, error } = await supabase.from('table').insert(...);

// 3. Handle result
if (error) {
  // Roll back
  setState(prev => prev.filter(item => item.id !== tempId));
  toast.error("Action failed");
} else {
  // Replace temp with real data
  setState(prev => prev.map(item => item.id === tempId ? data : item));
}
```

### Actions to Update
| Action | Hook | Optimistic Behavior |
|--------|------|---------------------|
| Clock in | `use-clock-ins.ts` | Add employee to clockIns immediately |
| Clock out | `use-clock-ins.ts` | Set isActive=false immediately |
| Assign service | `use-turns.ts` | Add turn to turns immediately |
| Complete turn | `use-turns.ts` | Set status=completed immediately |

### Files Changed
- `src/lib/hooks/use-clock-ins.ts` → Add optimistic logic to `clockIn`, `clockOut`
- `src/lib/hooks/use-turns.ts` → Add optimistic logic to `assignTurn`, `completeTurn`

---

## 3. Tap-to-Clock-Out with Confirmation

### Rationale
Swipe gesture is not discoverable and inconsistent across devices. Tap is universal.

### UX Flow
1. Tap inactive employee → Clock in (no confirmation)
2. Tap active employee → Show confirmation dialog
3. Confirm → Clock out with optimistic update

### Dialog
- Title: "Clock out [Name]?"
- Buttons: Cancel (secondary), Clock Out (primary)

### Files Changed
- `src/app/page.tsx`:
  - Add `clockOutDialogOpen` and `clockOutEmployeeId` state
  - Add confirmation dialog component
  - Remove: `swipeState`, `handleTouchStart`, `handleTouchMove`, `handleTouchEnd`, `getSwipeTransform`, `SWIPE_THRESHOLD`

---

## Expected Results

| Metric | Before | After |
|--------|--------|-------|
| Initial load (cold) | 11+ seconds | <500ms (cached) |
| Initial load (warm) | 1-2 seconds | <500ms (cached) |
| Clock in action | 1-3 seconds | <50ms (optimistic) |
| Assign service | 1-3 seconds | <50ms (optimistic) |

---

## Implementation Order

1. Server-side caching (biggest impact on load time)
2. Optimistic updates (biggest impact on action feel)
3. Clock out UX (simplification)
