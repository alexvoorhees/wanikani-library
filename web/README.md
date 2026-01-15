# Japanese Vocabulary Reader

A web app that generates readable Japanese content tailored to your vocabulary level. Upload your vocabulary list and get AI-generated reading material that uses ~90% words you already know!

## Features

- 📝 Upload your Japanese vocabulary list (comma-separated .txt file)
- 🔍 Search for English news and get simplified Japanese summaries
- 🎨 Visual highlighting: green for known words, red for new words
- 💾 Vocabulary list saved in browser localStorage
- 🤖 Powered by Venice.ai (privacy-first, open-source models)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Venice API

1. Get your API key from [Venice.ai](https://venice.ai/)
2. Copy the environment template:
   ```bash
   cp .env.local.example .env.local
   ```
3. Add your API key to `.env.local`:
   ```
   VENICE_API_KEY=your_actual_api_key_here
   ```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Upload Vocabulary**: Click "Choose File" and upload your Japanese vocabulary list
   - Format: Comma-separated text file (e.g., `九, 二, 人, 山, 水, ...`)
   - Example file: Use `known_words_simple.txt` from the parent directory

2. **Enter Topic**: Type what you want to read about
   - Examples: "technology news", "Japanese culture", "sports", "climate change"

3. **Generate**: Click "Generate" to create content
   - The AI will search for English news on your topic
   - It will create a 1-3 paragraph Japanese summary
   - Content uses ~90% vocabulary you already know

4. **Read**: Review the highlighted content
   - **Green text** = Words you know
   - **Red text** = New vocabulary to learn

## Tech Stack

- **Framework**: Next.js 15 with TypeScript
- **Styling**: Tailwind CSS
- **AI**: Venice.ai API (OpenAI-compatible)
- **Storage**: Browser localStorage

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Push this code to GitHub
2. Import to Vercel
3. Add `VENICE_API_KEY` environment variable in Vercel dashboard
4. Deploy!

## API Route

The app includes a single API endpoint:

- `POST /api/generate` - Generates Japanese content
  - Body: `{ topic: string, vocabList: string[] }`
  - Returns: `{ content: string }``

## Privacy

- Your vocabulary list is stored locally in your browser only
- Venice.ai does not retain your data
- No user accounts or external databases required

## Future Improvements

- WaniKani API integration (auto-sync vocabulary)
- Multiple AI model options
- Difficulty level adjustment
- Save/export generated content
- Reading statistics and progress tracking
