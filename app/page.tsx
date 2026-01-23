"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { Film, Image as ImageIcon, Sparkles, X } from "lucide-react";
import Composer from "@/components/ui/Composer";
import ChatMessage, { HistoryItem } from "@/components/ui/ChatMessage";

type StudioMode =
  | "image"
  | "video";

const POLL_INTERVAL_MS = 5000;

const VeoStudio: React.FC = () => {
  const [mode, setMode] = useState<StudioMode>("image");
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [resolution, setResolution] = useState("720p");
  const [durationSeconds, setDurationSeconds] = useState("4");
  const [selectedModel, setSelectedModel] = useState("gemini-3-pro-image-preview");

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mode === "video") {
      setSelectedModel("veo-3.1-generate-preview");
    } else {
      setSelectedModel("gemini-3-pro-image-preview");
    }
  }, [mode]);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [multipleImageFiles, setMultipleImageFiles] = useState<File[]>([]);
  const [geminiBusy, setGeminiBusy] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null); 

  const [activeOperation, setActiveOperation] = useState<{ id: string; name: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (mode === "video") {
        const hasImages = imageFile || generatedImage || multipleImageFiles.length > 0;
        const isHighRes = resolution === "1080p" || resolution === "4k";
        
        if (hasImages || isHighRes) {
            if (durationSeconds !== "8") {
                setDurationSeconds("8");
            }
        }
    }
  }, [mode, resolution, imageFile, generatedImage, multipleImageFiles, durationSeconds]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [history, isGenerating, geminiBusy]);

  const canStart = useMemo(() => {
    if (!prompt.trim()) return false;
    return !isGenerating && !geminiBusy;
  }, [prompt, isGenerating, geminiBusy]);

  const resetAll = () => {
    setPrompt("");
    setNegativePrompt("");
    setAspectRatio("16:9");
    setImageFile(null);
    setMultipleImageFiles([]);
  };

  const addHistoryItem = (item: HistoryItem) => {
    setHistory((prev) => [...prev, item]);
  };

  const updateHistoryItem = (id: string, updates: Partial<HistoryItem>) => {
    setHistory((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const handleImageGeneration = useCallback(async (loadingId: string) => {
    setGeminiBusy(true);
    try {
      let resp;
      const hasImages = imageFile || generatedImage || multipleImageFiles.length > 0;

      if (!hasImages) {
          resp = await fetch("/api/gemini/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt, model: selectedModel }),
          });
      } else {
          const form = new FormData();
          form.append("prompt", prompt);
          form.append("model", selectedModel);

          if (imageFile) form.append("imageFiles", imageFile);
          multipleImageFiles.forEach(f => form.append("imageFiles", f));

          if (generatedImage && !imageFile && multipleImageFiles.length === 0) {
             try {
                const [meta, b64] = generatedImage.split(",");
                const mime = meta?.split(";")?.[0]?.replace("data:", "") || "image/png";
                const byteCharacters = atob(b64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: mime });
                form.append("imageFiles", blob, "context.png");
             } catch (e) {
                 console.error("Failed to process context image", e);
             }
          }

          resp = await fetch("/api/gemini/edit", {
            method: "POST",
            body: form,
          });
      }

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error || `API error: ${resp.status}`);
      }

      const json = await resp.json();

      if (json?.image?.imageBytes) {
        const dataUrl = `data:${json.image.mimeType};base64,${json.image.imageBytes}`;
        setGeneratedImage(dataUrl);
        updateHistoryItem(loadingId, {
            type: "image",
            mediaUrl: dataUrl,
            isLoading: false,
        });
      } else if (json?.error) {
        throw new Error(json.error);
      }
    } catch (e: unknown) {
      console.error("Error in handleImageGeneration:", e);
      updateHistoryItem(loadingId, {
        type: "error",
        content: e instanceof Error ? e.message : "Failed to generate image",
        isLoading: false,
      });
    } finally {
      setGeminiBusy(false);
    }
  }, [prompt, selectedModel, imageFile, multipleImageFiles, generatedImage]);

  const startGeneration = useCallback(async () => {
    if (!canStart) return;

    addHistoryItem({
      id: Date.now().toString(),
      role: "user",
      type: "text",
      content: prompt,
      timestamp: Date.now(),
      inputImages: [
          ...(imageFile ? [URL.createObjectURL(imageFile)] : []),
          ...multipleImageFiles.map(f => URL.createObjectURL(f)),
          ...(generatedImage && !imageFile ? [generatedImage] : [])
      ]
    });

    const loadingId = (Date.now() + 1).toString();
    addHistoryItem({
      id: loadingId,
      role: "model",
      type: "text",
      isLoading: true,
      timestamp: Date.now(),
      modelName: selectedModel
    });

    if (mode === "video") {
      setIsGenerating(true);

      const form = new FormData();
      form.append("prompt", prompt);
      form.append("model", selectedModel);
      if (negativePrompt) form.append("negativePrompt", negativePrompt);
      if (aspectRatio) form.append("aspectRatio", aspectRatio);
      if (resolution) form.append("resolution", resolution);
      if (durationSeconds) form.append("durationSeconds", durationSeconds);

      multipleImageFiles.forEach((file) => {
        form.append("imageFiles", file);
      });

      if (imageFile) {
        form.append("imageFiles", imageFile);
      } 
      else if (generatedImage) {
          try {
            const [meta, b64] = generatedImage.split(",");
            const mime = meta?.split(";")?.[0]?.replace("data:", "") || "image/png";
            const byteCharacters = atob(b64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: mime });
            form.append("imageFiles", blob, "generated_context.png");
          } catch (e) {
              console.error("Failed to convert base64 to blob", e);
          }
      }

      try {
        const resp = await fetch("/api/veo/generate", {
          method: "POST",
          body: form,
        });
        const json = await resp.json();
        if (json?.name) {
            setActiveOperation({ id: loadingId, name: json.name });
            updateHistoryItem(loadingId, { content: "Generating video..." });
        } else {
            throw new Error(json.error || "Failed to start video generation");
        }
      } catch (e: unknown) {
        console.error(e);
        setIsGenerating(false);
        updateHistoryItem(loadingId, {
            type: "error",
            content: e instanceof Error ? e.message : "Video generation failed",
            isLoading: false
        });
      }
    } else {
      await handleImageGeneration(loadingId);
    }
    
    setPrompt("");

  }, [
    canStart,
    mode,
    prompt,
    selectedModel,
    negativePrompt,
    aspectRatio,
    imageFile,
    generatedImage,
    multipleImageFiles,
    handleImageGeneration,
    resolution,
    durationSeconds,
  ]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function poll() {
      if (!activeOperation) return;
      try {
        const resp = await fetch("/api/veo/operation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: activeOperation.name }),
        });
        const fresh = await resp.json();
        
        if (fresh?.error) {
            throw new Error(fresh.error.message || "Operation failed with error");
        }

        if (fresh?.done) {
          if (fresh?.response?.error) {
             throw new Error(fresh.response.error.message || "Generation failed");
          }

          const responsePayload = fresh?.response?.generateVideoResponse || fresh?.response || fresh?.result;

          if (responsePayload?.raiMediaFilteredReasons?.length > 0) {
              throw new Error(`Generation filtered: ${responsePayload.raiMediaFilteredReasons.join(", ")}`);
          }
          
          if (responsePayload?.raiMediaFilteredCount > 0) {
               throw new Error("Generation filtered by safety policies.");
          }

          const videoObj = responsePayload?.generatedVideos?.[0] || responsePayload?.generatedSamples?.[0];
          
          const fileUri = videoObj?.video?.uri || 
                          fresh?.response?.generatedVideos?.[0]?.video?.uri;
                          
          if (fileUri) {
            const dl = await fetch("/api/veo/download", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ uri: fileUri }),
            });
            const blob = await dl.blob();
            const url = URL.createObjectURL(blob);
            
            updateHistoryItem(activeOperation.id, {
                type: "video",
                mediaUrl: url,
                isLoading: false,
                content: undefined 
            });
          } else {
              const blocked = fresh?.response?.promptFeedback?.blockReason || fresh?.result?.promptFeedback?.blockReason;
              if (blocked) {
                  throw new Error(`Generation blocked: ${blocked}`);
              }
              throw new Error("No video URI returned.");
          }
          setIsGenerating(false);
          setActiveOperation(null);
          return;
        }
      } catch (e: unknown) {
        console.error(e);
        setIsGenerating(false);
        updateHistoryItem(activeOperation.id, {
            type: "error",
            content: e instanceof Error ? e.message : "Video polling failed",
            isLoading: false
        });
        setActiveOperation(null);
      } finally {
        timer = setTimeout(poll, POLL_INTERVAL_MS);
      }
    }
    if (activeOperation) {
      timer = setTimeout(poll, POLL_INTERVAL_MS);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [activeOperation]);

  const onPickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setImageFile(f);
    }
  };

  const onPickMultipleImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const imageFiles = files.filter((file) => file.type.startsWith("image/"));
      const maxImages = mode === "video" ? 3 : 6;
      const remainingSlots = maxImages - multipleImageFiles.length;
      
      if (remainingSlots <= 0) {
          alert(`Maximum ${maxImages} images allowed in this mode.`);
          return;
      }
      const limitedFiles = imageFiles.slice(0, remainingSlots);
      
      setMultipleImageFiles((prevFiles) =>
        [...prevFiles, ...limitedFiles].slice(0, maxImages)
      );
    }
  };

  const downloadImage = async () => {
     if (!generatedImage) return;
     const link = document.createElement("a");
     link.href = generatedImage;
     link.download = "generated-image.png";
     link.click();
  };

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    const limitedFiles = imageFiles.slice(0, 10);

    if (limitedFiles.length > 0) {
      if (mode === "image") {
         if (limitedFiles.length === 1 && multipleImageFiles.length === 0) {
             setImageFile(limitedFiles[0]);
         } else {
             const remaining = 6 - multipleImageFiles.length;
             setMultipleImageFiles(prev => [...prev, ...limitedFiles.slice(0, remaining)]);
         }
      } else if (mode === "video") {
        if (multipleImageFiles.length < 3) {
            const remaining = 3 - multipleImageFiles.length;
            setMultipleImageFiles(prev => [...prev, ...limitedFiles.slice(0, remaining)]);
        } else if (!imageFile) {
            setImageFile(limitedFiles[0]);
        }
      }
    }
  };

  return (
    <div
      className="relative min-h-screen w-full"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Top Gradient Line */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>

      {/* Main content area */}
      <div className="flex flex-col items-center justify-start min-h-screen pb-72 pt-12 px-4 w-full max-w-5xl mx-auto">
        
        {/* Empty State */}
        {history.length === 0 && (
            <div className="w-full max-w-2xl mt-32 flex flex-col items-center justify-center gap-8 text-center animate-in fade-in zoom-in duration-500">
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary to-blue-600 rounded-full blur opacity-25 group-hover:opacity-75 transition duration-1000"></div>
                    <div className="relative flex items-center justify-center w-24 h-24 rounded-full bg-card border border-white/10 shadow-2xl">
                         {mode === "video" ? (
                            <Film className="w-10 h-10 text-primary" />
                         ) : (
                            <ImageIcon className="w-10 h-10 text-primary" />
                         )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h2 className="text-4xl font-bold tracking-tight text-white">
                        {mode === "video" ? "Veo Video Studio" : "Gemini Image Studio"}
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-md mx-auto">
                        Create {mode === "video" ? "cinematic videos" : "stunning images"} with Google&apos;s most advanced AI models.
                    </p>
                  </div>
            </div>
        )}

        {/* History List */}
        <div className="w-full flex flex-col gap-4 mb-4">
            {history.map((item) => (
                <ChatMessage 
                    key={item.id} 
                    item={item} 
                    onDownload={handleDownload}
                />
            ))}
            <div ref={scrollRef} />
        </div>

        {/* Video Parameters Bar - Floating & Glass */}
        {mode === "video" && (
            <div className="w-full max-w-2xl mx-auto mb-6 p-2 bg-card/50 backdrop-blur-xl rounded-full border border-white/10 flex flex-wrap gap-4 justify-center items-center shadow-lg">
                <div className="flex items-center gap-2 px-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Quality</label>
                    <select 
                        value={resolution} 
                        onChange={(e) => setResolution(e.target.value)}
                        className="bg-transparent text-sm font-medium text-foreground focus:outline-none cursor-pointer"
                    >
                        <option value="720p" className="bg-card">720p HD</option>
                        <option value="1080p" className="bg-card">1080p FHD</option>
                        <option value="4k" className="bg-card">4K UHD</option>
                    </select>
                </div>
                <div className="w-px h-4 bg-white/10"></div>
                <div className="flex items-center gap-2 px-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Aspect</label>
                    <select 
                        value={aspectRatio} 
                        onChange={(e) => setAspectRatio(e.target.value)}
                        className="bg-transparent text-sm font-medium text-foreground focus:outline-none cursor-pointer"
                    >
                        <option value="16:9" className="bg-card">16:9 Landscape</option>
                        <option value="9:16" className="bg-card">9:16 Portrait</option>
                    </select>
                </div>
                <div className="w-px h-4 bg-white/10"></div>
                <div className="flex items-center gap-2 px-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Duration</label>
                    <select 
                        value={durationSeconds} 
                        onChange={(e) => setDurationSeconds(e.target.value)}
                        disabled={
                            resolution === "1080p" || 
                            resolution === "4k" || 
                            !!imageFile || 
                            !!generatedImage || 
                            multipleImageFiles.length > 0
                        }
                        className="bg-transparent text-sm font-medium text-foreground focus:outline-none cursor-pointer disabled:opacity-50"
                    >
                        <option value="4" className="bg-card">4 Seconds</option>
                        <option value="6" className="bg-card">6 Seconds</option>
                        <option value="8" className="bg-card">8 Seconds</option>
                    </select>
                </div>
            </div>
        )}

        {/* Persistent Context Area (Input Images) */}
        <div className={`w-full max-w-2xl mx-auto mb-8 transition-all duration-300 ${
            (imageFile || generatedImage || multipleImageFiles.length > 0) ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none h-0 overflow-hidden"
        }`}>
            <div className="p-4 bg-card/30 backdrop-blur-md rounded-2xl border border-white/5">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-3 h-3 text-primary" />
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Reference Media
                        </span>
                    </div>
                    <button 
                        onClick={() => {
                            setImageFile(null);
                            setMultipleImageFiles([]);
                            setGeneratedImage(null);
                        }}
                        className="text-xs text-muted-foreground hover:text-white transition-colors flex items-center gap-1"
                    >
                        <X className="w-3 h-3" /> Clear
                    </button>
                </div>

                <div className="flex flex-wrap gap-3 items-center">
                     {(imageFile || generatedImage) && (
                        <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-white/10 group shadow-md">
                                <Image
                                src={imageFile ? URL.createObjectURL(imageFile) : generatedImage!}
                                alt="Context"
                                fill
                                className="object-cover"
                            />
                        </div>
                     )}
                     
                     {multipleImageFiles.map((file, idx) => (
                        <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-white/10 shadow-md">
                                <Image
                                src={URL.createObjectURL(file)}
                                alt={`Input ${idx}`}
                                fill
                                className="object-cover"
                            />
                        </div>
                     ))}
                </div>
            </div>
        </div>

      </div>

      {/* Hidden Inputs */}
      <input
        id="single-image-input"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onPickImage}
      />
      <input
        id="multiple-image-input"
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={onPickMultipleImages}
      />

      {/* Composer (Fixed Bottom) */}
      <Composer
        mode={mode}
        setMode={setMode}
        hasGeneratedImage={!!generatedImage}
        hasVideoUrl={false}
        prompt={prompt}
        setPrompt={setPrompt}
        canStart={canStart}
        isGenerating={isGenerating || geminiBusy}
        startGeneration={startGeneration}
        geminiBusy={geminiBusy}
        resetAll={resetAll}
        downloadImage={downloadImage}
        onAddImage={() => document.getElementById("multiple-image-input")?.click()}
      />
      
    </div>
  );
};

export default VeoStudio;