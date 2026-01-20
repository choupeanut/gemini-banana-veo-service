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
  | "create-image"
  | "edit-image"
  | "compose-image"
  | "create-video";

const POLL_INTERVAL_MS = 5000;

const VeoStudio: React.FC = () => {
  const [mode, setMode] = useState<StudioMode>("create-image");
  const [prompt, setPrompt] = useState(""); // Video or image prompt
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
    if (mode === "create-video") {
      setSelectedModel("veo-3.1-generate-preview");
    } else if (mode === "edit-image" || mode === "compose-image") {
      setSelectedModel("gemini-3-pro-image-preview");
    } else if (mode === "create-image") {
      if (
        !selectedModel.includes("gemini") &&
        !selectedModel.includes("imagen")
      ) {
        setSelectedModel("gemini-3-pro-image-preview");
      }
    }
  }, [mode, selectedModel]);

  // Image generation prompts
  const [imagePrompt, setImagePrompt] = useState("");
  const [editPrompt, setEditPrompt] = useState("");
  const [composePrompt, setComposePrompt] = useState("");

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [multipleImageFiles, setMultipleImageFiles] = useState<File[]>([]);
  
  // Busy states
  const [imagenBusy, setImagenBusy] = useState(false);
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
    if (mode === "create-video") {
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
  }, [history, isGenerating, imagenBusy, geminiBusy]);

  const canStart = useMemo(() => {
    if (mode === "create-video") {
      if (!prompt.trim()) return false;
      return true;
    } else if (mode === "create-image") {
      return imagePrompt.trim() && !imagenBusy && !geminiBusy;
    } else if (mode === "edit-image") {
      return editPrompt.trim() && (imageFile || generatedImage) && !geminiBusy;
    } else if (mode === "compose-image") {
      const hasExistingImage = imageFile || generatedImage;
      const hasNewImages = multipleImageFiles.length > 0;
      return (
        composePrompt.trim() &&
        (hasExistingImage || hasNewImages) &&
        !geminiBusy
      );
    }
    return false;
  }, [
    mode,
    prompt,
    imageFile,
    generatedImage,
    imagePrompt,
    editPrompt,
    composePrompt,
    multipleImageFiles,
    imagenBusy,
    geminiBusy,
  ]);

  const resetAll = () => {
    setPrompt("");
    setNegativePrompt("");
    setAspectRatio("16:9");
    setImagePrompt("");
    setEditPrompt("");
    setComposePrompt("");
    setImageFile(null);
    setMultipleImageFiles([]);
    // We do NOT clear history or generatedImage (context) on reset, just inputs
    // If the user wants to clear context, they can upload a new image
  };

  const addHistoryItem = (item: HistoryItem) => {
    setHistory((prev) => [...prev, item]);
  };

  const updateHistoryItem = (id: string, updates: Partial<HistoryItem>) => {
    setHistory((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  // Imagen helper
  const generateWithImagen = useCallback(async (loadingId: string) => {
    setImagenBusy(true);
    try {
      const resp = await fetch("/api/imagen/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: imagePrompt }),
      });

      if (!resp.ok) {
        throw new Error(`API error: ${resp.status}`);
      }

      const json = await resp.json();

      if (json?.image?.imageBytes) {
        const dataUrl = `data:${json.image.mimeType};base64,${json.image.imageBytes}`;
        setGeneratedImage(dataUrl); // For edit context
        updateHistoryItem(loadingId, {
            type: "image",
            mediaUrl: dataUrl,
            isLoading: false,
        });
      } else if (json?.error) {
        throw new Error(json.error);
      }
    } catch (e: unknown) {
      console.error("Error in generateWithImagen:", e);
      updateHistoryItem(loadingId, {
        type: "error",
        content: e instanceof Error ? e.message : "Failed to generate image",
        isLoading: false,
      });
    } finally {
      setImagenBusy(false);
    }
  }, [imagePrompt]);

  // Gemini image generation helper
  const generateWithGemini = useCallback(async (loadingId: string) => {
    setGeminiBusy(true);
    try {
      const resp = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: imagePrompt, model: selectedModel }),
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error || `API error: ${resp.status}`);
      }

      const json = await resp.json();

      if (json?.image?.imageBytes) {
        const dataUrl = `data:${json.image.mimeType};base64,${json.image.imageBytes}`;
        setGeneratedImage(dataUrl); // For edit context
        updateHistoryItem(loadingId, {
            type: "image",
            mediaUrl: dataUrl,
            isLoading: false,
        });
      } else if (json?.error) {
        throw new Error(json.error);
      }
    } catch (e: unknown) {
      console.error("Error in generateWithGemini:", e);
      updateHistoryItem(loadingId, {
        type: "error",
        content: e instanceof Error ? e.message : "Failed to generate image",
        isLoading: false,
      });
    } finally {
      setGeminiBusy(false);
    }
  }, [imagePrompt, selectedModel]);

  // Gemini image edit helper
  const editWithGemini = useCallback(async (loadingId: string) => {
    setGeminiBusy(true);
    try {
      const form = new FormData();
      form.append("prompt", editPrompt);
      form.append("model", selectedModel);

      if (imageFile) {
        form.append("imageFile", imageFile);
      } else if (generatedImage) {
        const [meta, b64] = generatedImage.split(",");
        const mime = meta?.split(";")?.[0]?.replace("data:", "") || "image/png";
        form.append("imageBase64", b64);
        form.append("imageMimeType", mime);
      }

      const resp = await fetch("/api/gemini/edit", {
        method: "POST",
        body: form,
      });

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
      console.error("Error in editWithGemini:", e);
      updateHistoryItem(loadingId, {
        type: "error",
        content: e instanceof Error ? e.message : "Failed to edit image",
        isLoading: false,
      });
    } finally {
      setGeminiBusy(false);
    }
  }, [editPrompt, imageFile, generatedImage, selectedModel]);

  // Gemini image compose helper
  const composeWithGemini = useCallback(async (loadingId: string) => {
    setGeminiBusy(true);
    try {
      const form = new FormData();
      form.append("prompt", composePrompt);
      form.append("model", selectedModel);

      // Add newly uploaded images first
      for (const file of multipleImageFiles) {
        form.append("imageFiles", file);
      }

      // Include existing image last (if any)
      if (imageFile) {
        form.append("imageFiles", imageFile);
      } else if (generatedImage) {
        const [meta, b64] = generatedImage.split(",");
        const mime = meta?.split(";")?.[0]?.replace("data:", "") || "image/png";
        const byteCharacters = atob(b64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mime });

        const existingImageFile = new File([blob], "existing-image.png", {
          type: mime,
        });
        form.append("imageFiles", existingImageFile);
      }

      const resp = await fetch("/api/gemini/edit", {
        method: "POST",
        body: form,
      });

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
      console.error("Error in composeWithGemini:", e);
      updateHistoryItem(loadingId, {
        type: "error",
        content: e instanceof Error ? e.message : "Failed to compose images",
        isLoading: false,
      });
    } finally {
      setGeminiBusy(false);
    }
  }, [composePrompt, multipleImageFiles, imageFile, generatedImage, selectedModel]);

  // Start generation based on current mode
  const startGeneration = useCallback(async () => {
    if (!canStart) return;

    const userContent =
      mode === "create-video"
        ? prompt
        : mode === "create-image"
        ? imagePrompt
        : mode === "edit-image"
        ? editPrompt
        : composePrompt;

    const inputImages: string[] = [];
    if (mode === "edit-image" || mode === "compose-image") {
        if (imageFile) inputImages.push(URL.createObjectURL(imageFile));
        if (multipleImageFiles.length > 0) {
            multipleImageFiles.forEach(f => inputImages.push(URL.createObjectURL(f)));
        }
        if (!imageFile && generatedImage) {
            inputImages.push(generatedImage);
        }
    }

    // 1. Add User Message
    addHistoryItem({
      id: Date.now().toString(),
      role: "user",
      type: "text",
      content: userContent,
      timestamp: Date.now(),
      inputImages: inputImages.length > 0 ? inputImages : undefined
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

    if (mode === "create-video") {
      setIsGenerating(true);

      const form = new FormData();
      form.append("prompt", prompt);
      form.append("model", selectedModel);
      if (negativePrompt) form.append("negativePrompt", negativePrompt);
      if (aspectRatio) form.append("aspectRatio", aspectRatio);
      if (resolution) form.append("resolution", resolution);
      if (durationSeconds) form.append("durationSeconds", durationSeconds);

      // Handle multiple images for Veo 3.1
      // 1. New multiple uploads
      multipleImageFiles.forEach((file) => {
        form.append("imageFiles", file);
      });

      // 2. Single legacy upload (if any)
      if (imageFile) {
        form.append("imageFiles", imageFile);
      } 
      // 3. Generated context (if no new file uploaded, or as additional context)
      else if (generatedImage) {
          const [meta, b64] = generatedImage.split(",");
          const mime = meta?.split(";")?.[0]?.replace("data:", "") || "image/png";
          // We need to send this as a file or base64. 
          // Let's send as base64 field if it's the only one, or convert to file if mixing.
          // To keep it simple for the backend, let's try to convert to blob/file
          try {
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
    } else if (mode === "create-image") {
      if (selectedModel.includes("imagen")) {
        await generateWithImagen(loadingId);
      } else {
        await generateWithGemini(loadingId);
      }
    } else if (mode === "edit-image") {
      await editWithGemini(loadingId);
    } else if (mode === "compose-image") {
      await composeWithGemini(loadingId);
    }
    
    // Clear inputs after submission (optional, but good for chat flow)
    setPrompt("");
    setImagePrompt("");
    setEditPrompt("");
    setComposePrompt("");
    // We DON'T clear selected images immediately to allow easy tweaks, 
    // OR we clear them if we want to force new selection.
    // Let's keep images for now.

  }, [
    canStart,
    mode,
    prompt,
    imagePrompt,
    editPrompt,
    composePrompt,
    selectedModel,
    negativePrompt,
    aspectRatio,
    imageFile,
    generatedImage,
    multipleImageFiles,
    generateWithImagen,
    generateWithGemini,
    editWithGemini,
    composeWithGemini,
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
      // Limit to 3 files max
      const remainingSlots = 3 - multipleImageFiles.length;
      if (remainingSlots <= 0) {
          alert("Maximum 3 images allowed.");
          return;
      }
      const limitedFiles = imageFiles.slice(0, remainingSlots);
      
      setMultipleImageFiles((prevFiles) =>
        [...prevFiles, ...limitedFiles].slice(0, 3)
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
      if (mode === "compose-image") {
        setMultipleImageFiles((prevFiles) =>
          [...prevFiles, ...limitedFiles].slice(0, 10)
        );
      } else if (mode === "edit-image" || mode === "create-video") {
        setImageFile(limitedFiles[0]);
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
                  {mode === "create-video" ? (
                    <Film className="w-20 h-20 text-stone-300" />
                  ) : (
                    <ImageIcon className="w-20 h-20 text-stone-300" />
                  )}
                  <h2 className="text-2xl font-semibold text-stone-600">
                    {mode === "create-video" ? "Create Video" : "Generate Images"}
                  </h2>
                  <p className="text-stone-500 max-w-md">
                    Select a mode below and type a prompt to get started. 
                    {mode === "edit-image" && " Upload an image to edit."}
                    {mode === "compose-image" && " Upload multiple images to combine."}
                  </p>

                  {/* Dropzones for Uploads (Only when history is empty or relevant) */}
                  <div className="w-full mt-8">
                     {/* Single Image Upload (Edit/Video) */}
                     {((mode === "edit-image" && !imageFile && !generatedImage) ||
                        (mode === "create-video" && !imageFile && !generatedImage)) && (
                        <div
                        className="rounded-lg border-2 border-dashed border-stone-300 p-8 cursor-pointer hover:bg-stone-50 transition-colors bg-white/50"
                        onClick={() => document.getElementById("single-image-input")?.click()}
                        >
                            <div className="flex flex-col items-center gap-3 text-stone-600">
                                <Upload className="w-8 h-8" />
                                <div className="font-medium">Drop an image here or click to upload</div>
                            </div>
                        </div>
                     )}

                     {/* Multiple Image Upload (Compose) */}
                     {mode === "compose-image" && (
                        <div className="flex flex-col gap-4">
                            <div
                                className="rounded-lg border-2 border-dashed border-stone-300 p-8 cursor-pointer hover:bg-stone-50 transition-colors bg-white/50"
                                onClick={() => document.getElementById("multiple-image-input")?.click()}
                            >
                                <div className="flex flex-col items-center gap-3 text-stone-600">
                                    <Upload className="w-8 h-8" />
                                    <div className="font-medium">Drop multiple images here</div>
                                </div>
                            </div>
                            
                            {multipleImageFiles.length > 0 && (
                                <div className="flex flex-wrap gap-4 justify-center">
                                {multipleImageFiles.map((file, index) => (
                                    <div key={index} className="w-20 h-20 rounded-lg overflow-hidden border border-stone-300 shadow-sm relative">
                                    <Image
                                        src={URL.createObjectURL(file)}
                                        alt={`Preview ${index}`}
                                        fill
                                        className="object-cover"
                                    />
                                    </div>
                                ))}
                                </div>
                            )}
                        </div>
                     )}
                  </div>
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
        {mode === "create-video" && (
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

        {/* Persistent Context Area (Input Images) */}
        {(mode === "edit-image" || mode === "compose-image" || mode === "create-video") && (
            <div className="w-full max-w-2xl mx-auto mb-32 p-4 bg-white/50 backdrop-blur-sm rounded-xl border border-stone-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-stone-600">
                        {mode === "compose-image" || mode === "create-video" ? "Input Images" : "Reference Image"}
                    </span>
                    <div className="flex gap-2">
                        {mode === "compose-image" || mode === "create-video" ? (
                            <button 
                                onClick={() => document.getElementById("multiple-image-input")?.click()}
                                className="text-xs flex items-center gap-1 bg-stone-100 hover:bg-stone-200 px-2 py-1 rounded-md text-stone-700 transition-colors"
                            >
                                <Upload size={12} /> Add Images
                            </button>
                        ) : (
                            <button 
                                onClick={() => document.getElementById("single-image-input")?.click()}
                                className="text-xs flex items-center gap-1 bg-stone-100 hover:bg-stone-200 px-2 py-1 rounded-md text-stone-700 transition-colors"
                            >
                                <Upload size={12} /> {imageFile || generatedImage ? "Change Image" : "Upload Image"}
                            </button>
                        )}
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

                {/* Image Previews */}
                <div className="flex flex-wrap gap-3">
                    {/* Main Image (File or Generated) - Only for Edit Image now */}
                    {(imageFile || generatedImage) && mode === "edit-image" && (
                        <div className="relative h-24 aspect-video rounded-lg overflow-hidden border border-stone-300 bg-stone-100">
                             <Image
                                src={imageFile ? URL.createObjectURL(imageFile) : generatedImage!}
                                alt="Context"
                                fill
                                className="object-contain"
                            />
                        </div>
                    )}
                    
                    {/* Compose/Video Mode Images */}
                    {(mode === "compose-image" || mode === "create-video") && (
                        <>
                             {/* Show legacy/single generated image as one of the inputs if exists */}
                             {(imageFile || generatedImage) && (
                                <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-stone-300 bg-stone-100 group">
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
                             {multipleImageFiles.map((file, idx) => (
                                <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-stone-300 bg-stone-100">
                                     <Image
                                        src={URL.createObjectURL(file)}
                                        alt={`Input ${idx}`}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                             ))}
                             {/* Empty State for Compose/Video */}
                             {!imageFile && !generatedImage && multipleImageFiles.length === 0 && (
                                <div className="text-sm text-stone-400 italic py-2">
                                    No images selected. Upload images to provide context.
                                </div>
                             )}
                        </>
                    )}

                    {/* Empty State for Edit Image */}
                    {!imageFile && !generatedImage && mode === "edit-image" && (
                         <div 
                            onClick={() => document.getElementById("single-image-input")?.click()}
                            className="w-full h-24 border-2 border-dashed border-stone-300 rounded-lg flex flex-col items-center justify-center gap-1 text-stone-400 cursor-pointer hover:bg-stone-50 hover:border-stone-400 transition-all"
                         >
                            <Upload size={20} />
                            <span className="text-xs">Click to upload reference image</span>
                         </div>
                    )}
                </div>
            </div>
        )}

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
        isGenerating={isGenerating || imagenBusy || geminiBusy}
        startGeneration={startGeneration}
        imagePrompt={imagePrompt}
        setImagePrompt={setImagePrompt}
        editPrompt={editPrompt}
        setEditPrompt={setEditPrompt}
        composePrompt={composePrompt}
        setComposePrompt={setComposePrompt}
        geminiBusy={geminiBusy}
        resetAll={resetAll}
        downloadImage={downloadImage}
      />
    </div>
  );
};

export default VeoStudio;