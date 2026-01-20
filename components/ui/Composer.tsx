"use client";

import React from "react";
import {
  RotateCcw,
  Image as ImageIcon,
  Video,
  Download,
  Sparkles,
} from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type StudioMode =
  | "image"
  | "video";

interface ComposerProps {
  mode: StudioMode;
  setMode: (mode: StudioMode) => void;
  hasGeneratedImage?: boolean;
  hasVideoUrl?: boolean;

  prompt: string;
  setPrompt: (value: string) => void;

  canStart: boolean;
  isGenerating: boolean;
  startGeneration: () => void;

  geminiBusy: boolean;

  resetAll: () => void;
  downloadImage: () => void;
}

const Composer: React.FC<ComposerProps> = ({
  mode,
  setMode,
  hasGeneratedImage = false,
  hasVideoUrl = false,
  prompt,
  setPrompt,
  canStart,
  isGenerating,
  startGeneration,
  geminiBusy,
  resetAll,
  downloadImage,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      startGeneration();
    }
  };

  const handleReset = () => {
    resetAll();
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 w-[min(100%,48rem)] px-4">
      <div className="relative text-slate-900/80 backdrop-blur-sm bg-white/30 px-3 py-1 rounded-lg ">
        {hasGeneratedImage && !hasVideoUrl && (
          <div className="absolute -top-12 right-0 z-10">
            <button
              onClick={downloadImage}
              className="inline-flex items-center gap-2 bg-white/30 hover:bg-white text-slate-700 py-2 px-4 rounded-lg transition-colors"
              title="Download Image"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </button>
          </div>
        )}
        
        {/* Model Selector hidden as requested */}
        {/* <div className="flex items-center justify-between mb-3">
          <ModelSelector
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            mode={mode}
          />
        </div> */}

        {/* Input Area */}
        <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={mode === "video" ? "Generate a video..." : "Generate or edit an image..."}
            className="w-full bg-transparent focus:outline-none resize-none text-base font-normal placeholder-slate-800/60"
            rows={2}
        />

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="h-10 w-10 flex items-center justify-center bg-white/50 rounded-full hover:bg-white/70 cursor-pointer"
              title="Reset"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={startGeneration}
            disabled={!canStart || isGenerating || geminiBusy}
            aria-busy={isGenerating || geminiBusy}
            className={`h-10 w-10 flex items-center justify-center rounded-full text-white transition ${
              !canStart || isGenerating || geminiBusy
                ? "bg-white/50 cursor-not-allowed"
                : "bg-white/50 hover:bg-white/70 cursor-pointer"
            }`}
            title="Generate"
          >
            {isGenerating || geminiBusy ? (
              <div className="w-4 h-4 border-2 border-t-transparent border-black rounded-full animate-spin" />
            ) : (
              <Sparkles className="w-5 h-5 text-black" />
            )}
          </button>
        </div>

        {/* Mode Badges */}
        <div className="flex gap-1 mt-3 bg-white/10 rounded-md p-1 border border-white/20">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setMode("image")}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition flex-1 ${
                  mode === "image"
                    ? "bg-yellow-400/30 text-slate-900 backdrop-blur-sm"
                    : "text-slate-700 hover:bg-white/30 hover:text-slate-900"
                }`}
              >
                <ImageIcon className="w-4 h-4" aria-hidden="true" />
                <span>Create Image</span>
                {mode === "image" && <span className="text-[10px] bg-yellow-100 text-yellow-800 px-1 rounded border border-yellow-200">🍌 Nano Banana Pro</span>}
              </button>
            </TooltipTrigger>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setMode("video")}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition flex-1 ${
                  mode === "video"
                    ? "bg-purple-400/30 text-slate-900 backdrop-blur-sm"
                    : "text-slate-700 hover:bg-white/30 hover:text-slate-900"
                }`}
              >
                <Video className="w-4 h-4" />
                <span>Create Video</span>
                {mode === "video" && <span className="text-[10px] bg-purple-100 text-purple-800 px-1 rounded border border-purple-200">Veo 3.1</span>}
              </button>
            </TooltipTrigger>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};

export default Composer;
