"use client";

import { useEffect } from "react";
import { resolveEatmapMediaUrl } from "@/lib/base-path";

export function ImageLightbox({
  src,
  alt,
  open,
  onClose,
}: {
  src: string | null;
  alt?: string;
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !src) return null;
  const resolved = resolveEatmapMediaUrl(src);

  return (
    <button
      type="button"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4"
      aria-label="关闭大图"
      onClick={onClose}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={resolved} alt={alt ?? ""} className="max-h-[92vh] max-w-full object-contain" />
    </button>
  );
}
