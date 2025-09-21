import { NextRequest, NextResponse } from 'next/server';
import { adkManager, initializeADKAgents } from '@/lib/adk';

let initialized = false;

async function ensureInitialized() {
  if (!initialized) {
    await initializeADKAgents();
    initialized = true;
  }
}

export async function GET(request: NextRequest) {
  try {
    await ensureInitialized();
    
    const agents = adkManager.listAgents();
    
    return NextResponse.json({
      success: true,
      agents,
      count: agents.length,
    });
  } catch (error: any) {
    console.error('[ADK API] Error listing agents:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to list agents',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureInitialized();
    
    const { agentId, task, sessionId } = await request.json();
    
    if (!agentId || !task) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters: agentId and task',
        },
        { status: 400 }
      );
    }
    
    const result = await adkManager.executeAgent(agentId, task, sessionId);
    
    return NextResponse.json({
      success: true,
      result,
      agentId,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[ADK API] Error executing agent:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to execute agent',
      },
      { status: 500 }
    );
  }
}