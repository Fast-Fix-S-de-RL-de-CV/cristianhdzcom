"use client";
import { useEffect, useMemo, useState } from "react";
import { Play } from "lucide-react";
import { parseVideo } from "@/lib/marketing";

/**
 * Miniatura de un video por su link.
 *  - YouTube: thumbnail directo (img.youtube.com).
 *  - Vimeo: se pide el thumbnail por oEmbed (async).
 *  - Otro: placeholder con ▶.
 */
export function VideoThumb({ url, height = 96 }: { url: string; height?: number }) {
  const info = useMemo(() => parseVideo(url), [url]);
  const [vimeoThumb, setVimeoThumb] = useState("");

  useEffect(() => {
    setVimeoThumb("");
    if (info.kind !== "vimeo") return;
    let cancel = false;
    fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}&width=480`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!cancel && j?.thumbnail_url) setVimeoThumb(j.thumbnail_url as string);
      })
      .catch(() => {});
    return () => {
      cancel = true;
    };
  }, [url, info.kind]);

  const thumb = info.kind === "vimeo" ? vimeoThumb : info.thumb;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mk-video"
      style={{ height }}
      onClick={(e) => e.stopPropagation()}
      title="Abrir video"
    >
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumb} alt="" />
      ) : (
        <div className="mk-video-ph" />
      )}
      <span className="mk-video-play">
        <Play size={16} fill="currentColor" />
      </span>
    </a>
  );
}
