import { NextRequest, NextResponse } from 'next/server';

type InputMode = 'topic' | 'url';

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
    const { inputMode, topic, url } = await request.json();

    // Validate input mode
    if (inputMode !== 'topic' && inputMode !== 'url') {
      return NextResponse.json(
        { error: 'This endpoint only supports topic and url modes' },
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

    const apiKey = process.env.VENICE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Venice API key not configured' },
        { status: 500 }
      );
    }

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

      const result = await callVeniceWithRetry(apiKey, {
        model: 'qwen3-4b', // Venice Small - fast model for news gathering
        messages: [
          {
            role: 'user',
            content: newsPrompt,
          },
        ],
        temperature: 0.5,
        max_tokens: 800,
        venice_parameters: {
          enable_web_search: 'auto', // Enable web search for current news
          enable_web_citations: false,
          return_search_results_as_documents: false,
          disable_thinking: true, // Prevent Qwen3 thinking tokens in output
        },
      }, 2);

      if (!result.ok) {
        console.error('Venice API error (news gathering):', result.status, result.errorText);

        if (result.status === 429) {
          return NextResponse.json(
            {
              error: 'Rate limit exceeded. Venice AI has too many requests. Please wait a few minutes and try again.',
              errorType: 'RATE_LIMIT'
            },
            { status: 429 }
          );
        }

        if (result.status === 503) {
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
            error: `Failed to gather news: ${result.status}`,
            errorType: 'API_ERROR'
          },
          { status: result.status || 500 }
        );
      }

      const newsData = result.data as { choices: Array<{ message: { content: string } }> };
      sourceContent = newsData.choices[0]?.message?.content || '';

      // Strip out any <think>...</think> tags that Qwen3 might include
      // First, strip complete think blocks (has both opening and closing tags)
      sourceContent = sourceContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      // Then, handle unclosed <think> tags (truncated responses)
      sourceContent = sourceContent.replace(/<think>[\s\S]*/gi, '').trim();

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

        const result = await callVeniceWithRetry(apiKey, {
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
        }, 2);

        if (!result.ok) {
          console.error('Venice API error (URL extraction):', result.status, result.errorText);

          if (result.status === 429) {
            return NextResponse.json(
              {
                error: 'Rate limit exceeded. Venice AI has too many requests. Please wait a few minutes and try again.',
                errorType: 'RATE_LIMIT'
              },
              { status: 429 }
            );
          }

          if (result.status === 503) {
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
              error: `Failed to analyze URL content: ${result.status}`,
              errorType: 'API_ERROR'
            },
            { status: result.status || 500 }
          );
        }

        const extractData = result.data as { choices: Array<{ message: { content: string } }> };
        sourceContent = extractData.choices[0]?.message?.content || '';

        // Strip out any <think>...</think> tags that Qwen3 might include
        // First, strip complete think blocks (has both opening and closing tags)
        sourceContent = sourceContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        // Then, handle unclosed <think> tags (truncated responses)
        sourceContent = sourceContent.replace(/<think>[\s\S]*/gi, '').trim();

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
    }

    return NextResponse.json({
      sourceContent,
    });
  } catch (error) {
    console.error('Error in source API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
