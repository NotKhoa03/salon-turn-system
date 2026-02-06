# Persistent Undo Button Design

## Problem

Users make mistakes (wrong person assigned, wrong clock-in) and realize within seconds to minutes. The current 30-second toast-based undo is:
- Not noticeable enough
- Too short a window
- Lost when other actions pile up

## Solution

A persistent floating undo button that expands to show all session actions. Users can surgically undo any specific action without affecting others.

## Core Behaviors

- **Always visible** - Button is always on screen, even with no actions
- **Session-scoped** - Tracks all actions for the current daily session, resets next day
- **Surgical undo** - Remove any single action without affecting others
- **Persisted in session** - Survives page refresh (localStorage, cleared when new session starts)

## Actions Tracked

| Action | Undo Operation |
|--------|----------------|
| Clock in | Delete the clock-in record |
| Clock out | Clear clock-out time (employee clocked back in) |
| Assign turn | Delete the turn |
| Complete turn | Revert status to "in_progress" |

## UI Design

### Floating Button (Collapsed)

- Position: Bottom-right corner, 16px from edges
- Shows: Undo icon + action count badge (e.g., "↩️ 12")
- Always visible, grayed when count is 0
- Tap to expand the action list

### Expanded Panel

- Opens upward from the button
- Scrollable list of all session actions, newest at top
- Each row shows:
  - Time (e.g., "2:34 PM")
  - Action description (e.g., "Assigned Lisa → Manicure")
  - Undo button

Example rows:
```
2:45 PM   Completed turn - Mike (Pedicure)     [Undo]
2:42 PM   Assigned Lisa → Manicure             [Undo]
2:40 PM   Clocked in Sarah                     [Undo]
2:38 PM   Clocked out James                    [Undo]
```

- Header: "Today's Actions" with close button
- Empty state: "No actions yet today"
- Tap outside to collapse

## Edge Cases

1. **Undo clock-in when employee has turns assigned**
   - Block with message: "Can't undo clock-in — Lisa has 3 active turns. Undo those first."
   - Highlight dependent turns in the list

2. **Undo already-completed turn**
   - Works normally — reverts to "in_progress"

3. **Undo clock-out**
   - Works normally — employee shows as clocked in again

4. **Action was already modified elsewhere**
   - Show: "This action was already changed or removed"
   - Remove stale row from list

5. **Page refresh mid-session**
   - History reloads from localStorage
   - Validates each action still exists in database on expand

## Technical Implementation

### Storage

- localStorage key: `undo_history_{session_id}`
- Each action stores: `id`, `type`, `timestamp`, `description`, `payload`
- Cleared when new daily session starts

### Files to Create/Modify

| File | Change |
|------|--------|
| `src/components/undo-button.tsx` | New floating button component |
| `src/components/undo-panel.tsx` | New expandable action list |
| `src/lib/hooks/use-undo.ts` | Remove 30s expiry, remove 5-action limit, add localStorage, add dependency checking |
| Dashboard layout | Mount `<UndoButton />` |

### Database Changes

None required — uses existing APIs.

### Estimated Scope

- ~200-300 lines new UI code
- ~50-100 lines hook modifications
- No backend changes
