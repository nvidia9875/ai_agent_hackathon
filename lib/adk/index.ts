export { ADKAgent, ADKAgentManager, adkManager } from './agent-framework';
export type { ADKAgentConfig, ADKTool, ADKMessage, ADKContext } from './agent-framework';

export { ADKSearchCoordinatorAgent } from './agents/search-coordinator';
export { ADKBehaviorPredictorAgent } from './agents/behavior-predictor';

import { adkManager } from './agent-framework';
import { ADKSearchCoordinatorAgent } from './agents/search-coordinator';
import { ADKBehaviorPredictorAgent } from './agents/behavior-predictor';

export async function initializeADKAgents(): Promise<void> {
  console.log('Initializing ADK Agents...');
  
  const searchCoordinator = new ADKSearchCoordinatorAgent();
  const behaviorPredictor = new ADKBehaviorPredictorAgent();
  
  await searchCoordinator.initialize();
  await behaviorPredictor.initialize();
  
  adkManager.registerAgent(searchCoordinator);
  adkManager.registerAgent(behaviorPredictor);
  
  console.log('ADK Agents initialized successfully');
}