import { VisionAIClient } from './vision-ai-client';
import { PetMatcher } from './pet-matcher';
import { VisualAnalysisResult, AgentBase, PetMatchResult } from '@/types/agents';
import { PetInfo, FoundPetInfo } from '@/types/pet';
import { v4 as uuidv4 } from 'uuid';

export class VisualDetectiveAgent implements AgentBase {
  public id: string;
  public name: string = 'Visual Detective Agent';
  public status: 'idle' | 'processing' | 'error' = 'idle';
  public lastActivity: Date = new Date();

  private visionClient: VisionAIClient;
  private petMatcher: PetMatcher;

  constructor() {
    this.id = uuidv4();
    this.visionClient = new VisionAIClient();
    this.petMatcher = new PetMatcher();
  }

  async analyze(imageBuffer: Buffer): Promise<VisualAnalysisResult> {
    try {
      this.status = 'processing';
      this.lastActivity = new Date();

      console.log(`[${this.name}] Starting image analysis...`);
      
      // Vision AI による画像解析
      const analysisResult = await this.visionClient.analyzeImage(imageBuffer);
      
      console.log(`[${this.name}] Analysis complete:`, {
        petType: analysisResult.petType,
        breed: analysisResult.breed,
        confidence: analysisResult.confidence,
      });

      this.status = 'idle';
      this.lastActivity = new Date();
      
      return analysisResult;
    } catch (error) {
      console.error(`[${this.name}] Analysis error:`, error);
      this.status = 'error';
      this.lastActivity = new Date();
      throw error;
    }
  }

  async matchPets(
    missingPet: PetInfo,
    foundPet: FoundPetInfo
  ): Promise<PetMatchResult> {
    try {
      this.status = 'processing';
      this.lastActivity = new Date();

      console.log(`[${this.name}] Matching pets...`);
      console.log(`Missing pet: ${missingPet.name} (${missingPet.type})`);
      console.log(`Found pet: ${foundPet.petType} at ${foundPet.foundAddress}`);

      // ペットマッチング実行
      const matchResult = await this.petMatcher.matchPets(missingPet, foundPet);

      console.log(`[${this.name}] Match score: ${matchResult.matchScore}%`);
      console.log(`Recommendation: ${matchResult.recommendedAction}`);

      this.status = 'idle';
      this.lastActivity = new Date();

      return matchResult;
    } catch (error) {
      console.error(`[${this.name}] Matching error:`, error);
      this.status = 'error';
      this.lastActivity = new Date();
      throw error;
    }
  }

  async findSimilarPets(features: number[], threshold: number = 0.8): Promise<any[]> {
    // Vector Search を使用した類似ペット検索（実装予定）
    console.log(`[${this.name}] Searching for similar pets with threshold ${threshold}`);
    
    // 仮実装：実際にはVector Searchインデックスに問い合わせる
    return [
      {
        id: 'pet-123',
        similarity: 0.92,
        location: { lat: 35.6895, lng: 139.6917 },
        reportedDate: new Date('2024-01-15'),
      },
      {
        id: 'pet-456',
        similarity: 0.85,
        location: { lat: 35.6762, lng: 139.6503 },
        reportedDate: new Date('2024-01-14'),
      },
    ];
  }

  async generatePoster(analysisResult: VisualAnalysisResult, contactInfo: string): Promise<string> {
    // Imagen APIを使用したポスター生成（実装予定）
    console.log(`[${this.name}] Generating missing pet poster...`);
    
    // 仮実装：実際にはImagen APIでポスターを生成
    const posterUrl = `https://storage.googleapis.com/pawmate-posters/${this.id}-poster.jpg`;
    
    return posterUrl;
  }

  getStatus(): { id: string; name: string; status: string; lastActivity: Date } {
    return {
      id: this.id,
      name: this.name,
      status: this.status,
      lastActivity: this.lastActivity,
    };
  }
}