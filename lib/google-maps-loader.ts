declare global {
  interface Window {
    google: any;
    googleMapsCallback: () => void;
  }
}

let isLoaded = false;
let isLoading = false;
const callbacks: Array<() => void> = [];

export function loadGoogleMaps(): Promise<void> {
  return new Promise((resolve, reject) => {
    // 既に読み込まれている場合
    if (isLoaded && window.google && window.google.maps) {
      resolve();
      return;
    }

    // 読み込み中の場合はコールバックに追加
    if (isLoading) {
      callbacks.push(resolve);
      return;
    }

    // APIキーの確認
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      reject(new Error('Google Maps APIキーが設定されていません'));
      return;
    }

    isLoading = true;

    // 既存のスクリプトタグをチェック
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      // 既存のスクリプトがある場合は削除
      existingScript.remove();
    }

    // グローバルコールバック関数を設定
    window.googleMapsCallback = () => {
      isLoaded = true;
      isLoading = false;
      
      // すべてのコールバックを実行
      resolve();
      callbacks.forEach(callback => callback());
      callbacks.length = 0;
    };

    // スクリプトタグを作成
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=googleMapsCallback`;
    script.async = true;
    script.defer = true;
    
    script.onerror = () => {
      isLoading = false;
      reject(new Error('Google Maps APIの読み込みに失敗しました'));
    };

    document.head.appendChild(script);
  });
}

export function isGoogleMapsLoaded(): boolean {
  return isLoaded && window.google && window.google.maps;
}