import { useCallback, useEffect, useState } from "react";
import type { DayMarkTask, DayMarkTaskInput, TaskStatus } from "../types/daymark";
import {
  createDayMarkTask,
  createDayMarkTasks,
  deleteDayMarkTask,
  listDayMarkTasksByDate,
  updateDayMarkTask,
} from "../services/daymarkTasksService";
import { sortTasksByTime } from "../utils/daymarkUtils";

type UseDayMarkTasksParams = {
  date: string;
  userId?: string;
};

export function useDayMarkTasks({ date, userId }: UseDayMarkTasksParams) {
  const [tasks, setTasks] = useState<DayMarkTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const loadTasks = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError("");

    try {
      const nextTasks = await listDayMarkTasksByDate(userId, date);
      setTasks(sortTasksByTime(nextTasks));
    } catch (loadError) {
      console.error(loadError);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không tải được nhiệm vụ DayMark."
      );
    } finally {
      setIsLoading(false);
    }
  }, [date, userId]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadTasks();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [loadTasks]);

  async function createTask(input: DayMarkTaskInput) {
    if (!userId) return false;

    setError("");

    try {
      const createdTask = await createDayMarkTask(userId, input);
      setTasks((prev) => sortTasksByTime([...prev, createdTask]));
      return true;
    } catch (createError) {
      console.error(createError);
      setError(
        createError instanceof Error
          ? createError.message
          : "Không thêm được nhiệm vụ."
      );
      return false;
    }
  }

  async function createTasks(inputs: DayMarkTaskInput[]) {
    if (!userId) return false;

    setError("");

    try {
      const createdTasks = await createDayMarkTasks(userId, inputs);
      setTasks((prev) => sortTasksByTime([...prev, ...createdTasks]));
      return true;
    } catch (createError) {
      console.error(createError);
      setError(
        createError instanceof Error
          ? createError.message
          : "Không nhập được lịch từ văn bản."
      );
      return false;
    }
  }

  async function updateTask(taskId: string, input: Partial<DayMarkTaskInput>) {
    setError("");

    try {
      const updatedTask = await updateDayMarkTask(taskId, input);
      setTasks((prev) =>
        sortTasksByTime(
          prev.map((task) => (task.id === taskId ? updatedTask : task))
        )
      );
      return true;
    } catch (updateError) {
      console.error(updateError);
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Không cập nhật được nhiệm vụ."
      );
      await loadTasks();
      return false;
    }
  }

  async function updateTaskStatus(taskId: string, status: TaskStatus) {
    const previousTasks = tasks;

    setTasks((prev) =>
      prev.map((task) => (task.id === taskId ? { ...task, status } : task))
    );

    const success = await updateTask(taskId, { status });

    if (!success) {
      setTasks(previousTasks);
    }

    return success;
  }

  async function deleteTask(taskId: string) {
    const previousTasks = tasks;

    setError("");
    setTasks((prev) => prev.filter((task) => task.id !== taskId));

    try {
      await deleteDayMarkTask(taskId);
      return true;
    } catch (deleteError) {
      console.error(deleteError);
      setTasks(previousTasks);
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Không xóa được nhiệm vụ."
      );
      return false;
    }
  }

  return {
    createTask,
    createTasks,
    deleteTask,
    error,
    isLoading,
    loadTasks,
    tasks,
    updateTask,
    updateTaskStatus,
  };
}
