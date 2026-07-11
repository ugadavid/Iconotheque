export type VideoThumbnailProbeResult =
  | { ok: true; dataUrl: string; width: number; height: number }
  | { ok: false; error: string };

/**
 * Prototype renderer-only: extracts one frame in memory, without cache or DB writes.
 * Call only after an explicit user action with an iconotheque-image:// video URL.
 */
export function probeMidjourneyVideoFrame(videoUrl: string): Promise<VideoThumbnailProbeResult> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const timeoutId = window.setTimeout(() => finish({ ok: false, error: "Délai de chargement vidéo dépassé." }), 15000);
    let finished = false;

    function finish(result: VideoThumbnailProbeResult): void {
      if (finished) return;
      finished = true;
      window.clearTimeout(timeoutId);
      video.removeAttribute("src");
      video.load();
      resolve(result);
    }

    video.crossOrigin = "anonymous";
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = () => {
      if (!Number.isFinite(video.duration) || video.videoWidth === 0 || video.videoHeight === 0) {
        finish({ ok: false, error: "Métadonnées vidéo inexploitables." });
        return;
      }
      video.currentTime = Math.min(0.2, Math.max(0, video.duration / 2));
    };
    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext("2d");
        if (!context) return finish({ ok: false, error: "Canvas 2D indisponible." });
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        finish({ ok: true, dataUrl: canvas.toDataURL("image/png"), width: canvas.width, height: canvas.height });
      } catch (error) {
        finish({ ok: false, error: error instanceof Error ? error.message : "Canvas bloqué par la sécurité." });
      }
    };
    video.onerror = () => finish({ ok: false, error: "Chargement vidéo impossible." });
    video.src = videoUrl;
  });
}
