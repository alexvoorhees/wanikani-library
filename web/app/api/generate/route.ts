import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { topic, vocabList } = await request.json();

    if (!topic || !vocabList || vocabList.length === 0) {
      return NextResponse.json(
        { error: 'Topic and vocabulary list are required' },
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

    // Include the full vocabulary list for accurate content generation
    // LLMs like Llama 3.3 70B have 128K context - 2000+ Japanese words (~3K tokens) fits easily
    const fullVocabList = vocabList.join(', ');
    const totalVocabCount = vocabList.length;

    const prompt = `You are a Japanese language content generator helping a learner practice reading.

VOCABULARY CONSTRAINT (HIGHEST PRIORITY - YOU MUST FOLLOW THIS):
- Use ONLY kanji/words from the user's vocabulary list below
- You may introduce AT MOST 2-3 new kanji that are NOT in their list
- For ANY other words not in their vocabulary, write them in HIRAGANA instead of kanji
- Grammar particles (は, が, を, に, で, と, も, か, ね, よ, etc.) are always allowed
- This constraint is CRITICAL - using too many unknown kanji ruins the learning experience

The user knows ${totalVocabCount} words. Here is their COMPLETE vocabulary list:
${fullVocabList}

CONTENT TASK:
1. Search for recent news about: ${topic}
2. Write 1-2 short paragraphs summarizing it in simple Japanese
3. Use simple grammar structures appropriate for a learner
4. When unsure if a word is known, use hiragana or a simpler alternative

FORMATTING RULES:
1. Add spaces between words/particles (e.g., "今日 は 天気 が いい です")
2. Do NOT include citation numbers or references
3. Output as JSON:
{
  "japanese": "Your Japanese text with spaces between words",
  "english": "English translation"
}`;

    // Call Venice.ai API
    const response = await fetch('https://api.venice.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b', // Using a capable open-source model
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3, // Lower temperature for stricter vocabulary adherence
        max_tokens: 1500,
        venice_parameters: {
          enable_web_search: 'auto', // Enable real-time web search for current news
          enable_web_citations: false, // Disable inline citations
          return_search_results_as_documents: false,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Venice API error:', response.status, errorText);

      // Handle specific error cases
      if (response.status === 429) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded. Venice AI has too many requests. Please wait a few minutes and try again.',
            errorType: 'RATE_LIMIT'
          },
          { status: 429 }
        );
      }

      if (response.status === 401) {
        return NextResponse.json(
          {
            error: 'Invalid or missing API key. Please check your Venice API key configuration.',
            errorType: 'AUTH_ERROR'
          },
          { status: 401 }
        );
      }

      return NextResponse.json(
        {
          error: `Venice API error (${response.status}): ${errorText || 'Unknown error'}`,
          errorType: 'API_ERROR'
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    const rawContent = data.choices[0]?.message?.content || '';

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
      // Match: "japanese": "value" OR japanese: value
      const japaneseMatch = content.match(/["']?japanese["']?\s*:\s*["']?([\s\S]*?)["']?\s*,\s*["']?english["']?/i) ||
                           content.match(/["']?japanese["']?\s*:\s*["']([^"']+)["']/i);

      const englishMatch = content.match(/["']?english["']?\s*:\s*["']?([\s\S]*?)["']?\s*\}?$/i) ||
                          content.match(/["']?english["']?\s*:\s*["']([^"']+)["']/i);

      if (japaneseMatch) {
        let jpText = japaneseMatch[1].trim();
        let enText = englishMatch ? englishMatch[1].trim() : '';

        // Clean up any trailing punctuation or brackets from regex capture
        jpText = jpText.replace(/[,\}]$/, '').trim();
        enText = enText.replace(/[\}]$/, '').trim();

        return { japanese: jpText, english: enText };
      }

      return null;
    };

    const extracted = extractFields(rawContent);
    if (extracted) {
      japanese = extracted.japanese;
      english = extracted.english || 'Translation not available';
    } else {
      // Last resort: treat the whole response as Japanese
      japanese = rawContent;
      english = 'Translation not available';
    }

    return NextResponse.json({
      japanese,
      english
    });
  } catch (error) {
    console.error('Error in generate API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
