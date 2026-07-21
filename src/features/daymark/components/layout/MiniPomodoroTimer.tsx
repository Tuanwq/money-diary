import { Timer } from "lucide-react";
import { useEffect, useState } from "react";
import {
  formatPomodoroClock,
  getDisplayRemainingSeconds,
  getPomodoroModeLabel,
  isPomodoroActive,
  readStoredPomodoroState,
} from "../../utils/pomodoroUtils";

type MiniPomodoroTimerProps = {
  onOpen: () => void;
};

export function MiniPomodoroTimer({ onOpen }: MiniPomodoroTimerProps) {
  const [state, setState] = useState(readStoredPomodoroState);
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    const updateTimer = () => {
      setState(readStoredPomodoroState());
      setNowMs(Date.now());
    };

    const timeout = window.setTimeout(updateTimer, 0);
    const interval = window.setInterval(updateTimer, 1000);

    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, []);

  if (!isPomodoroActive(state.status)) return null;

  const remainingSeconds =
    nowMs === null ? state.remainingSeconds : getDisplayRemainingSeconds(state, nowMs);

  return (
    <button type="button" onClick={onOpen} className="daymark-mini-timer">
      <Timer aria-hidden="true" size={16} />
      <span>{getPomodoroModeLabel(state.mode)}</span>
      <strong>{formatPomodoroClock(remainingSeconds)}</strong>
    </button>
  );
}
