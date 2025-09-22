import { VertexAI } from '@google-cloud/vertexai';

export class VertexAIClient {
  private vertexAI: VertexAI;
  private model: any;
  private projectId: string;
  private location: string;
  private modelId: string;
  
  constructor() {
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || 'calm-seeker-471513-t3';
    this.location = process.env.VERTEX_AI_LOCATION || 'us-central1';
    this.modelId = process.env.VERTEX_AI_MODEL_ID || 'gemini-2.0-flash-002';
    
    if (!this.projectId) {
      throw new Error('GOOGLE_CLOUD_PROJECT_ID is required for Vertex AI');
    }
    
    // Vertex AI クライアントの初期化（サービスアカウント認証を使用）
    this.vertexAI = new VertexAI({
      project: this.projectId,
      location: this.location,
    });
    
    this.model = this.vertexAI.getGenerativeModel({
      model: this.modelId,
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
      },
    });
    
    console.log('[Vertex AI] Client initialized:', {
      projectId: this.projectId,
      location: this.location,
      model: this.modelId,
    });
  }
  
  async generateContent(prompt: string, systemPrompt?: string): Promise<string> {
    try {
      const fullPrompt = systemPrompt 
        ? `${systemPrompt}\n\n${prompt}`
        : prompt;
        
      console.log('[Vertex AI] Generating content for prompt length:', fullPrompt.length);
      
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }]
      });
      
      const response = result.response;
      const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      console.log('[Vertex AI] Response generated, length:', text.length);
      
      return text;
    } catch (error: any) {
      console.error('[Vertex AI] Generation failed:', error);
      
      // エラーの詳細を解析
      if (error.message?.includes('403')) {
        throw new Error(
          'Vertex AI API access denied. Please ensure:\n' +
          '1. Vertex AI API is enabled in GCP console\n' +
          '2. Service account has aiplatform.endpoints.predict permission\n' +
          '3. Project ID is correct: ' + this.projectId
        );
      }
      
      if (error.message?.includes('404')) {
        throw new Error(
          `Model ${this.modelId} not found in ${this.location}. ` +
          'Please check the model ID and location.'
        );
      }
      
      if (error.message?.includes('401')) {
        throw new Error(
          'Authentication failed. Please check:\n' +
          '1. credentials.json exists and is valid\n' +
          '2. GOOGLE_APPLICATION_CREDENTIALS points to the correct file'
        );
      }
      
      if (error.message?.includes('429')) {
        throw new Error(
          'Rate limit exceeded. Please wait a moment and try again.'
        );
      }
      
      throw new Error(`Vertex AI error: ${error.message || 'Unknown error'}`);
    }
  }
  
  async generateContentStream(
    prompt: string,
    systemPrompt?: string,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    try {
      const fullPrompt = systemPrompt 
        ? `${systemPrompt}\n\n${prompt}`
        : prompt;
        
      console.log('[Vertex AI] Starting stream generation...');
      
      const streamingResp = await this.model.generateContentStream({
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }]
      });
      
      let fullText = '';
      for await (const item of streamingResp.stream) {
        const chunkText = item.candidates?.[0]?.content?.parts?.[0]?.text || '';
        fullText += chunkText;
        if (onChunk) {
          onChunk(chunkText);
        }
      }
      
      console.log('[Vertex AI] Stream completed, total length:', fullText.length);
      
      return fullText;
    } catch (error: any) {
      console.error('[Vertex AI] Stream generation failed:', error);
      throw new Error(`Vertex AI streaming error: ${error.message || 'Unknown error'}`);
    }
  }
  
  async generateContentWithImage(parts: any[]): Promise<string> {
    try {
      console.log('[Vertex AI] Generating content with image...');
      
      // partsをVertex AI SDKの形式に変換
      const contentParts = parts.map(part => {
        if (part.inlineData) {
          return {
            inlineData: {
              mimeType: part.inlineData.mimeType || 'image/jpeg',
              data: part.inlineData.data
            }
          };
        } else if (part.text) {
          return { text: part.text };
        }
        return part;
      });
      
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: contentParts }]
      });
      
      const response = result.response;
      const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      console.log('[Vertex AI] Image analysis response generated, length:', text.length);
      
      return text;
    } catch (error: any) {
      console.error('[Vertex AI] Image analysis failed:', error);
      throw new Error(`Vertex AI image analysis error: ${error.message || 'Unknown error'}`);
    }
  }
  
  async countTokens(text: string): Promise<number> {
    try {
      // @google/genai SDK ではトークンカウント機能が異なるため、概算値を返す
      // 通常、1トークンは約4文字
      return Math.ceil(text.length / 4);
    } catch (error: any) {
      console.error('[Vertex AI] Token counting failed:', error);
      // トークンカウントが失敗しても処理を続行するため、概算値を返す
      return Math.ceil(text.length / 4);
    }
  }
  
  getModelInfo() {
    return {
      projectId: this.projectId,
      location: this.location,
      modelId: this.modelId,
      endpoint: `${this.location}-aiplatform.googleapis.com`,
    };
  }
}

// シングルトンインスタンス
let vertexAIClient: VertexAIClient | null = null;

export function getVertexAIClient(): VertexAIClient {
  if (!vertexAIClient) {
    vertexAIClient = new VertexAIClient();
  }
  return vertexAIClient;
}