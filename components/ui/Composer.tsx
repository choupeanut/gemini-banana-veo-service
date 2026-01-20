"use client";

import React from "react";
import {
  RotateCcw,
  Image as ImageIcon,
  Edit,
  Palette,
  Video,
  Download,
  Sparkles,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type StudioMode =
  | "create-image"
  | "edit-image"
  | "compose-image"
  | "create-video";

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

  imagePrompt: string;
  setImagePrompt: (value: string) => void;
  editPrompt: string;
  setEditPrompt: (value: string) => void;
  composePrompt: string;
  setComposePrompt: (value: string) => void;

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

  imagePrompt,
  setImagePrompt,
  editPrompt,
  setEditPrompt,
  composePrompt,
  setComposePrompt,
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

  const getTabText = (tabMode: StudioMode) => {
    switch (tabMode) {
      case "create-image":
        return "Create Image";
      case "edit-image":
        return "Edit Image";
      case "compose-image":
        return "Compose Image";
      case "create-video":
        return "Create Video";
      default:
        return "Unknown";
    }
  };

  const isTabDisabled = () => {
    return false;
  };

  const getTabTooltip = () => {
    return null;
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

        {mode === "create-video" && (
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Generate a video with text and frames..."
            className="w-full bg-transparent focus:outline-none resize-none text-base font-normal placeholder-slate-800/60"
            rows={2}
          />
        )}

        {mode === "create-image" && (
          <textarea
            value={imagePrompt}
            onChange={(e) => setImagePrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe the image to create..."
            className="w-full bg-transparent focus:outline-none resize-none text-base font-normal placeholder-slate-800/60"
            rows={2}
          />
        )}

        {mode === "edit-image" && (
          <textarea
            value={editPrompt}
            onChange={(e) => setEditPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe how to edit the image..."
            className="w-full bg-transparent focus:outline-none resize-none text-base font-normal placeholder-slate-800/60"
            rows={2}
          />
        )}

        {mode === "compose-image" && (
          <textarea
            value={composePrompt}
            onChange={(e) => setComposePrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe how to combine the images..."
            className="w-full bg-transparent focus:outline-none resize-none text-base font-normal placeholder-slate-800/60"
            rows={2}
          />
        )}

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
            title={
              mode === "create-image"
                ? "Generate Image"
                : mode === "edit-image"
                ? "Edit Image"
                : mode === "compose-image"
                ? "Compose Image"
                : "Generate Video"
            }
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
                onClick={() =>
                  !isTabDisabled() && setMode("create-image")
                }
                disabled={isTabDisabled()}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition flex-1 ${
                  mode === "create-image"
                    ? "bg-indigo-400/30 text-slate-900 backdrop-blur-sm"
                    : isTabDisabled()
                    ? "text-slate-400 cursor-not-allowed opacity-50"
                    : "text-slate-700 hover:bg-white/30 hover:text-slate-900"
                }`}
              >
                <ImageIcon className="w-4 h-4" aria-hidden="true" />
                {getTabText("create-image")}
              </button>
            </TooltipTrigger>
            {getTabTooltip() && (
              <TooltipContent>
                <p>{getTabTooltip()}</p>
              </TooltipContent>
            )}
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() =>
                  !isTabDisabled() && setMode("edit-image")
                }
                disabled={isTabDisabled()}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition flex-1 ${
                  mode === "edit-image"
                    ? "bg-blue-400/30 text-slate-900 backdrop-blur-sm"
                    : isTabDisabled()
                    ? "text-slate-400 cursor-not-allowed opacity-50"
                    : "text-slate-700 hover:bg-white/30 hover:text-slate-900"
                }`}
              >
                <Edit className="w-4 h-4" />
                {getTabText("edit-image")}
              </button>
            </TooltipTrigger>
            {getTabTooltip() && (
              <TooltipContent>
                <p>{getTabTooltip()}</p>
              </TooltipContent>
            )}
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() =>
                  !isTabDisabled() && setMode("compose-image")
                }
                disabled={isTabDisabled()}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition flex-1 ${
                  mode === "compose-image"
                    ? "bg-green-400/30 text-slate-900 backdrop-blur-sm"
                    : isTabDisabled()
                    ? "text-slate-400 cursor-not-allowed opacity-50"
                    : "text-slate-700 hover:bg-white/30 hover:text-slate-900"
                }`}
              >
                <Palette className="w-4 h-4" />
                {getTabText("compose-image")}
              </button>
            </TooltipTrigger>
            {getTabTooltip() && (
              <TooltipContent>
                <p>{getTabTooltip()}</p>
              </TooltipContent>
            )}
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() =>
                  !isTabDisabled() && setMode("create-video")
                }
                disabled={isTabDisabled()}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition flex-1 ${
                  mode === "create-video"
                    ? "bg-purple-400/30 text-slate-900 backdrop-blur-sm"
                    : isTabDisabled()
                    ? "text-slate-400 cursor-not-allowed opacity-50"
                    : "text-slate-700 hover:bg-white/30 hover:text-slate-900"
                }`}
              >
                <Video className="w-4 h-4" />
                {getTabText("create-video")}
              </button>
            </TooltipTrigger>
            {getTabTooltip() && (
              <TooltipContent>
                <p>{getTabTooltip()}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </div>
    </div>
  );
};

export default Composer;
