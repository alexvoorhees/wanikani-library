'use client';

import { useState, useEffect } from 'react';

interface Source {
  title?: string;
  url?: string;
  snippet?: string;
}

export default function Home() {
  const [vocabList, setVocabList] = useState<string[]>([]);
  const [topic, setTopic] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [englishTranslation, setEnglishTranslation] = useState('');
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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
      setGeneratedContent(data.japanese || '');
      setEnglishTranslation(data.english || '');
      setSources(data.sources || []);
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

    return <div className="whitespace-pre-wrap leading-relaxed text-lg">{segments}</div>;
  };

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

        {/* Generated Content Section */}
        {generatedContent && (
          <div className="space-y-6">
            {/* Sources Section */}
            {sources.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                  📰 Source Articles
                </h2>
                <div className="space-y-3">
                  {sources.map((source, idx) => (
                    <div key={idx} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-700 font-medium hover:underline"
                      >
                        {source.title || `Source ${idx + 1}`}
                      </a>
                      {source.snippet && (
                        <p className="text-sm text-gray-600 mt-1">{source.snippet}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Japanese Content */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold text-gray-800">
                  🇯🇵 Japanese Content
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

            {/* English Translation */}
            {englishTranslation && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                  🇺🇸 English Translation
                </h2>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-900 leading-relaxed text-lg whitespace-pre-wrap">
                    {englishTranslation}
                  </p>
                </div>
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
