'use client'

import React, { useEffect, useState } from 'react';
import { WeatherCondition } from '@/types/behavior-predictor';
import { WeatherService } from '@/lib/services/weather-service';
import { Cloud, CloudRain, CloudSnow, Sun, CloudLightning, Wind, Droplets, Thermometer } from 'lucide-react';

interface WeatherDisplayProps {
  lat?: number;
  lng?: number;
  onWeatherLoad?: (weather: WeatherCondition) => void;
  className?: string;
}

export const WeatherDisplay: React.FC<WeatherDisplayProps> = ({
  lat,
  lng,
  onWeatherLoad,
  className = ''
}) => {
  const [weather, setWeather] = useState<WeatherCondition | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      if (!lat || !lng) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const weatherService = WeatherService.getInstance();
        const weatherData = await weatherService.getWeatherCondition(lat, lng);
        setWeather(weatherData);
        onWeatherLoad?.(weatherData);
      } catch (err) {
        console.error('Failed to fetch weather:', err);
        setError('天気情報の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [lat, lng, onWeatherLoad]);

  const getWeatherIcon = (condition: WeatherCondition['condition']) => {
    switch (condition) {
      case 'sunny':
        return <Sun className="w-6 h-6 text-yellow-500" />;
      case 'cloudy':
        return <Cloud className="w-6 h-6 text-gray-500" />;
      case 'rainy':
        return <CloudRain className="w-6 h-6 text-blue-500" />;
      case 'stormy':
        return <CloudLightning className="w-6 h-6 text-purple-500" />;
      case 'snowy':
        return <CloudSnow className="w-6 h-6 text-blue-300" />;
      default:
        return <Cloud className="w-6 h-6 text-gray-400" />;
    }
  };

  const getWeatherText = (condition: WeatherCondition['condition']) => {
    const texts = {
      'sunny': '晴れ',
      'cloudy': '曇り',
      'rainy': '雨',
      'stormy': '嵐',
      'snowy': '雪'
    };
    return texts[condition] || '不明';
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  if (!weather) {
    return null;
  }

  return (
    <div className={`bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-md p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {getWeatherIcon(weather.condition)}
          <span className="text-lg font-semibold">{getWeatherText(weather.condition)}</span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-1">
          <Thermometer className="w-4 h-4 text-red-500" />
          <span className="text-gray-700">{weather.temperature.toFixed(1)}°C</span>
        </div>
        
        <div className="flex items-center gap-1">
          <Droplets className="w-4 h-4 text-blue-500" />
          <span className="text-gray-700">{weather.humidity}%</span>
        </div>
        
        <div className="flex items-center gap-1">
          <Wind className="w-4 h-4 text-gray-500" />
          <span className="text-gray-700">{weather.windSpeed.toFixed(1)} m/s</span>
        </div>
        
        <div className="flex items-center gap-1">
          <CloudRain className="w-4 h-4 text-blue-400" />
          <span className="text-gray-700">{weather.precipitation ? '降水あり' : '降水なし'}</span>
        </div>
      </div>
      
      {weather.temperature < 10 && (
        <div className="mt-3 p-2 bg-blue-200 rounded text-xs text-blue-800">
          低温注意：ペットは暖かい場所を探している可能性があります
        </div>
      )}
      
      {weather.temperature > 30 && (
        <div className="mt-3 p-2 bg-orange-200 rounded text-xs text-orange-800">
          高温注意：ペットは日陰や水のある場所にいる可能性があります
        </div>
      )}
      
      {weather.precipitation && (
        <div className="mt-3 p-2 bg-blue-200 rounded text-xs text-blue-800">
          雨天：ペットは雨宿りできる場所に隠れている可能性があります
        </div>
      )}
    </div>
  );
};