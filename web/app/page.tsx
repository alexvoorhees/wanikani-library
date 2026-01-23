'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { ReaderSurface } from '@/components/ui/reader-surface';
import { Spinner } from '@/components/ui/spinner';
import { AlertCircle, X, Search, Link, FileText, Download, Key } from 'lucide-react';

interface KanjiInfo {
  character: string;
  meanings: string[];
  readings: string[];
}

type InputMode = 'topic' | 'url' | 'text';

export default function Home() {
  const [vocabList, setVocabList] = useState<string[]>([]);
  const [inputMode, setInputMode] = useState<InputMode>('topic');
  const [topic, setTopic] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [textInput, setTextInput] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [englishTranslation, setEnglishTranslation] = useState('');
  const [newsContent, setNewsContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [loadingStage, setLoadingStage] = useState<'source' | 'translate'>('source');
  const [unknownKanji, setUnknownKanji] = useState<string[]>([]);
  const [kanjiInfo, setKanjiInfo] = useState<KanjiInfo[]>([]);
  const [isLoadingKanji, setIsLoadingKanji] = useState(false);
  const [error, setError] = useState<string>('');

  // WaniKani API sync state
  const [wanikaniApiKey, setWanikaniApiKey] = useState('');
  const [isLoadingWanikani, setIsLoadingWanikani] = useState(false);
  const [wanikaniError, setWanikaniError] = useState<string>('');
  const [wanikaniSuccess, setWanikaniSuccess] = useState<string>('');
  const [showWanikaniModal, setShowWanikaniModal] = useState(false);

  const TEXT_INPUT_LIMIT = 10000;

  // Fetch known kanji from WaniKani and download as text file
  const handleWanikaniExport = async (downloadOnly: boolean = true) => {
    if (!wanikaniApiKey.trim()) {
      setWanikaniError('Please enter your WaniKani API key');
      return;
    }

    setIsLoadingWanikani(true);
    setWanikaniError('');
    setWanikaniSuccess('');

    try {
      const response = await fetch('/api/wanikani-kanji', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: wanikaniApiKey.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setWanikaniError(data.error || 'Failed to fetch kanji from WaniKani');
        return;
      }

      if (!data.kanji || data.kanji.length === 0) {
        setWanikaniError('No kanji at Guru level or above found. Keep studying!');
        return;
      }

      // Create the kanji string (one character per line for easy use)
      const kanjiText = data.kanji.join('');

      if (downloadOnly) {
        // Trigger file download
        const blob = new Blob([kanjiText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'wanikani_known_kanji.txt';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setWanikaniSuccess(`Downloaded ${data.count} kanji!`);
      } else {
        // Use directly in the app - convert kanji to a vocab list format
        // Each kanji becomes a "word" in the vocab list
        const kanjiAsVocab = data.kanji;
        setVocabList(kanjiAsVocab);
        localStorage.setItem('japaneseVocab', JSON.stringify(kanjiAsVocab));
        setWanikaniSuccess(`Loaded ${data.count} kanji into vocabulary!`);
      }
    } catch (error) {
      console.error('Error fetching WaniKani kanji:', error);
      setWanikaniError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoadingWanikani(false);
    }
  };

  // Extract unique kanji characters from vocabulary list
  // This is much more compact than sending the full word list to the API
  const extractKanjiFromVocab = (vocab: string[]): string => {
    const kanjiRegex = /[\u4e00-\u9faf\u3400-\u4dbf]/g;
    const allKanji = vocab.join('').match(kanjiRegex) || [];
    return [...new Set(allKanji)].sort().join('');
  };

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
    if (vocabList.length === 0) {
      setError('Please upload a vocabulary file first!');
      return;
    }

    // Validate based on input mode
    if (inputMode === 'topic' && !topic.trim()) {
      setError('Please enter a topic to search for!');
      return;
    }
    if (inputMode === 'url' && !urlInput.trim()) {
      setError('Please enter a URL to analyze!');
      return;
    }
    if (inputMode === 'text' && !textInput.trim()) {
      setError('Please enter some English text to convert!');
      return;
    }

    setIsLoading(true);
    setError(''); // Clear previous errors
    setGeneratedContent(''); // Clear previous content
    setEnglishTranslation('');
    setNewsContent('');

    try {
      // For topic and url modes, use two-stage process
      if (inputMode === 'topic' || inputMode === 'url') {
        // Stage 1: Fetch source content
        setLoadingStage('source');

        const sourceRequestBody: Record<string, unknown> = {
          inputMode,
        };

        if (inputMode === 'topic') {
          sourceRequestBody.topic = topic;
        } else {
          sourceRequestBody.url = urlInput;
        }

        const sourceResponse = await fetch('/api/source', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sourceRequestBody),
        });

        const sourceData = await sourceResponse.json();

        if (!sourceResponse.ok) {
          setError(sourceData.error || 'Failed to fetch source content. Please try again.');
          setIsLoading(false);
          return;
        }

        if (!sourceData.sourceContent || sourceData.sourceContent.trim().length === 0) {
          setError('No content was found. Please try a different topic or URL.');
          setIsLoading(false);
          return;
        }

        // Display the source content immediately
        setNewsContent(sourceData.sourceContent);
        setIsLoading(false);

        // Stage 2: Translate to Japanese
        setIsTranslating(true);
        setLoadingStage('translate');

        const translateResponse = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inputMode: 'text',
            text: sourceData.sourceContent,
            knownKanji: extractKanjiFromVocab(vocabList),
          }),
        });

        const translateData = await translateResponse.json();

        if (!translateResponse.ok) {
          setError(translateData.error || 'Failed to translate content. Please try again.');
          setIsTranslating(false);
          return;
        }

        if (!translateData.japanese || translateData.japanese.trim().length === 0) {
          setError('Translation failed. Please try again.');
          setIsTranslating(false);
          return;
        }

        setGeneratedContent(translateData.japanese || '');
        setEnglishTranslation(translateData.english || '');
        setIsTranslating(false);
      } else {
        // For text mode, use single-stage process (same as before)
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inputMode,
            text: textInput,
            knownKanji: extractKanjiFromVocab(vocabList),
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Failed to generate content. Please try again.');
          setIsLoading(false);
          return;
        }

        if (!data.japanese || data.japanese.trim().length === 0) {
          setError('No content was generated. Please try again or try a different source.');
          setIsLoading(false);
          return;
        }

        setGeneratedContent(data.japanese || '');
        setEnglishTranslation(data.english || '');
        setNewsContent(data.sourceContent || textInput);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error generating content:', error);
      setError('Network error. Please check your connection and try again.');
      setIsLoading(false);
      setIsTranslating(false);
    }
  };

  // Kanji tooltip component
  const KanjiWithTooltip = ({ char, info }: { char: string; info?: KanjiInfo }) => {
    return (
      <span className="relative inline-block group">
        <span className="font-bold text-primary cursor-help">
          {char}
        </span>
        {info && (
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-white border border-border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 whitespace-nowrap pointer-events-none">
            <span className="block text-2xl font-japanese text-primary mb-1">{info.character}</span>
            <span className="block text-xs text-muted-foreground uppercase tracking-wider">Reading</span>
            <span className="block text-sm mb-1">{info.readings.slice(0, 2).join(', ')}</span>
            <span className="block text-xs text-muted-foreground uppercase tracking-wider">Meaning</span>
            <span className="block text-sm">{info.meanings.slice(0, 2).join(', ')}</span>
            <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-white" />
          </span>
        )}
      </span>
    );
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

          // Find kanji info for this character
          const info = kanjiInfo.find(k => k.character === char);

          // Add the bolded kanji with tooltip
          segments.push(
            <KanjiWithTooltip key={`bold-${segmentKey++}`} char={char} info={info} />
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

    return <div className="whitespace-pre-wrap leading-reading text-xl font-japanese text-foreground">{segments}</div>;
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
    <div className="min-h-screen bg-background paper-texture">
      <div className="max-w-3xl mx-auto px-6 py-12 md:py-16">
        {/* Header with subtle Japanese accent */}
        <header className="text-center mb-14 relative">
          <div className="inline-flex items-center gap-3 mb-4">
            <span className="seal-accent">読</span>
            <h1 className="text-3xl md:text-4xl font-medium text-foreground tracking-tight">
              Japanese Reader
            </h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Generate readable Japanese content using your vocabulary
          </p>
          <div className="rule-japanese mt-8 mx-auto max-w-xs" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowWanikaniModal(true)}
            className="mt-4 text-muted-foreground hover:text-primary"
          >
            <Download className="h-4 w-4 mr-2" />
            Download WaniKani Kanji
          </Button>
        </header>

        {/* WaniKani Kanji Export Modal */}
        {showWanikaniModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowWanikaniModal(false)}
                className="absolute top-3 right-3 h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 mb-3">
                <Key className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">WaniKani Sync</span>
              </div>
              <CardTitle className="mb-2">Export Your Known Kanji</CardTitle>
              <p className="text-sm text-muted-foreground mb-4">
                Connect to WaniKani to download a text file of all kanji you know at Guru level or above.
              </p>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <Input
                      type="password"
                      value={wanikaniApiKey}
                      onChange={(e) => setWanikaniApiKey(e.target.value)}
                      placeholder="Enter your WaniKani API key (v2)"
                      className="flex-1"
                    />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      onClick={() => handleWanikaniExport(true)}
                      disabled={isLoadingWanikani || !wanikaniApiKey.trim()}
                      variant="default"
                      size="sm"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {isLoadingWanikani ? 'Fetching...' : 'Download Kanji File'}
                    </Button>
                    <Button
                      onClick={() => handleWanikaniExport(false)}
                      disabled={isLoadingWanikani || !wanikaniApiKey.trim()}
                      variant="secondary"
                      size="sm"
                    >
                      {isLoadingWanikani ? 'Fetching...' : 'Use Directly in App'}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Get your API key from{' '}
                    <a
                      href="https://www.wanikani.com/settings/personal_access_tokens"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline hover:no-underline"
                    >
                      WaniKani Settings → API Tokens
                    </a>
                    . Your key is never stored.
                  </p>

                  {/* Error Display */}
                  {wanikaniError && (
                    <Alert variant="destructive" className="mt-3">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        <AlertDescription>{wanikaniError}</AlertDescription>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setWanikaniError('')}
                          className="ml-auto h-6 w-6 text-destructive hover:text-destructive/80"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </Alert>
                  )}

                  {/* Success Display */}
                  {wanikaniSuccess && (
                    <Alert variant="info" className="mt-3">
                      <div className="flex items-center gap-2">
                        <AlertDescription>{wanikaniSuccess}</AlertDescription>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setWanikaniSuccess('')}
                          className="ml-auto h-6 w-6"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Setup Section - lighter visual weight */}
        <div className="space-y-4 mb-10">
          {/* Vocabulary Upload Section */}
          <Card variant="setup">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Step 1</span>
            </div>
            <CardTitle className="mb-4">Upload Your Vocabulary</CardTitle>
            <CardContent>
              <div className="flex items-center gap-4">
                <Input
                  type="file"
                  accept=".txt"
                  onChange={handleFileUpload}
                />
                {vocabList.length > 0 && (
                  <span className="text-sm text-primary font-medium whitespace-nowrap">
                    {extractKanjiFromVocab(vocabList).length} kanji loaded
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Content Input Section */}
          <Card variant="setup">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Step 2</span>
            </div>
            <CardTitle className="mb-4">Choose your content source</CardTitle>
            <CardContent>
              {/* Mode Selector */}
              <div className="flex gap-2 mb-4 p-1 bg-muted/50 rounded-lg w-fit">
                <button
                  onClick={() => setInputMode('topic')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    inputMode === 'topic'
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-transparent hover:bg-muted text-muted-foreground'
                  }`}
                >
                  <Search className="h-4 w-4" />
                  Web Search
                </button>
                <button
                  onClick={() => setInputMode('url')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    inputMode === 'url'
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-transparent hover:bg-muted text-muted-foreground'
                  }`}
                >
                  <Link className="h-4 w-4" />
                  URL
                </button>
                <button
                  onClick={() => setInputMode('text')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    inputMode === 'text'
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-transparent hover:bg-muted text-muted-foreground'
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  Paste Text
                </button>
              </div>

              {/* Topic Search Input */}
              {inputMode === 'topic' && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Search the web for news about a topic
                  </p>
                  <div className="flex gap-3">
                    <Input
                      type="text"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !isLoading && vocabList.length > 0) {
                          handleGenerate();
                        }
                      }}
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
                </div>
              )}

              {/* URL Input */}
              {inputMode === 'url' && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Paste a URL to an English webpage to summarize in Japanese
                  </p>
                  <div className="flex gap-3">
                    <Input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !isLoading && vocabList.length > 0) {
                          handleGenerate();
                        }
                      }}
                      placeholder="https://example.com/article..."
                      className="flex-1"
                    />
                    <Button
                      onClick={handleGenerate}
                      disabled={isLoading || vocabList.length === 0}
                    >
                      {isLoading ? 'Generating...' : 'Generate'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Direct Text Input */}
              {inputMode === 'text' && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                      Paste or type English text to convert to Japanese
                    </p>
                    <span className={`text-xs ${textInput.length > TEXT_INPUT_LIMIT ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {textInput.length.toLocaleString()} / {TEXT_INPUT_LIMIT.toLocaleString()}
                    </span>
                  </div>
                  <textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value.slice(0, TEXT_INPUT_LIMIT))}
                    placeholder="Paste or type your English text here..."
                    className="w-full min-h-[150px] px-3 py-2 border border-border rounded-md bg-background text-foreground resize-y focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  />
                  <Button
                    onClick={handleGenerate}
                    disabled={isLoading || vocabList.length === 0 || textInput.length === 0}
                    className="w-full"
                  >
                    {isLoading ? 'Generating...' : 'Convert to Japanese'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Error Display */}
        {error && !isLoading && (
          <Alert variant="destructive" className="mb-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  <p>{error}</p>
                  {error.includes('Rate limit') && (
                    <div className="mt-4 p-4 bg-destructive/5 rounded-md border border-destructive/20">
                      <p className="text-sm font-medium mb-2">Rate Limit Tips:</p>
                      <ul className="text-sm space-y-1 list-disc list-inside opacity-90">
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
                className="flex-shrink-0 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </Alert>
        )}

        {/* Loading Indicator - Stage 1: Fetching source */}
        {isLoading && (
          <Card className="mb-6">
            <div className="flex flex-col items-center justify-center gap-4 py-8">
              <Spinner size="lg" />
              <div className="text-center">
                <p className="text-muted-foreground text-sm mb-1">
                  {inputMode === 'topic' && 'Searching the web...'}
                  {inputMode === 'url' && 'Fetching webpage content...'}
                  {inputMode === 'text' && 'Converting your text to Japanese...'}
                </p>
                <p className="text-muted-foreground text-xs">
                  {(inputMode === 'topic' || inputMode === 'url') && 'Step 1 of 2: Getting English content'}
                  {inputMode === 'text' && 'This may take a moment...'}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Generated Content Section - Main reading area */}
        {(englishTranslation || generatedContent || isTranslating) && !isLoading && (
          <div className="space-y-6">
            {/* English Content - Shows after translation is complete */}
            {englishTranslation && !isTranslating && (
              <Card variant="reader">
                <CardTitle className="mb-4 text-muted-foreground">English</CardTitle>
                <ReaderSurface variant="english">
                  <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap">
                    {englishTranslation}
                  </p>
                </ReaderSurface>
              </Card>
            )}

            {/* Japanese Content - Primary reading surface */}
            {isTranslating ? (
              <Card variant="reader">
                <CardTitle className="mb-5">Japanese</CardTitle>
                <div className="flex flex-col items-center justify-center gap-4 py-8">
                  <Spinner size="lg" />
                  <div className="text-center">
                    <p className="text-muted-foreground text-sm mb-1">Translating to Japanese...</p>
                    <p className="text-muted-foreground text-xs">Step 2 of 2: Adapting to your vocabulary</p>
                  </div>
                </div>
              </Card>
            ) : generatedContent && (
              <Card variant="reader">
                <div className="flex justify-between items-center mb-5">
                  <CardTitle>Japanese</CardTitle>
                  <span className="text-xs text-muted-foreground">
                    <span className="font-bold text-primary">Bold</span> = New kanji (hover for info)
                  </span>
                </div>
                <ReaderSurface variant="japanese">
                  {highlightText(generatedContent)}
                </ReaderSurface>
              </Card>
            )}
          </div>
        )}

        {/* New Kanji Vocabulary Panel */}
        {generatedContent && !isLoading && !isTranslating && unknownKanji.length > 0 && (
          <Card className="mt-6">
            <CardTitle className="mb-5">
              New Kanji ({unknownKanji.length})
            </CardTitle>
            <CardContent>
              {isLoadingKanji ? (
                <div className="flex items-center justify-center py-8">
                  <Spinner className="mr-3" />
                  <p className="text-muted-foreground text-sm">Loading kanji information...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {kanjiInfo.map((info, index) => (
                    <div
                      key={index}
                      className="border border-border-subtle rounded-md p-4 hover:border-border hover:shadow-sm transition-all duration-200 bg-card/50"
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-3xl font-japanese text-primary flex-shrink-0">
                          {info.character}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="mb-2">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">
                              Reading
                            </p>
                            <p className="text-sm text-foreground">
                              {info.readings.slice(0, 2).join(', ')}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">
                              Meaning
                            </p>
                            <p className="text-sm text-foreground/80">
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

        {/* Instructions - Initial state */}
        {vocabList.length === 0 && (
          <Alert variant="info" className="text-center">
            <p>
              Start by uploading your Japanese vocabulary list (comma-separated .txt file)
            </p>
          </Alert>
        )}

        {/* Footer accent */}
        <div className="rule-japanese mt-16 mx-auto max-w-xs" />
      </div>
    </div>
  );
}
