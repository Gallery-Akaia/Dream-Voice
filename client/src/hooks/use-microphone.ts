import { useState, useRef, useCallback, useEffect } from "react";

export function useMicrophone() {
  const [isActive, setIsActive] = useState(false);
  const [permission, setPermission] = useState<"granted" | "denied" | "prompt">("prompt");
  const [micLevel, setMicLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const onAudioDataRef = useRef<((data: Uint8Array) => void) | null>(null);

  const updateMicLevel = useCallback(() => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    setMicLevel(Math.min(100, Math.round((average / 255) * 100)));
    
    animationFrameRef.current = requestAnimationFrame(updateMicLevel);
  }, []);

  const startMicrophone = useCallback(async (onAudioData: (data: Uint8Array) => void) => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
        },
      });

      streamRef.current = stream;
      onAudioDataRef.current = onAudioData;

      // Create audio context and analyser
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);

      analyserRef.current = analyser;

      // Create script processor for audio chunks
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      
      processor.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0);
        // Convert float32 to int16
        const int16Data = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          int16Data[i] = Math.max(-1, Math.min(1, inputData[i])) < 0 
            ? inputData[i] * 0x8000 
            : inputData[i] * 0x7FFF;
        }
        
        if (onAudioDataRef.current) {
          onAudioDataRef.current(new Uint8Array(int16Data.buffer));
        }
      };

      analyser.connect(processor);
      processor.connect(audioContext.destination);
      processorRef.current = processor;

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
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
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
    startMicrophone,
    stopMicrophone,
  };
}
