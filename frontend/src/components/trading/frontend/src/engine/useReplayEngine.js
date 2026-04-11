import { useState, useRef, useCallback, useEffect } from "react";

const SPEEDS = [1, 2, 5, 10, 25, 50];

export function useReplayEngine({ totalBars, initialIndex = 10, onTick }) {
  const [index, setIndex] = useState(initialIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(0);

  const intervalRef = useRef(null);

  const speed = SPEEDS[speedIdx];

  const stepForward = useCallback(() => {
    setIndex((prev) => {
      const next = Math.min(prev + 1, totalBars);
      return next;
    });
  }, [totalBars]);

  const stepBackward = useCallback(() => {
    setIndex((prev) => Math.max(prev - 1, 1));
  }, []);

  const play = useCallback(() => setIsPlaying(true), []);
  const pause = useCallback(() => setIsPlaying(false), []);

  const reset = useCallback(() => {
    setIsPlaying(false);
    setIndex(initialIndex);
  }, [initialIndex]);

  const jumpToStart = useCallback(() => {
    setIsPlaying(false);
    setIndex(initialIndex);
  }, [initialIndex]);

  const jumpToEnd = useCallback(() => {
    setIsPlaying(false);
    setIndex(totalBars);
  }, [totalBars]);

  const cycleSpeed = useCallback(() => {
    setSpeedIdx((i) => (i + 1) % SPEEDS.length);
  }, []);

  // Main replay loop
  useEffect(() => {
    if (!isPlaying) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    const ms = Math.max(20, 500 / speed);

    intervalRef.current = setInterval(() => {
      setIndex((prev) => {
        if (prev >= totalBars) {
          setIsPlaying(false);
          return prev;
        }

        const next = prev + 1;

        if (onTick) {
          onTick(next);
        }

        return next;
      });
    }, ms);

    return () => clearInterval(intervalRef.current);
  }, [isPlaying, speed, totalBars, onTick]);

  return {
    index,
    isPlaying,
    speed,
    speedIdx,

    stepForward,
    stepBackward,
    play,
    pause,
    reset,
    jumpToStart,
    jumpToEnd,
    cycleSpeed,

    setIndex,
  };
}
