import React from "react";
import Image from "next/image";
import { Loader2, AlertCircle, User, Sparkles } from "lucide-react";
import VideoPlayer from "./VideoPlayer";

export type HistoryItem = {
  id: string;
  role: "user" | "model";
  type: "text" | "image" | "video" | "error";
  content?: string; 
  mediaUrl?: string;
  isLoading?: boolean;
  timestamp: number;
  modelName?: string;
  inputImages?: string[]; 
};

interface ChatMessageProps {
  item: HistoryItem;
  onDownload?: (url: string, filename: string) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ item, onDownload }) => {
  const isUser = item.role === "user";

  return (
    <div
      className={`flex w-full gap-5 p-6 rounded-2xl mb-2 transition-all duration-500 animate-in fade-in slide-in-from-bottom-2 ${
        isUser ? "bg-transparent" : "bg-card/20 border border-white/5"
      }`}
    >
      <div className="flex-shrink-0 mt-1">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg ring-1 ring-white/10 ${
            isUser 
                ? "bg-stone-800 text-stone-400" 
                : "bg-gradient-to-br from-primary to-blue-600 text-white"
          }`}
        >
          {isUser ? <User size={18} /> : <Sparkles size={18} />}
        </div>
      </div>

      <div className="flex-grow min-w-0 space-y-2">
        {/* Header */}
        <div className="flex items-center gap-3">
            <span className="font-bold text-sm text-foreground">
            {isUser ? "You" : "Gemini AI"}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
        </div>

        {/* Content */}
        {item.content && (
            <div className="text-base text-stone-300 whitespace-pre-wrap leading-relaxed max-w-prose">
                {item.content}
            </div>
        )}

        {/* Input Images (for User) */}
        {isUser && item.inputImages && item.inputImages.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {item.inputImages.map((img, idx) => (
              <div key={idx} className="relative w-24 h-24 rounded-lg overflow-hidden border border-white/10 shadow-sm opacity-80 hover:opacity-100 transition-opacity">
                <Image
                  src={img}
                  alt={`Input ${idx}`}
                  fill
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        )}

        {/* Loading State */}
        {item.isLoading && (
          <div className="flex items-center gap-3 py-4 text-primary">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm font-medium animate-pulse">
                {item.modelName?.includes("veo") ? "Rendering video frames..." : "Dreaming up pixels..."}
            </span>
          </div>
        )}

        {/* Media Content (Image/Video) */}
        {!item.isLoading && item.mediaUrl && (
            <div className="mt-4">
                {item.type === "image" && (
                    <div className="relative w-full max-w-xl rounded-xl overflow-hidden border border-white/10 shadow-2xl group bg-black/50">
                        <Image
                            src={item.mediaUrl}
                            alt="Generated content"
                            width={1024}
                            height={1024}
                            className="w-full h-auto object-contain"
                        />
                        {onDownload && (
                            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-end p-4">
                                <button
                                    onClick={() => onDownload(item.mediaUrl!, `generated-${item.id}.png`)}
                                    className="flex items-center gap-2 bg-white text-black font-semibold text-xs py-2 px-4 rounded-full shadow-lg hover:scale-105 transition-transform"
                                >
                                    Download
                                </button>
                            </div>
                        )}
                    </div>
                )}
                {item.type === "video" && (
                    <div className="w-full max-w-xl rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-black">
                        <VideoPlayer 
                            src={item.mediaUrl!} 
                            onDownload={() => onDownload && onDownload(item.mediaUrl!, `generated-video-${item.id}.mp4`)}
                        />
                    </div>
                )}
            </div>
        )}

        {/* Error State */}
        {item.type === "error" && (
            <div className="flex items-center gap-3 p-4 bg-red-500/10 text-red-400 rounded-xl text-sm border border-red-500/20 mt-2">
                <AlertCircle size={18} />
                <p>{item.content || "An error occurred"}</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;