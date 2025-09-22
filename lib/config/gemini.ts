import { getVertexAIClient } from '@/lib/adk/vertex-ai-client';

// Vertex AI経由でGeminiを使用するためのラッパー
export const geminiModel = {
  async generateContent(prompt: string | any[]) {
    const vertexClient = getVertexAIClient();
    
    // 配列の場合は画像を含むマルチモーダルリクエスト
    if (Array.isArray(prompt)) {
      const text = await vertexClient.generateContentWithImage(prompt);
      return {
        response: {
          text: () => text,
        },
      };
    }
    
    // 文字列の場合は通常のテキストリクエスト
    const text = await vertexClient.generateContent(prompt);
    
    return {
      response: {
        text: () => text,
      },
    };
  },
};