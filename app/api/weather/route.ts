import { NextRequest, NextResponse } from 'next/server';
import { WeatherService } from '@/lib/services/weather-service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    
    if (!lat || !lng) {
      return NextResponse.json(
        { error: '緯度と経度が必要です' },
        { status: 400 }
      );
    }
    
    const weatherService = WeatherService.getInstance();
    const weatherData = await weatherService.getWeatherCondition(
      parseFloat(lat),
      parseFloat(lng)
    );
    
    const weatherImpact = weatherService.getWeatherImpactOnBehavior(
      weatherData,
      searchParams.get('petType') as 'dog' | 'cat' || 'dog'
    );
    
    return NextResponse.json({
      weather: weatherData,
      impact: weatherImpact,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Weather API error:', error);
    return NextResponse.json(
      { error: '天気情報の取得に失敗しました' },
      { status: 500 }
    );
  }
}