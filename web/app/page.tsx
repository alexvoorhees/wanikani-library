'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [vocabList, setVocabList] = useState<string[]>([]);
  const [topic, setTopic] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
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
      setGeneratedContent(data.content);
    } catch (error) {
      console.error('Error generating content:', error);
      alert('Failed to generate content. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Highlight vocabulary in generated content
  const highlightText = (text: string) => {
    if (!text) return null;

    // Split text into words/characters for highlighting
    // This is a simple implementation - can be improved
    const segments: React.ReactElement[] = [];
    let currentIndex = 0;

    // Check each character/word
    for (let i = 0; i < text.length; i++) {
      let matched = false;

      // Check if any vocab word starts at this position
      for (const word of vocabList) {
        if (text.substring(i, i + word.length) === word) {
          // Add any non-matched text before this
          if (i > currentIndex) {
            segments.push(
              <span key={`unknown-${currentIndex}`} className="text-red-600 font-semibold">
                {text.substring(currentIndex, i)}
              </span>
            );
          }

          // Add matched word
          segments.push(
            <span key={`known-${i}`} className="text-green-600">
              {word}
            </span>
          );

          currentIndex = i + word.length;
          i = currentIndex - 1; // -1 because loop will increment
          matched = true;
          break;
        }
      }
    }

    // Add remaining text
    if (currentIndex < text.length) {
      segments.push(
        <span key={`unknown-${currentIndex}`} className="text-red-600 font-semibold">
          {text.substring(currentIndex)}
        </span>
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
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-gray-800">
                Your Content
              </h2>
              <div className="flex gap-4 text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 bg-green-600 rounded"></span>
                  Known words
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 bg-red-600 rounded"></span>
                  New words
                </span>
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              {highlightText(generatedContent)}
            </div>
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
