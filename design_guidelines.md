# Radio New Power - Design Guidelines

## Design Approach
**Reference-Based: Modern SaaS/Enterprise Platforms**
Drawing inspiration from Linear, Vercel, and modern productivity tools. This is a utility-focused streaming platform prioritizing functional clarity, professional aesthetics, and real-time synchronization. The design uses sophisticated neutrals with restrained blue accents for a polished, enterprise-grade appearance.

## Core Design Principles
1. **Professional Restraint**: Understated elegance over visual noise
2. **Functional Clarity**: Every element serves a purpose
3. **Generous Space**: Breathing room enhances comprehension
4. **Subtle Depth**: Elevation through shadows, not color

---

## Typography
- **Primary Font**: Inter (Google Fonts CDN)
- **Display/Headings**: Inter SemiBold (text-2xl to text-4xl)
- **Body Text**: Inter Regular (text-base to text-lg)
- **UI Labels**: Inter Medium (text-sm to text-base)
- **Micro Text**: Inter Regular (text-xs for metadata)

**Hierarchy**:
- H1: text-4xl font-semibold
- H2: text-2xl font-semibold
- H3: text-xl font-medium
- Body: text-base
- Labels: text-sm font-medium
- Captions: text-xs text-gray-500

---

## Layout System
**Spacing Primitives**: Tailwind units of **2, 4, 6, 8, 12, 16, 24**
- Micro spacing: gap-2, p-2
- Standard: p-4, p-6, gap-4
- Component padding: p-8, p-12
- Section spacing: py-16, py-24

**Container Strategy**:
- Listener view: max-w-4xl centered
- Admin dashboard: Full-width with max-w-7xl inner content
- Sidebar: w-64 fixed

---

## Color Usage (Sophisticated Neutrals + Blue Accents)

**Do NOT specify exact colors** - this is implementation detail. Instead, describe the color strategy:

**Foundation**:
- Background layers in neutral gray spectrum (light to medium tones)
- White surfaces for content cards/panels
- Very subtle borders between sections

**Accents**:
- Muted blue for primary actions (play button, go live toggle)
- Darker blue for hover states
- Avoid saturated, bright blues - prefer professional, muted tones

**Functional Colors**:
- Red for live indicators and emergency actions (desaturated, not bright)
- Gray spectrum for inactive/disabled states
- Success states use subtle green (rare usage)

**Text Hierarchy**:
- Primary text in dark gray (not pure black)
- Secondary text in medium gray
- Tertiary/metadata in light gray

---

## Component Library

### Listener Interface

**Hero Section** (min-h-[80vh]):
- Full-width background image (radio equipment, sound waves, or studio environment)
- Dark gradient overlay for text readability
- Centered station branding (logo + tagline)
- Large play/pause button with **blurred background** (backdrop-blur-md)
- Button positioned center, no hover effects on background blur
- Subtle live status badge if broadcasting
- Listener count in corner (small, unobtrusive)

**Player Controls Bar** (sticky bottom, full-width):
- Contained layout (max-w-4xl centered)
- Elevated card with subtle shadow
- Track title and artist (left-aligned)
- Play/pause, volume controls (center)
- Live indicator with pulsing dot (right)
- Clean, horizontal arrangement

**Secondary Sections** (below fold):
- Current Show/Schedule card
- About the Station section
- Contact/Social links footer

### Admin Dashboard

**Sidebar Navigation** (w-64, fixed left):
- Station logo top
- Nav items: Dashboard, Live Studio, Playlist, Analytics, Settings
- Active state with subtle blue accent
- Logout at bottom
- Minimalist icons (Heroicons via CDN)

**Live Studio Panel**:
- Large "Go Live" toggle button (prominent, cannot miss)
- Microphone level meter (horizontal bar, real-time)
- Background music volume slider with percentage
- Connected listeners count (large number)
- Emergency broadcast stop (destructive red button)
- Status cards showing stream health

**Playlist Manager**:
- Upload zone with dashed border
- Table view of tracks (title, duration, actions)
- Drag handles for reordering
- Inline edit and delete actions
- Clean, data-focused layout

**Dashboard Overview**:
- Grid of metric cards (2x2 or 3x1)
- Listening time graph (line chart, minimal styling)
- Recent activity feed

---

## Elevation & Depth

**Shadow System**:
- Cards: subtle shadow (shadow-sm)
- Elevated panels: medium shadow (shadow-md)
- Modals/overlays: pronounced shadow (shadow-lg)
- No drop-shadows on buttons (use subtle borders instead)

**Layering**:
- Background: neutral gray
- Surface: white/very light gray cards
- Interactive elements: slightly elevated from surface

---

## Images

**Hero Background Image**:
- **Type**: Professional radio studio environment, sound mixing console, or abstract sound wave visualization
- **Treatment**: Dark gradient overlay (black opacity 40-60%) for text contrast
- **Placement**: Full-width, full-height hero section
- **Content over image**: Station logo, tagline, play button with blurred background

**Station Logo**:
- Modern, minimal wordmark or abstract icon
- Placement: Hero center (200px width), sidebar top (100px width)

**Admin Dashboard**: No decorative images - focus on data and controls

---

## Key Interactions

**Transitions**: All state changes use 200-300ms easing
- Play/pause: Smooth icon morph
- Live toggle: Slide animation with color transition
- Volume sliders: Immediate visual feedback

**Loading States**: Minimal spinners, skeleton screens for content areas

**Focus States**: Blue outline (2px) on keyboard navigation

**Disabled States**: Reduced opacity (50%), no hover effects

---

## Accessibility
- WCAG AA contrast ratios minimum
- Keyboard shortcuts: Space (play/pause), M (mute)
- ARIA labels on all player controls
- Screen reader announcements for live status changes
- Focus visible on all interactive elements

---

This design creates a professional, enterprise-grade streaming platform that feels refined and purposeful. The restrained color palette and generous spacing ensure the interface never feels cluttered, while subtle depth cues guide user attention effectively.