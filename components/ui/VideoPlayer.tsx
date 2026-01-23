"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import Slider from "rc-slider";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Scissors,
  Download,
} from "lucide-react";

interface VideoPlayerProps {
  src: string;
  onOutputChanged?: (blob: Blob) => void;
  onDownload?: () => void;
  onResetTrim?: () => void;
}

const formatTime = (seconds: number) => {
  if (isNaN(seconds)) {
    return "00:00";
  }
  const date = new Date(seconds * 1000);
  const hh = date.getUTCHours();
  const mm = date.getUTCMinutes();
  const ss = date.getUTCSeconds().toString().padStart(2, "0");
  if (hh) {
    return `${hh}:${mm.toString().padStart(2, "0")}:${ss}`;
  }
  return `${mm}:${ss}`;
};

export default function VideoPlayer({
  src,
  onOutputChanged,
  onDownload,
  onResetTrim,
}: VideoPlayerProps) {
  const playerRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [played, setPlayed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [trimRange, setTrimRange] = useState<[number, number]>([0, 0]);
  const [isTrimmed, setIsTrimmed] = useState(false);
  const [effectiveDuration, setEffectiveDuration] = useState(0);
  const [effectiveStartTime, setEffectiveStartTime] = useState(0);
  const [showTrimBar, setShowTrimBar] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    setIsTrimmed(false);
    setTrimRange([0, 0]);
    setDuration(0);
    setEffectiveDuration(0);
    setEffectiveStartTime(0);
    setPlayed(0);
    setSeeking(false);
    try {
      playerRef.current?.load?.();
    } catch {}
  }, [src]);

  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.muted = muted;
      playerRef.current.volume = volume;
    }
  }, [muted, volume]);

  const handlePlayPause = () => {
    if (!playerRef.current) return;
    setPlaying((p) => {
      const next = !p;
      if (next) {
        playerRef.current?.play().catch(() => {});
      } else {
        playerRef.current?.pause();
      }
      return next;
    });
  };

  const handleVolumeChange = (value: number | number[]) => {
    const newVolume = Array.isArray(value) ? value[0] : value;
    setVolume(newVolume);
    setMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    setVolume((prev) => (nextMuted ? 0 : prev === 0 ? 0.8 : prev));
  };

  const handleTimeUpdate = () => {
    const current = playerRef.current?.currentTime ?? 0;
    const rawTotal = playerRef.current?.duration;
    const total = Number.isFinite(rawTotal) && rawTotal ? rawTotal : duration;
    if (!seeking) {
      const denomRaw = isTrimmed ? effectiveDuration : total;
      const denom = Number.isFinite(denomRaw) && denomRaw > 0 ? denomRaw : 1;
      const numerator = current - (isTrimmed ? effectiveStartTime : 0);
      const fraction = Math.min(Math.max(numerator / denom, 0), 1);
      setPlayed(fraction);
      if (isTrimmed) {
        const endTime = effectiveStartTime + effectiveDuration;
        if (current >= endTime) {
          if (isRecording) {
            return;
          }
          const startTime = effectiveStartTime;
          if (playerRef.current) {
            if (typeof playerRef.current.fastSeek === "function") {
              playerRef.current.fastSeek(startTime);
            } else {
              playerRef.current.currentTime = startTime;
            }
            try {
              playerRef.current.play();
            } catch {}
          }
          setPlayed(0);
        }
      }
    }
  };

  const handleLoadedMetadata = () => {
    const video = playerRef.current;
    if (!video) return;
    const raw = video.duration;
    if (!Number.isFinite(raw) || raw === Infinity || raw === 0) {
      const onSeeked = () => {
        const fixed = video.duration;
        const computed =
          Number.isFinite(fixed) && fixed > 0 ? fixed : video.currentTime || 0;
        setDuration(computed);
        setTrimRange([0, computed]);
        setEffectiveDuration(computed);
        setEffectiveStartTime(0);
        video.removeEventListener("seeked", onSeeked);
        try {
          if (typeof video.fastSeek === "function") {
            video.fastSeek(0);
          } else {
            video.currentTime = 0;
          }
        } catch {}
      };
      video.addEventListener("seeked", onSeeked);
      try {
        video.currentTime = 1e9;
      } catch {}
      return;
    }
    const d = raw;
    setDuration(d);
    setTrimRange([0, d]);
    setEffectiveDuration(d);
    setEffectiveStartTime(0);
  };

  const handleDurationChange = () => {
    const d = playerRef.current?.duration;
    if (Number.isFinite(d) && d && d !== Infinity) {
      setDuration(d);
      setTrimRange([0, d]);
      setEffectiveDuration(d);
      setEffectiveStartTime(0);
    }
  };

  const handleSeekChange = (value: number | number[]) => {
    const newPlayed = Array.isArray(value) ? value[0] : value;
    setPlayed(newPlayed);
    const spanRaw = isTrimmed ? effectiveDuration : duration;
    const span = Number.isFinite(spanRaw) && spanRaw > 0 ? spanRaw : 0;
    const seekToTime = newPlayed * span + (isTrimmed ? effectiveStartTime : 0);
    if (playerRef.current) {
      if (typeof playerRef.current.fastSeek === "function") {
        playerRef.current.fastSeek(seekToTime);
      } else {
        playerRef.current.currentTime = seekToTime;
      }
    }
  };

  const recordSegment = useCallback(
    async (startTime: number, endTime: number) => {
      const video = playerRef.current;
      if (!video || endTime <= startTime) return null;

      try {
        await video.play();
        await new Promise((r) => setTimeout(r, 50));
        video.pause();
      } catch {}

      const v = video as HTMLVideoElement & {
        captureStream?(): MediaStream;
        mozCaptureStream?(): MediaStream;
      };
      const stream: MediaStream | null =
        v.captureStream?.() ?? v.mozCaptureStream?.() ?? null;
      if (!stream) return null;

      const mimeCandidates = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
      ];
      let mimeType = "";
      for (const m of mimeCandidates) {
        if (
          typeof MediaRecorder !== "undefined" &&
          MediaRecorder.isTypeSupported(m)
        ) {
          mimeType = m;
          break;
        }
      }

      const chunks: BlobPart[] = [];
      return await new Promise<Blob | null>((resolve) => {
        let resolved = false;
        const recorder = new MediaRecorder(
          stream,
          mimeType ? { mimeType } : undefined
        );
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };
        recorder.onstop = () => {
          if (resolved) return;
          resolved = true;
          setIsRecording(false);
          const type = recorder.mimeType || mimeType || "video/webm";
          resolve(new Blob(chunks, { type }));
        };
        recorder.onerror = () => {
          if (!resolved) {
            setIsRecording(false);
            resolve(null);
          }
        };

        const onTick = () => {
          const now = playerRef.current?.currentTime ?? 0;
          if (now >= endTime) {
            video.removeEventListener("timeupdate", onTick);
            try {
              recorder.stop();
            } catch {}
            try {
              video.pause();
            } catch {}
          }
        };
        video.addEventListener("timeupdate", onTick);
        if (typeof video.fastSeek === "function") {
          video.fastSeek(startTime);
        } else {
          video.currentTime = startTime;
        }
        try {
          setIsRecording(true);
          recorder.start(200);
        } catch {
          setIsRecording(true);
          recorder.start();
        }
        video.play();
      });
    },
    []
  );

  const handleTrim = useCallback(async () => {
    const startTime = trimRange[0];
    const endTime = trimRange[1];
    setEffectiveStartTime(startTime);
    setEffectiveDuration(Math.max(endTime - startTime, 0));
    setIsTrimmed(true);
    setPlaying(false);

    if (playerRef.current) {
      if (typeof playerRef.current.fastSeek === "function") {
        playerRef.current.fastSeek(startTime);
      } else {
        playerRef.current.currentTime = startTime;
      }
    }
    setPlayed(0);

    const blob = await recordSegment(startTime, endTime);
    if (blob) {
      onOutputChanged?.(blob);
    }
  }, [trimRange, onOutputChanged, recordSegment]);

  const handleResetTrim = () => {
    setIsTrimmed(false);
    setTrimRange([0, duration]);
    setEffectiveDuration(duration);
    setEffectiveStartTime(0);
    if (playerRef.current) {
      if (typeof playerRef.current.fastSeek === "function") {
        playerRef.current.fastSeek(0);
      } else {
        playerRef.current.currentTime = 0;
      }
    }
    setPlayed(0);
    onResetTrim?.();
  };

  const handleTrimRangeChange = (value: number | number[]) => {
    if (Array.isArray(value)) {
      setTrimRange(value as [number, number]);
    }
  };

  const spanForDisplay = isTrimmed ? effectiveDuration : duration;
  const safeDisplaySpan =
    Number.isFinite(spanForDisplay) && spanForDisplay > 0 ? spanForDisplay : 0;
  const currentDisplaySeconds = played * safeDisplaySpan;
  const totalDisplaySeconds = safeDisplaySpan;

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
        <video
          ref={playerRef}
          src={src}
          className="w-full h-full object-contain"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onDurationChange={handleDurationChange}
          onPlay={() => {
            if (isTrimmed) {
              const currentTime = playerRef.current?.currentTime || 0;
              const startTime = trimRange[0];
              if (currentTime < startTime) {
                if (typeof playerRef.current?.fastSeek === "function") {
                  playerRef.current.fastSeek(startTime);
                } else if (playerRef.current) {
                  playerRef.current.currentTime = startTime;
                }
              }
            }
            setPlaying(true);
          }}
          onPause={() => setPlaying(false)}
          playsInline
          controls={false}
          preload="metadata"
          key={src}
          loop={!isTrimmed && !isRecording}
        />

        {showTrimBar && (
          <div className="absolute left-0 right-0 bottom-2 z-20 px-4">
            <div className="backdrop-blur-md bg-black/60 rounded-xl px-3 py-2 border border-white/10">
              <div className="flex items-center gap-3">
                <span className="text-xs text-white/90 min-w-8 text-center font-mono">
                  {formatTime(trimRange[0])}
                </span>
                <div className="relative flex-1 h-6 flex">
                  <div
                    className="absolute inset-y-0 left-0 pointer-events-none z-0"
                    style={{
                      width: `${(trimRange[0] / (duration || 1)) * 100}%`,
                      backgroundColor: "rgba(255,255,255,0.1)",
                      borderRadius: 8,
                      height: 28,
                    }}
                  />
                  <div
                    className="absolute inset-y-0 right-0 pointer-events-none z-0"
                    style={{
                      width: `${(1 - trimRange[1] / (duration || 1)) * 100}%`,
                      backgroundColor: "rgba(255,255,255,0.1)",
                      borderRadius: 8,
                      height: 28,
                    }}
                  />
                  <div className="relative z-10 w-full">
                    <Slider
                      range
                      min={0}
                      max={duration}
                      step={0.1}
                      value={trimRange}
                      onChange={handleTrimRangeChange}
                      disabled={duration === 0}
                      styles={{
                        rail: {
                          backgroundColor: "transparent",
                        },
                        track: { height: 24, backgroundColor: "transparent" },
                        handle: {
                          width: 8,
                          height: 28,
                          borderRadius: 4,
                          backgroundColor: "white",
                          borderColor: "white",
                          marginBottom: 10,
                          boxShadow: "0 0 10px rgba(0,0,0,0.5)"
                        },
                      }}
                    />
                  </div>
                </div>
                <span className="text-xs text-white/90 min-w-8 text-center font-mono">
                  {formatTime(trimRange[1])}
                </span>
                <div className="flex items-center gap-2 pl-1">
                  <button
                    onClick={handleTrim}
                    className="inline-flex items-center gap-1 h-8 px-3 rounded-md backdrop-blur-sm bg-primary/80 hover:bg-primary text-white text-xs cursor-pointer transition-colors"
                  >
                    Cut
                  </button>
                  <button
                    onClick={handleResetTrim}
                    className="inline-flex items-center gap-1 h-8 px-3 rounded-md backdrop-blur-sm bg-white/10 hover:bg-white/20 text-white text-xs cursor-pointer transition-colors"
                    disabled={!isTrimmed}
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-2 text-white">
        <div className="flex items-center gap-4 backdrop-blur-md bg-white/5 border border-white/10 rounded-xl px-3 py-2">
          <button
            onClick={handlePlayPause}
            className="focus:outline-none text-white hover:text-primary transition-colors"
          >
            {playing ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6" />
            )}
          </button>
          <div className="flex-grow">
            <Slider
              min={0}
              max={1}
              step={0.0001}
              value={played}
              onBeforeChange={() => setSeeking(true)}
              onChange={handleSeekChange}
              onAfterChange={() => setSeeking(false)}
              styles={{
                track: { backgroundColor: "var(--color-primary)" },
                handle: { backgroundColor: "white", borderColor: "white", boxShadow: "0 0 5px rgba(0,0,0,0.5)" },
                rail: { backgroundColor: "rgba(255,255,255,0.2)" }
              }}
            />
          </div>
          <div className="text-sm text-stone-300 font-mono">
            {formatTime(currentDisplaySeconds)} /{" "}
            {formatTime(totalDisplaySeconds)}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="focus:outline-none text-stone-300 hover:text-white transition-colors"
            >
              {muted || volume === 0 ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>
            <div className="w-24">
              <Slider
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={handleVolumeChange}
                styles={{
                  track: { backgroundColor: "white" },
                  handle: { backgroundColor: "white", borderColor: "white" },
                  rail: { backgroundColor: "rgba(255,255,255,0.2)" }
                }}
              />
            </div>
            <button
              onClick={() => setShowTrimBar((s) => !s)}
              title={showTrimBar ? "Hide trimmer" : "Show trimmer"}
              className={`ml-1 focus:outline-none hover:text-primary text-stone-300 transition-colors`}
            >
              <Scissors
                className={`w-5 h-5 transition-transform duration-150 ${
                  showTrimBar ? "rotate-270" : "rotate-0"
                }`}
              />
            </button>
            <button
              onClick={onDownload}
              title="Download"
              className="ml-1 focus:outline-none text-stone-300 hover:text-primary transition-colors"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}