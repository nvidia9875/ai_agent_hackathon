export class GeocodingService {
  private static instance: GeocodingService;
  private geocoder: google.maps.Geocoder | null = null;

  private constructor() {}

  static getInstance(): GeocodingService {
    if (!GeocodingService.instance) {
      GeocodingService.instance = new GeocodingService();
    }
    return GeocodingService.instance;
  }

  private ensureGeocoder(): void {
    if (!this.geocoder && window.google?.maps?.Geocoder) {
      this.geocoder = new window.google.maps.Geocoder();
    }
  }

  async geocodeAddress(address: string): Promise<{lat: number; lng: number} | null> {
    this.ensureGeocoder();
    
    if (!this.geocoder) {
      console.error('Geocoder not available');
      return null;
    }

    return new Promise((resolve) => {
      this.geocoder!.geocode(
        { 
          address: address,
          region: 'JP' // 日本の住所を優先
        },
        (results, status) => {
          if (status === 'OK' && results && results[0]) {
            const location = results[0].geometry.location;
            resolve({
              lat: location.lat(),
              lng: location.lng()
            });
          } else {
            console.error('Geocoding failed:', status, address);
            resolve(null);
          }
        }
      );
    });
  }

  async geocodeAddresses(addresses: string[]): Promise<Array<{address: string; location: {lat: number; lng: number} | null}>> {
    const results = [];
    
    for (const address of addresses) {
      // レート制限を避けるため、リクエスト間に遅延を入れる
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const location = await this.geocodeAddress(address);
      results.push({ address, location });
    }
    
    return results;
  }

  // 日本の主要都市の座標をフォールバックとして使用
  getDefaultLocationForCity(city: string): {lat: number; lng: number} | null {
    const cityCoordinates: {[key: string]: {lat: number; lng: number}} = {
      '渋谷': { lat: 35.6580, lng: 139.7016 },
      '新宿': { lat: 35.6896, lng: 139.7006 },
      '東京': { lat: 35.6762, lng: 139.6503 },
      '品川': { lat: 35.6284, lng: 139.7387 },
      '池袋': { lat: 35.7295, lng: 139.7109 },
      '上野': { lat: 35.7141, lng: 139.7774 },
      '秋葉原': { lat: 35.6984, lng: 139.7731 },
      '浅草': { lat: 35.7118, lng: 139.7966 },
      '六本木': { lat: 35.6627, lng: 139.7316 },
      '原宿': { lat: 35.6701, lng: 139.7029 },
      '代々木': { lat: 35.6833, lng: 139.7020 },
      '中野': { lat: 35.7056, lng: 139.6636 },
      '吉祥寺': { lat: 35.7022, lng: 139.5806 },
      '横浜': { lat: 35.4437, lng: 139.6380 },
      '川崎': { lat: 35.5308, lng: 139.7029 },
      '千葉': { lat: 35.6074, lng: 140.1065 },
      '大宮': { lat: 35.9065, lng: 139.6241 },
    };

    // 部分一致検索
    for (const [cityName, coords] of Object.entries(cityCoordinates)) {
      if (city.includes(cityName)) {
        return coords;
      }
    }

    return null;
  }

  // 住所文字列から座標を推定（Geocoding APIが使えない場合のフォールバック）
  async estimateLocation(address: string): Promise<{lat: number; lng: number}> {
    // まずGeocoding APIを試す
    const geocoded = await this.geocodeAddress(address);
    if (geocoded) {
      return geocoded;
    }

    // 主要都市の座標を検索
    const cityLocation = this.getDefaultLocationForCity(address);
    if (cityLocation) {
      return cityLocation;
    }

    // デフォルトで東京駅周辺を返す
    return { lat: 35.6762, lng: 139.6503 };
  }
}