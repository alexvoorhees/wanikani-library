# WaniKani Library

Turn your WaniKani progress into a GPT-friendly library of known Japanese vocabulary.

## What This Does

Syncs your WaniKani account data and exports your known vocabulary and kanji to JSON format. Use this with Custom GPTs to generate Japanese content that matches your current level.

## Setup

1. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Get your WaniKani API key:**
   - Go to https://www.wanikani.com/settings/personal_access_tokens
   - Generate a new token (needs `assignments:read` and `subjects:read` permissions)

3. **Configure your API key:**
   - Open the `.env` file
   - Replace `your_api_key_here` with your actual API key

## Usage

Run the sync script:

```bash
python sync_wanikani.py
```

This will:
- Fetch your WaniKani assignments and subjects
- Classify vocabulary and kanji as "known" (Guru+ stage) or "learning" (Apprentice stage)
- Export to `output/wanikani_library.json`

## Output Format

The JSON output includes:
- **Known vocabulary**: Words you've reached Guru I stage or higher
- **Learning vocabulary**: Words in Apprentice stages
- **Known kanji**: Kanji at Guru I or higher
- **Learning kanji**: Kanji in Apprentice stages

Each item includes:
- Characters/readings
- Meanings
- Current SRS stage
- WaniKani level

## Use with Custom GPT

Upload the `output/wanikani_library.json` file to a Custom GPT and prompt it to generate stories or news using primarily the words from your "known" list.

Example prompt:
> "Using primarily the vocabulary in my known list, write a short story about space exploration."

## Configuration

Edit `sync_wanikani.py` to change the classification threshold:
- `KNOWN_THRESHOLD = 5` (default: Guru I and above)
- Set to `7` for Master+ only
- Set to `9` for Enlightened+ only
