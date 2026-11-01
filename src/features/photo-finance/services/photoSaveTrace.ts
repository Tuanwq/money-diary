export type PhotoSaveStage = "prepare" | "ledger" | "authorization" | "display" | "thumbnail" | "metadata";

const LABELS: Record<PhotoSaveStage, string> = {
  prepare: "Kiểm tra kho ảnh",
  ledger: "Lưu giao dịch",
  authorization: "Xác thực",
  display: "Tải ảnh chính",
  thumbnail: "Tải ảnh thu nhỏ",
  metadata: "Ghi liên kết ảnh",
};

type StageTiming = { stage: PhotoSaveStage; elapsedMs: number; attempts: number; bytes: number };

export function photoSaveStageLabel(stage: PhotoSaveStage) { return LABELS[stage]; }

/** Timings contain no photo, account, transaction or storage identifiers. */
export function createPhotoSaveTrace(onStageStart?: (stage: PhotoSaveStage) => void,
  clock: () => number = () => globalThis.performance?.now() ?? Date.now()) {
  const started = clock();
  const timings = new Map<PhotoSaveStage, StageTiming>();
  let failedStage: PhotoSaveStage | undefined;

  async function measure<T>(stage: PhotoSaveStage, operation: () => PromiseLike<T> | T,
    bytes = 0): Promise<T> {
    const timing = timings.get(stage) ?? { stage, elapsedMs: 0, attempts: 0, bytes: 0 };
    timing.attempts += 1;
    timing.bytes = Math.max(timing.bytes, bytes);
    timings.set(stage, timing);
    onStageStart?.(stage);
    const stepStarted = clock();
    try {
      const result = await operation();
      if (failedStage === stage) failedStage = undefined;
      return result;
    }
    catch (cause) { failedStage = stage; throw cause; }
    finally { timing.elapsedMs += Math.max(0, clock() - stepStarted); }
  }

  function report() {
    const steps = [...timings.values()];
    const slowest = steps.reduce<StageTiming | undefined>((previous, current) =>
      !previous || current.elapsedMs > previous.elapsedMs ? current : previous, undefined);
    return { totalMs: Math.max(0, clock() - started), steps, slowest, failedStage };
  }

  return { measure, report };
}

export type PhotoSaveTrace = ReturnType<typeof createPhotoSaveTrace>;

export function formatPhotoSaveReport(trace: PhotoSaveTrace) {
  const result = trace.report();
  const seconds = (milliseconds: number) => `${(milliseconds / 1000).toFixed(1)} giây`;
  const stages = result.steps.map((step) => `${LABELS[step.stage]} ${seconds(step.elapsedMs)}` +
    (step.attempts > 1 ? ` (${step.attempts} lần)` : ""));
  return `Tổng ${seconds(result.totalMs)} · ${stages.join(" · ")}`;
}
