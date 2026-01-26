# Mobile UX & Tap Feedback Design

**Date:** 2026-01-26
**Status:** Approved

## Problem Statement

1. **No immediate button feedback** - Buttons (clock out, services, queue actions) show no visual response on tap. Users don't know their tap registered, leading to double-clicks and uncertainty.

2. **Mobile usability issues** - Touch targets too small, layout cramped, gestures finicky, text hard to read. App is used on mixed devices (phones and tablets).

## Design Direction: "Soft Luxury"

A nail salon is about care, precision, and pampering. The interactions should feel luxurious - soft yet responsive, elegant yet satisfying. Think: the sensation of a spa, not a cash register.

---

## Part 1: Premium Tap Feedback

### Concept: "Soft Press with Rose Gold Shimmer"

Two-layer feedback system that feels premium and on-brand.

### Layer 1 - The Soft Press (immediate)

Button feels like pressing into a cushion:

```css
/* Add to button component */
active:shadow-inner
active:shadow-[#b76e79]/20
active:translate-y-[1px]
transition-all duration-100 ease-out
```

- Subtle inward shadow creates "pressed in" depth
- Tiny downward shift (1px) adds physicality
- Rose gold tint in the shadow keeps it on-brand

### Layer 2 - The Shimmer (confirmation)

Brief shimmer sweeps across after press - like light catching polished nails:

```css
@keyframes shimmer-sweep {
  0% { background-position: -100% 0; }
  100% { background-position: 200% 0; }
}

.tap-confirmed {
  background: linear-gradient(
    120deg,
    transparent 0%,
    rgba(247, 231, 206, 0.4) 50%,  /* Champagne */
    transparent 100%
  );
  background-size: 50% 100%;
  animation: shimmer-sweep 0.4s ease-out;
}
```

### Double-tap Prevention

- Pointer-events disabled for 400ms after tap
- Button gets subtle opacity (0.85) during processing
- No jarring disabled state - just slightly muted

---

## Part 2: Mobile Touch Targets

### Concept: "Generous & Forgiving"

Salon staff have busy hands. Touch targets need to be large and forgiving.

### Minimum Touch Target Sizes

| Element | Minimum Size |
|---------|-------------|
| Primary buttons | 48x48px |
| Employee avatars | 56x56px on mobile |
| Service cards | Full-width, 60px height minimum |
| Queue item swipe area | 64px tall minimum |

### Spacing Between Targets

```css
@media (max-width: 768px) {
  .touch-target {
    min-height: 48px;
    padding: 14px 20px;
  }

  .touch-gap {
    gap: 12px;  /* Minimum 12px between tappable items */
  }
}
```

### Extended Hit Areas

Extend tappable area beyond visible button:

```css
.avatar-button::before {
  content: '';
  position: absolute;
  inset: -8px;  /* 8px larger on all sides */
}
```

### Visual Affordance

On mobile, add subtle shadows to tappable elements:

```css
@media (max-width: 768px) {
  .tappable {
    box-shadow: 0 2px 8px rgba(45, 45, 45, 0.08);
  }
}
```

---

## Part 3: Mobile Layout & Typography

### Concept: "Breathable & Scannable"

Staff glance at the POS between clients. Information needs to be instantly readable.

### Typography Scaling

```css
@media (max-width: 768px) {
  body { font-size: 16px; }  /* Prevent iOS zoom on input focus */

  .employee-name { font-size: 14px; font-weight: 600; }
  .service-label { font-size: 15px; line-height: 1.3; }
  .queue-text { font-size: 15px; }
  .price { font-size: 17px; font-weight: 600; }
}
```

### Layout Adjustments

**Service Grid:**
```css
@media (max-width: 480px) {
  .service-grid {
    grid-template-columns: repeat(2, 1fr);  /* 2 columns on small phones */
    gap: 10px;
  }
}
```

**Employee Avatars:**
```css
@media (max-width: 768px) {
  .employee-row {
    gap: 16px;
    padding: 12px 0;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
}
```

**Turn Grid:**
```css
@media (max-width: 768px) {
  .turn-grid {
    font-size: 13px;
    overflow-x: auto;
    min-width: min-content;
  }
}
```

### Reduce Visual Clutter

- Hide secondary info (timestamps) on small screens
- Use icons instead of text labels where clear
- Collapse admin controls into a menu

---

## Part 4: Gesture Improvements

### Concept: "Confident & Clear"

Swipe gestures should feel intentional, not accidental.

### Swipe Thresholds

```javascript
const SWIPE_THRESHOLD = 80;      // Distance in pixels
const VELOCITY_THRESHOLD = 0.3;  // Fast swipes count even if short
```

### Progressive Visual Feedback

**Clock-out swipe (employee avatar):**

| Progress | Visual Feedback |
|----------|-----------------|
| 0-50% | Subtle lift, slight shadow increase |
| 50-80% | Rose gold glow appears, "release to clock out" hint |
| 80-100% | Full glow, ready state |

**Queue item swipe-to-skip:**

```css
.swipe-reveal {
  background: linear-gradient(
    90deg,
    #b76e79 0%,      /* Rose gold */
    #f7e7ce 100%     /* Champagne fade */
  );
  opacity: calc(var(--swipe-progress) * 0.9);
}

.skip-icon {
  transform: scale(calc(0.8 + var(--swipe-progress) * 0.4));
  opacity: var(--swipe-progress);
}
```

### Cancel Affordance

Smooth snap-back with soft bounce:

```css
.swipe-cancel {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

### Prevent Accidental Triggers

- Require 60% of threshold + pause OR full threshold
- Ignore swipes that are more horizontal than vertical (for clock-out)

---

## Implementation Priority

### Phase 1 - Immediate Impact (Button Feedback)
1. Add soft press CSS to `button.tsx` component
2. Create shimmer animation in `globals.css`
3. Add double-tap prevention wrapper utility
4. Apply to service cards and employee avatars

### Phase 2 - Touch Targets
1. Increase avatar sizes on mobile breakpoint
2. Add extended hit areas to small buttons
3. Increase service card heights on mobile
4. Add minimum gap between tappable elements

### Phase 3 - Layout & Typography
1. Bump base font sizes on mobile
2. Switch service grid to 2 columns on small phones
3. Add horizontal scroll to employee row if needed
4. Reduce visual clutter (hide secondary info)

### Phase 4 - Gesture Polish
1. Add progressive visual feedback to swipes
2. Implement velocity-based threshold
3. Add snap-back animation for cancelled swipes
4. Tune swipe directions to prevent accidental triggers

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/ui/button.tsx` | Tap feedback styles |
| `src/app/globals.css` | Animations, mobile breakpoints |
| `src/app/page.tsx` | Avatar sizes, service grid, layout |
| `src/components/queue/swipeable-queue-item.tsx` | Gesture improvements |

---

## Brand Colors Reference

| Color | Hex | Usage |
|-------|-----|-------|
| Rose Gold | #b76e79 | Primary accent, tap feedback |
| Champagne | #f7e7ce | Shimmer, highlights |
| Charcoal | #2d2d2d | Text |
| Sage | #9caf88 | Success states |
| Cream | #faf8f5 | Backgrounds |
