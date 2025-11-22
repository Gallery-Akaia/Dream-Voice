import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { LiveIndicator } from "@/components/live-indicator";
import { ThemeToggle } from "@/components/theme-toggle";
import { Play, Pause, Volume2, VolumeX, Radio, Users } from "lucide-react";

export default function ListenerPage() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState([75]);
  const [isMuted, setIsMuted] = useState(false);
  const [isLive] = useState(false);
  const [listenerCount] = useState(0);
  const [currentTrack] = useState<{ title: string; artist: string } | null>(null);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10"></div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-12">
        <div className="w-full max-w-2xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-primary/10 mb-4">
              <Radio className="w-16 h-16 text-primary" />
            </div>
            
            <h1 className="text-5xl font-bold tracking-tight" data-testid="text-station-name">
              Radio New Power
            </h1>
            <p className="text-xl text-muted-foreground">
              Your 24/7 streaming radio station
            </p>
          </div>

          <Card className="p-8 space-y-6">
            <div className="flex items-center justify-between">
              <LiveIndicator isLive={isLive} />
              <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="text-listener-count">
                <Users className="w-4 h-4" />
                <span>{listenerCount} listeners</span>
              </div>
            </div>

            {currentTrack ? (
              <div className="text-center space-y-1" data-testid="div-current-track">
                <h2 className="text-2xl font-semibold">{currentTrack.title}</h2>
                <p className="text-lg text-muted-foreground">{currentTrack.artist}</p>
              </div>
            ) : (
              <div className="text-center space-y-1">
                <h2 className="text-2xl font-semibold text-muted-foreground">
                  {isPlaying ? "Connecting..." : "Ready to play"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Press play to start listening
                </p>
              </div>
            )}

            <div className="flex justify-center">
              <Button
                size="icon"
                variant="default"
                className="h-20 w-20 rounded-full"
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
          </Card>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Synchronized playback • All listeners hear the same audio
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
