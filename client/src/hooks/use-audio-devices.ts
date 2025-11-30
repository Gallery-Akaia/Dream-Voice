import { useState, useEffect, useCallback, useRef } from "react";

export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: "audioinput" | "audiooutput";
  isExternal: boolean;
}

function isExternalDevice(label: string): boolean {
  const lowerLabel = label.toLowerCase();
  const externalKeywords = [
    'usb',
    'external',
    'headset',
    'headphone',
    'bluetooth',
    'line in',
    'line-in',
    'aux',
    'mixer',
    'interface',
    'scarlett',
    'focusrite',
    'behringer',
    'presonus',
    'steinberg',
    'motu',
    'universal audio',
    'rode',
    'shure',
    'audio-technica',
    'blue yeti',
    'wired',
    'cable',
    'audio adapter',
    'sound card',
  ];
  
  const builtInKeywords = [
    'built-in',
    'built in',
    'internal',
    'iphone microphone',
    'android',
    'phone',
    'device microphone',
    'speakerphone',
  ];
  
  if (builtInKeywords.some(keyword => lowerLabel.includes(keyword))) {
    return false;
  }
  
  if (externalKeywords.some(keyword => lowerLabel.includes(keyword))) {
    return true;
  }
  
  return false;
}

function isMediaDevicesSupported(): boolean {
  return typeof navigator !== 'undefined' && 
    navigator.mediaDevices && 
    typeof navigator.mediaDevices.enumerateDevices === 'function';
}

export function useAudioDevices() {
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem("selectedAudioDevice");
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [autoSwitch, setAutoSwitch] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("audioAutoSwitch");
      return saved !== null ? saved === "true" : true;
    }
    return true;
  });
  const [hasExternalDevice, setHasExternalDevice] = useState(false);
  const previousDevicesRef = useRef<AudioDevice[]>([]);
  const autoSwitchRef = useRef(autoSwitch);
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    autoSwitchRef.current = autoSwitch;
  }, [autoSwitch]);

  const enumerateDevices = useCallback(async () => {
    if (!isMediaDevicesSupported()) {
      setError("Audio devices are not supported in this browser. Please use a modern browser.");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const deviceList = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = deviceList
        .filter((device) => device.kind === "audioinput")
        .map((device) => ({
          deviceId: device.deviceId,
          label: device.label || `Audio Input ${device.deviceId.slice(0, 8)}`,
          kind: device.kind as "audioinput",
          isExternal: isExternalDevice(device.label || ""),
        }));

      const externalDevices = audioInputs.filter(d => d.isExternal);
      const builtInDevices = audioInputs.filter(d => !d.isExternal);
      const hasExternal = externalDevices.length > 0;
      
      setDevices(audioInputs);
      setHasExternalDevice(hasExternal);

      const previousDevices = previousDevicesRef.current;
      const previousExternalDevices = previousDevices.filter(d => d.isExternal);
      const isFirstLoad = isInitialLoadRef.current;
      
      const newExternalDevice = !isFirstLoad ? externalDevices.find(
        d => !previousExternalDevices.some(pd => pd.deviceId === d.deviceId)
      ) : null;
      
      const externalDisconnected = !isFirstLoad && 
        previousExternalDevices.length > 0 && 
        externalDevices.length === 0;

      previousDevicesRef.current = audioInputs;
      isInitialLoadRef.current = false;

      setSelectedDeviceId(currentSelectedId => {
        const currentAutoSwitch = autoSwitchRef.current;
        
        if (currentAutoSwitch) {
          if (newExternalDevice) {
            localStorage.setItem("selectedAudioDevice", newExternalDevice.deviceId);
            return newExternalDevice.deviceId;
          } else if (externalDisconnected && builtInDevices.length > 0) {
            localStorage.setItem("selectedAudioDevice", builtInDevices[0].deviceId);
            return builtInDevices[0].deviceId;
          } else if (!currentSelectedId || !audioInputs.some(d => d.deviceId === currentSelectedId)) {
            if (hasExternal) {
              localStorage.setItem("selectedAudioDevice", externalDevices[0].deviceId);
              return externalDevices[0].deviceId;
            } else if (builtInDevices.length > 0) {
              localStorage.setItem("selectedAudioDevice", builtInDevices[0].deviceId);
              return builtInDevices[0].deviceId;
            }
          }
        } else {
          const savedDeviceId = localStorage.getItem("selectedAudioDevice");
          if (savedDeviceId && audioInputs.some((d) => d.deviceId === savedDeviceId)) {
            return savedDeviceId;
          } else if (!currentSelectedId && audioInputs.length > 0) {
            return audioInputs[0].deviceId;
          }
        }
        
        if (currentSelectedId && audioInputs.some(d => d.deviceId === currentSelectedId)) {
          return currentSelectedId;
        }
        
        return currentSelectedId;
      });

      if (audioInputs.some((d) => d.label !== "" && !d.label.startsWith("Audio Input"))) {
        setHasPermission(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to enumerate devices");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isMediaDevicesSupported()) {
      setError("Audio devices are not supported in this browser.");
      return;
    }
    
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setHasPermission(true);
      await enumerateDevices();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Permission denied";
      if (errorMessage.includes("NotAllowedError") || errorMessage.includes("Permission")) {
        setError("Microphone access was denied. Please allow access in your browser settings.");
      } else {
        setError(errorMessage);
      }
      setHasPermission(false);
    }
  }, [enumerateDevices]);

  const selectDevice = useCallback((deviceId: string) => {
    setSelectedDeviceId(deviceId);
    localStorage.setItem("selectedAudioDevice", deviceId);
  }, []);

  const toggleAutoSwitch = useCallback((enabled: boolean) => {
    setAutoSwitch(enabled);
    localStorage.setItem("audioAutoSwitch", String(enabled));
    if (enabled) {
      isInitialLoadRef.current = false;
      enumerateDevices();
    }
  }, [enumerateDevices]);

  const refreshDevices = useCallback(async () => {
    await enumerateDevices();
  }, [enumerateDevices]);

  useEffect(() => {
    enumerateDevices();

    if (!isMediaDevicesSupported()) {
      return;
    }

    const handleDeviceChange = () => {
      enumerateDevices();
    };

    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange);
    };
  }, [enumerateDevices]);

  const selectedDevice = devices.find(d => d.deviceId === selectedDeviceId) || null;

  return {
    devices,
    selectedDeviceId,
    selectedDevice,
    isLoading,
    error,
    hasPermission,
    autoSwitch,
    hasExternalDevice,
    selectDevice,
    toggleAutoSwitch,
    refreshDevices,
    requestPermission,
  };
}
