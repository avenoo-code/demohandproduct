import { useCallback, useEffect, useRef, useState } from "react";

export type AudioMetrics = {
  available: boolean;
  micDenied: boolean;
  volume: number;
  lowEnergy: number;
  midEnergy: number;
  highEnergy: number;
  speakingActive: boolean;
  silenceDuration: number;
  peakIntensity: number;
  averageIntensity: number;
};

const DEFAULT_METRICS: AudioMetrics = {
  available: false,
  micDenied: false,
  volume: 0,
  lowEnergy: 0,
  midEnergy: 0,
  highEnergy: 0,
  speakingActive: false,
  silenceDuration: 0,
  peakIntensity: 0,
  averageIntensity: 0,
};

export function useAudioMetrics() {
  const [metrics, setMetrics] = useState<AudioMetrics>(DEFAULT_METRICS);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const samplesRef = useRef(0);
  const sumIntensityRef = useRef(0);
  const lastSpeechAtRef = useRef(0);

  const stop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    analyserRef.current?.disconnect();
    analyserRef.current = null;
    audioContextRef.current?.close();
    audioContextRef.current = null;
  }, []);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.85;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      samplesRef.current = 0;
      sumIntensityRef.current = 0;
      lastSpeechAtRef.current = performance.now();

      const frequencyBuffer = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(frequencyBuffer);
        const normalized = Array.from(frequencyBuffer, (value) => value / 255);

        const volume = normalized.reduce((acc, value) => acc + value, 0) / normalized.length;
        const lowEnergy = averageSlice(normalized, 0, 0.2);
        const midEnergy = averageSlice(normalized, 0.2, 0.55);
        const highEnergy = averageSlice(normalized, 0.55, 1);

        samplesRef.current += 1;
        sumIntensityRef.current += volume;
        const averageIntensity = sumIntensityRef.current / samplesRef.current;

        const speakingActive = volume > 0.08;
        if (speakingActive) {
          lastSpeechAtRef.current = performance.now();
        }

        setMetrics((prev) => ({
          available: true,
          micDenied: false,
          volume,
          lowEnergy,
          midEnergy,
          highEnergy,
          speakingActive,
          silenceDuration: (performance.now() - lastSpeechAtRef.current) / 1000,
          peakIntensity: Math.max(prev.peakIntensity, volume),
          averageIntensity,
        }));

        rafRef.current = requestAnimationFrame(tick);
      };

      tick();
      return true;
    } catch {
      setMetrics((prev) => ({
        ...prev,
        available: false,
        micDenied: true,
      }));
      return false;
    }
  }, []);

  const resetSessionStats = useCallback(() => {
    samplesRef.current = 0;
    sumIntensityRef.current = 0;
    setMetrics((prev) => ({
      ...prev,
      peakIntensity: 0,
      averageIntensity: 0,
      silenceDuration: 0,
    }));
  }, []);

  useEffect(() => stop, [stop]);

  return {
    metrics,
    start,
    stop,
    resetSessionStats,
  };
}

function averageSlice(values: Uint8Array | number[], start: number, end: number): number {
  const from = Math.floor(values.length * start);
  const to = Math.max(from + 1, Math.floor(values.length * end));
  let sum = 0;
  for (let i = from; i < to; i += 1) {
    sum += values[i];
  }
  return sum / (to - from);
}
