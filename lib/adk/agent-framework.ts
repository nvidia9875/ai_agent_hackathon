import { VertexAI, HarmCategory, HarmBlockThreshold } from '@google-cloud/aiplatform';

export interface ADKAgentConfig {
  agentId: string;
  displayName: string;
  description: string;
  tools?: ADKTool[];
  systemPrompt?: string;
  model?: string;
}

export interface ADKTool {
  name: string;
  description: string;
  parameters?: Record<string, any>;
  function?: (params: any) => Promise<any>;
}

export interface ADKMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, any>;
}

export interface ADKContext {
  sessionId: string;
  userId?: string;
  location?: { lat: number; lng: number };
  timestamp: Date;
  additionalData?: Record<string, any>;
}

export abstract class ADKAgent {
  protected vertexAI: VertexAI;
  protected config: ADKAgentConfig;
  protected projectId: string;
  protected location: string;
  protected model: any;

  constructor(config: ADKAgentConfig) {
    this.config = config;
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || 'calm-seeker-471513-t3';
    this.location = process.env.VERTEX_AI_LOCATION || 'us-central1';
    
    this.vertexAI = new VertexAI({
      project: this.projectId,
      location: this.location,
    });
    
    const modelName = config.model || process.env.VERTEX_AI_MODEL_ID || 'gemini-1.5-pro-002';
    this.model = this.vertexAI.preview.getGenerativeModel({
      model: modelName,
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
  }

  abstract process(input: any, context: ADKContext): Promise<any>;

  protected async callVertexAI(prompt: string, context?: ADKContext): Promise<string> {
    try {
      const systemPrompt = this.config.systemPrompt || '';
      const fullPrompt = `${systemPrompt}\n\nContext: ${JSON.stringify(context)}\n\nRequest: ${prompt}`;
      
      console.log(`[ADK] Calling Vertex AI with model: ${this.config.model || 'gemini-1.5-pro-002'}`);
      
      const result = await this.model.generateContent(fullPrompt);
      const response = await result.response;
      const text = response.text();
      
      console.log(`[ADK] Vertex AI response received, length: ${text.length} characters`);
      
      return text;
    } catch (error: any) {
      console.error('[ADK] Vertex AI call failed:', error.message || error);
      
      // 詳細なエラー情報を提供
      if (error.message?.includes('403')) {
        throw new Error('Vertex AI API access denied. Please check API is enabled and credentials have proper permissions.');
      }
      if (error.message?.includes('404')) {
        throw new Error('Vertex AI model not found. Please check the model ID in configuration.');
      }
      if (error.message?.includes('401')) {
        throw new Error('Authentication failed. Please check your Google Cloud credentials.');
      }
      
      throw new Error(`Vertex AI API error: ${error.message || 'Unknown error occurred'}`);
    }
  }

  protected async executeWithTools(input: string, tools: ADKTool[]): Promise<any> {
    const toolResults: Record<string, any> = {};
    
    for (const tool of tools) {
      if (tool.function) {
        try {
          toolResults[tool.name] = await tool.function(input);
        } catch (error) {
          console.error(`Tool ${tool.name} execution failed:`, error);
          toolResults[tool.name] = { error: error.message };
        }
      }
    }
    
    return toolResults;
  }

  async initialize(): Promise<void> {
    console.log(`[ADK] Initializing Agent: ${this.config.agentId}`);
    console.log(`[ADK] Using project: ${this.projectId}`);
    console.log(`[ADK] Using location: ${this.location}`);
    console.log(`[ADK] Using model: ${this.config.model || process.env.VERTEX_AI_MODEL_ID || 'gemini-1.5-pro-002'}`);
    
    // 認証情報の確認
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.warn('[ADK] Warning: GOOGLE_APPLICATION_CREDENTIALS not set');
    }
    
    // プロジェクトIDの確認
    if (!this.projectId) {
      throw new Error('GOOGLE_CLOUD_PROJECT_ID is required');
    }
  }

  getConfig(): ADKAgentConfig {
    return this.config;
  }

  setTool(tool: ADKTool): void {
    if (!this.config.tools) {
      this.config.tools = [];
    }
    this.config.tools.push(tool);
  }
}

export class ADKAgentManager {
  private agents: Map<string, ADKAgent> = new Map();
  private sessions: Map<string, ADKContext> = new Map();

  registerAgent(agent: ADKAgent): void {
    const config = agent.getConfig();
    this.agents.set(config.agentId, agent);
    console.log(`Registered ADK Agent: ${config.agentId}`);
  }

  async getAgent(agentId: string): Promise<ADKAgent | undefined> {
    return this.agents.get(agentId);
  }

  createSession(userId?: string): string {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const context: ADKContext = {
      sessionId,
      userId,
      timestamp: new Date(),
    };
    this.sessions.set(sessionId, context);
    return sessionId;
  }

  getSession(sessionId: string): ADKContext | undefined {
    return this.sessions.get(sessionId);
  }

  async executeAgent(
    agentId: string,
    input: any,
    sessionId?: string
  ): Promise<any> {
    const agent = await this.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    let context: ADKContext;
    if (sessionId && this.sessions.has(sessionId)) {
      context = this.sessions.get(sessionId)!;
    } else {
      const newSessionId = this.createSession();
      context = this.sessions.get(newSessionId)!;
    }

    return await agent.process(input, context);
  }

  listAgents(): ADKAgentConfig[] {
    return Array.from(this.agents.values()).map(agent => agent.getConfig());
  }

  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }
}

export const adkManager = new ADKAgentManager();