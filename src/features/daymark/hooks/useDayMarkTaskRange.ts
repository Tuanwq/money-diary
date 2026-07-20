import { useEffect, useState } from "react";
import type { DayMarkTask } from "../types/daymark";
import { listDayMarkTasksInRange } from "../services/daymarkTasksService";

type UseDayMarkTaskRangeParams = {
  fromDate: string;
  toDate: string;
  userId?: string;
};

export function useDayMarkTaskRange({
  fromDate,
  toDate,
  userId,
}: UseDayMarkTaskRangeParams) {
  const [tasks, setTasks] = useState<DayMarkTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) return;

    let ignore = false;
    const activeUserId = userId;

    async function loadTasks() {
      setIsLoading(true);
      setError("");

      try {
        const nextTasks = await listDayMarkTasksInRange(
          activeUserId,
          fromDate,
          toDate
        );

        if (!ignore) {
          setTasks(nextTasks);
        }
      } catch (loadError) {
        console.error(loadError);

        if (!ignore) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Không tải được thống kê DayMark."
          );
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadTasks();

    return () => {
      ignore = true;
    };
  }, [fromDate, toDate, userId]);

  return {
    error,
    isLoading,
    tasks,
  };
}
