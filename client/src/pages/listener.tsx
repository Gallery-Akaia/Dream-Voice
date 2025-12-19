import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { LiveIndicator } from "@/components/live-indicator";
import { ThemeToggle } from "@/components/theme-toggle";
import { ChatWidget } from "@/components/chat-widget";
import { AnimatedBackground } from "@/components/animated-background";
import { FloatingParticles } from "@/components/floating-particles";
import { AudioVisualizer } from "@/components/audio-visualizer";
import { Play, Pause, Volume2, VolumeX, Radio, Users, MessageCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useWebSocket } from "@/hooks/use-websocket";
import { motion, useReducedMotion } from "framer-motion";
import type { ChatMessage } from "@shared/schema";

export default function ListenerPage() {
  const { radioState, tracks, isConnected, ws } = useWebSocket();
  const shouldReduceMotion = useReducedMotion();
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState([75]);
  const [isMuted, setIsMuted] = useState(false);
  const [username, setUsername] = useState("");
  const [usernameEntered, setUsernameEntered] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [streamConfig, setStreamConfig] = useState({ streamUrl: "", isEnabled: false });
  const [streamConnected, setStreamConnected] = useState(false);
  const [streamError, setStreamError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const liveStreamRef = useRef<HTMLAudioElement | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const micAudioContextRef = useRef<AudioContext | null>(null);
  const micGainNodeRef = useRef<GainNode | null>(null);
  const micNextStartTimeRef = useRef(0);
  const playMicrophoneAudioRef = useRef<((data: ArrayBuffer) => void) | null>(null);
  const lastTrackIdRef = useRef<string | null>(null);
  const currentTrackUrlRef = useRef<string | null>(null);
  const serverPositionRef = useRef<number>(0);

  const resolveTrackUrl = useCallback((url: string): string => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    return new URL(url, window.location.origin).href;
  }, []);

  const readyTracks = tracks.filter(t => t.uploadStatus === "ready" || !t.uploadStatus);
  const currentTrack = readyTracks.find((t) => t.id === radioState.currentTrackId);

  const initMicAudioContext = useCallback(async () => {
    if (!micAudioContextRef.current) {
      micAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      micGainNodeRef.current = micAudioContextRef.current.createGain();
      micGainNodeRef.current.connect(micAudioContextRef.current.destination);
      
      const volumeLevel = isMuted ? 0 : volume[0] / 100;
      micGainNodeRef.current.gain.value = volumeLevel;
      
      micNextStartTimeRef.current = 0;
    }
    
    if (micAudioContextRef.current.state === 'suspended') {
      await micAudioContextRef.current.resume();
    }
  }, [isMuted, volume]);

  const playMicrophoneAudio = useCallback((arrayBuffer: ArrayBuffer) => {
    try {
      if (arrayBuffer.byteLength < 8) {
        return;
      }
      
      const dataView = new DataView(arrayBuffer);
      const sampleRate = dataView.getUint32(0, true);
      const pcmByteLength = dataView.getUint32(4, true);
      
      if (arrayBuffer.byteLength < 8 + pcmByteLength || sampleRate < 8000 || sampleRate > 96000) {
        return;
      }
      
      const pcmSlice = arrayBuffer.slice(8, 8 + pcmByteLength);
      const pcmData = new Float32Array(pcmSlice);
      
      if (!micAudioContextRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        micAudioContextRef.current = new AudioContextClass();
        micGainNodeRef.current = micAudioContextRef.current.createGain();
        micGainNodeRef.current.connect(micAudioContextRef.current.destination);
        
        const volumeLevel = isMuted ? 0 : volume[0] / 100;
        micGainNodeRef.current.gain.value = volumeLevel;
        micNextStartTimeRef.current = 0;
      }
      
      const audioContext = micAudioContextRef.current;
      
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      
      if (!micGainNodeRef.current) {
        return;
      }

      const audioBuffer = audioContext.createBuffer(1, pcmData.length, sampleRate);
      audioBuffer.getChannelData(0).set(pcmData);
      
      const currentTime = audioContext.currentTime;
      
      if (micNextStartTimeRef.current < currentTime - 0.3) {
        micNextStartTimeRef.current = currentTime + 0.05;
      }
      
      const startTime = Math.max(currentTime + 0.02, micNextStartTimeRef.current);
      
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(micGainNodeRef.current);
      source.start(startTime);
      
      micNextStartTimeRef.current = startTime + audioBuffer.duration;
    } catch (error) {
      console.error("Microphone audio playback error:", error);
    }
  }, [isMuted, volume]);

  // Store the callback in ref so WebSocket handler can always access latest version
  useEffect(() => {
    playMicrophoneAudioRef.current = playMicrophoneAudio;
  }, [playMicrophoneAudio]);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = "auto";
    }

    const audio = audioRef.current;
    
    const handleAudioError = (e: Event) => {
      const mediaError = (e.target as HTMLAudioElement).error;
      console.error("Audio element error:", {
        code: mediaError?.code,
        message: mediaError?.message,
        src: audio.src,
      });
    };

    audio.addEventListener("error", handleAudioError);

    // Setup live stream audio element for low-latency streaming
    if (!liveStreamRef.current) {
      liveStreamRef.current = new Audio();
      liveStreamRef.current.preload = "none";
      liveStreamRef.current.crossOrigin = "anonymous";
      
      const handleStreamCanPlay = () => {
        setStreamConnected(true);
        setStreamError(false);
      };
      
      const handleStreamError = (e: Event) => {
        const mediaError = (e.target as HTMLAudioElement).error;
        console.error("Live stream error:", {
          code: mediaError?.code,
          message: mediaError?.message,
          src: liveStreamRef.current?.src,
        });
        setStreamConnected(false);
        setStreamError(true);
      };

      liveStreamRef.current.addEventListener("canplay", handleStreamCanPlay);
      liveStreamRef.current.addEventListener("error", handleStreamError);
      liveStreamRef.current.addEventListener("stalled", () => {
        console.warn("Stream stalled - checking connection");
      });

      return () => {
        if (liveStreamRef.current) {
          liveStreamRef.current.removeEventListener("canplay", handleStreamCanPlay);
          liveStreamRef.current.removeEventListener("error", handleStreamError);
        }
        audio.removeEventListener("error", handleAudioError);
        if (syncIntervalRef.current) {
          clearInterval(syncIntervalRef.current);
        }
        if (micAudioContextRef.current) {
          micAudioContextRef.current.close();
        }
      };
    }

    return () => {
      audio.removeEventListener("error", handleAudioError);
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
      if (micAudioContextRef.current) {
        micAudioContextRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (!ws) return;

    const handleMessage = async (event: MessageEvent) => {
      try {
        let arrayBuffer: ArrayBuffer | null = null;
        
        if (event.data instanceof Blob) {
          arrayBuffer = await event.data.arrayBuffer();
        } else if (event.data instanceof ArrayBuffer) {
          arrayBuffer = event.data;
        }
        
        if (arrayBuffer && arrayBuffer.byteLength >= 8) {
          if (playMicrophoneAudioRef.current) {
            playMicrophoneAudioRef.current(arrayBuffer);
          }
          return;
        }
        
        if (typeof event.data === 'string') {
          const data = JSON.parse(event.data);
          if (data.type === "initial_state" && data.streamConfig) {
            setStreamConfig(data.streamConfig);
          } else if (data.type === "stream_config_updated" && data.config) {
            setStreamConfig(data.config);
          } else if (data.type === "chat_message") {
            const newMessage: ChatMessage = {
              id: Math.random().toString(),
              username: data.username,
              text: data.text,
              timestamp: Date.now(),
            };
            setChatMessages(prev => [...prev.slice(-49), newMessage]);
            setUnreadCount(prev => prev + 1);
          }
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    };

    ws.addEventListener("message", handleMessage);
    return () => ws.removeEventListener("message", handleMessage);
  }, [ws]);

  useEffect(() => {
    if (!audioRef.current || !currentTrack || !isPlaying) {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
      if (audioRef.current && !isPlaying) {
        audioRef.current.pause();
      }
      return;
    }

    const audio = audioRef.current;
    const resolvedUrl = resolveTrackUrl(currentTrack.fileUrl);

    if (currentTrackUrlRef.current !== resolvedUrl) {
      currentTrackUrlRef.current = resolvedUrl;
      audio.src = resolvedUrl;
      audio.currentTime = radioState.playbackPosition;
      audio.play().catch((error) => {
        console.error("Audio playback error:", error?.name, error?.message, resolvedUrl);
        setIsPlaying(false);
      });
    } else if (audio.paused) {
      audio.play().catch((error) => {
        console.error("Audio resume error:", error?.name, error?.message);
        setIsPlaying(false);
      });
    }

    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
    }

    syncIntervalRef.current = setInterval(() => {
      if (!audio.paused && currentTrack) {
        const serverPosition = serverPositionRef.current;
        const clientPosition = audio.currentTime;
        const drift = Math.abs(serverPosition - clientPosition);

        if (drift > 2) {
          audio.currentTime = serverPosition;
        }
      }
    }, 3000);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [isPlaying, currentTrack, radioState.currentTrackId, resolveTrackUrl]);

  useEffect(() => {
    serverPositionRef.current = radioState.playbackPosition;
  }, [radioState.playbackPosition]);

  useEffect(() => {
    if (!isConnected) {
      setIsPlaying(false);
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    }
  }, [isConnected]);

  useEffect(() => {
    if (!audioRef.current) return;
    const volumeLevel = isMuted ? 0 : volume[0] / 100;
    audioRef.current.volume = volumeLevel;
    if (liveStreamRef.current) {
      liveStreamRef.current.volume = volumeLevel;
    }
  }, [isMuted, volume]);

  useEffect(() => {
    if (!audioRef.current || !currentTrack) return;
    
    if (lastTrackIdRef.current !== currentTrack.id) {
      lastTrackIdRef.current = currentTrack.id;
      const resolvedUrl = resolveTrackUrl(currentTrack.fileUrl);
      currentTrackUrlRef.current = resolvedUrl;
      audioRef.current.src = resolvedUrl;
      audioRef.current.currentTime = radioState.playbackPosition;
      
      if (isPlaying) {
        audioRef.current.play().catch((error) => {
          console.error("Track change play error:", error?.name, error?.message, resolvedUrl);
        });
      }
    }
  }, [currentTrack, isPlaying, resolveTrackUrl]);

  // Auto-play live stream when it becomes available
  useEffect(() => {
    if (streamConfig.isEnabled && streamConfig.streamUrl && !isPlaying && liveStreamRef.current) {
      liveStreamRef.current.src = streamConfig.streamUrl;
      liveStreamRef.current.play().catch(err => {
        console.error("Auto-play live stream failed:", err);
        setStreamError(true);
      });
      setIsPlaying(true);
    } else if (!streamConfig.isEnabled && liveStreamRef.current && isPlaying) {
      // Stop playing if stream is disabled
      liveStreamRef.current.pause();
      setIsPlaying(false);
    }
  }, [streamConfig.isEnabled, streamConfig.streamUrl]);

  useEffect(() => {
    if (!micGainNodeRef.current) return;
    const volumeLevel = isMuted ? 0 : volume[0] / 100;
    micGainNodeRef.current.gain.value = volumeLevel;
  }, [isMuted, volume]);

  useEffect(() => {
    if (radioState.isLive) {
      micNextStartTimeRef.current = 0;
      console.log("Admin went live - reset microphone scheduling");
    }
  }, [radioState.isLive]);

  const togglePlay = () => {
    // If live stream is enabled and available, play that instead
    if (streamConfig.isEnabled && streamConfig.streamUrl && liveStreamRef.current) {
      if (isPlaying) {
        liveStreamRef.current.pause();
      } else {
        if (!liveStreamRef.current.src || liveStreamRef.current.src !== streamConfig.streamUrl) {
          liveStreamRef.current.src = streamConfig.streamUrl;
        }
        liveStreamRef.current.play().catch(err => {
          console.error("Live stream play error:", err);
          setStreamError(true);
        });
      }
      setIsPlaying(!isPlaying);
      return;
    }

    // Fall back to playlist playback
    if (!audioRef.current || !currentTrack) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      const resolvedUrl = resolveTrackUrl(currentTrack.fileUrl);
      if (!audioRef.current.src || audioRef.current.src === "" || currentTrackUrlRef.current !== resolvedUrl) {
        currentTrackUrlRef.current = resolvedUrl;
        audioRef.current.src = resolvedUrl;
        audioRef.current.currentTime = radioState.playbackPosition;
      }
      audioRef.current.play().catch(err => console.error("Play error:", err));
    }
    
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleSendChat = (text: string) => {
    if (!ws || !usernameEntered) return;
    
    ws.send(JSON.stringify({
      type: "chat_message",
      username: username,
      text: text,
    }));
  };

  const handleSetUsername = () => {
    if (username.trim()) {
      initMicAudioContext();
      setUsernameEntered(true);
    }
  };

  const handleChatOpen = () => {
    setIsChatOpen(true);
    setUnreadCount(0);
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <AnimatedBackground />
      <FloatingParticles />
      
      <div className="absolute top-4 right-4 z-50 flex gap-2">
        {!usernameEntered && (
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Your name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSetUsername()}
              className="h-9 bg-card/90 backdrop-blur-md"
              data-testid="input-username"
            />
            <Button size="sm" onClick={handleSetUsername} data-testid="button-set-username">
              Enter
            </Button>
          </div>
        )}
        <ThemeToggle />
      </div>

      {usernameEntered && (
        <Button
          variant="outline"
          size="sm"
          className="absolute top-4 left-4 z-50 bg-card/90 backdrop-blur-md"
          onClick={handleChatOpen}
          data-testid="button-open-chat"
        >
          <MessageCircle className="w-4 h-4 mr-1" />
          {unreadCount > 0 && <span className="ml-1 bg-destructive text-destructive-foreground rounded-full px-2 text-xs">{unreadCount}</span>}
        </Button>
      )}

      <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12 relative z-10">
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.6 }}
          className="w-full max-w-4xl mx-auto space-y-12"
        >
          <div className="text-center space-y-8">
            <motion.div
              className="inline-flex items-center justify-center w-32 h-32 rounded-full mb-4 relative"
              style={{
                background: "linear-gradient(135deg, hsla(195, 100%, 50%, 0.3), hsla(270, 60%, 65%, 0.3))",
                backdropFilter: "blur(20px)",
                boxShadow: "0 0 60px hsla(195, 100%, 50%, 0.3)",
              }}
              animate={shouldReduceMotion ? {} : {
                boxShadow: [
                  "0 0 60px hsla(195, 100%, 50%, 0.3)",
                  "0 0 80px hsla(270, 60%, 65%, 0.4)",
                  "0 0 60px hsla(195, 100%, 50%, 0.3)",
                ],
              }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <Radio className="w-16 h-16 text-foreground drop-shadow-lg" />
            </motion.div>
            
            <div className="space-y-3">
              <h1 
                className="text-6xl font-semibold tracking-tight drop-shadow-lg" 
                style={{ color: "rgba(255, 255, 255, 0.95)", textShadow: "0 2px 20px rgba(0, 0, 0, 0.5), 0 0 40px rgba(59, 130, 246, 0.3)" }}
                data-testid="text-station-name"
              >
                RADIO DREAM VOICE
              </h1>
              <p 
                className="text-xl" 
                style={{ color: "rgba(255, 255, 255, 0.8)", textShadow: "0 1px 10px rgba(0, 0, 0, 0.5)" }}
              >
                Your 24/7 streaming radio station
              </p>
            </div>

            <AudioVisualizer isPlaying={isPlaying} shouldReduceMotion={shouldReduceMotion || false} />
          </div>

          <Card
            className="p-10 space-y-8 relative overflow-hidden border-white/20 bg-card/80 backdrop-blur-xl shadow-2xl"
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <LiveIndicator isLive={radioState.isLive} />
              <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="text-listener-count">
                <Users className="w-4 h-4" />
                <span>{radioState.listenerCount} listeners</span>
              </div>
            </div>

            <div className="text-center space-y-1" data-testid="div-current-track">
              <h2 className="text-3xl font-semibold">{currentTrack?.title || "No tracks"}</h2>
              <p className="text-lg text-muted-foreground">
                {currentTrack?.artist || "Unknown Artist"}
              </p>
            </div>

            <div className="flex justify-center py-4">
              <Button
                size="icon"
                className="h-24 w-24 rounded-full shadow-lg"
                onClick={togglePlay}
                data-testid="button-play-pause"
              >
                {isPlaying ? (
                  <Pause className="h-10 w-10" />
                ) : (
                  <Play className="h-10 w-10 ml-1" />
                )}
              </Button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Volume</span>
                <span className="text-sm text-muted-foreground">{isMuted ? 0 : volume[0]}%</span>
              </div>
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMute}
                  data-testid="button-mute"
                >
                  {isMuted || volume[0] === 0 ? (
                    <VolumeX className="h-5 w-5" />
                  ) : (
                    <Volume2 className="h-5 w-5" />
                  )}
                </Button>
                <Slider
                  value={volume}
                  onValueChange={setVolume}
                  max={100}
                  step={1}
                  className="flex-1"
                  disabled={isMuted}
                  data-testid="slider-volume"
                />
              </div>
            </div>

            {streamConfig.isEnabled && streamConfig.streamUrl && (
              <div className={`p-3 rounded-lg text-center text-sm flex items-center justify-center gap-2 ${
                streamConnected 
                  ? "bg-green-50 dark:bg-green-950 text-green-900 dark:text-green-100" 
                  : streamError
                  ? "bg-red-50 dark:bg-red-950 text-red-900 dark:text-red-100"
                  : "bg-blue-50 dark:bg-blue-950 text-blue-900 dark:text-blue-100"
              }`} data-testid="text-stream-status">
                <div className={`w-2 h-2 rounded-full ${
                  streamConnected 
                    ? "bg-green-600 dark:bg-green-400 animate-pulse" 
                    : streamError
                    ? "bg-red-600 dark:bg-red-400"
                    : "bg-blue-600 dark:bg-blue-400 animate-pulse"
                }`} />
                {streamConnected ? "Live stream connected" : streamError ? "Stream connection failed" : "Connecting to live stream..."}
              </div>
            )}

            {!isConnected && (
              <div className="text-center text-sm text-destructive font-medium">
                Connection lost. Trying to reconnect...
              </div>
            )}
          </Card>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Synchronized playback • All listeners hear the same audio
            </p>
          </div>
        </motion.div>
      </div>

      <ChatWidget
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        onSendMessage={handleSendChat}
        messages={chatMessages}
        username={username}
      />
      <audio ref={audioRef} />
      <audio ref={liveStreamRef} data-testid="audio-live-stream" />
    </div>
  );
}
