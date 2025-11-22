import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { LiveIndicator } from "@/components/live-indicator";
import { ThemeToggle } from "@/components/theme-toggle";
import { ChatWidget } from "@/components/chat-widget";
import { Play, Pause, Volume2, VolumeX, Radio, Users, MessageCircle } from "lucide-react";
import { useWebSocket } from "@/hooks/use-websocket";
import type { ChatMessage } from "@shared/schema";

export default function ListenerPage() {
  const { radioState, tracks, isConnected, ws } = useWebSocket();
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

  const currentTrack = tracks.find((t) => t.id === radioState.currentTrackId);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = "auto";
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
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
          if (!isChatOpen) {
            setUnreadCount(prev => prev + 1);
          }
        }
      } catch (error) {
        console.error("Chat message error:", error);
      }
    };

    ws.addEventListener("message", handleMessage);
    return () => ws.removeEventListener("message", handleMessage);
  }, [ws, isChatOpen]);

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
    audioRef.current.volume = isMuted ? 0 : volume[0] / 100;
  }, [volume, isMuted]);

  const togglePlay = () => {
    if (!isConnected || !currentTrack) return;
    
    if (!isPlaying) {
      if (audioRef.current) {
        audioRef.current.currentTime = radioState.playbackPosition;
        audioRef.current.play().catch((error) => {
          console.error("Audio playback error:", error);
          return;
        });
      }
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
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
      setUsernameEntered(true);
    }
  };

  const handleChatOpen = () => {
    setIsChatOpen(true);
    setUnreadCount(0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-purple-800 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/2 right-0 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-4000"></div>
      </div>

      <div className="absolute top-4 right-4 z-10 flex gap-2">
        {!usernameEntered && (
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Your name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSetUsername()}
              className="px-3 py-2 rounded-lg text-sm border bg-white/10 backdrop-blur border-white/20 text-white placeholder:text-white/50"
              data-testid="input-username"
            />
            <Button size="sm" onClick={handleSetUsername} className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600" data-testid="button-set-username">
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
          className="absolute top-4 left-4 z-10 bg-white/10 backdrop-blur border-white/20 text-white hover:bg-white/20"
          onClick={handleChatOpen}
          data-testid="button-open-chat"
        >
          <MessageCircle className="w-4 h-4 mr-1" />
          {unreadCount > 0 && <span className="ml-1 bg-pink-500 text-white rounded-full px-2 text-xs">{unreadCount}</span>}
        </Button>
      )}

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-12">
        <div className="w-full max-w-2xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 mb-4 shadow-2xl animate-pulse">
              <Radio className="w-16 h-16 text-white" />
            </div>
            
            <h1 className="text-6xl font-bold tracking-tight text-white drop-shadow-lg" data-testid="text-station-name">
              Radio New Power
            </h1>
            <p className="text-xl text-purple-100">
              Your 24/7 streaming radio station
            </p>
          </div>

          <Card className="p-8 space-y-6 bg-white/95 backdrop-blur border-white/30 shadow-2xl">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <LiveIndicator isLive={radioState.isLive} />
              <div className="flex items-center gap-2 text-sm text-purple-600 font-semibold" data-testid="text-listener-count">
                <Users className="w-4 h-4" />
                <span>{radioState.listenerCount} listeners</span>
              </div>
            </div>

            {currentTrack ? (
              <div className="text-center space-y-1" data-testid="div-current-track">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">{currentTrack.title}</h2>
                <p className="text-lg text-gray-600">
                  {currentTrack.artist || "Unknown Artist"}
                </p>
              </div>
            ) : (
              <div className="text-center space-y-1">
                <h2 className="text-2xl font-semibold text-gray-400">
                  {isConnected 
                    ? (tracks.length > 0 ? "Ready to play" : "No tracks available") 
                    : "Connecting to server..."}
                </h2>
                <p className="text-sm text-gray-500">
                  {isConnected && tracks.length > 0
                    ? "Press play to start listening" 
                    : isConnected 
                      ? "Admin needs to upload audio tracks"
                      : "Please wait..."}
                </p>
              </div>
            )}

            <div className="flex justify-center">
              <Button
                size="icon"
                className="h-24 w-24 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-2xl transform hover:scale-105 transition-transform"
                onClick={togglePlay}
                disabled={!isConnected || tracks.length === 0}
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
                <span className="text-sm font-semibold text-purple-600">Volume</span>
                <span className="text-sm text-purple-600 font-bold">{isMuted ? 0 : volume[0]}%</span>
              </div>
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-purple-600 hover:bg-purple-100"
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
              <div className="text-center text-sm text-pink-600 font-semibold">
                Connection lost. Trying to reconnect...
              </div>
            )}
          </Card>

          <div className="text-center">
            <p className="text-sm text-purple-100">
              Synchronized playback • All listeners hear the same audio
            </p>
          </div>
        </div>
      </div>

      <ChatWidget
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        onSendMessage={handleSendChat}
        messages={chatMessages}
        username={username}
      />
    </div>
  );
}
