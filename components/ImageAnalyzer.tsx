'use client';

import { useState } from 'react';
import Image from 'next/image';

interface AnalysisResult {
  petType: 'dog' | 'cat' | 'other';
  breed?: string;
  color: string[];
  size: 'small' | 'medium' | 'large';
  confidence: number;
  description: string;
  imageQuality: number;
}

export default function ImageAnalyzer() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setAnalysisResult(null);
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);

      const response = await fetch('/api/agents/visual-detective', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const data = await response.json();
      setAnalysisResult(data.analysis);
    } catch (err) {
      setError('画像の解析に失敗しました。もう一度お試しください。');
      console.error('Analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">
          ペット画像解析 AI
        </h2>

        {/* ファイルアップロード */}
        <div className="mb-8">
          <label className="block mb-2 text-sm font-medium text-gray-700">
            ペットの写真をアップロード
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        {/* プレビュー */}
        {previewUrl && (
          <div className="mb-8">
            <div className="relative w-full h-64 md:h-96 bg-gray-100 rounded-lg overflow-hidden">
              <Image
                src={previewUrl}
                alt="Pet preview"
                fill
                style={{ objectFit: 'contain' }}
              />
            </div>
          </div>
        )}

        {/* 解析ボタン */}
        {selectedFile && !analysisResult && (
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-colors ${
              isAnalyzing
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isAnalyzing ? '解析中...' : '画像を解析'}
          </button>
        )}

        {/* エラー表示 */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* 解析結果 */}
        {analysisResult && (
          <div className="mt-8 space-y-6">
            <h3 className="text-xl font-semibold text-gray-800">解析結果</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">ペットの種類</p>
                <p className="text-lg font-semibold">
                  {analysisResult.petType === 'dog' ? '犬' : 
                   analysisResult.petType === 'cat' ? '猫' : 'その他'}
                </p>
              </div>

              {analysisResult.breed && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">品種</p>
                  <p className="text-lg font-semibold">{analysisResult.breed}</p>
                </div>
              )}

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">サイズ</p>
                <p className="text-lg font-semibold">
                  {analysisResult.size === 'small' ? '小型' :
                   analysisResult.size === 'medium' ? '中型' : '大型'}
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">主な色</p>
                <p className="text-lg font-semibold">
                  {analysisResult.color.join(', ')}
                </p>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">説明</p>
              <p className="text-lg">{analysisResult.description}</p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">解析精度</p>
                <div className="flex items-center mt-1">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${analysisResult.confidence * 100}%` }}
                    />
                  </div>
                  <span className="ml-2 text-sm font-semibold">
                    {Math.round(analysisResult.confidence * 100)}%
                  </span>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-600">画像品質</p>
                <div className="flex items-center mt-1">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${analysisResult.imageQuality}%` }}
                    />
                  </div>
                  <span className="ml-2 text-sm font-semibold">
                    {Math.round(analysisResult.imageQuality)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}