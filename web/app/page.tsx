'use client';

import { useState, useEffect } from 'react';

interface KanjiInfo {
  character: string;
  meanings: string[];
  readings: string[];
}

export default function Home() {
  const [vocabList, setVocabList] = useState<string[]>([]);
  const [topic, setTopic] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [unknownKanji, setUnknownKanji] = useState<string[]>([]);
  const [kanjiInfo, setKanjiInfo] = useState<KanjiInfo[]>([]);
  const [isLoadingKanji, setIsLoadingKanji] = useState(false);

  // Load vocab list from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('japaneseVocab');
    if (saved) {
      setVocabList(JSON.parse(saved));
    }
  }, []);

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      // Split by comma and trim whitespace
      const words = text.split(',').map(w => w.trim()).filter(w => w);
      setVocabList(words);
      localStorage.setItem('japaneseVocab', JSON.stringify(words));
    };
    reader.readAsText(file);
  };

  // Generate content
  const handleGenerate = async () => {
    if (!topic || vocabList.length === 0) {
      alert('Please upload a vocabulary file and enter a topic!');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, vocabList }),
      });

      const data = await response.json();
      setGeneratedContent(data.content);
    } catch (error) {
      console.error('Error generating content:', error);
      alert('Failed to generate content. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Highlight unknown kanji in generated content
  const highlightText = (text: string) => {
    if (!text) return null;

    // Track kanji we've already seen in this text (for first-appearance-only bolding)
    const seenKanji = new Set<string>();
    const segments: React.ReactElement[] = [];

    // Regex to detect kanji characters (CJK Unified Ideographs)
    const kanjiRegex = /[\u4E00-\u9FAF]/;

    // Build current segment of non-bold text
    let currentSegment = '';
    let segmentKey = 0;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      // Check if this character is a kanji
      if (kanjiRegex.test(char)) {
        // Check if this kanji is in our known vocabulary
        const isKnown = vocabList.some(word => word.includes(char));

        // Bold this kanji only if it's unknown AND we haven't seen it yet
        const shouldBold = !isKnown && !seenKanji.has(char);

        if (shouldBold) {
          // Push any accumulated non-bold text first
          if (currentSegment) {
            segments.push(
              <span key={`normal-${segmentKey++}`}>{currentSegment}</span>
            );
            currentSegment = '';
          }

          // Add the bolded kanji
          segments.push(
            <span key={`bold-${segmentKey++}`} className="font-bold">
              {char}
            </span>
          );

          // Mark this kanji as seen
          seenKanji.add(char);
        } else {
          // Known kanji or already seen - just add to current segment
          currentSegment += char;
        }
      } else {
        // Not a kanji - add to current segment
        currentSegment += char;
      }
    }

    // Add any remaining text
    if (currentSegment) {
      segments.push(
        <span key={`normal-${segmentKey++}`}>{currentSegment}</span>
      );
    }

    return <div className="whitespace-pre-wrap leading-relaxed text-lg text-gray-900">{segments}</div>;
  };

  // Extract unknown kanji from text
  const extractUnknownKanji = (text: string): string[] => {
    if (!text) return [];

    const kanjiRegex = /[\u4E00-\u9FAF]/g;
    const allKanji = text.match(kanjiRegex) || [];
    const uniqueKanji = Array.from(new Set(allKanji));

    // Filter to only unknown kanji
    return uniqueKanji.filter(char => !vocabList.some(word => word.includes(char)));
  };

  // Fetch kanji information when content is generated
  useEffect(() => {
    const fetchKanjiInfo = async () => {
      if (!generatedContent) {
        setUnknownKanji([]);
        setKanjiInfo([]);
        return;
      }

      const kanji = extractUnknownKanji(generatedContent);
      setUnknownKanji(kanji);

      if (kanji.length === 0) {
        setKanjiInfo([]);
        return;
      }

      setIsLoadingKanji(true);
      try {
        const response = await fetch('/api/kanji', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kanji }),
        });

        const data = await response.json();
        setKanjiInfo(data.kanjiInfo);
      } catch (error) {
        console.error('Error fetching kanji info:', error);
      } finally {
        setIsLoadingKanji(false);
      }
    };

    fetchKanjiInfo();
  }, [generatedContent, vocabList]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-indigo-900 mb-2">
            日本語 Japanese Reader
          </h1>
          <p className="text-gray-600">
            Generate readable Japanese content using your vocabulary
          </p>
        </header>

        {/* Vocabulary Upload Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            1. Upload Your Vocabulary
          </h2>
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept=".txt"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-indigo-50 file:text-indigo-700
                hover:file:bg-indigo-100"
            />
            {vocabList.length > 0 && (
              <span className="text-green-600 font-medium whitespace-nowrap">
                ✓ {vocabList.length} words loaded
              </span>
            )}
          </div>
        </div>

        {/* Topic Input Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            2. What would you like to read about?
          </h2>
          <div className="flex gap-4">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., technology news, Japanese culture, sports..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
            />
            <button
              onClick={handleGenerate}
              disabled={isLoading || vocabList.length === 0}
              className="px-8 py-3 bg-indigo-600 text-white rounded-lg font-semibold
                hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed
                transition-colors"
            >
              {isLoading ? 'Generating...' : 'Generate'}
            </button>
          </div>
        </div>

        {/* Loading Indicator */}
        {isLoading && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              <p className="text-gray-600 font-medium">Generating your Japanese content...</p>
            </div>
          </div>
        )}

        {/* Generated Content Section */}
        {generatedContent && !isLoading && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-gray-800">
                Your Content
              </h2>
              <div className="flex gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-2">
                  <span className="font-bold">Bold</span>
                  = Unknown kanji (first appearance)
                </span>
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              {highlightText(generatedContent)}
            </div>
          </div>
        )}

        {/* New Kanji Vocabulary Panel */}
        {generatedContent && !isLoading && unknownKanji.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              New Kanji in This Text ({unknownKanji.length})
            </h2>

            {isLoadingKanji ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mr-3"></div>
                <p className="text-gray-600">Loading kanji information...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {kanjiInfo.map((info, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-4xl font-bold text-indigo-900 flex-shrink-0">
                        {info.character}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="mb-2">
                          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                            Reading
                          </p>
                          <p className="text-sm text-gray-700 font-medium">
                            {info.readings.slice(0, 2).join(', ')}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                            Meaning
                          </p>
                          <p className="text-sm text-gray-700">
                            {info.meanings.slice(0, 2).join(', ')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        {vocabList.length === 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <p className="text-blue-800">
              📝 Start by uploading your Japanese vocabulary list (comma-separated .txt file)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
