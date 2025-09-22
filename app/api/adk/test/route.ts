import { NextRequest, NextResponse } from 'next/server';
import { getVertexAIClient } from '@/lib/adk/vertex-ai-client';

export async function GET(request: NextRequest) {
  console.log('[ADK Test] Starting Vertex AI connection test...');
  
  try {
    // 環境変数の確認
    const config = {
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      credentials: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      location: process.env.VERTEX_AI_LOCATION || 'us-central1',
      modelId: process.env.VERTEX_AI_MODEL_ID || 'gemini-2.5-flash',
    };
    
    console.log('[ADK Test] Configuration:', {
      projectId: config.projectId ? '✓ Set' : '✗ Missing',
      credentials: config.credentials ? '✓ Set' : '✗ Missing',
      location: config.location,
      modelId: config.modelId,
    });
    
    // 必須設定の確認
    if (!config.projectId) {
      return NextResponse.json({
        success: false,
        error: 'GOOGLE_CLOUD_PROJECT_ID is not set',
        config,
      }, { status: 500 });
    }
    
    if (!config.credentials) {
      return NextResponse.json({
        success: false,
        error: 'GOOGLE_APPLICATION_CREDENTIALS is not set',
        config,
      }, { status: 500 });
    }
    
    // Vertex AI クライアントの初期化テスト
    let vertexClient;
    try {
      vertexClient = getVertexAIClient();
      console.log('[ADK Test] Vertex AI client initialized successfully');
    } catch (error: any) {
      console.error('[ADK Test] Failed to initialize Vertex AI client:', error);
      return NextResponse.json({
        success: false,
        error: `Failed to initialize Vertex AI client: ${error.message}`,
        config,
      }, { status: 500 });
    }
    
    // 簡単なテストプロンプト
    const testPrompt = 'こんにちは。これはVertex AI接続テストです。短く返答してください。';
    
    console.log('[ADK Test] Sending test prompt to Vertex AI...');
    
    try {
      const startTime = Date.now();
      const response = await vertexClient.generateContent(testPrompt);
      const endTime = Date.now();
      
      console.log('[ADK Test] Response received successfully');
      
      // トークン数のカウント
      let tokenCount = 0;
      try {
        tokenCount = await vertexClient.countTokens(testPrompt);
      } catch (error) {
        console.warn('[ADK Test] Token counting failed:', error);
      }
      
      return NextResponse.json({
        success: true,
        message: 'Vertex AI connection successful',
        test: {
          prompt: testPrompt,
          response: response.substring(0, 200), // 最初の200文字のみ
          responseTime: `${endTime - startTime}ms`,
          tokenCount,
        },
        modelInfo: vertexClient.getModelInfo(),
        timestamp: new Date().toISOString(),
      });
      
    } catch (error: any) {
      console.error('[ADK Test] Vertex AI API call failed:', error);
      
      // エラーの詳細分析
      let errorDetails = {
        message: error.message,
        suggestions: [] as string[],
      };
      
      if (error.message.includes('403')) {
        errorDetails.suggestions.push(
          'Vertex AI APIがGCPコンソールで有効化されているか確認',
          'サービスアカウントにaiplatform.endpoints.predict権限があるか確認'
        );
      } else if (error.message.includes('401')) {
        errorDetails.suggestions.push(
          'credentials.jsonファイルが存在するか確認',
          'GOOGLE_APPLICATION_CREDENTIALSが正しいパスを指しているか確認'
        );
      } else if (error.message.includes('404')) {
        errorDetails.suggestions.push(
          `モデルID (${config.modelId}) が正しいか確認`,
          `リージョン (${config.location}) が正しいか確認`
        );
      }
      
      return NextResponse.json({
        success: false,
        error: 'Vertex AI API call failed',
        errorDetails,
        config: {
          projectId: config.projectId ? '✓ Set' : '✗ Missing',
          credentials: config.credentials ? '✓ Set' : '✗ Missing',
          location: config.location,
          modelId: config.modelId,
        },
      }, { status: 500 });
    }
    
  } catch (error: any) {
    console.error('[ADK Test] Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: 'Unexpected error occurred',
      message: error.message,
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, systemPrompt } = await request.json();
    
    if (!prompt) {
      return NextResponse.json({
        success: false,
        error: 'Prompt is required',
      }, { status: 400 });
    }
    
    const vertexClient = getVertexAIClient();
    
    console.log('[ADK Test] Generating custom content...');
    const response = await vertexClient.generateContent(prompt, systemPrompt);
    
    return NextResponse.json({
      success: true,
      prompt,
      systemPrompt,
      response,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error: any) {
    console.error('[ADK Test] Custom generation failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Generation failed',
    }, { status: 500 });
  }
}