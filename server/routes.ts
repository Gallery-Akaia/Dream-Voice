import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import path from "path";
import bcrypt from "bcrypt";
import { parseFile } from "music-metadata";
import { execSync } from "child_process";
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
    const allowedAudioTypes = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/aac", "audio/flac"];
    const allowedVideoTypes = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo", "video/mpeg"];
    const allowedTypes = [...allowedAudioTypes, ...allowedVideoTypes];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Audio or video files are allowed."));
    }
  },
});

const connectedClients = new Set<WebSocket>();
let microphoneAudioBuffer: number[] = [];
let microphoneBufferTimeout: NodeJS.Timeout | null = null;

function broadcastMicrophoneAudio(data: number[]) {
  // Add to buffer
  microphoneAudioBuffer.push(...data);
  
  // Clear existing timeout
  if (microphoneBufferTimeout) {
    clearTimeout(microphoneBufferTimeout);
  }
  
  // Schedule broadcast after 100ms to batch chunks
  microphoneBufferTimeout = setTimeout(() => {
    if (microphoneAudioBuffer.length > 0) {
      broadcastToClients({
        type: "microphone_audio",
        data: microphoneAudioBuffer,
      });
      microphoneAudioBuffer = [];
    }
    microphoneBufferTimeout = null;
  }, 100);
}

function broadcastToClients(data: any) {
  const message = JSON.stringify(data);
  connectedClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  const existingAdmin = await storage.getUserByUsername("admin");
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    await storage.createUser({
      username: "admin",
      password: hashedPassword,
    });
    console.log("Default admin user created (username: admin, password: admin123)");
  }

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

      const fs = await import("fs/promises");
      let audioFilePath = req.file.path;
      let audioFilename = req.file.filename;
      let isVideo = req.file.mimetype.startsWith("video/");

      // If it's a video, extract audio
      if (isVideo) {
        try {
          const audioFilenameWithoutExt = audioFilename.replace(/\.[^/.]+$/, "");
          const newAudioFilename = audioFilenameWithoutExt + ".mp3";
          const newAudioPath = path.join(process.cwd(), "uploads", newAudioFilename);

          // Use FFmpeg to extract audio (q:a 5 = good quality, fast conversion)
          execSync(`ffmpeg -i "${audioFilePath}" -q:a 5 -map a "${newAudioPath}" -y -loglevel quiet`);

          // Delete the original video file
          await fs.unlink(audioFilePath);

          // Update paths to the new audio file
          audioFilePath = newAudioPath;
          audioFilename = newAudioFilename;
        } catch (ffmpegError) {
          console.error("Failed to extract audio from video:", ffmpegError);
          await fs.unlink(req.file.path).catch(() => {});
          return res.status(400).json({ error: "Failed to extract audio from video. Please try a different file." });
        }
      }

      let metadata;
      let duration = 0;
      let title = req.body.title || req.file.originalname.replace(/\.[^/.]+$/, "");
      let artist = req.body.artist || null;

      try {
        metadata = await parseFile(audioFilePath);
        if (metadata.format.duration) {
          duration = Math.floor(metadata.format.duration);
        }
        if (metadata.common.title) {
          title = metadata.common.title;
        }
        if (metadata.common.artist) {
          artist = metadata.common.artist;
        }
      } catch (metadataError) {
        console.error("Failed to extract metadata:", metadataError);
        duration = parseInt(req.body.duration) || 180;
      }

      if (duration === 0) {
        await fs.unlink(audioFilePath);
        return res.status(400).json({ error: "Invalid audio file: duration cannot be determined" });
      }

      const trackData = insertAudioTrackSchema.parse({
        title,
        artist,
        duration,
        fileUrl: `/uploads/${audioFilename}`,
        order: (await storage.getAllTracks()).length,
      });

      const track = await storage.createTrack(trackData);

      broadcastToClients({
        type: "playlist_updated",
        tracks: await storage.getAllTracks(),
      });

      res.json(track);
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Failed to upload track" });
    }
  });

  app.delete("/api/tracks/:id", async (req, res) => {
    try {
      const track = await storage.getTrack(req.params.id);
      if (track) {
        const fs = await import("fs/promises");
        const fileName = track.fileUrl.replace("/uploads/", "");
        const filePath = path.join(process.cwd(), "uploads", fileName);
        try {
          await fs.unlink(filePath);
        } catch (fileError) {
          console.error("Failed to delete file:", fileError);
        }
      }
      
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

  app.get("/api/analytics", async (req, res) => {
    try {
      const analytics = storage.getListenerAnalytics(60);
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch analytics" });
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

  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: "/ws"
  });

  wss.on("connection", async (ws) => {
    connectedClients.add(ws);
    
    const currentState = storage.getRadioState();
    currentState.listenerCount = connectedClients.size;
    storage.updateRadioState({ listenerCount: connectedClients.size });
    storage.recordListenerAnalytics(connectedClients.size);

    const tracks = await storage.getAllTracks();
    ws.send(JSON.stringify({
      type: "initial_state",
      state: currentState,
      tracks: tracks,
    }));

    broadcastToClients({
      type: "listener_count_updated",
      count: connectedClients.size,
    });

    ws.on("message", (message) => {
      try {
        const messageStr = message.toString();
        const data = JSON.parse(messageStr);
        
        if (data.type === "playback_position") {
          storage.updateRadioState({
            playbackPosition: data.position,
            currentTrackId: data.trackId,
          });
        } else if (data.type === "chat_message") {
          const chatMessage = {
            id: Math.random().toString(),
            username: data.username || "Anonymous",
            text: data.text,
            timestamp: Date.now(),
          };
          storage.addChatMessage(chatMessage);
          broadcastToClients({
            type: "chat_message",
            username: chatMessage.username,
            text: chatMessage.text,
          });
        } else if (data.type === "microphone_audio") {
          // Buffer and batch microphone audio before broadcasting
          broadcastMicrophoneAudio(data.data);
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

      storage.recordListenerAnalytics(connectedClients.size);

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
