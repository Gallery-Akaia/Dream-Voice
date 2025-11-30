import { useState, useRef, useCallback, useEffect } from "react";

export function useMicrophone() {
  const [isActive, setIsActive] = useState(false);
  const [permission, setPermission] = useState<"granted" | "denied" | "prompt">("prompt");
  const [micLevel, setMicLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const onAudioDataRef = useRef<((data: Blob) => void) | null>(null);

  const updateMicLevel = useCallback(() => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    setMicLevel(Math.min(100, Math.round((average / 255) * 100)));
    
    animationFrameRef.current = requestAnimationFrame(updateMicLevel);
  }, []);

  const startMicrophone = useCallback(async (onAudioData: (data: Blob) => void, deviceId?: string | null) => {
    try {
      setError(null);
      
      const savedDeviceId = deviceId || localStorage.getItem("selectedAudioDevice");
      
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      };
      
      if (savedDeviceId) {
        audioConstraints.deviceId = { exact: savedDeviceId };
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
      });
      
      const activeTrack = stream.getAudioTracks()[0];
      const settings = activeTrack?.getSettings();
      setCurrentDeviceId(settings?.deviceId || null);

      streamRef.current = stream;
      onAudioDataRef.current = onAudioData;

      // Create MediaRecorder with Opus compression (like WhatsApp/Telegram)
      const options = {
        mimeType: "audio/webm;codecs=opus",
        audioBitsPerSecond: 32000, // 32kbps for low latency
      };

      const recorder = new MediaRecorder(stream, options);
      recorderRef.current = recorder;

      // Send compressed audio chunks immediately as they're available
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0 && onAudioDataRef.current) {
          onAudioDataRef.current(event.data);
        }
      };

      // Request audio data every 250ms for smoother streaming
      recorder.start(250);

      // Set up analyser for mic level visualization
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      setPermission("granted");
      setIsActive(true);
      updateMicLevel();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to access microphone";
      setError(message);
      setPermission("denied");
      setIsActive(false);
    }
  }, [updateMicLevel]);

  const stopMicrophone = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
      recorderRef.current = null;
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

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    setIsActive(false);
    setMicLevel(0);
    setCurrentDeviceId(null);
    onAudioDataRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      if (isActive) {
        stopMicrophone();
      }
    };
  }, []);

  return {
    isActive,
    permission,
    micLevel,
    error,
    currentDeviceId,
    startMicrophone,
    stopMicrophone,
  };
}
