/** Nested photo dialogs can close in any order, including route unmounts. */
export function createPhotoDialogLock() {
  const locks: symbol[] = [];
  let originalOverflow = "";
  return (style: { overflow: string }) => {
    if (locks.length === 0) originalOverflow = style.overflow;
    const token = Symbol();
    locks.push(token);
    style.overflow = "hidden";
    return {
      isTop: () => locks.at(-1) === token,
      release: () => {
        const index = locks.indexOf(token);
        if (index === -1) return;
        locks.splice(index, 1);
        if (locks.length === 0) style.overflow = originalOverflow;
      },
    };
  };
}

export const lockPhotoDialog = createPhotoDialogLock();
