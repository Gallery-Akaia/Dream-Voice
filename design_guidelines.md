# Radio New Power - Design Guidelines

## Design Approach
**Reference-Based with System Foundation**
Drawing inspiration from modern streaming platforms (Spotify, Apple Music, SoundCloud) while prioritizing functional clarity. This is a utility-focused application where real-time synchronization and admin controls are paramount.

## Core Design Principles
1. **Instant Recognition**: Users should immediately understand the player state (playing/paused/live)
2. **Minimal Friction**: One-click to start listening
3. **Admin Power**: Clear, accessible controls for broadcasting
4. **Visual Feedback**: Real-time indicators for live status and synchronization

---

## Typography
- **Primary Font**: Inter (Google Fonts) - clean, modern, excellent readability
- **Display/Headings**: Inter Bold (text-3xl to text-5xl)
- **Body Text**: Inter Regular (text-base to text-lg)
- **UI Labels**: Inter Medium (text-sm)
- **Accent/Live Indicators**: Inter SemiBold

---

## Layout System
**Spacing Primitives**: Use Tailwind units of **2, 4, 6, 8, 12, 16, 20**
- Tight spacing: p-2, gap-2
- Standard: p-4, p-6, gap-4
- Generous: p-8, p-12, gap-8
- Section spacing: py-16, py-20

**Grid Strategy**:
- Listener view: Single-column centered (max-w-2xl)
- Admin panel: Two-column split (sidebar + main content)

---

## Component Library

### Listener Interface
**Hero Section** (h-screen or min-h-[600px]):
- Full-width background with subtle gradient overlay
- Centered station branding and tagline
- Large, prominent play/pause button (min-w-[120px])
- Station logo/icon centered above controls

**Player Controls** (sticky bottom or centered):
- Large circular play/pause toggle button
- Volume slider with icon indicators
- Current track/show title display
- Live indicator badge (pulsing animation when active)
- Listener count display
- Waveform visualization or audio bars (subtle, non-distracting)

**Status Indicators**:
- "LIVE" badge: Pulsing red dot with text
- "Automated Playback" badge: Static gray indicator
- Connection status: Small icon in corner

### Admin Dashboard
**Navigation Sidebar** (w-64):
- Station branding at top
- Primary sections: Dashboard, Playlist Manager, Live Controls, Analytics
- Logout button at bottom
- Current admin status indicator

**Live Control Panel**:
- Prominent "Go Live" toggle button (large, cannot be missed)
- Microphone input level meter
- Background music volume slider (0-100% with live preview)
- Live stream status (connected listeners count)
- Emergency stop button (destructive styling)
- Audio preview monitor

**Playlist Manager**:
- Drag-and-drop audio file upload zone
- Table/grid view of uploaded tracks
- Track details: title, duration, artist
- Reorder controls
- Delete/edit actions
- Play queue preview

---

## Visual Hierarchy
1. **Primary Action**: Play/pause button (listener) or Go Live (admin)
2. **Secondary Info**: Track title, live status, listener count
3. **Tertiary Controls**: Volume, settings, navigation
4. **Background Elements**: Waveforms, gradients, subtle patterns

---

## Interactive States
- **Buttons**: Subtle scale on hover (scale-105), pressed state (scale-95)
- **Sliders**: Highlight thumb on interaction
- **Live Toggle**: Smooth transition between states (300ms)
- **Status Changes**: Fade transitions for indicators (200ms)

---

## Images
**Hero Background**: Abstract sound wave visualization or radio tower silhouette with gradient overlay (dark to transparent). Image should evoke energy and connectivity.
- Placement: Full-width hero section
- Treatment: Blur overlay for button readability

**Station Logo**: Bold, modern wordmark or icon representing "Radio New Power"
- Placement: Centered in hero, top-left in admin sidebar
- Size: 200px width in hero, 120px in sidebar

No additional decorative images needed - focus on functional UI clarity.

---

## Key Interactions
- **Listener Join**: Immediate audio sync, no buffering UI unless necessary
- **Admin Goes Live**: Visual transition across all connected clients (LIVE badge appears)
- **Volume Adjustments**: Real-time, no lag in response
- **Connection Loss**: Clear error state with retry mechanism

---

## Accessibility
- High contrast for all status indicators
- Keyboard shortcuts for play/pause (spacebar)
- Screen reader announcements for live status changes
- Focus indicators on all interactive elements
- ARIA labels for player controls

---

This design prioritizes functionality and clarity while maintaining a modern, professional aesthetic appropriate for a radio streaming platform.