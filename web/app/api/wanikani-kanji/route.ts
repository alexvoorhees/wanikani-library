import { NextRequest, NextResponse } from 'next/server';

// SRS stage thresholds
// WaniKani stages: 1-4=Apprentice, 5-6=Guru, 7-8=Master, 9=Enlightened, 10=Burned
const KNOWN_THRESHOLD = 5; // Guru I and above

interface WaniKaniSubject {
  id: number;
  object: string;
  data: {
    characters: string;
    level: number;
  };
}

interface WaniKaniAssignment {
  data: {
    subject_id: number;
    srs_stage: number;
  };
}

interface WaniKaniResponse<T> {
  data: T[];
  pages: {
    next_url: string | null;
  };
}

async function fetchAllPages<T>(
  endpoint: string,
  apiKey: string,
  params?: Record<string, string>
): Promise<T[]> {
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Wanikani-Revision': '20170710',
  };

  const results: T[] = [];
  let url: string | null = `https://api.wanikani.com/v2/${endpoint}`;

  // Add initial params to URL
  if (params) {
    const searchParams = new URLSearchParams(params);
    url = `${url}?${searchParams.toString()}`;
  }

  while (url) {
    const response = await fetch(url, { headers });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid API key. Please check your WaniKani API key.');
      }
      throw new Error(`WaniKani API error: ${response.status} ${response.statusText}`);
    }

    const data: WaniKaniResponse<T> = await response.json();
    results.push(...data.data);

    // Get next page URL
    url = data.pages.next_url;
  }

  return results;
}

export async function POST(request: NextRequest) {
  try {
    const { apiKey } = await request.json();

    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json(
        { error: 'WaniKani API key is required' },
        { status: 400 }
      );
    }

    // Fetch assignments (user progress data)
    const assignments = await fetchAllPages<WaniKaniAssignment>(
      'assignments',
      apiKey
    );

    // Fetch kanji subjects only
    const subjects = await fetchAllPages<WaniKaniSubject>(
      'subjects',
      apiKey,
      { types: 'kanji' }
    );

    // Build subject lookup map
    const subjectMap = new Map<number, WaniKaniSubject>();
    for (const subject of subjects) {
      subjectMap.set(subject.id, subject);
    }

    // Filter for known kanji (Guru and above)
    const knownKanji: string[] = [];

    for (const assignment of assignments) {
      const subjectId = assignment.data.subject_id;
      const subject = subjectMap.get(subjectId);

      // Skip if not a kanji subject
      if (!subject || subject.object !== 'kanji') {
        continue;
      }

      // Check if at Guru level or above
      if (assignment.data.srs_stage >= KNOWN_THRESHOLD) {
        knownKanji.push(subject.data.characters);
      }
    }

    // Sort kanji by WaniKani level for consistency
    const kanjiWithLevel = knownKanji.map(char => {
      const subject = Array.from(subjectMap.values()).find(s => s.data.characters === char);
      return { char, level: subject?.data.level || 0 };
    });
    kanjiWithLevel.sort((a, b) => a.level - b.level);

    const sortedKanji = kanjiWithLevel.map(k => k.char);

    return NextResponse.json({
      kanji: sortedKanji,
      count: sortedKanji.length,
    });
  } catch (error) {
    console.error('Error fetching WaniKani kanji:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch kanji from WaniKani';

    return NextResponse.json(
      { error: errorMessage },
      { status: error instanceof Error && error.message.includes('Invalid API key') ? 401 : 500 }
    );
  }
}
