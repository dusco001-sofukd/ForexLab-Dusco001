import { useState, useRef, useEffect, useCallback } from "react";

export function useReplayEngine({ data, initialIndex = 10 }) {
  const [index, setIndex] = useState(initialIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const intervalRef = useRef(null);

  const play = () => setIsPlaying(true);
  const pause = () => setIsPlaying(false);

  const stepForward = () => {
    setIndex((i) => Math.min(i + 1, data.length));
  };

  const stepBackward = () => {
    setIndex((i) => Math.max(i - 1, 1));
  };

  useEffect(() => {
    if (!isPlaying) {
      clearInterval(intervalRef.current);
      return;
    }

    const ms = Math.max(20, 500 / speed);

    intervalRef.current = setInterval(() => {
      setIndex((i) => {
        if (i >= data.length) {
          setIsPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, ms);

    return () => clearInterval(intervalRef.current);
  }, [isPlaying, speed, data]);

  return {
    index,
    isPlaying,
    speed,
    setSpeed,
    setIndex,
    play,
    pause,
    stepForward,
    stepBackward,
  };
}
