# Radio New Power

## Overview

Radio New Power is a 24/7 streaming radio application with synchronized playback across all listeners. The platform features a public-facing listener interface and a comprehensive admin panel for managing broadcasts, playlists, and live streaming controls. The system maintains real-time synchronization through WebSocket connections, ensuring all listeners hear the same audio at the same position simultaneously.

**Project Status:** MVP Complete - Core features functional, ready for testing and deployment

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (November 22, 2025)

- ✅ Complete frontend implementation with beautiful design using Inter font
- ✅ Full backend with Express API, WebSocket server, audio file uploads
- ✅ Admin authentication and session management (default: admin/admin123)
- ✅ Playlist management with drag-drop upload and metadata extraction
- ✅ Live broadcasting controls (UI and state management)
- ✅ Real-time synchronization via WebSocket with drift correction
- ✅ Server-side playback loop broadcasting position updates every second
- ✅ Listener count tracking with real-time updates
- ✅ Static file serving for audio uploads via /uploads route
- ✅ Improved client-side synchronization with 0.5s drift threshold
- ✅ Periodic sync checks every 2 seconds during playback
- ✅ Animated gradients with cool-toned colors (blues, purples, cyans)
- ✅ Floating particle effects for visual ambiance
- ✅ Audio visualizer component with dynamic soundwave animations
- ✅ Glassmorphism effects throughout the design
- ✅ Full accessibility support with reduced motion preferences
- ✅ Video file upload support with automatic audio extraction (MP4, WebM, etc.)
- ✅ Live microphone streaming - admins can broadcast their voice directly to all listeners
- ✅ Real-time microphone level visualization during live broadcasts
- ✅ Browser microphone permission request when going live
- ✅ Server broadcasts microphone audio to all connected listeners

## Core Features

### Listener Experience
- **24/7 Synchronized Radio Stream**: All listeners hear the same audio at the same time
- **Real-time Track Information**: Displays current track title, artist, and album art
- **Live Indicator**: Pulsing animation when admin is broadcasting live
- **Volume Controls**: Individual volume control and mute functionality
- **Listener Count**: Real-time display of active listeners
- **Automatic Synchronization**: Periodic drift correction to maintain sync (0.5s threshold)

### Admin Dashboard
- **Secure Authentication**: Session-based login with bcrypt password hashing
- **Playlist Manager**: 
  - Drag-and-drop audio and video file upload (MP3, WAV, OGG, MP4, WebM, etc.)
  - Automatic audio extraction from video files (using FFmpeg)
  - Automatic metadata extraction (duration, title, artist)
  - Track list with delete functionality
  - File validation (50MB max file size)
- **Live Control Panel**:
  - Go Live toggle to switch between automated and live mode
  - Background music volume slider
  - Listener count display
- **Sidebar Navigation**: Easy access to Dashboard, Playlist, and Live controls

## System Architecture

### Technology Stack

**Frontend:**
- React with TypeScript
- Wouter for routing
- TanStack Query (React Query) for server state
- Tailwind CSS with shadcn/ui components
- HTML5 Audio API for playback
- WebSocket client for real-time updates

**Backend:**
- Node.js with Express.js
- TypeScript for type safety
- express-session with MemoryStore for authentication
- WebSocket server (ws library) for real-time communication
- Multer for file uploads
- music-metadata for audio file analysis

**Data Layer:**
- In-memory storage (MemStorage) for MVP
- Drizzle ORM with PostgreSQL support (configured but not required)
- Session data stored in memory

### API Endpoints

**Authentication:**
- `POST /api/auth/login` - Admin login
- `POST /api/auth/register` - Create new admin user
- `POST /api/auth/logout` - End session

**Playlist Management:**
- `GET /api/tracks` - Get all tracks
- `POST /api/tracks` - Upload new track (multipart/form-data)
- `DELETE /api/tracks/:id` - Delete track and audio file

**Radio State:**
- `GET /api/radio/state` - Get current radio state
- `POST /api/radio/live` - Update live broadcasting state

**Static Files:**
- `/uploads/*` - Serve uploaded audio files

### WebSocket Communication

**Endpoint:** `/ws`

**Messages from Server:**
- `initial_state` - Sent on connection with current state and playlist
- `radio_state_updated` - Broadcasts when playback state changes
- `playlist_updated` - Sent when tracks are added/removed
- `listener_count_updated` - Updates active listener count
- `track_changed` - Broadcast when track changes (includes trackId and position)
- `playback_sync` - Sent every second with current playback position

**Messages from Client:**
- `playback_position` - (Optional) Client reports current playback position

### Playback Synchronization

**Server-Side:**
- Maintains authoritative playback clock
- Increments playback position every second
- Automatically switches tracks when current track ends
- Broadcasts position updates to all connected clients
- Tracks listener count via WebSocket connections

**Client-Side:**
- Connects to WebSocket on page load
- Receives initial state with current track and position
- Starts playback at server-specified position
- Periodic drift correction every 2 seconds
- Resyncs when drift exceeds 0.5 seconds
- Automatic track switching when server changes track

### File Storage

**Audio Files:**
- Stored in `/uploads` directory
- Filename format: `{timestamp}-{random}.{ext}`
- Validated file types: 
  - Audio: audio/mpeg, audio/mp3, audio/wav, audio/ogg, audio/aac, audio/flac
  - Video: video/mp4, video/webm, video/quicktime, video/x-msvideo, video/mpeg
- Video files are automatically converted to MP3 audio format
- Maximum file size: 50MB
- Metadata extracted on upload (duration, title, artist)
- Files deleted from disk when track is removed from playlist

## Default Credentials

**Admin Account:**
- Username: `admin`
- Password: `admin123`
- Created automatically on first server start

## Environment Variables

- `SESSION_SECRET` - Secret key for session encryption (defaults to dev key)
- `PORT` - Server port (defaults to 5000)
- `NODE_ENV` - Environment mode (development/production)

## Routes

**Public:**
- `/` - Listener page (main radio interface)

**Admin (Protected):**
- `/admin` or `/admin/login` - Admin login page
- `/admin/dashboard` - Dashboard overview
- `/admin/playlist` - Playlist management
- `/admin/live` - Live broadcasting controls

## Known Limitations (MVP)

1. **Storage**: Currently using in-memory storage. Data is lost on server restart. For production, configure PostgreSQL via `DATABASE_URL` environment variable.

2. **Scalability**: In-memory session storage and single-server WebSocket design are suitable for small audiences. Larger deployments would benefit from Redis for sessions and a pub/sub system for WebSocket scaling.

3. **Audio Format Support**: Limited to browser-supported formats (MP3, WAV, OGG). Consider adding transcoding for broader format support.

4. **Mobile Playback**: Some mobile browsers may require user interaction before playing audio. Auto-play policies vary by platform.

## Design Guidelines

The application follows modern radio streaming platform design patterns inspired by Spotify, Apple Music, and SoundCloud:

- **Typography**: Inter font family throughout
- **Color Scheme**: Customizable via Tailwind config (primary, accent, muted tones)
- **Theme Support**: Light and dark mode with theme toggle
- **Layout**: 
  - Listener page: Full-screen hero design with gradient background
  - Admin pages: Sidebar navigation with clean, spacious layout
- **Components**: shadcn/ui component library for consistent, accessible UI
- **Icons**: Lucide React icons for clear visual communication

## Development

**Start Development Server:**
```bash
npm run dev
```

**Build for Production:**
```bash
npm run build
npm start
```

**Workflow:**
- The "Start application" workflow runs `npm run dev`
- Automatically restarts on code changes
- Frontend served via Vite dev server
- Backend runs on Express with hot reload via tsx

## Deployment Readiness

✅ **Ready for MVP Deployment:**
- Core functionality tested and working
- Authentication implemented and secure
- Real-time synchronization functional
- File upload and management operational
- Responsive design for mobile and desktop
- Error handling in place

**Pre-Deployment Checklist:**
1. Set `SESSION_SECRET` environment variable to a secure random string
2. Consider setting up PostgreSQL for persistent storage
3. Review file upload limits based on expected usage
4. Test on target deployment platform
5. Configure HTTPS for production (WebSocket requires secure connection in production)

## Future Enhancements

**Priority Features:**
- Real live microphone streaming via WebRTC
- Persistent database storage (PostgreSQL)
- Track scheduling and playlists
- User accounts and favorites
- Chat functionality for listeners
- Audio transcoding for broader format support
- CDN integration for audio delivery
- Analytics and listening statistics

**Infrastructure Improvements:**
- Redis for session storage
- Pub/sub system for multi-server WebSocket synchronization
- Load balancing for horizontal scaling
- Automated backups for audio files and database
- CI/CD pipeline for automated deployments
