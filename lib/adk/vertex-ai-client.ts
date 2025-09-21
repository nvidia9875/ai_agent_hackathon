import { VertexAI, HarmCategory, HarmBlockThreshold } from '@google-cloud/aiplatform';

export class VertexAIClient {
  private vertexAI: VertexAI;
  private model: any;
  private projectId: string;
  private location: string;
  private modelId: string;
  
  constructor() {
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || '';
    this.location = process.env.VERTEX_AI_LOCATION || 'us-central1';
    this.modelId = process.env.VERTEX_AI_MODEL_ID || 'gemini-1.5-pro-002';
    
    if (!this.projectId) {
      throw new Error('GOOGLE_CLOUD_PROJECT_ID is required for Vertex AI');
    }
    
    // Vertex AI クライアントの初期化
    this.vertexAI = new VertexAI({
      project: this.projectId,
      location: this.location,
    });
    
    // Gemini モデルの設定
    this.model = this.vertexAI.preview.getGenerativeModel({
      model: this.modelId,
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
    });
    
    console.log('[VertexAI] Client initialized:', {
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
        
      console.log('[VertexAI] Generating content for prompt length:', fullPrompt.length);
      
      const result = await this.model.generateContent(fullPrompt);
      const response = await result.response;
      const text = response.text();
      
      console.log('[VertexAI] Response generated, length:', text.length);
      
      return text;
    } catch (error: any) {
      console.error('[VertexAI] Generation failed:', error);
      
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
        
      console.log('[VertexAI] Starting stream generation...');
      
      const streamingResult = await this.model.generateContentStream(fullPrompt);
      
      let fullText = '';
      for await (const chunk of streamingResult.stream) {
        const chunkText = chunk.text();
        fullText += chunkText;
        if (onChunk) {
          onChunk(chunkText);
        }
      }
      
      console.log('[VertexAI] Stream completed, total length:', fullText.length);
      
      return fullText;
    } catch (error: any) {
      console.error('[VertexAI] Stream generation failed:', error);
      throw new Error(`Vertex AI streaming error: ${error.message || 'Unknown error'}`);
    }
  }
  
  async countTokens(text: string): Promise<number> {
    try {
      const countResult = await this.model.countTokens(text);
      return countResult.totalTokens;
    } catch (error: any) {
      console.error('[VertexAI] Token counting failed:', error);
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