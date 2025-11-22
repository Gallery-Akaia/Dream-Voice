# Radio New Power - Design Guidelines (Dynamic Edition)

## Design Approach
**Hybrid: Modern SaaS + Dynamic Media Platform**
Merging Linear's professional restraint with Spotify/Apple Music's dynamic visual language. This is a premium streaming platform that balances functional clarity with captivating motion design. Cool-toned gradients (blues, purples, cyans) create depth without overwhelming, while glassmorphism and subtle particles add premium polish.

## Core Design Principles
1. **Dynamic Sophistication**: Motion serves purpose, not decoration
2. **Layered Depth**: Glassmorphism creates floating, ethereal interfaces
3. **Ambient Energy**: Subtle particles and gradients suggest constant activity
4. **Professional Legibility**: Animations never compromise readability

---

## Typography
- **Primary Font**: Inter (Google Fonts CDN)
- **Display**: Inter SemiBold (text-3xl to text-5xl)
- **Body**: Inter Regular (text-base to text-lg)
- **UI Labels**: Inter Medium (text-sm)
- **Metadata**: Inter Regular (text-xs)

**Hierarchy**:
- H1: text-5xl font-semibold tracking-tight
- H2: text-3xl font-semibold
- H3: text-xl font-medium
- Body: text-base leading-relaxed
- Labels: text-sm font-medium uppercase tracking-wide

---

## Layout System
**Spacing Primitives**: Tailwind units of **2, 4, 6, 8, 12, 16, 24**
- Micro: gap-2, p-2
- Standard: p-6, gap-4
- Cards: p-8
- Sections: py-16, py-24

**Container Strategy**:
- Listener: max-w-6xl centered
- Admin: Full-width with max-w-7xl content
- Sidebar: w-72 fixed

---

## Color Strategy (Cool-Toned Dynamics)

**Foundation**:
- Dark base layers with subtle gradient shifts (deep navy to charcoal)
- Glassmorphic surfaces with semi-transparent backgrounds
- Multi-layered gradients transitioning between blues, purples, and cyans

**Accents**:
- Cyan for primary actions and live indicators
- Purple for secondary emphasis and hover states
- Blue for interactive elements
- Gradients combine all three in diagonal or radial patterns

**Glassmorphism Treatment**:
- Semi-transparent backgrounds (15-25% opacity)
- Backdrop blur on all floating panels
- Subtle borders with gradient strokes
- Inner glow effects on elevated surfaces

**Text on Dynamic Backgrounds**:
- White primary text with subtle glow/shadow for readability
- Light cyan/blue for secondary text
- Ensure contrast even over animated gradients

---

## Component Library

### Listener Interface

**Hero Section** (min-h-screen):
- Animated gradient background (diagonal sweep blues→purples→cyans)
- Floating particles (20-30 small dots drifting slowly)
- Real-time audio visualizer bars (bottom third, subtle, responsive to music)
- Centered station logo with subtle glow
- Large play button with glassmorphic background (backdrop-blur-xl, semi-transparent)
- Button background does NOT animate on hover
- Pulsing live indicator (cyan glow)
- Listener count in corner with glass panel

**Floating Player Bar** (sticky bottom):
- Full-width glassmorphic panel with blur
- Elevated above content with pronounced shadow
- Mini audio visualizer (left side, compact bars)
- Track info with marquee scroll for long titles
- Control buttons with glow on active state
- Volume with animated fill gradient
- Live pulse indicator (right)

**Content Sections** (below hero):
- Current Show card with glass effect and gradient border
- Schedule grid with animated gradient on hover
- About section with parallax subtle background shift
- Social links footer with icon glow effects

### Admin Dashboard

**Animated Sidebar** (w-72, gradient background):
- Logo with subtle rotation on hover
- Navigation items with sliding gradient underline on active
- Icons from Heroicons with scale animation on hover
- Live status indicator at top (pulsing)
- Gradient fade at bottom

**Live Studio Command Center**:
- Large "GO LIVE" toggle with dramatic gradient shift and glow
- Real-time waveform visualizer (large, center panel)
- Microphone input meter with animated gradient fill
- Background music controls with glassmorphic sliders
- Connected listeners (huge number with counting animation)
- Emergency stop button (red glow, pulsing border)
- Stream health cards with subtle breathing animation

**Playlist Manager**:
- Glassmorphic upload zone with animated dashed border
- Table with alternating row subtle gradients
- Drag handles with glow on interaction
- Waveform preview thumbnails for each track
- Delete/edit buttons with gradient backgrounds

**Dashboard Analytics**:
- Grid of glass cards (3 columns)
- Animated line charts with gradient fills
- Real-time listener map (if applicable) with glowing points
- Activity feed with sliding entrance animations

---

## Animations & Effects

**Continuous Animations**:
- Background gradient: 15-second diagonal shift (blues→purples→cyans)
- Particles: Slow upward drift with random X movement
- Live indicator: 2-second pulse cycle (scale + glow)
- Audio visualizer: Respond to frequency data in real-time

**Interaction Animations** (200-300ms):
- Button press: Scale down (0.95) + glow increase
- Toggle switches: Slide with gradient color morph
- Card hover: Lift (translateY -4px) + glow intensify
- Modal entry: Scale up from 0.9 with fade-in

**Loading States**:
- Skeleton screens with animated gradient shimmer
- Spinner with rotating gradient border

**Scroll Animations**:
- Parallax: Background gradients shift slower than content
- Fade-in sections: Content cards appear with subtle slide-up

---

## Images

**Hero Background**:
- **Type**: Abstract sound wave visualization, DJ equipment in dark studio, or cosmic/space theme with particle effects
- **Treatment**: Semi-transparent gradient overlay (dark to transparent) to blend with animated gradient
- **Placement**: Full-screen background, fixed position
- **Alternative**: Skip image entirely and rely on pure animated gradient background for cleaner effect

**Station Logo**:
- Modern wordmark or geometric icon
- Subtle glow effect applied
- Hero: 240px width, Sidebar: 120px width

**Track Thumbnails** (Playlist Manager):
- 80px square waveform visualizations or album art placeholders
- Glassmorphic border treatment

---

## Glassmorphism Implementation

**Standard Glass Panel**:
- Semi-transparent background (white/blue at 15% opacity)
- Backdrop blur (blur-xl or blur-2xl)
- 1px gradient border (light cyan to purple)
- Subtle inner shadow for depth

**Elevated Glass (Modals, Player Bar)**:
- Increased background opacity (20-25%)
- Stronger blur (blur-3xl)
- Pronounced shadow beneath
- Optional outer glow (cyan/purple)

---

## Accessibility
- Maintain WCAG AA contrast on all text over animated backgrounds
- Reduce motion preference: Disable gradient animations, particles, and visualizers
- Keyboard focus: Cyan glow outline (3px)
- Screen reader announcements for live status, track changes
- All animations respect prefers-reduced-motion media query

---

This design creates a premium, dynamic streaming experience that feels alive and engaging while maintaining professional clarity. The cool-toned palette and glassmorphic depth create modern sophistication, while subtle animations suggest constant energy without overwhelming users.