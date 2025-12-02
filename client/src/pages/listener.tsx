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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const micAudioContextRef = useRef<AudioContext | null>(null);
  const micGainNodeRef = useRef<GainNode | null>(null);
  const micNextStartTimeRef = useRef(0);
  const playMicrophoneAudioRef = useRef<((base64Data: string) => Promise<void>) | null>(null);
  const lastTrackIdRef = useRef<string | null>(null);

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

  const playMicrophoneAudio = useCallback(async (base64Data: string) => {
    try {
      console.log("Received microphone audio, base64 length:", base64Data.length);
      
      await initMicAudioContext();
      
      if (!micAudioContextRef.current || !micGainNodeRef.current) {
        console.error("Audio context not initialized");
        return;
      }

      const audioContext = micAudioContextRef.current;

      // Convert Base64 to ArrayBuffer
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      console.log("Created byte array, size:", bytes.length);
      
      // Decode audio data
      const audioBuffer = await audioContext.decodeAudioData(bytes.buffer);
      
      // Schedule playback at the correct time
      const currentTime = audioContext.currentTime;
      const startTime = Math.max(currentTime, micNextStartTimeRef.current);
      
      // Create source node and schedule playback
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(micGainNodeRef.current);
      source.start(startTime);
      
      // Update next start time for seamless playback
      micNextStartTimeRef.current = startTime + audioBuffer.duration;
      
      console.log("Scheduled audio chunk, duration:", audioBuffer.duration, "startTime:", startTime);
    } catch (error) {
      console.error("Microphone audio playback error:", {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        base64Length: base64Data?.length,
        audioContextState: micAudioContextRef.current?.state,
        currentTime: micAudioContextRef.current?.currentTime,
        nextStartTime: micNextStartTimeRef.current,
      });
    }
  }, [initMicAudioContext]);

  // Store the callback in ref so WebSocket handler can always access latest version
  useEffect(() => {
    playMicrophoneAudioRef.current = playMicrophoneAudio;
  }, [playMicrophoneAudio]);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = "auto";
    }

    return () => {
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

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "chat_message") {
          const newMessage: ChatMessage = {
            id: Math.random().toString(),
            username: data.username,
            text: data.text,
            timestamp: Date.now(),
          };
          setChatMessages(prev => [...prev.slice(-49), newMessage]);
          setUnreadCount(prev => prev + 1);
        } else if (data.type === "microphone_audio") {
          // Play microphone audio from admin using ref to avoid recreating listener
          console.log("Received microphone audio chunk");
          if (playMicrophoneAudioRef.current) {
            playMicrophoneAudioRef.current(data.data);
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

    if (audio.src !== currentTrack.fileUrl) {
      audio.src = currentTrack.fileUrl;
      audio.currentTime = radioState.playbackPosition;
      audio.play().catch((error) => {
        console.error("Audio playback error:", error);
        setIsPlaying(false);
      });
    }

    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
    }

    syncIntervalRef.current = setInterval(() => {
      if (!audio.paused && radioState.currentTrackId === currentTrack.id) {
        const serverPosition = radioState.playbackPosition;
        const clientPosition = audio.currentTime;
        const drift = Math.abs(serverPosition - clientPosition);

        if (drift > 0.5) {
          audio.currentTime = serverPosition;
        }
      }
    }, 2000);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [isPlaying, currentTrack, radioState.currentTrackId, radioState.playbackPosition]);

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
  }, [isMuted, volume]);

  useEffect(() => {
    if (!audioRef.current || !currentTrack) return;
    
    if (lastTrackIdRef.current !== currentTrack.id) {
      lastTrackIdRef.current = currentTrack.id;
      audioRef.current.src = currentTrack.fileUrl;
      audioRef.current.currentTime = radioState.playbackPosition;
      
      if (isPlaying) {
        audioRef.current.play().catch((error) => {
          console.error("Track change play error:", error);
        });
      }
    }
  }, [currentTrack, radioState.playbackPosition, isPlaying]);

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
    if (!audioRef.current || !currentTrack) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      if (!audioRef.current.src || audioRef.current.src === "") {
        audioRef.current.src = currentTrack.fileUrl;
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
    </div>
  );
}
