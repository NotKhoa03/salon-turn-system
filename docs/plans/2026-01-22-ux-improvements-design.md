# UX Improvements Design

**Date:** 2026-01-22
**Status:** Approved

## Overview

Streamline the salon POS interface for faster, one-tap interactions with distinctive visual feedback.

## Changes

### 1. Service Selection Grid

Replace dropdown with always-visible 3-column grid of tappable service cards.

- Each card shows: service name, price, half-turn badge (½) if applicable
- One tap assigns to next technician in queue
- Half-turn services have champagne background
- "Assign to..." link below grid for manual technician selection

### 2. Unified Clock-In/Clock-Out

Horizontal row of employee avatars above the queue panel.

**Visual states:**
- Not clocked in: grayscale, transparent
- Clocked in: full color with glow ring
- Busy: full color with clock badge

**Interactions:**
- Tap grayscale avatar → clock in
- Long-press active avatar → clock out

### 3. Turn Grid Redesign

Fixed 10-row grid (T1-T10) with distinctive cell states:

| State | Visual |
|-------|--------|
| Empty | Dashed border, transparent |
| In-progress | Bottom half filled with shimmer animation |
| Full turn complete | Solid sage green, white checkmark |
| Half turn complete | Diagonal slash, rose-gold/cream split |

### 4. Welcome Animation

Elegant 1.5-second fade-in sequence:
1. Logo fades in at center (0-0.4s)
2. Logo floats to nav position (0.4-0.8s)
3. UI elements slide in with stagger (0.8-1.5s)

Respects `prefers-reduced-motion`. Skipped on repeat visits via localStorage.

## Layout

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo]         [Date Picker]              [Admin] [User]   │
├───────────────────────┬─────────────────────────────────────┤
│  ○ ○ ○ ○ ○ ○ ○ ○     │                                     │
│  (employee avatars)   │                                     │
├───────────────────────┤        TURN GRID                    │
│  ┌─────┬─────┬─────┐ │   (10 fixed rows)                   │
│  │ Svc │ Svc │ Svc │ │                                     │
│  │ Svc │ Svc │ Svc │ │                                     │
│  │ Svc │ Svc │ Svc │ │                                     │
│  └─────┴─────┴─────┘ │                                     │
│  "Assign to..." link  │                                     │
├───────────────────────┤                                     │
│  QUEUE                │                                     │
│  1. Maria ← NEXT      │                                     │
│  2. John              │                                     │
└───────────────────────┴─────────────────────────────────────┘
```
