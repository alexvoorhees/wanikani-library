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

    // Create a sample of vocabulary to include in the prompt (not all 1000+ words)
    const vocabSample = vocabList.slice(0, 200).join(', ');
    const totalVocabCount = vocabList.length;

    const prompt = `You are a Japanese language content generator. Your task is to search for recent English news articles about "${topic}", then create a simplified Japanese summary.

CRITICAL CONSTRAINTS:
1. Find recent English news/articles about: ${topic}
2. Write a 1-3 paragraph summary in Japanese using ONLY vocabulary from the user's known word list
3. The user knows ${totalVocabCount} words total
4. Aim for ~90% of words to be from their vocabulary list
5. Keep the content interesting and informative
6. Use simple grammar structures appropriate for their level

Here is a sample of their known vocabulary (first 200 words):
${vocabSample}

The user knows ${totalVocabCount} total words including these patterns:
- Basic kanji and compounds
- Common phrases (お母さん, ありがとう, etc.)
- Numbers and counters (〜円, 〜人, etc.)
- Everyday vocabulary

IMPORTANT FORMATTING RULES:
1. Add spaces between distinct Japanese words/particles to make parsing easier (e.g., "今日 は 天気 が いい です" instead of "今日は天気がいいです")
2. Do NOT include any citation numbers or references in the Japanese text
3. Output your response in the following JSON format:
{
  "japanese": "Your Japanese summary here with spaces between words",
  "english": "English translation of the Japanese summary"
}

Make sure the English translation accurately reflects what you wrote in Japanese.`;

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
        temperature: 0.7,
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
