# Gemini Banana Veo Service (Quickstart & Studio)

This is an interactive Next.js web application designed to demonstrate and operate Google Gemini API's multimodal generation capabilities, specifically focusing on the advanced features of the **Veo 3.1** video generation model and **Nano Banana Pro** (Gemini 3 Pro) image generation.

## ✨ Key Features

### 1. Video Generation - Veo 3.1 Preview
-   **Model**: Defaults to `veo-3.1-generate-preview`.
-   **Multimodal Input**:
    -   **Text Prompt**: Describe the video content.
    -   **Multi-Image References**: Supports uploading up to 3 reference images for Image-to-Video generation to maintain visual consistency.
-   **Advanced Parameter Control**:
    -   **Resolution**: 720p (Default), 1080p, 4K.
    -   **Duration**: 4s, 6s, 8s.
    -   **Aspect Ratio**: 16:9, 9:16.
-   **Smart Constraints**: Automatically locks video duration to **8 seconds** when High Resolution (1080p/4K) is selected or reference images are uploaded, ensuring compliance with model specifications.
-   **Comprehensive Feedback**: Displays detailed API error messages (e.g., Safety RAI Reasons) to help users understand generation failures.

### 2. Image Generation - Nano Banana Pro
-   **Model**: Uses `gemini-3-pro-image-preview`.
-   **Unified Mode**: Consolidates Create, Edit, and Compose workflows into a single **Image** mode.
-   **Smart Logic**:
    -   **Text-to-Image**: Generates from text prompt if no images are uploaded.
    -   **Image-to-Image**: Automatically switches to edit or composition mode if images (single or multiple) are uploaded.

### 3. User Interface (Cinematic Dark Mode)
-   **Theme Engine**: Custom Tailwind configuration (`app/globals.css`) implementing an "Electric Blue" (`oklch(0.6 0.2 240)`) and Deep Dark (`oklch(0.1 0.02 240)`) palette.
-   **Floating Command Center**: `Composer.tsx` implements a floating glassmorphism capsule for inputs, separating controls from content.
-   **Adaptive Context Bar**: `app/page.tsx` features a collapsible "Reference Media" panel that gracefully animates in/out based on user state.
-   **Immersive Chat**: `ChatMessage.tsx` renders results in a transparent, avatar-based list with electric blue accents and high-fidelity media previews.
-   **Video Player**: `VideoPlayer.tsx` features custom-styled controls matching the electric blue theme for a cohesive playback experience.

## 🛠️ Technical Specifications

### Tech Stack
-   **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4.
-   **Backend**: Next.js API Routes (Route Handlers).
-   **API Integration**:
    -   Uses `@google/genai` SDK for standard generation requests.
    -   Uses direct `fetch` calls to Google REST API for long-running operations (Veo 3.1) to ensure correct parsing of the latest `generatedSamples` response structure.

### Key Files
-   `app/page.tsx`: Main application entry point. Contains:
    -   Global state management (`mode`, `history`, `parameters`).
    -   Constraint logic (`useEffect`).
    -   API integration logic (`startGeneration`, `poll`).
    -   UI rendering logic (Context Bar, History List).
-   `components/ui/Composer.tsx`: Floating input capsule. Contains Prompt input, mode switch tabs (Image/Video), and the primary "Generate" button.
-   `components/ui/ChatMessage.tsx`: Renders chat history, supporting Markdown text, image previews, and video players.
-   `app/api/veo/generate/route.ts`: Handles video generation requests.
    -   Parses multiple images from `multipart/form-data`.
    -   Encapsulates parameters (`resolution`, `durationSeconds`).
    -   **Technical Fix**: To support Veo 3.1 multi-image reference, it provides both `imageBytes` and `bytesBase64Encoded` in the `referenceImages` payload to satisfy both SDK expectations and raw API requirements.
-   `app/api/veo/operation/route.ts`: Handles operation polling.

## 🏗️ Architecture Flow

1.  **Initialization**: User selects mode (Image/Video).
2.  **Input**: User enters a prompt and uploads reference images via the Context Bar.
3.  **Validation & Constraints**:
    -   Frontend `useEffect` monitors parameter changes and automatically corrects invalid settings (e.g., enforcing 8s duration).
    -   `canStart` checks for necessary conditions.
4.  **Submission**: `startGeneration` packages data based on the mode:
    -   **Video**: Calls `/api/veo/generate` with all images and parameters.
    -   **Image**: Calls `/api/gemini/generate` (text only) or `/api/gemini/edit` (with images).
5.  **Backend Processing**: Route Handlers convert data formats and call Google APIs.
6.  **Polling (Video Only)**: Frontend retrieves the Operation Name and polls `/api/veo/operation` every 5 seconds until the task completes or fails.
7.  **Display**: Updates `history` state, and the interface instantly renders the new chat bubble.

## 🚀 Deployment & Build

The project includes a standard `Dockerfile` supporting containerized deployment.

```bash
# 1. Build Docker Image
docker build -t gemini-banana-veo-service .

# 2. Run Container (API Key required)
docker run -p 3000:3000 -e GEMINI_API_KEY=your_key gemini-banana-veo-service
```
