import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Mic, 
  RefreshCw, 
  Play, 
  Square, 
  Check, 
  AlertCircle, 
  Headphones,
  Settings2
} from "lucide-react";
import { useAudioDevices, type AudioDevice } from "@/hooks/use-audio-devices";
import { useToast } from "@/hooks/use-toast";

export default function AdminAudioSources() {
  const { toast } = useToast();
  const {
    devices,
    selectedDeviceId,
    isLoading,
    error,
    hasPermission,
    selectDevice,
    refreshDevices,
    requestPermission,
  } = useAudioDevices();

  const [isTesting, setIsTesting] = useState(false);
  const [testLevel, setTestLevel] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const updateLevel = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    setTestLevel(Math.min(100, Math.round((average / 255) * 100)));

    animationFrameRef.current = requestAnimationFrame(updateLevel);
  }, []);

  const startTest = async () => {
    if (!selectedDeviceId) {
      toast({
        title: "No device selected",
        description: "Please select an audio device first",
        variant: "destructive",
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: selectedDeviceId },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      setIsTesting(true);
      updateLevel();

      toast({
        title: "Testing audio",
        description: "Speak or play audio through your mixer to see the levels",
      });
    } catch (err) {
      toast({
        title: "Failed to access device",
        description: err instanceof Error ? err.message : "Unable to access the selected audio device",
        variant: "destructive",
      });
    }
  };

  const stopTest = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsTesting(false);
    setTestLevel(0);
  };

  useEffect(() => {
    return () => {
      stopTest();
    };
  }, []);

  const handleSelectDevice = (device: AudioDevice) => {
    if (isTesting) {
      stopTest();
    }
    selectDevice(device.deviceId);
    toast({
      title: "Device selected",
      description: `${device.label} will be used for broadcasting`,
    });
  };

  const getDeviceIcon = (device: AudioDevice) => {
    const label = device.label.toLowerCase();
    if (label.includes("mixer") || label.includes("interface") || label.includes("line")) {
      return <Settings2 className="w-5 h-5" />;
    }
    if (label.includes("headset") || label.includes("headphone")) {
      return <Headphones className="w-5 h-5" />;
    }
    return <Mic className="w-5 h-5" />;
  };

  const getDeviceType = (device: AudioDevice): string => {
    const label = device.label.toLowerCase();
    if (label.includes("mixer") || label.includes("interface")) {
      return "Mixer/Interface";
    }
    if (label.includes("line")) {
      return "Line Input";
    }
    if (label.includes("headset")) {
      return "Headset";
    }
    if (label.includes("webcam") || label.includes("camera")) {
      return "Camera Mic";
    }
    return "Microphone";
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Audio Sources</h1>
          <p className="text-muted-foreground mt-1">Connect your mixer or audio device</p>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight" data-testid="text-audio-sources-title">
            Audio Sources
          </h1>
          <p className="text-muted-foreground mt-1">
            Connect your mixer or audio device for broadcasting
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshDevices}
          disabled={isLoading}
          data-testid="button-refresh-devices"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {!hasPermission && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Permission required to access audio devices</span>
            <Button
              size="sm"
              onClick={requestPermission}
              data-testid="button-request-permission"
            >
              Grant Permission
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Available Audio Devices</CardTitle>
            <CardDescription>
              Select the audio source you want to use for broadcasting. This can be a mixer, 
              USB audio interface, or any microphone connected to your computer.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {devices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Mic className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No audio devices found</p>
                <p className="text-sm">Connect a mixer or microphone and click refresh</p>
              </div>
            ) : (
              devices.map((device, index) => (
                <div
                  key={device.deviceId}
                  className={`flex items-center justify-between p-4 rounded-lg border transition-colors cursor-pointer hover-elevate ${
                    selectedDeviceId === device.deviceId
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                  onClick={() => handleSelectDevice(device)}
                  data-testid={`device-item-${index}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-md ${
                      selectedDeviceId === device.deviceId
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {getDeviceIcon(device)}
                    </div>
                    <div>
                      <p className="font-medium">{device.label}</p>
                      <p className="text-sm text-muted-foreground">{getDeviceType(device)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={selectedDeviceId === device.deviceId ? "default" : "secondary"}>
                      {getDeviceType(device)}
                    </Badge>
                    {selectedDeviceId === device.deviceId && (
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-4 h-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Audio Input</CardTitle>
            <CardDescription>
              Test your selected device to make sure it's working before going live
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Selected Device</Label>
                <p className="text-sm text-muted-foreground">
                  {selectedDeviceId
                    ? devices.find((d) => d.deviceId === selectedDeviceId)?.label || "Unknown device"
                    : "No device selected"}
                </p>
              </div>
              <Button
                variant={isTesting ? "destructive" : "default"}
                onClick={isTesting ? stopTest : startTest}
                disabled={!selectedDeviceId}
                data-testid="button-test-audio"
              >
                {isTesting ? (
                  <>
                    <Square className="w-4 h-4 mr-2" />
                    Stop Test
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Test Audio
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Input Level</Label>
                <span className="text-sm text-muted-foreground">
                  {isTesting ? `${testLevel}%` : "Inactive"}
                </span>
              </div>
              <Progress 
                value={testLevel} 
                className="h-3"
                data-testid="progress-audio-level"
              />
              <p className="text-xs text-muted-foreground">
                {isTesting
                  ? "Speak into your microphone or play audio through your mixer"
                  : "Click 'Test Audio' to check your input levels"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Alert>
        <Mic className="h-4 w-4" />
        <AlertDescription>
          The selected audio source will be used when you go live from the Live Controls page.
          Make sure to test your audio levels before broadcasting.
        </AlertDescription>
      </Alert>
    </div>
  );
}
