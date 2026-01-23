import { NextRequest, NextResponse } from 'next/server';

type InputMode = 'topic' | 'url' | 'text';

// Helper function to call Venice API with retry logic
async function callVeniceWithRetry(
  apiKey: string,
  body: object,
  maxRetries: number = 2
): Promise<{ ok: boolean; status: number; data?: unknown; errorText?: string }> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('https://api.venice.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data = await response.json();
        return { ok: true, status: response.status, data };
      }

      // Don't retry on client errors (4xx) except 429
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        const errorText = await response.text();
        return { ok: false, status: response.status, errorText };
      }

      // Retry on 5xx errors and 429
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      const errorText = await response.text();
      return { ok: false, status: response.status, errorText };
    } catch (error) {
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      return { ok: false, status: 0, errorText: String(error) };
    }
  }
  return { ok: false, status: 0, errorText: 'Max retries exceeded' };
}

export async function POST(request: NextRequest) {
  try {
    const { inputMode = 'topic', topic, url, text, vocabList } = await request.json();

    if (!vocabList || vocabList.length === 0) {
      return NextResponse.json(
        { error: 'Vocabulary list is required' },
        { status: 400 }
      );
    }

    // Validate based on input mode
    if (inputMode === 'topic' && !topic) {
      return NextResponse.json(
        { error: 'Topic is required for web search mode' },
        { status: 400 }
      );
    }
    if (inputMode === 'url' && !url) {
      return NextResponse.json(
        { error: 'URL is required for URL mode' },
        { status: 400 }
      );
    }
    if (inputMode === 'text' && !text) {
      return NextResponse.json(
        { error: 'Text is required for text input mode' },
        { status: 400 }
      );
    }

    const apiKey = process.env.VENICE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Venice API key not configured' },
        { status: 500 }
      );
    }

    // STEP 1: Get English content based on input mode
    let sourceContent = '';

    if (inputMode === 'topic') {
      // Mode A: Web search for news about a topic
      const newsPrompt = `You are a news researcher. Search for recent news about the following topic and provide a clear, concise summary in English.

TOPIC: ${topic}

TASK:
1. Search for current news about this topic
2. Write 1-2 short paragraphs summarizing the most relevant and recent information
3. Keep it simple and factual
4. Write in English only

Output just the summary text, no formatting or extra commentary.

/no_think`;

      const newsResponse = await fetch('https://api.venice.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'qwen3-4b', // Venice Small - fast model for news gathering
          messages: [
            {
              role: 'user',
              content: newsPrompt,
            },
          ],
          temperature: 0.5,
          max_tokens: 1200, // Increased for longer summaries
          venice_parameters: {
            enable_web_search: 'auto', // Enable web search for current news
            enable_web_citations: false,
            return_search_results_as_documents: false,
            disable_thinking: true, // Prevent Qwen3 thinking tokens in output
          },
        }),
      });

      if (!newsResponse.ok) {
        const errorText = await newsResponse.text();
        console.error('Venice API error (news gathering):', newsResponse.status, errorText);
        return NextResponse.json(
          {
            error: `Failed to gather news: ${newsResponse.status}`,
            errorType: 'API_ERROR'
          },
          { status: newsResponse.status }
        );
      }

      const newsData = await newsResponse.json();
      sourceContent = newsData.choices[0]?.message?.content || '';

      if (!sourceContent) {
        return NextResponse.json(
          { error: 'No news content retrieved' },
          { status: 500 }
        );
      }
    } else if (inputMode === 'url') {
      // Mode B: Fetch and analyze content from a URL
      try {
        // Fetch the webpage content
        const fetchResponse = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; JapaneseReader/1.0)',
          },
        });

        if (!fetchResponse.ok) {
          return NextResponse.json(
            { error: `Failed to fetch URL: ${fetchResponse.status}` },
            { status: 400 }
          );
        }

        const htmlContent = await fetchResponse.text();

        // Use AI to extract and summarize the main content from the HTML
        const extractPrompt = `You are a content extractor. Analyze this webpage HTML and extract the main article or content.

URL: ${url}

HTML CONTENT (truncated):
${htmlContent.slice(0, 15000)}

TASK:
1. Identify the main article or content (ignore navigation, ads, footers, etc.)
2. Extract the key information and write a clear summary in English
3. Write 1-3 paragraphs that capture the essential information
4. Keep it factual and informative

Output just the summary text, no formatting or extra commentary.

/no_think`;

        const extractResponse = await fetch('https://api.venice.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'qwen3-4b',
            messages: [
              {
                role: 'user',
                content: extractPrompt,
              },
            ],
            temperature: 0.3,
            max_tokens: 1500, // Increased for longer content
            venice_parameters: {
              disable_thinking: true,
            },
          }),
        });

        if (!extractResponse.ok) {
          const errorText = await extractResponse.text();
          console.error('Venice API error (URL extraction):', extractResponse.status, errorText);
          return NextResponse.json(
            {
              error: `Failed to analyze URL content: ${extractResponse.status}`,
              errorType: 'API_ERROR'
            },
            { status: extractResponse.status }
          );
        }

        const extractData = await extractResponse.json();
        sourceContent = extractData.choices[0]?.message?.content || '';

        if (!sourceContent) {
          return NextResponse.json(
            { error: 'Could not extract content from the URL' },
            { status: 500 }
          );
        }
      } catch (fetchError) {
        console.error('Error fetching URL:', fetchError);
        return NextResponse.json(
          { error: 'Failed to fetch the URL. Please check the URL and try again.' },
          { status: 400 }
        );
      }
    } else if (inputMode === 'text') {
      // Mode C: Use the provided text directly
      sourceContent = text.slice(0, 10000); // Enforce character limit
    }

    // STEP 2: Translation with Vocabulary Constraints
    // Use larger model to translate English content to simple Japanese using known vocabulary
    const totalVocabCount = vocabList.length;

    // Extract unique kanji characters from vocabulary - this is much more compact than the full word list
    // and captures the essential constraint (which kanji the user can read)
    const kanjiRegex = /[\u4e00-\u9faf\u3400-\u4dbf]/g;
    const allKanji = vocabList.join('').match(kanjiRegex) || [];
    const uniqueKanji = [...new Set(allKanji)].sort().join('');

    // Also include a sample of vocabulary words for context (common patterns, readings)
    const MAX_VOCAB_SAMPLE = 500;
    const vocabSample = vocabList.length > MAX_VOCAB_SAMPLE
      ? vocabList.slice(0, MAX_VOCAB_SAMPLE).join(', ')
      : vocabList.join(', ');

    const translationPrompt = `You are a Japanese language translator specializing in creating learner-friendly content.

KANJI CONSTRAINT (HIGHEST PRIORITY - YOU MUST FOLLOW THIS):
- The user knows these ${uniqueKanji.length} kanji characters: ${uniqueKanji}
- Use ONLY kanji from this list in your translation
- You may introduce AT MOST 2-3 new kanji that are NOT in their list
- For ANY word containing unknown kanji, write it in HIRAGANA instead
- Grammar particles (は, が, を, に, で, と, も, か, ね, よ, etc.) are always allowed
- This constraint is CRITICAL - using unknown kanji ruins the learning experience

The user knows ${totalVocabCount} vocabulary words. Here is a sample for context:
${vocabSample}

CONTENT TO TRANSLATE:
${sourceContent}

TASK:
1. Translate the above English text into simple Japanese
2. Use ONLY kanji from the user's known kanji list (+ max 2-3 new kanji)
3. Use simple grammar structures appropriate for a learner
4. When a word contains unknown kanji, write it in hiragana instead

FORMATTING RULES:
1. Add spaces between words/particles (e.g., "今日 は 天気 が いい です")
2. Do NOT include citation numbers or references
3. Output as JSON:
{
  "japanese": "Your Japanese text with spaces between words",
  "english": "The original English content"
}

/no_think`;

    // Call Venice.ai API for translation with retry logic
    // Using qwen3-4b for faster response (same model as source fetching)
    const translationResult = await callVeniceWithRetry(apiKey, {
      model: 'qwen3-4b', // Fast model - same as source fetching
      messages: [
        {
          role: 'user',
          content: translationPrompt,
        },
      ],
      temperature: 0.3, // Lower temperature for stricter vocabulary adherence
      max_tokens: 3000, // Increased to handle longer translations
      venice_parameters: {
        disable_thinking: true, // Prevent Qwen3 thinking tokens in output
      },
    }, 2); // Retry up to 2 times

    if (!translationResult.ok) {
      console.error('Venice API error (translation):', translationResult.status, translationResult.errorText);

      // Handle specific error cases
      if (translationResult.status === 429) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded. Venice AI has too many requests. Please wait a few minutes and try again.',
            errorType: 'RATE_LIMIT'
          },
          { status: 429 }
        );
      }

      if (translationResult.status === 401) {
        return NextResponse.json(
          {
            error: 'Invalid or missing API key. Please check your Venice API key configuration.',
            errorType: 'AUTH_ERROR'
          },
          { status: 401 }
        );
      }

      if (translationResult.status === 503) {
        return NextResponse.json(
          {
            error: 'Venice AI service is temporarily unavailable. Please try again in a moment.',
            errorType: 'SERVICE_UNAVAILABLE'
          },
          { status: 503 }
        );
      }

      return NextResponse.json(
        {
          error: `Venice API error (${translationResult.status}): ${translationResult.errorText || 'Unknown error'}`,
          errorType: 'API_ERROR'
        },
        { status: translationResult.status || 500 }
      );
    }

    const data = translationResult.data as { choices: Array<{ message: { content: string } }> };
    let rawContent = data.choices[0]?.message?.content || '';

    // Strip out any <think>...</think> tags that Qwen3 might include despite disable_thinking
    // First, strip complete think blocks (has both opening and closing tags)
    rawContent = rawContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    // Then, handle unclosed <think> tags (truncated responses where max_tokens cut off the closing tag)
    rawContent = rawContent.replace(/<think>[\s\S]*/gi, '').trim();

    // Parse the JSON response from the model
    let japanese = '';
    let english = '';

    // Helper function to extract fields from various formats
    const extractFields = (content: string): { japanese: string; english: string } | null => {
      // Try standard JSON parse first (for properly formatted JSON)
      try {
        // Check for markdown code block
        const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
          const parsed = JSON.parse(codeBlockMatch[1]);
          if (parsed.japanese) {
            return { japanese: parsed.japanese, english: parsed.english || '' };
          }
        }

        // Try parsing the whole content as JSON
        const parsed = JSON.parse(content);
        if (parsed.japanese) {
          return { japanese: parsed.japanese, english: parsed.english || '' };
        }
      } catch {
        // JSON parse failed, try regex extraction
      }

      // Extract using regex for various formats (quoted or unquoted values)
      // Match: "japanese": "value" - handles multiline content with [\s\S] instead of /s flag
      const japaneseMatch = content.match(/"japanese"\s*:\s*"((?:[^"\\]|\\[\s\S])*)"/);
      if (japaneseMatch) {
        // Unescape the JSON string
        let jpText = japaneseMatch[1]
          .replace(/\\n/g, '\n')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\');

        const englishMatch = content.match(/"english"\s*:\s*"((?:[^"\\]|\\[\s\S])*)"/);

        let enText = englishMatch
          ? englishMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\')
          : '';

        return { japanese: jpText, english: enText };
      }

      // Last fallback: try to extract content between "japanese": " and the next quote
      // This handles truncated responses
      const truncatedMatch = content.match(/"japanese"\s*:\s*"([^"]*)/);
      if (truncatedMatch) {
        return { japanese: truncatedMatch[1], english: '' };
      }

      return null;
    };

    // Clean any JSON artifacts from the content if parsing completely failed
    const cleanJsonArtifacts = (content: string): string => {
      // Remove JSON structure artifacts like { "japanese": "
      return content
        .replace(/^\s*\{\s*["']?japanese["']?\s*:\s*["']?/i, '')
        .replace(/["']?\s*,\s*["']?english["']?\s*:\s*["']?[\s\S]*$/i, '')
        .replace(/["']?\s*\}\s*$/i, '')
        .trim();
    };

    const extracted = extractFields(rawContent);
    if (extracted) {
      japanese = extracted.japanese;
      english = extracted.english || 'Translation not available';
    } else {
      // Last resort: clean any JSON artifacts and use the content
      japanese = cleanJsonArtifacts(rawContent);
      english = 'Translation not available';
    }

    // Validate that we actually got content
    if (!japanese || japanese.trim().length === 0) {
      console.error('Translation API returned empty content. Raw response:', rawContent);
      return NextResponse.json(
        {
          error: 'Failed to generate Japanese content. The translation service returned an empty response. Please try again.',
          debug: process.env.NODE_ENV === 'development' ? { rawContent } : undefined
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      japanese,
      english,
      sourceContent // Include the original English content for display
    });
  } catch (error) {
    console.error('Error in generate API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
