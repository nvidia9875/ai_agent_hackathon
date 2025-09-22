export { ADKAgent, ADKAgentManager, adkManager } from './agent-framework';
export type { ADKAgentConfig, ADKTool, ADKMessage, ADKContext } from './agent-framework';

export { ADKBehaviorPredictorAgent } from './agents/behavior-predictor';

import { adkManager } from './agent-framework';
import { ADKBehaviorPredictorAgent } from './agents/behavior-predictor';

export async function initializeADKAgents(): Promise<void> {
  console.log('Initializing ADK Agents...');
  
  const behaviorPredictor = new ADKBehaviorPredictorAgent();
  
  await behaviorPredictor.initialize();
  
  adkManager.registerAgent(behaviorPredictor);
  
  console.log('ADK Agents initialized successfully');
}