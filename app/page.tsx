"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { Upload, Film, Image as ImageIcon } from "lucide-react";
import Composer from "@/components/ui/Composer";
import ChatMessage, { HistoryItem } from "@/components/ui/ChatMessage";

type StudioMode =
  | "image"
  | "video";

const POLL_INTERVAL_MS = 5000;

const VeoStudio: React.FC = () => {
  const [mode, setMode] = useState<StudioMode>("image");
  const [prompt, setPrompt] = useState(""); // Unified prompt for all modes
  const [negativePrompt, setNegativePrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [resolution, setResolution] = useState("720p");
  const [durationSeconds, setDurationSeconds] = useState("4");
  const [selectedModel, setSelectedModel] = useState("gemini-3-pro-image-preview");

  // History State
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Update selected model when mode changes
  useEffect(() => {
    if (mode === "video") {
      setSelectedModel("veo-3.1-generate-preview");
    } else {
      setSelectedModel("gemini-3-pro-image-preview");
    }
  }, [mode]);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [multipleImageFiles, setMultipleImageFiles] = useState<File[]>([]);
  
  // Busy states
  const [geminiBusy, setGeminiBusy] = useState(false);
  
  // Legacy state for Edit Mode context (keeps track of the last generated image for editing)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null); 

  // Debug multipleImageFiles state
  useEffect(() => {
    /* console.log(
      "multipleImageFiles state changed:",
      multipleImageFiles.length,
      multipleImageFiles
    ); */
  }, [multipleImageFiles]);

  useEffect(() => {
    let objectUrl: string | null = null;
    if (imageFile) {
      objectUrl = URL.createObjectURL(imageFile);
    } else {
    }

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [imageFile]);

  // Active video generation tracking
  const [activeOperation, setActiveOperation] = useState<{ id: string; name: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Enforce Veo 3.1 constraints
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

  // Auto-scroll to bottom when history changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [history, isGenerating, geminiBusy]);

  const canStart = useMemo(() => {
    // Basic check: must have prompt and not be busy
    if (!prompt.trim()) return false;
    return !isGenerating && !geminiBusy;
  }, [prompt, isGenerating, geminiBusy]);

  const resetAll = () => {
    setPrompt("");
    setNegativePrompt("");
    setAspectRatio("16:9");
    setImageFile(null);
    setMultipleImageFiles([]);
    // We do NOT clear history or generatedImage (context) on reset, just inputs
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
          // Text-to-Image
          resp = await fetch("/api/gemini/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt, model: selectedModel }),
          });
      } else {
          // Image-to-Image (Edit/Compose)
          const form = new FormData();
          form.append("prompt", prompt);
          form.append("model", selectedModel);

          if (imageFile) form.append("imageFiles", imageFile);
          multipleImageFiles.forEach(f => form.append("imageFiles", f));

          if (generatedImage && !imageFile && multipleImageFiles.length === 0) {
             // Convert base64 to blob for context
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

          // Use edit endpoint for multimodal image generation
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
        setGeneratedImage(dataUrl); // Update context
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

  // Start generation based on current mode
  const startGeneration = useCallback(async () => {
    if (!canStart) return;

    // 1. Add User Message
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

    // 2. Add Loading Model Message
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

      // Handle multiple images for Veo 3.1
      multipleImageFiles.forEach((file) => {
        form.append("imageFiles", file);
      });

      if (imageFile) {
        form.append("imageFiles", imageFile);
      } 
      else if (generatedImage) {
          // Convert base64 to blob
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
      // Unified Image Generation
      await handleImageGeneration(loadingId);
    }
    
    // Clear inputs after submission
    setPrompt("");
    // We keep images to allow iterative refinement, unless user clears them.

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

  // Poll operation until done then download
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
        console.log("Polling response:", fresh);
        
        if (fresh?.error) {
            throw new Error(fresh.error.message || "Operation failed with error");
        }

        if (fresh?.done) {
          if (fresh?.response?.error) {
             throw new Error(fresh.response.error.message || "Generation failed");
          }

          // Inspect response structure
          const responsePayload = fresh?.response?.generateVideoResponse || fresh?.response || fresh?.result;

          // Check for RAI filtering
          if (responsePayload?.raiMediaFilteredReasons?.length > 0) {
              throw new Error(`Generation filtered: ${responsePayload.raiMediaFilteredReasons.join(", ")}`);
          }
          
          if (responsePayload?.raiMediaFilteredCount > 0) {
               throw new Error("Generation filtered by safety policies.");
          }

          // Try various paths to find the video
          // Veo 3.1 uses 'generatedSamples', older models might use 'generatedVideos'
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
            
            // Update history
            updateHistoryItem(activeOperation.id, {
                type: "video",
                mediaUrl: url,
                isLoading: false,
                content: undefined // Remove "Generating..." text
            });
          } else {
              console.error("Unexpected polling response structure:", fresh);
              // Check for safety filters or other non-error blocks
              const blocked = fresh?.response?.promptFeedback?.blockReason || fresh?.result?.promptFeedback?.blockReason;
              if (blocked) {
                  throw new Error(`Generation blocked: ${blocked}`);
              }
              throw new Error(`No video URI. Structure: ${JSON.stringify(fresh).substring(0, 100)}...`);
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
      // setGeneratedImage(null); // Keep generated image as backup or clear? Let's keep to not annoy user.
    }
  };

  const onPickMultipleImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const imageFiles = files.filter((file) => file.type.startsWith("image/"));
      
      // Dynamic limits based on mode
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
     // Legacy download for "current" image, mostly for Composer button
     // If there is a generatedImage, download it.
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

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent) => {
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
         // If dropping single image in image mode, replace single file
         // or if dropping multiple, append? 
         if (limitedFiles.length === 1 && multipleImageFiles.length === 0) {
             setImageFile(limitedFiles[0]);
         } else {
             // Append to multiple, enforcing limit (max 6 for image mode)
             const remaining = 6 - multipleImageFiles.length;
             setMultipleImageFiles(prev => [...prev, ...limitedFiles.slice(0, remaining)]);
         }
      } else if (mode === "video") {
        // Enforce limit (max 3 for video mode)
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
      className="relative min-h-screen w-full text-stone-900"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Main content area */}
      <div className="flex flex-col items-center justify-start min-h-screen pb-60 pt-10 px-4 w-full max-w-5xl mx-auto">
        
        {/* Placeholder / Empty State */}
        {history.length === 0 && (
            <div className="w-full max-w-3xl mt-20">
              <div className="flex flex-col items-center justify-center gap-6 text-center px-4">
                  {mode === "video" ? (
                    <Film className="w-20 h-20 text-stone-300" />
                  ) : (
                    <ImageIcon className="w-20 h-20 text-stone-300" />
                  )}
                  <h2 className="text-2xl font-semibold text-stone-600">
                    {mode === "video" ? "Create Video" : "Generate Images"}
                  </h2>
                  <p className="text-stone-500 max-w-md">
                    Select a mode below and type a prompt to get started. 
                    Upload images to guide generation.
                  </p>
              </div>
            </div>
        )}

        {/* History List */}
        <div className="w-full flex flex-col gap-2 mb-4">
            {history.map((item) => (
                <ChatMessage 
                    key={item.id} 
                    item={item} 
                    onDownload={handleDownload}
                />
            ))}
            <div ref={scrollRef} />
        </div>

        {/* Video Parameters Bar */}
        {mode === "video" && (
            <div className="w-full max-w-2xl mx-auto mb-4 p-3 bg-white/40 backdrop-blur-sm rounded-lg border border-stone-200 flex flex-wrap gap-4 justify-center items-center text-xs text-stone-700">
                <div className="flex items-center gap-2">
                    <label className="font-medium">Resolution:</label>
                    <select 
                        value={resolution} 
                        onChange={(e) => setResolution(e.target.value)}
                        className="bg-white/60 border border-stone-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-stone-400"
                    >
                        <option value="720p">720p</option>
                        <option value="1080p">1080p</option>
                        <option value="4k">4K</option>
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <label className="font-medium">Aspect Ratio:</label>
                    <select 
                        value={aspectRatio} 
                        onChange={(e) => setAspectRatio(e.target.value)}
                        className="bg-white/60 border border-stone-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-stone-400"
                    >
                        <option value="16:9">16:9</option>
                        <option value="9:16">9:16</option>
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <label className="font-medium">Duration:</label>
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
                        className="bg-white/60 border border-stone-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-stone-400 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={
                            resolution === "1080p" || resolution === "4k" || !!imageFile || !!generatedImage || multipleImageFiles.length > 0
                            ? "Locked to 8s for High Res or Image Input"
                            : ""
                        }
                    >
                        <option value="4">4s</option>
                        <option value="6">6s</option>
                        <option value="8">8s</option>
                    </select>
                </div>
            </div>
        )}

        {/* Persistent Context Area (Input Images) - Always visible/accessible */}
        <div className="w-full max-w-2xl mx-auto mb-32 p-4 bg-white/50 backdrop-blur-sm rounded-xl border border-stone-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-stone-600">
                            Input Context (Images)
                        </span>
                        <span className="text-[10px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded border border-stone-200">
                            {mode === "video" ? "Max 3 for Veo 3.1" : "Max 6 for Banana Pro"}
                        </span>
                    </div>
                    <div className="flex gap-2">
                        {(imageFile || generatedImage || multipleImageFiles.length > 0) && (
                            <button 
                                onClick={() => {
                                    setImageFile(null);
                                    setMultipleImageFiles([]);
                                    setGeneratedImage(null);
                                }}
                                className="text-xs text-red-500 hover:bg-red-50 px-2 py-1 rounded-md transition-colors"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                {/* Image Previews & Dropzone */}
                <div className="flex flex-wrap gap-3 items-center">
                     {/* Show legacy/single generated image as one of the inputs if exists */}
                     {(imageFile || generatedImage) && (
                        <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-stone-300 bg-stone-100 group shrink-0">
                                <Image
                                src={imageFile ? URL.createObjectURL(imageFile) : generatedImage!}
                                alt="Context"
                                fill
                                className="object-cover"
                            />
                            <div className="absolute inset-0 bg-black/50 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                Base
                            </div>
                        </div>
                     )}
                     
                     {/* Multiple uploaded images */}
                     {multipleImageFiles.map((file, idx) => (
                        <div key={idx} className="relative w-24 h-24 rounded-lg overflow-hidden border border-stone-300 bg-stone-100 shrink-0">
                                <Image
                                src={URL.createObjectURL(file)}
                                alt={`Input ${idx}`}
                                fill
                                className="object-cover"
                            />
                        </div>
                     ))}

                     {/* Dropzone Card (Add Button) */}
                     {(!imageFile && !generatedImage && multipleImageFiles.length === 0) ? (
                        // Empty State: Big Dropzone
                        <div 
                            className="w-full h-32 border-2 border-dashed border-stone-300 rounded-lg flex flex-col items-center justify-center gap-2 text-stone-500 cursor-pointer hover:bg-stone-50 hover:border-stone-400 transition-all"
                            onClick={() => document.getElementById("multiple-image-input")?.click()}
                        >
                            <Upload className="w-8 h-8 opacity-60" />
                            <div className="text-sm font-medium">Drop images here or click to upload</div>
                            <div className="text-xs opacity-60">Up to {mode === "video" ? "3" : "6"} images</div>
                        </div>
                     ) : (
                        // Has content: Small Add Button (if limit not reached)
                        (multipleImageFiles.length < (mode === "video" ? 3 : 6) && !imageFile) && (
                            <div 
                                className="w-24 h-24 border-2 border-dashed border-stone-300 rounded-lg flex flex-col items-center justify-center gap-1 text-stone-400 cursor-pointer hover:bg-stone-50 hover:border-stone-400 transition-all shrink-0"
                                onClick={() => document.getElementById("multiple-image-input")?.click()}
                                title="Add more images"
                            >
                                <Upload className="w-6 h-6" />
                                <span className="text-[10px]">Add</span>
                            </div>
                        )
                     )}
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
        hasVideoUrl={false} // Always allow continuing
        prompt={prompt}
        setPrompt={setPrompt}
        canStart={canStart}
        isGenerating={isGenerating || geminiBusy}
        startGeneration={startGeneration}
        geminiBusy={geminiBusy}
        resetAll={resetAll}
        downloadImage={downloadImage}
      />

      {/* Fixed Credits (Bottom Right) */}
      <div className="fixed bottom-4 right-4 z-50 text-xs text-stone-400 max-w-[300px] leading-tight hidden md:block text-right">
          <p>
              Credit: <a href="https://github.com/choupeanut/gemini-banana-veo-service" target="_blank" rel="noopener noreferrer" className="hover:text-stone-600 underline decoration-stone-300">Peanut Chou</a>
          </p>
          <p className="mt-1 opacity-70">
              forked from: <a href="https://github.com/google-gemini/veo-3-nano-banana-gemini-api-quickstart" target="_blank" rel="noopener noreferrer" className="hover:text-stone-600 underline decoration-stone-300 text-[10px]">google-gemini/veo-3-nano-banana-gemini-api-quickstart</a>
          </p>
      </div>
    </div>
  );
};

export default VeoStudio;
