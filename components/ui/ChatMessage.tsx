import React from "react";
import Image from "next/image";
import { Loader2, AlertCircle, User, Bot } from "lucide-react";
import VideoPlayer from "./VideoPlayer";

export type HistoryItem = {
  id: string;
  role: "user" | "model";
  type: "text" | "image" | "video" | "error";
  content?: string; // Prompt text or error message
  mediaUrl?: string;
  isLoading?: boolean;
  timestamp: number;
  modelName?: string;
  // For compose/edit modes
  inputImages?: string[]; // Array of blob URLs
};

interface ChatMessageProps {
  item: HistoryItem;
  onDownload?: (url: string, filename: string) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ item, onDownload }) => {
  const isUser = item.role === "user";

  return (
    <div
      className={`flex w-full gap-4 p-6 ${
        isUser ? "bg-white/5" : "bg-transparent"
      } rounded-xl mb-4 transition-all`}
    >
      <div className="flex-shrink-0 mt-1">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isUser ? "bg-stone-700 text-white" : "bg-gradient-to-br from-blue-500 to-purple-600 text-white"
          }`}
        >
          {isUser ? <User size={16} /> : <Bot size={16} />}
        </div>
      </div>

      <div className="flex-grow min-w-0 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-stone-700 dark:text-stone-200">
            {isUser ? "You" : item.modelName || "Model"}
            </span>
            <span className="text-xs text-stone-400">
            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
        </div>

        {/* Content */}
        <div className="text-stone-800 dark:text-stone-200 whitespace-pre-wrap leading-relaxed">
          {item.content && <p>{item.content}</p>}
        </div>

        {/* Input Images (for User) */}
        {isUser && item.inputImages && item.inputImages.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {item.inputImages.map((img, idx) => (
              <div key={idx} className="relative w-24 h-24 rounded-lg overflow-hidden border border-stone-200">
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
          <div className="flex items-center gap-2 text-stone-500 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Generating content...</span>
          </div>
        )}

        {/* Media Content (Image/Video) */}
        {!item.isLoading && item.mediaUrl && (
            <div className="mt-3">
                {item.type === "image" && (
                    <div className="relative w-full max-w-md rounded-lg overflow-hidden border border-stone-200 shadow-sm group">
                        <Image
                            src={item.mediaUrl}
                            alt="Generated content"
                            width={800}
                            height={600}
                            className="w-full h-auto object-contain bg-stone-50"
                        />
                        {onDownload && (
                            <button
                                onClick={() => onDownload(item.mediaUrl!, `generated-${item.id}.png`)}
                                className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Download"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                            </button>
                        )}
                    </div>
                )}
                {item.type === "video" && (
                    <div className="w-full max-w-md">
                        <VideoPlayer src={item.mediaUrl} />
                    </div>
                )}
            </div>
        )}

        {/* Error State */}
        {item.type === "error" && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
                <AlertCircle size={16} />
                <p>{item.content || "An error occurred"}</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
