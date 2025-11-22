import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import path from "path";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { insertAudioTrackSchema, insertUserSchema } from "@shared/schema";
import type { RadioState } from "@shared/schema";

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  }),
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only audio files are allowed."));
    }
  },
});

const connectedClients = new Set<WebSocket>();

function broadcastToClients(data: any) {
  const message = JSON.stringify(data);
  connectedClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      if (req.session) {
        req.session.userId = user.id;
      }

      res.json({ success: true, user: { id: user.id, username: user.username } });
    } catch (error) {
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
      const user = await storage.createUser({
        username: validatedData.username,
        password: hashedPassword,
      });

      res.json({ success: true, user: { id: user.id, username: user.username } });
    } catch (error) {
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ error: "Logout failed" });
        }
        res.json({ success: true });
      });
    } else {
      res.json({ success: true });
    }
  });

  app.get("/api/tracks", async (req, res) => {
    try {
      const tracks = await storage.getAllTracks();
      res.json(tracks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tracks" });
    }
  });

  app.post("/api/tracks", upload.single("audio"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { title, artist, duration } = req.body;

      const track = await storage.createTrack({
        title: title || req.file.originalname,
        artist: artist || null,
        duration: parseInt(duration) || 0,
        fileUrl: `/uploads/${req.file.filename}`,
        order: (await storage.getAllTracks()).length,
      });

      broadcastToClients({
        type: "playlist_updated",
        tracks: await storage.getAllTracks(),
      });

      res.json(track);
    } catch (error) {
      res.status(500).json({ error: "Failed to upload track" });
    }
  });

  app.delete("/api/tracks/:id", async (req, res) => {
    try {
      await storage.deleteTrack(req.params.id);
      
      broadcastToClients({
        type: "playlist_updated",
        tracks: await storage.getAllTracks(),
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete track" });
    }
  });

  app.get("/api/radio/state", async (req, res) => {
    try {
      const state = storage.getRadioState();
      res.json(state);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch radio state" });
    }
  });

  app.post("/api/radio/live", async (req, res) => {
    try {
      const { isLive, backgroundVolume } = req.body;

      storage.updateRadioState({
        isLive: isLive !== undefined ? isLive : storage.getRadioState().isLive,
        backgroundVolume: backgroundVolume !== undefined ? backgroundVolume : storage.getRadioState().backgroundVolume,
      });

      broadcastToClients({
        type: "radio_state_updated",
        state: storage.getRadioState(),
      });

      res.json(storage.getRadioState());
    } catch (error) {
      res.status(500).json({ error: "Failed to update live state" });
    }
  });

  const httpServer = createServer(app);

  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws) => {
    connectedClients.add(ws);
    
    const currentState = storage.getRadioState();
    currentState.listenerCount = connectedClients.size;
    storage.updateRadioState({ listenerCount: connectedClients.size });

    ws.send(JSON.stringify({
      type: "initial_state",
      state: currentState,
      tracks: storage.getAllTracks(),
    }));

    broadcastToClients({
      type: "listener_count_updated",
      count: connectedClients.size,
    });

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === "playback_position") {
          storage.updateRadioState({
            playbackPosition: data.position,
            currentTrackId: data.trackId,
          });
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });

    ws.on("close", () => {
      connectedClients.delete(ws);
      storage.updateRadioState({ listenerCount: connectedClients.size });
      
      broadcastToClients({
        type: "listener_count_updated",
        count: connectedClients.size,
      });
    });
  });

  let playbackInterval: NodeJS.Timeout | null = null;

  async function startPlaybackLoop() {
    if (playbackInterval) return;

    playbackInterval = setInterval(async () => {
      const state = storage.getRadioState();
      const tracks = await storage.getAllTracks();

      if (tracks.length === 0 || state.isLive) return;

      if (state.currentTrackId === null) {
        storage.updateRadioState({
          currentTrackId: tracks[0].id,
          playbackPosition: 0,
        });
        
        broadcastToClients({
          type: "track_changed",
          trackId: tracks[0].id,
          position: 0,
        });
        return;
      }

      const currentTrackIndex = tracks.findIndex(t => t.id === state.currentTrackId);
      if (currentTrackIndex === -1) return;

      const currentTrack = tracks[currentTrackIndex];
      const newPosition = state.playbackPosition + 1;

      if (newPosition >= currentTrack.duration) {
        const nextTrackIndex = (currentTrackIndex + 1) % tracks.length;
        const nextTrack = tracks[nextTrackIndex];
        
        storage.updateRadioState({
          currentTrackId: nextTrack.id,
          playbackPosition: 0,
        });

        broadcastToClients({
          type: "track_changed",
          trackId: nextTrack.id,
          position: 0,
        });
      } else {
        storage.updateRadioState({
          playbackPosition: newPosition,
        });

        broadcastToClients({
          type: "playback_sync",
          trackId: state.currentTrackId,
          position: newPosition,
        });
      }
    }, 1000);
  }

  startPlaybackLoop();

  return httpServer;
}
