# Gemini Banana Veo Service

A futuristic, high-performance Next.js studio application for Google's **Veo 3.1** (Video) and **Nano Banana Pro** (Gemini 3 Pro Image) models.

![Cinematic Dark UI](https://placehold.co/1200x675/1a1a2e/6a11cb?text=Cinematic+Dark+UI)

## ✨ New: Cinematic Dark Mode
The interface has been completely overhauled with a professional **"Electric Blue" & "Cinematic Dark"** aesthetic:
*   **Immersive Atmosphere**: Deep background tones with dynamic ambient glows.
*   **Floating Command Center**: A sleek, glassmorphism-based input capsule for distraction-free prompting.
*   **Pro Video Controls**: Transparent, floating parameter bars for resolution, aspect ratio, and duration.
*   **Adaptive Context**: Smart "Reference Media" card that only appears when needed.

## 🚀 Features

### 1. Veo 3.1 Video Studio
*   **State-of-the-Art Generation**: Full support for Google's `veo-3.1-generate-preview` model.
*   **Multi-Modal Control**: Text-to-Video & Image-to-Video (up to 3 reference frames).
*   **Professional Parameters**:
    *   **Quality**: 720p, 1080p, 4K UHD.
    *   **Aspect Ratio**: 16:9 Cinematic, 9:16 Social.
    *   **Duration**: 4s, 6s, 8s (Smart auto-locking logic).

### 2. Gemini Image Studio
*   **Nano Banana Pro**: Unified workflow for `gemini-3-pro-image-preview`.
*   **Seamless Editing**: Intelligent switching between Text-to-Image and Image-to-Image based on your inputs.
*   **Contextual History**: Chat-style history with high-fidelity previews and instant downloads.

## 🛠️ Getting Started

1.  **Clone the repository**
    ```bash
    git clone https://github.com/choupeanut/gemini-banana-veo-service.git
    cd gemini-banana-veo-service
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Run the development server**
    Requires a valid `GEMINI_API_KEY` from Google AI Studio.
    ```bash
    export GEMINI_API_KEY=your_key
    npm run dev
    ```

4.  **Open in Browser**
    Navigate to `http://localhost:3000` to experience the new studio.

## 📚 Documentation

See [gemini.md](./gemini.md) for deep-dive technical documentation on architecture, API routes, and state management.

## 🤝 Credits

*   **Design & Dev**: [Peanut Chou](https://github.com/choupeanut/gemini-banana-veo-service)
*   **Original Fork**: [google-gemini/veo-3-nano-banana-gemini-api-quickstart](https://github.com/google-gemini/veo-3-nano-banana-gemini-api-quickstart)
