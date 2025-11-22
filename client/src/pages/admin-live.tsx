import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { LiveIndicator } from "@/components/live-indicator";
import { Mic, Radio, Users, Volume2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

export default function AdminLive() {
  const { toast } = useToast();
  const [isLive, setIsLive] = useState(false);
  const [backgroundVolume, setBackgroundVolume] = useState([30]);
  const [micLevel] = useState(0);
  const [listenerCount] = useState(0);

  const handleGoLive = () => {
    if (isLive) {
      setIsLive(false);
      toast({
        title: "Broadcast ended",
        description: "You are no longer live. Automated playback resumed.",
      });
    } else {
      setIsLive(true);
      toast({
        title: "You're live!",
        description: "Broadcasting to all listeners now.",
      });
    }
  };

  const handleEmergencyStop = () => {
    setIsLive(false);
    toast({
      title: "Emergency stop activated",
      description: "Live broadcast stopped immediately.",
      variant: "destructive",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-live-title">
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
                <Label htmlFor="mic-level" className="text-sm font-medium">
                  Microphone Input
                </Label>
                <span className="text-sm text-muted-foreground">{micLevel}%</span>
              </div>
              <Progress value={micLevel} className="h-2" id="mic-level" />
              <p className="text-xs text-muted-foreground">
                {micLevel === 0 ? "No input detected" : "Input level"}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="background-volume" className="text-sm font-medium">
                  Background Music Volume
                </Label>
                <span className="text-sm text-muted-foreground">{backgroundVolume[0]}%</span>
              </div>
              <div className="flex items-center gap-4">
                <Volume2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <Slider
                  id="background-volume"
                  value={backgroundVolume}
                  onValueChange={setBackgroundVolume}
                  max={100}
                  step={1}
                  className="flex-1"
                  disabled={!isLive}
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
          When you go live, all listeners will hear your microphone input. The background
          music will automatically adjust to your selected volume level.
        </AlertDescription>
      </Alert>
    </div>
  );
}
