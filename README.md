# CaptionGen — AI Video Caption Generator

Generate professional captions for your videos using Groq Whisper AI. Supports Hindi, Hinglish, and 12+ languages with 10 stunning caption templates.

## Features

- **AI Transcription** — Powered by Groq Whisper large-v3, the fastest and most accurate speech-to-text
- **Hinglish & 12 Languages** — Hindi, Urdu, Tamil, Telugu, Bengali, Marathi, Gujarati, Kannada, Malayalam, Punjabi, Arabic, English
- **10 Caption Templates** — Clean Classic, CapCut Viral, Neon Nights, Gradient Wave, Minimal Pill, Karaoke Sync, Street Impact, Boxed Words, Handwritten, Cinema Scope
- **Word-by-Word Sync** — 4 templates with real-time word highlighting as speech plays
- **Caption Editor** — Edit text, adjust timestamps, merge, split, and reorder captions
- **Multi-Format Export** — SRT, VTT, ASS (styled), TXT, JSON
- **Keyboard Shortcuts** — Space (play/pause), Ctrl+S (export SRT)
- **Offline-capable** — Works entirely in-browser after initial load (except API call)

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript (strict)
- **Styling**: Tailwind CSS v4
- **UI**: shadcn/ui + lucide-react
- **Transcription**: Groq Whisper API (free tier)
- **Audio Processing**: Web Audio API (browser-native)

## Setup

### 1. Clone and install

```bash
git clone <your-repo-url>
cd captiongen
npm install
```

### 2. Add your Groq API key

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your key:

```env
GROQ_API_KEY=gsk_your_key_here
```

### 3. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Getting a Free Groq API Key

1. Go to [console.groq.com](https://console.groq.com)
2. Sign up for a free account
3. Navigate to **API Keys** in the sidebar
4. Click **Create API Key**
5. Copy the key (starts with `gsk_`)
6. Paste it into `.env.local` or the in-app Settings panel

The free tier includes generous limits for Whisper transcription.

## Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com/new](https://vercel.com/new) and import your repo
3. Add environment variable: `GROQ_API_KEY` = your key
4. Click **Deploy**

## Usage

1. Upload a video (MP4, WebM, MOV — up to 500MB)
2. Click **Generate Captions** (add API key in Settings first)
3. Choose a caption template from the Templates panel
4. Edit captions in the Editor panel if needed
5. Export your captions in the Export panel

## Supported Languages

| Code | Language |
|------|----------|
| auto | Auto Detect |
| hi | Hindi / Hinglish |
| en | English |
| ur | Urdu |
| te | Telugu |
| ta | Tamil |
| bn | Bengali |
| mr | Marathi |
| gu | Gujarati |
| kn | Kannada |
| ml | Malayalam |
| pa | Punjabi |
| ar | Arabic |

## License

MIT
