import { useEffect, useState } from "react";
import {
  readStreakCompletionRate,
  writeStreakCompletionRate,
} from "../utils/daymarkStreak";

export function useDayMarkStreakSettings() {
  const [requiredCompletionRate, setRequiredCompletionRate] = useState(
    readStreakCompletionRate
  );

  useEffect(() => {
    function syncRate() {
      setRequiredCompletionRate(readStreakCompletionRate());
    }

    window.addEventListener("storage", syncRate);
    window.addEventListener("daymark-streak-rate-change", syncRate);

    return () => {
      window.removeEventListener("storage", syncRate);
      window.removeEventListener("daymark-streak-rate-change", syncRate);
    };
  }, []);

  function updateRequiredCompletionRate(value: number) {
    setRequiredCompletionRate(writeStreakCompletionRate(value));
  }

  return {
    requiredCompletionRate,
    updateRequiredCompletionRate,
  };
}
