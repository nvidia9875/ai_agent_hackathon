// Vertex AI API直接テストスクリプト
const { VertexAI } = require('@google-cloud/aiplatform');

async function testVertexAI() {
  console.log('=== Vertex AI Direct Test ===\n');
  
  // 環境変数の確認
  console.log('Environment Check:');
  console.log('- PROJECT_ID:', process.env.GOOGLE_CLOUD_PROJECT_ID || 'NOT SET');
  console.log('- CREDENTIALS:', process.env.GOOGLE_APPLICATION_CREDENTIALS || 'NOT SET');
  console.log('- LOCATION:', process.env.VERTEX_AI_LOCATION || 'us-central1');
  console.log('- MODEL_ID:', process.env.VERTEX_AI_MODEL_ID || 'gemini-2.5-flash');
  console.log('');
  
  try {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || 'calm-seeker-471513-t3';
    const location = process.env.VERTEX_AI_LOCATION || 'us-central1';
    const modelId = process.env.VERTEX_AI_MODEL_ID || 'gemini-2.5-flash';
    
    console.log('Initializing Vertex AI client...');
    const vertexAI = new VertexAI({
      project: projectId,
      location: location,
    });
    
    console.log('Getting generative model...');
    const model = vertexAI.preview.getGenerativeModel({
      model: modelId,
      generationConfig: {
        maxOutputTokens: 256,
        temperature: 0.7,
        topP: 0.9,
      },
    });
    
    console.log('Sending test prompt...');
    const prompt = 'こんにちは。これは接続テストです。短く返答してください。';
    
    const startTime = Date.now();
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const endTime = Date.now();
    
    console.log('\n✅ SUCCESS!');
    console.log('Response:', text);
    console.log('Response time:', endTime - startTime, 'ms');
    
  } catch (error) {
    console.error('\n❌ ERROR:');
    console.error('Message:', error.message);
    
    if (error.message.includes('403')) {
      console.error('\n🔧 Solution:');
      console.error('1. Enable Vertex AI API in GCP Console');
      console.error('2. Grant aiplatform.user role to service account');
    } else if (error.message.includes('401')) {
      console.error('\n🔧 Solution:');
      console.error('1. Check credentials.json exists');
      console.error('2. Verify GOOGLE_APPLICATION_CREDENTIALS path');
    } else if (error.message.includes('404')) {
      console.error('\n🔧 Solution:');
      console.error('1. Check model ID:', process.env.VERTEX_AI_MODEL_ID || 'gemini-2.5-flash');
      console.error('2. Check location:', process.env.VERTEX_AI_LOCATION || 'us-central1');
    }
    
    process.exit(1);
  }
}

// 環境変数を設定
process.env.GOOGLE_APPLICATION_CREDENTIALS = './credentials.json';
process.env.GOOGLE_CLOUD_PROJECT_ID = 'calm-seeker-471513-t3';

testVertexAI();