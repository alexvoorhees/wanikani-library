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
2. Write a 1-3 paragraph summary in Japanese
3. Use ONLY vocabulary from the user's known word list (they know ${totalVocabCount} words total)
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

Generate the Japanese content now. Only output the Japanese text, no English explanations.`;

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
        max_tokens: 1000,
        venice_parameters: {
          enable_web_search: 'auto', // Enable real-time web search for current news
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Venice API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to generate content from Venice API' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';

    return NextResponse.json({ content });
  } catch (error) {
    console.error('Error in generate API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
