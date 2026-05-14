# Frontend Design Skill

## Purpose
Guide creation of distinctive, production-grade frontend interfaces that avoid generic "AI slop" aesthetics. Implement real working code with exceptional attention to aesthetic details and creative choices.

---

## Before Writing Any Code — Design Thinking First

Understand the context and commit to a BOLD aesthetic direction:
- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Pick a clear direction — brutally minimal, maximalist, retro-futuristic, organic/natural, luxury/refined, playful, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian
- **Constraints**: Framework, performance, accessibility requirements
- **Differentiation**: What makes this UNFORGETTABLE?

**CRITICAL**: Choose one clear conceptual direction and execute it with full precision. Intentionality matters more than intensity.

---

## Layout — Mobile-First Responsive

Always build mobile-first. Every component must work at 360px before scaling up.

### Navigation pattern (mandatory for dashboards and apps):
- **Desktop (≥768px)**: Left sidebar navigation, 220px wide, fixed height, user avatar at bottom
- **Mobile (<768px)**: Sidebar hidden (`display: none`), bottom navigation bar visible with icon + label per item

```css
/* Desktop default */
.sidebar { display: flex; width: 220px; }
.bottom-nav { display: none; }

/* Mobile override */
@media (max-width: 768px) {
  .sidebar { display: none; }
  .bottom-nav { display: block; }
}
```

### Content grid:
Use `repeat(auto-fit, minmax(160px, 1fr))` — collapses gracefully on mobile without extra breakpoints.

---

## Typography

- **NEVER use**: Inter, Roboto, Arial, system-ui, or any generic font
- Pair a distinctive **display font** (headings) with a refined **body font**
- Good pairing examples: Syne + DM Sans, Playfair Display + Lato, Space Mono + Mulish, Fraunces + Plus Jakarta Sans
- Load from Google Fonts
- Font weights: 400 (body), 500 (labels/nav), 700 (headings only)
- Heading sizes: h1 = 28px, h2 = 22px, h3 = 18px
- Body: 15–16px, line-height 1.7

---

## Color & Theme

- Use CSS variables for ALL colors — never hardcode hex values in components
- Define a palette at `:root` level
- Always support dark mode via `@media (prefers-color-scheme: dark)` or a `.dark` class
- Dominant background + 1 strong accent color outperforms evenly distributed multi-color palettes
- NEVER use purple gradients on white — the most overused AI aesthetic

```css
:root {
  --color-bg: #ffffff;
  --color-surface: #f5f4f0;
  --color-border: rgba(0,0,0,0.1);
  --color-text-primary: #1a1a1a;
  --color-text-muted: #6b6b6b;
  --color-accent: #1D9E75;        /* your brand accent */
  --color-accent-light: #E1F5EE;
}
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #141414;
    --color-surface: #1e1e1e;
    --color-border: rgba(255,255,255,0.1);
    --color-text-primary: #f0f0f0;
    --color-text-muted: #999;
  }
}
```

---

## Motion & Interactions

- Prioritize CSS-only animations — no JS animation libraries unless the task truly demands it
- One well-orchestrated page load with staggered `animation-delay` creates more delight than scattered micro-interactions
- Hover states must surprise slightly — not just color changes
- Use `transition: all 0.15s ease` for nav items, buttons, cards

```css
.nav-item {
  transition: background 0.15s ease, color 0.15s ease, transform 0.1s ease;
}
.nav-item:hover { transform: translateX(3px); }
```

---

## Components

### Sidebar
```html
<aside class="sidebar">
  <div class="logo">Brand</div>
  <nav>
    <a class="nav-item active"><i class="icon"></i> Dashboard</a>
    <a class="nav-item"><i class="icon"></i> Projects</a>
  </nav>
  <div class="sidebar-footer">
    <div class="avatar">AY</div>
    <div>
      <div class="user-name">Ayush</div>
      <div class="user-role">CEO, Aakteks</div>
    </div>
  </div>
</aside>
```

### Bottom Nav (mobile)
```html
<nav class="bottom-nav">
  <a class="bn-item active"><i class="icon"></i><span>Home</span></a>
  <a class="bn-item"><i class="icon"></i><span>Projects</span></a>
  <a class="bn-item"><i class="icon"></i><span>Analytics</span></a>
  <a class="bn-item"><i class="icon"></i><span>Settings</span></a>
</nav>
```

### Stat / Metric Cards
- Surface background (slightly off-white or dark surface)
- 13px muted label above, 24px/700 value below
- Trend indicator with semantic color (green = up, red = down)
- Grid of 2–4 with `gap: 12px`

### Borders
- Default: `0.5px solid var(--color-border)` — never 1px for refined UI
- Cards: `border-radius: 12px`
- Nav items, buttons: `border-radius: 8px`
- Pills/badges: `border-radius: 20px`

---

## What to NEVER Do

- No generic fonts (Inter, Roboto, Arial, system-ui)
- No purple gradient on white background
- No 1px borders on refined UI — use 0.5px
- No hardcoded colors — always CSS variables
- No layout that ignores mobile (always mobile-first)
- No cookie-cutter card grids that look the same as every other dashboard
- No inline styles for colors — define them in `:root`
- No design without a clear aesthetic point-of-view

---

## Checklist Before Submitting Any UI

- [ ] Works at 360px mobile width
- [ ] Sidebar on desktop, bottom nav on mobile
- [ ] CSS variables used for all colors
- [ ] Dark mode supported
- [ ] No generic fonts
- [ ] Hover/active states on all interactive elements
- [ ] Consistent border-radius throughout
- [ ] Accessible — interactive elements have labels or aria attributes
