import { useEffect, useRef, useState } from "react";

export function useConfirmSheet() {
  const [prompt, setPrompt] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const resolve = useRef<((value: boolean) => void) | null>(null);

  function confirm(message: string): Promise<boolean> {
    setPrompt(message);
    return new Promise(answer => {
      resolve.current = answer;
    });
  }

  function close(value: boolean) {
    const answer = resolve.current;
    resolve.current = null;
    answer?.(value);
    dialog.current?.close();
    setPrompt("");
  }

  useEffect(() => {
    if (!prompt) return;
    const element = dialog.current;
    if (element && !element.open) element.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [prompt]);

  const sheet = <dialog
    ref={dialog}
    className="mobile-dialog confirm-sheet"
    aria-label="Xác nhận thao tác"
    onCancel={event => {
      event.preventDefault();
      close(false);
    }}
    onClose={() => {
      resolve.current?.(false);
      resolve.current = null;
      setPrompt("");
    }}
  >
    <div className="dialog-content editor-stack">
      <div className="dialog-handle" aria-hidden="true" />
      <div className="dialog-heading">
        <h2>Xác nhận</h2>
        <button type="button" aria-label="Đóng" onClick={() => close(false)}>×</button>
      </div>
      <p>{prompt}</p>
      <div className="actions">
        <button className="button" onClick={() => close(true)}>Tiếp tục</button>
        <button className="button-outline" onClick={() => close(false)}>Hủy</button>
      </div>
    </div>
  </dialog>;

  return { confirm, sheet };
}
