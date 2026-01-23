"use client";

import React from "react";
import {
  RotateCcw,
  Image as ImageIcon,
  Video,
  Download,
  Sparkles,
  Paperclip
} from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider
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
  onAddImage: () => void;
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
  onAddImage
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
    <TooltipProvider delayDuration={0}>
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-[min(95%,42rem)]">
      
      {/* Mode Switcher Tabs - Floating above */}
      <div className="absolute -top-12 left-0 flex gap-1 p-1 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 shadow-lg">
          <button
            onClick={() => setMode("image")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              mode === "image"
                ? "bg-white/10 text-white shadow-inner"
                : "text-stone-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Image</span>
          </button>
          <button
            onClick={() => setMode("video")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              mode === "video"
                ? "bg-white/10 text-white shadow-inner"
                : "text-stone-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Video className="w-4 h-4" />
            <span>Video</span>
          </button>
      </div>

      {/* Main Composer Capsule */}
      <div className="relative bg-[#0a0a0a]/80 backdrop-blur-2xl p-4 rounded-3xl border border-white/10 shadow-2xl ring-1 ring-white/5">
        
        {/* Input Area */}
        <div className="relative flex flex-col gap-2">
            <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={mode === "video" ? "Describe the video you want to create..." : "Describe the image you want to generate..."}
                className="w-full bg-transparent focus:outline-none resize-none text-[15px] leading-relaxed font-medium text-white placeholder-stone-500 min-h-[50px] max-h-[200px] py-1"
                rows={2}
            />
            
            {/* Actions Bar */}
            <div className="flex items-center justify-between pt-2 mt-1 border-t border-white/5">
                <div className="flex items-center gap-1">
                     <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={onAddImage}
                                className="h-9 w-9 flex items-center justify-center text-stone-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                            >
                                <Paperclip className="w-5 h-5" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="bg-stone-900 border-stone-800 text-stone-200">
                           <p>Add reference images</p>
                        </TooltipContent>
                     </Tooltip>

                     <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={handleReset}
                                className="h-9 w-9 flex items-center justify-center text-stone-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                            >
                                <RotateCcw className="w-5 h-5" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="bg-stone-900 border-stone-800 text-stone-200">
                           <p>Reset all inputs</p>
                        </TooltipContent>
                     </Tooltip>
                     
                     {hasGeneratedImage && !hasVideoUrl && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={downloadImage}
                                    className="h-9 w-9 flex items-center justify-center text-stone-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                                >
                                    <Download className="w-5 h-5" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="bg-stone-900 border-stone-800 text-stone-200">
                               <p>Download Image</p>
                            </TooltipContent>
                        </Tooltip>
                     )}
                </div>

                <button
                    onClick={startGeneration}
                    disabled={!canStart || isGenerating || geminiBusy}
                    className={`h-10 px-5 flex items-center gap-2 rounded-full font-semibold text-sm transition-all duration-300 shadow-lg hover:shadow-primary/25 ${
                    !canStart || isGenerating || geminiBusy
                        ? "bg-white/5 text-stone-500 cursor-not-allowed"
                        : "bg-gradient-to-r from-primary to-blue-500 text-white hover:scale-105"
                    }`}
                >
                    {isGenerating || geminiBusy ? (
                         <>
                            <div className="w-4 h-4 border-2 border-t-transparent border-white/50 rounded-full animate-spin" />
                            <span>Creating...</span>
                         </>
                    ) : (
                        <>
                            <Sparkles className="w-4 h-4 fill-white" />
                            <span>Generate</span>
                        </>
                    )}
                </button>
            </div>
        </div>
      </div>
    </div>
    </TooltipProvider>
  );
};

export default Composer;