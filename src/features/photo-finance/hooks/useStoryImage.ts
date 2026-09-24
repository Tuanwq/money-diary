import { useEffect, useState } from "react";
import type { createPhotoAttachmentRepository } from "../services/photoAttachmentRepository.ts";

type Repository = ReturnType<typeof createPhotoAttachmentRepository>;

export function useStoryImage(path: string | undefined, repository: Repository) {
  const [state, setState] = useState({ path: "", url: "", error: "", attempt: 0 });
  const retry = () => {
    if (path) repository.invalidateImage(path);
    setState((current) => ({ ...current, url: "", error: "", attempt: current.attempt + 1 }));
  };
  const fail = () => {
    if (!path) return;
    repository.invalidateImage(path);
    setState((current) => ({ ...current, path, url: "", error: "Ảnh chưa tải được. Hãy thử lại." }));
  };
  useEffect(() => {
    if (!path) return;
    let active = true;
    void repository.signedImage(path).then((url) => {
      if (active) setState((current) => ({ ...current, path, url, error: "" }));
    }).catch(() => {
      if (active) setState((current) => ({ ...current, path, url: "", error: "Không tải được ảnh riêng tư." }));
    });
    return () => { active = false; };
  }, [path, repository, state.attempt]);
  return { url: state.path === path ? state.url : "", error: state.path === path ? state.error : "", retry, fail };
}
