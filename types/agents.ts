/**
 * AI Agent Types
 * 3つのAIエージェント間で共有される型定義
 */

// ========== Common Types ==========

export interface Location {
  lat: number;
  lng: number;
}

export interface TimeRange {
  start: string; // ISO 8601
  end: string;   // ISO 8601
}

export interface Confidence {
  level: number; // 0-1
  factors: string[];
}

// ========== Pet Information ==========

export interface PetInfo {
  id: string;
  name: string;
  type: 'dog' | 'cat';
  breed: string;
  age: number; // years
  size: 'small' | 'medium' | 'large';
  weight: number; // kg
  color: string[];
  markings: string[];
  personality: {
    friendliness: number; // 0-1 (towards humans)
    activity_level: number; // 0-1
    fearfulness: number; // 0-1
    territorial: number; // 0-1
  };
  health: {
    mobility: number; // 0-1
    vision: number; // 0-1
    hearing: number; // 0-1
    medical_conditions: string[];
  };
  lastSeen: {
    location: Location;
    timestamp: string;
    description: string;
    witness_reliability: number; // 0-1
  };
  images: string[]; // URLs
  owner: {
    name: string;
    contact: string;
    emergency_contact?: string;
  };
}

// ========== Visual Detective Types ==========

export interface FeatureVector {
  values: number[]; // 1024 dimensions
  dimension: number;
  timestamp: string;
  metadata?: {
    image_url: string;
    extraction_method: string;
    confidence: number;
  };
}

export interface AnalysisResult {
  image_url: string;
  pet_detected: boolean;
  pet_type: 'dog' | 'cat' | 'unknown';
  confidence: Confidence;
  features: {
    colors: Array<{
      color: string;
      percentage: number;
      location: 'body' | 'face' | 'ears' | 'tail';
    }>;
    size_estimate: {
      category: 'small' | 'medium' | 'large';
      confidence: number;
    };
    distinctive_features: string[];
  };
  image_quality: {
    blur_score: number; // 0-1 (0=very blurry)
    brightness: number; // 0-1
    contrast: number; // 0-1
    overall_quality: number; // 0-1
  };
  body_parts: Array<{
    part: 'head' | 'body' | 'legs' | 'tail';
    detected: boolean;
    bounding_box: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    confidence: number;
  }>;
}

export interface SimilarityMatch {
  pet_id: string;
  similarity_score: number; // 0-1
  matched_features: string[];
  confidence: Confidence;
  comparison_details: {
    color_match: number; // 0-1
    size_match: number; // 0-1
    pattern_match: number; // 0-1
    body_shape_match: number; // 0-1
  };
}

// ========== Behavior Predictor Types ==========

export interface BehaviorPattern {
  exploration_radius: number; // meters
  hiding_probability: number; // 0-1
  food_seeking_behavior: number; // 0-1
  human_avoidance: number; // 0-1
  territorial_behavior: number; // 0-1
  activity_by_time: Array<{
    hour: number; // 0-23
    activity_level: number; // 0-1
  }>;
  preferred_terrain: Array<{
    type: 'urban' | 'suburban' | 'rural' | 'forest' | 'water';
    preference: number; // 0-1
  }>;
}

export interface PredictionResult {
  pet_info: PetInfo;
  behavior_pattern: BehaviorPattern;
  movement_prediction: Array<{
    time_elapsed: number; // hours
    probable_locations: Array<{
      location: Location;
      probability: number; // 0-1
      reasoning: string;
    }>;
    search_radius: number; // meters
  }>;
  environmental_factors: {
    weather_impact: number; // -1 to 1
    terrain_difficulty: number; // 0-1
    human_activity_level: number; // 0-1
  };
  confidence: Confidence;
}

export interface SearchArea {
  id: string;
  center: Location;
  radius: number; // meters
  priority: number; // 1-10
  type: 'primary' | 'secondary' | 'backup';
  characteristics: {
    terrain: string;
    accessibility: number; // 0-1
    safety: number; // 0-1
    resource_availability: number; // 0-1
  };
  estimated_search_time: number; // minutes
  required_volunteers: number;
  success_probability: number; // 0-1
}

// ========== Search Coordinator Types ==========

export interface SearchCase {
  id: string;
  status: 'active' | 'paused' | 'completed' | 'archived';
  pet_info: PetInfo;
  start_time: string;
  last_updated: string;
  assigned_resources: Resource;
  current_strategy: SearchStrategy;
  progress: SearchProgress;
  coordination_results: CoordinationResult[];
}

export interface SearchStrategy {
  id: string;
  name: string;
  description: string;
  priority_areas: SearchArea[];
  timeline: Array<{
    phase: string;
    start_time: string;
    duration: number; // hours
    activities: string[];
    required_resources: Resource;
  }>;
  success_probability: number; // 0-1
  estimated_duration: number; // hours
  resource_requirements: Resource;
  contingency_plans: Array<{
    trigger: string;
    alternative_strategy: string;
    activation_criteria: any;
  }>;
}

export interface CoordinationResult {
  timestamp: string;
  visual_detective_input: AnalysisResult[];
  behavior_predictor_input: PredictionResult;
  integrated_findings: {
    confidence_level: number; // 0-1
    key_insights: string[];
    conflicting_evidence: string[];
    recommended_actions: string[];
  };
  updated_strategy: SearchStrategy;
  next_steps: Array<{
    action: string;
    priority: number; // 1-10
    assigned_to: string;
    deadline: string;
    resources_needed: string[];
  }>;
}

export interface Resource {
  volunteers: Array<{
    id: string;
    name: string;
    skills: string[];
    availability: TimeRange[];
    current_location?: Location;
    contact: string;
  }>;
  equipment: Array<{
    type: string;
    quantity: number;
    location: Location;
    condition: 'excellent' | 'good' | 'fair' | 'poor';
  }>;
  budget: {
    total: number;
    allocated: number;
    spent: number;
    remaining: number;
  };
  time_allocation: {
    planned_hours: number;
    used_hours: number;
    remaining_hours: number;
  };
}

export interface SearchProgress {
  search_id: string;
  overall_completion: number; // 0-100 percentage
  areas_completed: string[]; // SearchArea IDs
  areas_in_progress: string[];
  areas_pending: string[];
  milestones: Milestone[];
  events: SearchEvent[];
  metrics: {
    time_elapsed: number; // hours
    distance_covered: number; // km
    volunteers_engaged: number;
    sightings_reported: number;
    false_positives: number;
    current_success_probability: number; // 0-1
  };
  current_phase: 'initial_analysis' | 'active_search' | 'follow_up' | 'final_review';
}

export interface Milestone {
  id: string;
  name: string;
  description: string;
  target_date: string;
  completion_date?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
  importance: 'low' | 'medium' | 'high' | 'critical';
  dependencies: string[]; // Other milestone IDs
  success_criteria: any;
}

export interface SearchEvent {
  id: string;
  search_id: string;
  timestamp: string;
  type: 'sighting' | 'search_completion' | 'strategy_change' | 'resource_allocation' | 
        'weather_update' | 'volunteer_assignment' | 'equipment_deployment' | 'analysis_result';
  title: string;
  description: string;
  location?: Location;
  reporter: string;
  reliability: number; // 0-1
  impact_level: 'low' | 'medium' | 'high' | 'critical';
  metadata?: any;
  related_events?: string[]; // Other event IDs
}

// ========== Agent Response Types ==========

export interface AgentResponse<T = any> {
  agent_type: 'visual-detective' | 'behavior-predictor' | 'search-coordinator';
  task_id: string;
  status: 'success' | 'error' | 'timeout' | 'in_progress';
  result?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  processing_time: number; // milliseconds
  confidence?: Confidence;
  metadata?: {
    version: string;
    model_used?: string;
    resources_consumed?: any;
  };
}

export interface TaskRequest {
  task_id: string;
  agent_type: 'visual-detective' | 'behavior-predictor' | 'search-coordinator';
  task_type: string;
  payload: any;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  deadline?: string;
  dependencies?: string[]; // Other task IDs
  callback_url?: string;
  metadata?: any;
}

// ========== Optimization Types ==========

export interface OptimizationResult {
  strategy_id: string;
  improved_elements: Array<{
    element: string;
    old_value: any;
    new_value: any;
    improvement_score: number; // 0-1
    reasoning: string;
  }>;
  overall_improvement: number; // 0-1
  confidence: Confidence;
  alternative_strategies: SearchStrategy[];
  resource_reallocation: Resource;
  expected_outcomes: {
    success_probability_delta: number;
    time_savings: number; // hours
    resource_efficiency_gain: number; // 0-1
  };
}

// ========== Utility Types ==========

export interface APIConfig {
  google_maps_key: string;
  vertex_ai_endpoint: string;
  vision_ai_key: string;
  weather_api_key: string;
  firestore_config: any;
  pubsub_config: any;
  storage_bucket: string;
}

export interface SystemHealth {
  overall_status: 'healthy' | 'degraded' | 'critical' | 'down';
  agents: {
    visual_detective: 'online' | 'offline' | 'error';
    behavior_predictor: 'online' | 'offline' | 'error';
    search_coordinator: 'online' | 'offline' | 'error';
  };
  services: {
    database: 'connected' | 'disconnected' | 'error';
    message_queue: 'active' | 'inactive' | 'error';
    storage: 'available' | 'unavailable' | 'error';
  };
  performance_metrics: {
    avg_response_time: number; // ms
    success_rate: number; // 0-1
    error_rate: number; // 0-1
    throughput: number; // requests/minute
  };
}