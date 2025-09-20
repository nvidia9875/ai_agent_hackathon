import type { WeatherCondition } from '@/lib/types/behavior-predictor';

const OPENWEATHER_API_KEY = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;
const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';

export class WeatherService {
  private static instance: WeatherService;
  private cache: Map<string, { data: WeatherCondition; timestamp: number }> = new Map();
  private cacheTimeout = 1800000; // 30 minutes

  private constructor() {}

  public static getInstance(): WeatherService {
    if (!WeatherService.instance) {
      WeatherService.instance = new WeatherService();
    }
    return WeatherService.instance;
  }

  public async getWeatherCondition(lat: number, lng: number): Promise<WeatherCondition> {
    const cacheKey = `${lat.toFixed(2)}-${lng.toFixed(2)}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      if (OPENWEATHER_API_KEY) {
        const response = await fetch(
          `${OPENWEATHER_BASE_URL}/weather?lat=${lat}&lon=${lng}&appid=${OPENWEATHER_API_KEY}&units=metric`
        );
        
        if (response.ok) {
          const data = await response.json();
          const weatherCondition = this.parseWeatherData(data);
          
          this.cache.set(cacheKey, {
            data: weatherCondition,
            timestamp: Date.now(),
          });
          
          return weatherCondition;
        }
      }
      
      return this.getMockWeatherData(lat, lng);
    } catch (error) {
      console.error('Weather API error:', error);
      return this.getMockWeatherData(lat, lng);
    }
  }

  private parseWeatherData(data: any): WeatherCondition {
    const mainWeather = data.weather[0].main.toLowerCase();
    let condition: WeatherCondition['condition'];

    switch (mainWeather) {
      case 'clear':
        condition = 'sunny';
        break;
      case 'clouds':
        condition = 'cloudy';
        break;
      case 'rain':
      case 'drizzle':
        condition = 'rainy';
        break;
      case 'thunderstorm':
        condition = 'stormy';
        break;
      case 'snow':
        condition = 'snowy';
        break;
      default:
        condition = 'cloudy';
    }

    return {
      temperature: data.main.temp,
      humidity: data.main.humidity,
      precipitation: ['rain', 'drizzle', 'thunderstorm', 'snow'].includes(mainWeather),
      windSpeed: data.wind.speed,
      condition,
    };
  }

  private getMockWeatherData(lat: number, lng: number): WeatherCondition {
    const conditions: WeatherCondition['condition'][] = ['sunny', 'cloudy', 'rainy'];
    const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
    
    return {
      temperature: 15 + Math.random() * 15,
      humidity: 40 + Math.random() * 40,
      precipitation: randomCondition === 'rainy',
      windSpeed: Math.random() * 10,
      condition: randomCondition,
    };
  }

  public getWeatherImpactOnBehavior(weather: WeatherCondition, petType: 'dog' | 'cat'): {
    movementReduction: number;
    hidingIncrease: number;
    description: string;
  } {
    let movementReduction = 0;
    let hidingIncrease = 0;
    let description = '';

    if (weather.precipitation) {
      movementReduction = petType === 'cat' ? 0.7 : 0.3;
      hidingIncrease = petType === 'cat' ? 0.9 : 0.5;
      description = `雨天のため、${petType === 'cat' ? '猫は雨を避ける場所に隠れている' : '犬の移動範囲が制限される'}可能性が高いです。`;
    } else if (weather.temperature < 5) {
      movementReduction = 0.5;
      hidingIncrease = 0.7;
      description = '低温のため、暖かい場所を求めている可能性があります。';
    } else if (weather.temperature > 30) {
      movementReduction = 0.4;
      hidingIncrease = 0.6;
      description = '高温のため、日陰や涼しい場所にいる可能性があります。';
    } else if (weather.windSpeed > 10) {
      movementReduction = 0.3;
      hidingIncrease = 0.4;
      description = '強風のため、風を避けられる場所にいる可能性があります。';
    } else {
      description = '天候は移動に大きな影響を与えていません。';
    }

    return {
      movementReduction,
      hidingIncrease,
      description,
    };
  }
}