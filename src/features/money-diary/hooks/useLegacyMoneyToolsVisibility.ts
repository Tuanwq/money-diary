import { useState } from "react";
import { safeSetStorageItem } from "../../../utils/safeStorage";

const STORAGE_KEY = "money-diary-legacy-money-tools-visible";

function readVisibility(userId: string | undefined) {
  if (!userId) return false;
  try {
    return localStorage.getItem(`${STORAGE_KEY}:${userId}`) === "true";
  } catch {
    return false;
  }
}

export function useLegacyMoneyToolsVisibility(userId: string | undefined) {
  const [visibilityByUser, setVisibilityByUser] = useState<Record<string, boolean>>({});
  const visible = userId
    ? visibilityByUser[userId] ?? readVisibility(userId)
    : false;

  function setLegacyMoneyToolsVisible(next: boolean) {
    if (!userId) return;
    setVisibilityByUser((current) => ({ ...current, [userId]: next }));
    safeSetStorageItem(`${STORAGE_KEY}:${userId}`, String(next));
  }

  return { legacyMoneyToolsVisible: visible, setLegacyMoneyToolsVisible };
}
