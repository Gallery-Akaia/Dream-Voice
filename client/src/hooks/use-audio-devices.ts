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
  ];
  
  const builtInKeywords = [
    'built-in',
    'built in',
    'internal',
    'default',
    'iphone microphone',
    'android',
    'phone',
    'device microphone',
  ];
  
  if (builtInKeywords.some(keyword => lowerLabel.includes(keyword))) {
    return false;
  }
  
  if (externalKeywords.some(keyword => lowerLabel.includes(keyword))) {
    return true;
  }
  
  return false;
}

export function useAudioDevices() {
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [autoSwitch, setAutoSwitch] = useState(() => {
    const saved = localStorage.getItem("audioAutoSwitch");
    return saved !== null ? saved === "true" : true;
  });
  const [hasExternalDevice, setHasExternalDevice] = useState(false);
  const previousDevicesRef = useRef<AudioDevice[]>([]);

  const enumerateDevices = useCallback(async () => {
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
      
      const newExternalDevice = externalDevices.find(
        d => !previousExternalDevices.some(pd => pd.deviceId === d.deviceId)
      );
      
      const externalDisconnected = previousExternalDevices.length > 0 && 
        externalDevices.length === 0;

      previousDevicesRef.current = audioInputs;

      if (autoSwitch) {
        if (newExternalDevice) {
          setSelectedDeviceId(newExternalDevice.deviceId);
          localStorage.setItem("selectedAudioDevice", newExternalDevice.deviceId);
        } else if (externalDisconnected && builtInDevices.length > 0) {
          setSelectedDeviceId(builtInDevices[0].deviceId);
          localStorage.setItem("selectedAudioDevice", builtInDevices[0].deviceId);
        } else if (hasExternal && !selectedDeviceId) {
          setSelectedDeviceId(externalDevices[0].deviceId);
          localStorage.setItem("selectedAudioDevice", externalDevices[0].deviceId);
        } else if (!hasExternal && builtInDevices.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(builtInDevices[0].deviceId);
          localStorage.setItem("selectedAudioDevice", builtInDevices[0].deviceId);
        }
      } else {
        const savedDeviceId = localStorage.getItem("selectedAudioDevice");
        if (savedDeviceId && audioInputs.some((d) => d.deviceId === savedDeviceId)) {
          setSelectedDeviceId(savedDeviceId);
        } else if (audioInputs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(audioInputs[0].deviceId);
        }
      }

      if (audioInputs.some((d) => d.label !== "")) {
        setHasPermission(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to enumerate devices");
    } finally {
      setIsLoading(false);
    }
  }, [selectedDeviceId, autoSwitch]);

  const requestPermission = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setHasPermission(true);
      await enumerateDevices();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Permission denied");
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
      enumerateDevices();
    }
  }, [enumerateDevices]);

  const refreshDevices = useCallback(async () => {
    await enumerateDevices();
  }, [enumerateDevices]);

  useEffect(() => {
    enumerateDevices();

    const handleDeviceChange = () => {
      enumerateDevices();
    };

    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange);
    };
  }, [enumerateDevices]);

  const selectedDevice = devices.find(d => d.deviceId === selectedDeviceId);

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
