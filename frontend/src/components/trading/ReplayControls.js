import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, SkipForward, SkipBack, RotateCcw, ChevronFirst, ChevronLast } from "lucide-react";

const SPEEDS = [1, 2, 5, 10, 25, 50];

export default function ReplayControls({ totalBars, visibleBars, onVisibleBarsChange, onReset }) {
  const [playing, setPlaying] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(0);
  const intervalRef = useRef(null);
  const speed = SPEEDS[speedIdx];

  const stepForward = useCallback(() => {
    onVisibleBarsChange((prev) => Math.min(prev + 1, totalBars));
  }, [totalBars, onVisibleBarsChange]);

  const stepBackward = useCallback(() => {
    onVisibleBarsChange((prev) => Math.max(prev - 1, 1));
  }, [onVisibleBarsChange]);

  useEffect(() => {
    if (playing) {
      const ms = Math.max(20, 500 / speed);
      intervalRef.current = setInterval(() => {
        onVisibleBarsChange((prev) => {
          if (prev >= totalBars) {
            setPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, ms);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, speed, totalBars, onVisibleBarsChange]);

  const togglePlay = () => setPlaying((p) => !p);

  const cycleSpeed = () => setSpeedIdx((i) => (i + 1) % SPEEDS.length);

  const jumpToStart = () => { setPlaying(false); onVisibleBarsChange(10); };
  const jumpToEnd = () => { setPlaying(false); onVisibleBarsChange(totalBars); };

  const handleReset = () => {
    setPlaying(false);
    onVisibleBarsChange(10);
    if (onReset) onReset();
  };

  const progress = totalBars > 0 ? (visibleBars / totalBars) * 100 : 0;

  return (
    <div className="flex items-center gap-0 border-t border-black bg-white" data-testid="replay-controls">
      {/* Progress bar */}
      <div className="flex-1 h-1 bg-neutral-200 cursor-pointer relative group" data-testid="replay-progress-bar"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const pct = (e.clientX - rect.left) / rect.width;
          const bar = Math.max(1, Math.round(pct * totalBars));
          setPlaying(false);
          onVisibleBarsChange(bar);
        }}
      >
        <div className="h-full bg-black transition-all duration-75" style={{ width: `${progress}%` }} />
      </div>

      <div className="flex items-center border-l border-black">
        <ControlBtn data-testid="replay-jump-start" onClick={jumpToStart} title="Jump to start">
          <ChevronFirst size={16} />
        </ControlBtn>
        <ControlBtn data-testid="replay-step-back" onClick={stepBackward} title="Step back">
          <SkipBack size={16} />
        </ControlBtn>
        <ControlBtn data-testid="replay-play-pause" onClick={togglePlay} title={playing ? "Pause" : "Play"} active={playing}>
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </ControlBtn>
        <ControlBtn data-testid="replay-step-forward" onClick={stepForward} title="Step forward">
          <SkipForward size={16} />
        </ControlBtn>
        <ControlBtn data-testid="replay-jump-end" onClick={jumpToEnd} title="Jump to end">
          <ChevronLast size={16} />
        </ControlBtn>
        <button
          data-testid="replay-speed"
          onClick={cycleSpeed}
          className="h-10 px-4 font-mono text-xs font-bold border-l border-black hover:bg-neutral-100 transition-colors duration-150"
          title="Change speed"
        >
          {speed}X
        </button>
        <ControlBtn data-testid="replay-reset" onClick={handleReset} title="Reset">
          <RotateCcw size={14} />
        </ControlBtn>
        <div className="h-10 px-4 flex items-center font-mono text-xs text-black/60 border-l border-black" data-testid="replay-bar-count">
          {visibleBars} / {totalBars}
        </div>
      </div>
    </div>
  );
}

function ControlBtn({ children, active, ...props }) {
  return (
    <button
      className={`h-10 w-10 flex items-center justify-center border-l border-black transition-colors duration-150 ${
        active ? "bg-black text-white" : "bg-white text-black hover:bg-neutral-100"
      }`}
      {...props}
    >
      {children}
    </button>
  );
}
