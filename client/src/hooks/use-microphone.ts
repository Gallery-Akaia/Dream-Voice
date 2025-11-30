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

  const cleanupAudio = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try {
        recorderRef.current.stop();
      } catch (e) {
        // Ignore stop errors
      }
      recorderRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (analyserRef.current) {
      try {
        analyserRef.current.disconnect();
      } catch (e) {
        // Ignore disconnect errors
      }
      analyserRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        if (audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
        }
      } catch (e) {
        // Ignore close errors on some browsers
      }
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

  const startMicrophone = useCallback(async (onAudioData: (data: Blob) => void, deviceId?: string | null) => {
    // Clean up any existing stream first
    cleanupAudio();
    
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
      
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraints,
        });
      } catch (deviceErr) {
        // If exact device failed, try without device constraint as fallback
        if (savedDeviceId && deviceErr instanceof Error && 
            (deviceErr.name === 'OverconstrainedError' || deviceErr.message.includes('not found'))) {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
          // Clear the invalid saved device
          localStorage.removeItem("selectedAudioDevice");
        } else {
          throw deviceErr;
        }
      }
      
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
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const audioContext = new AudioContextClass();
        audioContextRef.current = audioContext;
        
        // Resume if suspended (required on some mobile browsers)
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }
        
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);
        analyserRef.current = analyser;
        
        updateMicLevel();
      }

      setPermission("granted");
      setIsActive(true);
    } catch (err) {
      // Clean up on error
      cleanupAudio();
      
      let message = "Failed to access microphone";
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.message.includes('Permission')) {
          message = "Microphone permission was denied. Please allow access in your browser settings.";
        } else if (err.name === 'NotFoundError' || err.message.includes('not found')) {
          message = "No microphone found. Please connect a microphone and try again.";
        } else if (err.name === 'NotReadableError' || err.message.includes('in use')) {
          message = "Microphone is being used by another app. Please close other apps using the microphone.";
        } else {
          message = err.message;
        }
      }
      setError(message);
      setPermission("denied");
      setIsActive(false);
    }
  }, [updateMicLevel, cleanupAudio]);

  const stopMicrophone = cleanupAudio;

  useEffect(() => {
    return () => {
      // Always cleanup on unmount - check refs directly instead of state
      if (streamRef.current || recorderRef.current || audioContextRef.current) {
        cleanupAudio();
      }
    };
  }, [cleanupAudio]);

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
