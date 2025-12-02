import { useState, useRef, useCallback, useEffect } from "react";

const BUFFER_SIZE = 4096;

export function useMicrophone() {
  const [isActive, setIsActive] = useState(false);
  const [permission, setPermission] = useState<"granted" | "denied" | "prompt">("prompt");
  const [micLevel, setMicLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const onAudioDataRef = useRef<((data: ArrayBuffer, sampleRate: number) => void) | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const updateMicLevel = useCallback(() => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    setMicLevel(Math.min(100, Math.round((average / 255) * 100)));
    
    animationFrameRef.current = requestAnimationFrame(updateMicLevel);
  }, []);

  const cleanupAudio = useCallback(() => {
    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch (e) {}
      processorRef.current = null;
    }
    
    if (workletNodeRef.current) {
      try {
        workletNodeRef.current.disconnect();
      } catch (e) {}
      workletNodeRef.current = null;
    }
    
    if (sourceRef.current) {
      try {
        sourceRef.current.disconnect();
      } catch (e) {}
      sourceRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (analyserRef.current) {
      try {
        analyserRef.current.disconnect();
      } catch (e) {}
      analyserRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        if (audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
        }
      } catch (e) {}
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

  const setupWithWorklet = async (
    audioContext: AudioContext,
    source: MediaStreamAudioSourceNode,
    sampleRate: number
  ): Promise<boolean> => {
    try {
      await audioContext.audioWorklet.addModule('/audio-processor.js');
      
      const workletNode = new AudioWorkletNode(audioContext, 'audio-processor', {
        numberOfInputs: 1,
        numberOfOutputs: 0,
        channelCount: 1,
      });
      workletNodeRef.current = workletNode;
      
      workletNode.port.onmessage = (event) => {
        if (onAudioDataRef.current && event.data.pcmData) {
          const pcmBuffer = event.data.pcmData;
          const actualSampleRate = event.data.sampleRate || sampleRate;
          onAudioDataRef.current(pcmBuffer, actualSampleRate);
        }
      };
      
      source.connect(workletNode);
      
      return true;
    } catch (e) {
      console.log("AudioWorklet not supported, falling back to ScriptProcessor");
      return false;
    }
  };

  const setupWithScriptProcessor = (
    audioContext: AudioContext,
    source: MediaStreamAudioSourceNode,
    sampleRate: number
  ) => {
    const processor = audioContext.createScriptProcessor(BUFFER_SIZE, 1, 1);
    processorRef.current = processor;
    
    processor.onaudioprocess = (event) => {
      if (onAudioDataRef.current) {
        const inputData = event.inputBuffer.getChannelData(0);
        const buffer = new Float32Array(inputData).buffer;
        onAudioDataRef.current(buffer, sampleRate);
      }
    };
    
    source.connect(processor);
    
    const silentGain = audioContext.createGain();
    silentGain.gain.value = 0;
    processor.connect(silentGain);
    silentGain.connect(audioContext.destination);
  };

  const startMicrophone = useCallback(async (onAudioData: (data: ArrayBuffer, sampleRate: number) => void, deviceId?: string | null) => {
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
        if (savedDeviceId && deviceErr instanceof Error && 
            (deviceErr.name === 'OverconstrainedError' || deviceErr.message.includes('not found'))) {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
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

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;
      
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;
      
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;
      
      const sampleRate = audioContext.sampleRate;
      
      const workletSuccess = await setupWithWorklet(audioContext, source, sampleRate);
      if (!workletSuccess) {
        const isScriptProcessorAvailable = typeof audioContext.createScriptProcessor === 'function';
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        
        if (!isScriptProcessorAvailable || isMobile) {
          cleanupAudio();
          setError("Live audio is not supported on this device. Please try using a desktop browser.");
          setPermission("denied");
          setIsActive(false);
          return;
        }
        
        setupWithScriptProcessor(audioContext, source, sampleRate);
      }
      
      updateMicLevel();

      setPermission("granted");
      setIsActive(true);
    } catch (err) {
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
      if (streamRef.current || processorRef.current || audioContextRef.current || workletNodeRef.current) {
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
