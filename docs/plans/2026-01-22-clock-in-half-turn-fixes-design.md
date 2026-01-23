# Clock-In/Clock-Out and Half-Turn Pairing Design

**Date:** 2026-01-22
**Status:** Approved

## Overview

Fix two issues:
1. Employees cannot clock back in after clocking out
2. Half-turns should pair with the next service on the same row

## Clock-In/Clock-Out Fix

### Problem
Currently fetching only clock-ins where `clock_out_time IS NULL`, so clocked-out employees disappear.

### Solution

1. **Fetch all clock-ins for the session** (remove null filter)
2. **Track active vs inactive** in UI based on `clock_out_time`
3. **Re-clock-in logic:**
   - If employee has existing clock-in record: clear `clock_out_time`
   - Position: `max position of still-active workers + 1`
4. **Queue display:** Only show active employees
5. **Turn grid:** Show all employees who worked that day

## Half-Turn Pairing

### Data Model Change

Add column to `turns` table:
```sql
ALTER TABLE turns ADD COLUMN paired_with_turn_id UUID REFERENCES turns(id);
```

### Assignment Logic

1. Check if employee has completed half-turn with no pairing
2. If pending half-turn exists:
   - Use SAME turn_number
   - Set `paired_with_turn_id` to link them
3. If no pending half-turn:
   - Increment turn_number as usual

### Cell Visual States

| State | Visual |
|-------|--------|
| Empty | Dashed border |
| Full in-progress | Half-filled + shimmer |
| Full completed | Solid sage + checkmark |
| Half in-progress | Half-filled + shimmer |
| Half completed (pending) | Rose-gold left, cream right |
| Paired in-progress | Rose-gold left + shimmer right |
| Paired completed | Rose-gold left + sage right with diagonal |

## Files to Modify

- `supabase/migrations/` - Add `paired_with_turn_id` column
- `src/lib/hooks/use-clock-ins.ts` - Fetch all, handle re-clock-in
- `src/lib/hooks/use-turns.ts` - Half-turn pairing logic
- `src/lib/hooks/use-queue.ts` - Handle inactive employees
- `src/components/turn-grid/turn-grid.tsx` - New cell states
