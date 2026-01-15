import { NextRequest, NextResponse } from 'next/server';

interface KanjiInfo {
  character: string;
  meanings: string[];
  readings: string[];
}

export async function POST(request: NextRequest) {
  try {
    const { kanji } = await request.json();

    if (!kanji || !Array.isArray(kanji)) {
      return NextResponse.json(
        { error: 'Kanji array is required' },
        { status: 400 }
      );
    }

    // Fetch information for each kanji from Jisho.org API
    const kanjiInfo: KanjiInfo[] = await Promise.all(
      kanji.map(async (char: string) => {
        try {
          const response = await fetch(`https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(char)}`);

          if (!response.ok) {
            return {
              character: char,
              meanings: ['Definition not available'],
              readings: ['Reading not available'],
            };
          }

          const data = await response.json();

          // Extract meanings and readings from the first result
          if (data.data && data.data.length > 0) {
            const firstResult = data.data[0];

            // Get English meanings
            const meanings = firstResult.senses
              ?.flatMap((sense: any) => sense.english_definitions || [])
              .slice(0, 3) || ['Definition not available'];

            // Get readings (kun and on readings)
            const readings: string[] = [];

            // Add kun readings (Japanese readings)
            const kunReadings = firstResult.japanese
              ?.filter((j: any) => j.reading)
              .map((j: any) => j.reading)
              .slice(0, 2) || [];

            readings.push(...kunReadings);

            // If no readings found, try to get from alternative sources
            if (readings.length === 0) {
              readings.push('Reading not available');
            }

            return {
              character: char,
              meanings: meanings.length > 0 ? meanings : ['Definition not available'],
              readings: readings.length > 0 ? readings : ['Reading not available'],
            };
          }

          return {
            character: char,
            meanings: ['Definition not available'],
            readings: ['Reading not available'],
          };
        } catch (error) {
          console.error(`Error fetching info for kanji ${char}:`, error);
          return {
            character: char,
            meanings: ['Error loading definition'],
            readings: ['Error loading reading'],
          };
        }
      })
    );

    return NextResponse.json({ kanjiInfo });
  } catch (error) {
    console.error('Error in kanji API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
