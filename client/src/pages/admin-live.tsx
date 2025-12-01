import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { LiveIndicator } from "@/components/live-indicator";
import { Skeleton } from "@/components/ui/skeleton";
import { Mic, Radio, Users, Volume2, AlertCircle, Settings2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMicrophone } from "@/hooks/use-microphone";
import { useAudioDevices } from "@/hooks/use-audio-devices";
import { speak } from "@/lib/text-to-speech";
import { useRef, useEffect } from "react";
import { Link } from "wouter";
import type { RadioState } from "@shared/schema";

export default function AdminLive() {
  const { toast } = useToast();
  const { isActive, micLevel, error, currentDeviceId, startMicrophone, stopMicrophone } = useMicrophone();
  const { devices, selectedDeviceId } = useAudioDevices();
  const wsRef = useRef<WebSocket | null>(null);
  
  const selectedDevice = devices.find(d => d.deviceId === selectedDeviceId);
  const activeDevice = currentDeviceId ? devices.find(d => d.deviceId === currentDeviceId) : null;

  const { data: radioState, isLoading } = useQuery<RadioState>({
    queryKey: ["/api/radio/state"],
    refetchInterval: 3000,
  });

  const updateLiveMutation = useMutation({
    mutationFn: async (data: { isLive?: boolean; backgroundVolume?: number }) => {
      return await apiRequest("POST", "/api/radio/live", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/radio/state"] });
    },
  });

  useEffect(() => {
    return () => {
      stopMicrophone();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [stopMicrophone]);

  const handleGoLive = async () => {
    const newLiveState = !radioState?.isLive;
    
    if (newLiveState) {
      // Going live - request microphone access
      try {
        // Connect to WebSocket for microphone streaming
        const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const ws = new WebSocket(`${wsProtocol}//${window.location.host}/ws`);
        wsRef.current = ws;

        ws.onopen = async () => {
          // Start microphone capture and stream compressed audio
          startMicrophone((audioBlob: Blob) => {
            // Convert blob to Base64 synchronously and send immediately
            if (ws.readyState === WebSocket.OPEN) {
              // Use FileReader since arrayBuffer is async and can cause queueing
              const reader = new FileReader();
              reader.onload = () => {
                const base64 = (reader.result as string).split(",")[1];
                console.log("Sending audio chunk, size:", base64.length);
                ws.send(JSON.stringify({
                  type: "microphone_audio",
                  data: base64,
                }));
              };
              reader.onerror = () => {
                console.error("FileReader error");
              };
              reader.readAsDataURL(audioBlob);
            }
          });
        };

        // Wait a moment for WebSocket to connect before updating state
        await new Promise((resolve) => setTimeout(resolve, 500));

        updateLiveMutation.mutate(
          { isLive: newLiveState },
          {
            onSuccess: () => {
              speak("You're live. Broadcasting microphone to all listeners now.");
              toast({
                title: "You're live!",
                description: "Broadcasting microphone to all listeners now.",
              });
            },
          }
        );
      } catch (err) {
        toast({
          title: "Microphone Error",
          description: err instanceof Error ? err.message : "Failed to access microphone",
          variant: "destructive",
        });
      }
    } else {
      // Ending live broadcast
      stopMicrophone();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      updateLiveMutation.mutate(
        { isLive: newLiveState },
        {
          onSuccess: () => {
            speak("Broadcast ended. Automated playback resumed.");
            toast({
              title: "Broadcast ended",
              description: "Automated playback resumed.",
            });
          },
        }
      );
    }
  };

  const handleVolumeChange = (value: number[]) => {
    updateLiveMutation.mutate({ backgroundVolume: value[0] });
  };

  const handleEmergencyStop = () => {
    stopMicrophone();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    updateLiveMutation.mutate(
      { isLive: false },
      {
        onSuccess: () => {
          speak("Emergency stop activated. Live broadcast stopped immediately.");
          toast({
            title: "Emergency stop activated",
            description: "Live broadcast stopped immediately.",
            variant: "destructive",
          });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Live Controls</h1>
          <p className="text-muted-foreground">Broadcast live to your listeners</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardContent className="pt-6">
              <Skeleton className="h-40 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <Skeleton className="h-40 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isLive = radioState?.isLive || false;
  const backgroundVolume = radioState?.backgroundVolume || 30;
  const listenerCount = radioState?.listenerCount || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight" data-testid="text-live-title">
          Live Controls
        </h1>
        <p className="text-muted-foreground">
          Broadcast live to your listeners
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Broadcast Status</CardTitle>
            <CardDescription>
              Current live streaming state
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status</span>
              <LiveIndicator isLive={isLive} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Current Listeners</span>
                <div className="flex items-center gap-2" data-testid="text-live-listener-count">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{listenerCount}</span>
                </div>
              </div>
            </div>

            <Button
              size="lg"
              variant={isLive ? "destructive" : "default"}
              className="w-full"
              onClick={handleGoLive}
              disabled={updateLiveMutation.isPending}
              data-testid="button-go-live"
            >
              {isLive ? (
                <>
                  <Radio className="w-5 h-5 mr-2" />
                  End Broadcast
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5 mr-2" />
                  Go Live
                </>
              )}
            </Button>

            {isLive && (
              <Button
                size="sm"
                variant="outline"
                className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={handleEmergencyStop}
                disabled={updateLiveMutation.isPending}
                data-testid="button-emergency-stop"
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                Emergency Stop
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Audio Controls</CardTitle>
            <CardDescription>
              Manage broadcast audio levels
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Audio Source</Label>
                <Link href="/admin/audio-sources">
                  <Button variant="ghost" size="sm" data-testid="button-configure-audio">
                    <Settings2 className="w-4 h-4 mr-1" />
                    Configure
                  </Button>
                </Link>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
                <div className="p-2 rounded-md bg-primary/10">
                  <Mic className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" data-testid="text-selected-device">
                    {selectedDevice?.label || "Default Audio Input"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isActive && activeDevice 
                      ? `Broadcasting from: ${activeDevice.label}` 
                      : "Selected for broadcast"}
                  </p>
                </div>
                {isActive && (
                  <Badge variant="default" className="shrink-0">Active</Badge>
                )}
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="mic-level" className="text-sm font-medium">
                  Input Level
                </Label>
                <span className="text-sm text-muted-foreground">{isActive ? `${micLevel}%` : "Inactive"}</span>
              </div>
              <Progress value={isActive ? micLevel : 0} className="h-2" id="mic-level" />
              <p className="text-xs text-muted-foreground">
                {isActive ? "Audio is being captured" : "Start broadcast to see audio levels"}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="background-volume" className="text-sm font-medium">
                  Background Music Volume
                </Label>
                <span className="text-sm text-muted-foreground">{backgroundVolume}%</span>
              </div>
              <div className="flex items-center gap-4">
                <Volume2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <Slider
                  id="background-volume"
                  value={[backgroundVolume]}
                  onValueChange={handleVolumeChange}
                  max={100}
                  step={1}
                  className="flex-1"
                  disabled={!isLive || updateLiveMutation.isPending}
                  data-testid="slider-background-volume"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {isLive
                  ? "Adjust how loud the background music plays during your broadcast"
                  : "Only adjustable during live broadcast"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          When you go live, all listeners will hear audio from your selected source. Configure
          your mixer or audio device in the <Link href="/admin/audio-sources" className="font-medium underline underline-offset-4" data-testid="link-audio-sources-inline">Audio Sources</Link> settings.
        </AlertDescription>
      </Alert>
    </div>
  );
}
