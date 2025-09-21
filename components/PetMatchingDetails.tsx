'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import type { MatchingResult } from '@/lib/services/pet-feature-analyzer';

interface PetMatchingDetailsProps {
  matchingResult: MatchingResult | null;
  isLoading?: boolean;
}

export const PetMatchingDetails: React.FC<PetMatchingDetailsProps> = ({ 
  matchingResult, 
  isLoading = false 
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (score >= 60) return <AlertCircle className="w-5 h-5 text-yellow-600" />;
    return <XCircle className="w-5 h-5 text-red-600" />;
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return <Badge variant="success">高一致</Badge>;
    if (score >= 60) return <Badge variant="warning">中一致</Badge>;
    if (score >= 40) return <Badge variant="secondary">低一致</Badge>;
    return <Badge variant="destructive">不一致</Badge>;
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>AI分析中...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!matchingResult) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>AIマッチング分析結果</CardTitle>
          {getScoreBadge(matchingResult.overallScore)}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold">総合マッチング度</span>
            <span className={`text-2xl font-bold ${getScoreColor(matchingResult.overallScore)}`}>
              {matchingResult.overallScore}%
            </span>
          </div>
          <Progress value={matchingResult.overallScore} className="h-3" />
          <p className="text-sm text-gray-600 mt-2">{matchingResult.summary}</p>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold mb-4">詳細分析</h3>
          <div className="space-y-3">
            {matchingResult.details.map((detail, index) => (
              <div key={index} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getScoreIcon(detail.similarity)}
                    <span className="font-medium">{detail.category}</span>
                  </div>
                  <span className={`font-bold ${getScoreColor(detail.similarity)}`}>
                    {detail.similarity}%
                  </span>
                </div>
                <Progress value={detail.similarity} className="h-2 mb-2" />
                <p className="text-sm text-gray-600">{detail.explanation}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>注意:</strong> このAI分析は参考情報です。実際の確認は写真や直接の確認をお勧めします。
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};