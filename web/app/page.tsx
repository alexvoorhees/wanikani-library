'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { ReaderSurface } from '@/components/ui/reader-surface';
import { Spinner } from '@/components/ui/spinner';
import { AlertCircle, X } from 'lucide-react';

interface Source {
  title?: string;
  url?: string;
  snippet?: string;
}

interface KanjiInfo {
  character: string;
  meanings: string[];
  readings: string[];
}

export default function Home() {
  const [vocabList, setVocabList] = useState<string[]>([]);
  const [topic, setTopic] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [englishTranslation, setEnglishTranslation] = useState('');
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [unknownKanji, setUnknownKanji] = useState<string[]>([]);
  const [kanjiInfo, setKanjiInfo] = useState<KanjiInfo[]>([]);
  const [isLoadingKanji, setIsLoadingKanji] = useState(false);
  const [error, setError] = useState<string>('');

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
      setError('Please upload a vocabulary file and enter a topic!');
      return;
    }

    setIsLoading(true);
    setError(''); // Clear previous errors
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, vocabList }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle API errors
        setError(data.error || 'Failed to generate content. Please try again.');
        return;
      }

      setGeneratedContent(data.japanese || '');
      setEnglishTranslation(data.english || '');
      setSources(data.sources || []);
    } catch (error) {
      console.error('Error generating content:', error);
      setError('Network error. Please check your connection and try again.');
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
        <Card variant="setup" className="mb-6">
          <CardTitle className="mb-4">1. Upload Your Vocabulary</CardTitle>
          <CardContent>
            <div className="flex items-center gap-4">
              <Input
                type="file"
                accept=".txt"
                onChange={handleFileUpload}
              />
              {vocabList.length > 0 && (
                <span className="text-green-600 font-medium whitespace-nowrap">
                  ✓ {vocabList.length} words loaded
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Topic Input Section */}
        <Card variant="setup" className="mb-6">
          <CardTitle className="mb-4">2. What would you like to read about?</CardTitle>
          <CardContent>
            <div className="flex gap-4">
              <Input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., technology news, Japanese culture, sports..."
                className="flex-1"
              />
              <Button
                onClick={handleGenerate}
                disabled={isLoading || vocabList.length === 0}
              >
                {isLoading ? 'Generating...' : 'Generate'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && !isLoading && (
          <Alert variant="destructive" className="mb-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div className="flex-1">
                <AlertTitle className="text-red-900">Error</AlertTitle>
                <AlertDescription className="text-red-800">
                  <p>{error}</p>
                  {error.includes('Rate limit') && (
                    <div className="mt-4 p-4 bg-red-100 rounded border border-red-300">
                      <p className="text-sm text-red-900 font-medium mb-2">Rate Limit Tips:</p>
                      <ul className="text-sm text-red-800 space-y-1 list-disc list-inside">
                        <li>Wait 2-5 minutes before trying again</li>
                        <li>Venice AI has usage quotas - check your account limits</li>
                        <li>Web search requests are more expensive than regular requests</li>
                      </ul>
                    </div>
                  )}
                </AlertDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setError('')}
                className="flex-shrink-0 text-red-600 hover:text-red-800"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </Alert>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <Card className="p-8 mb-6">
            <div className="flex flex-col items-center justify-center gap-4">
              <Spinner size="lg" />
              <p className="text-gray-600 font-medium">Generating your Japanese content...</p>
            </div>
          </Card>
        )}

        {/* Generated Content Section */}
        {generatedContent && !isLoading && (
          <div className="space-y-6">
            {/* Sources Section */}
            {sources.length > 0 && (
              <Card>
                <CardTitle className="mb-4">📰 Source Articles</CardTitle>
                <CardContent>
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
                </CardContent>
              </Card>
            )}

            {/* Japanese Content */}
            <Card variant="reader">
              <div className="flex justify-between items-center mb-4">
                <CardTitle>🇯🇵 Japanese Content</CardTitle>
                <div className="flex gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-2">
                    <span className="font-bold">Bold</span>
                    = Unknown kanji (first appearance)
                  </span>
                </div>
              </div>
              <ReaderSurface variant="japanese" className="p-4">
                {highlightText(generatedContent)}
              </ReaderSurface>
            </Card>

            {/* English Translation */}
            {englishTranslation && (
              <Card variant="reader">
                <CardTitle className="mb-4">🇺🇸 English Translation</CardTitle>
                <ReaderSurface variant="english" className="p-4">
                  <p className="text-gray-900 leading-relaxed text-lg whitespace-pre-wrap">
                    {englishTranslation}
                  </p>
                </ReaderSurface>
              </Card>
            )}
          </div>
        )}

        {/* New Kanji Vocabulary Panel */}
        {generatedContent && !isLoading && unknownKanji.length > 0 && (
          <Card className="mt-6">
            <CardTitle className="mb-4">
              New Kanji in This Text ({unknownKanji.length})
            </CardTitle>
            <CardContent>
              {isLoadingKanji ? (
                <div className="flex items-center justify-center py-8">
                  <Spinner className="mr-3" />
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
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        {vocabList.length === 0 && (
          <Alert variant="info" className="text-center">
            <p className="text-blue-800">
              📝 Start by uploading your Japanese vocabulary list (comma-separated .txt file)
            </p>
          </Alert>
        )}
      </div>
    </div>
  );
}
