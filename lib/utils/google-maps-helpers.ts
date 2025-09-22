interface CreateMarkerOptions {
  position: google.maps.LatLngLiteral;
  map: google.maps.Map;
  title?: string;
  icon?: {
    url: string;
    scaledSize?: google.maps.Size;
    anchor?: google.maps.Point;
  };
  animation?: google.maps.Animation;
  zIndex?: number;
  draggable?: boolean;
}

interface MarkerResult {
  marker: google.maps.marker.AdvancedMarkerElement | google.maps.Marker;
  isAdvanced: boolean;
}

export async function createMapMarker(options: CreateMarkerOptions): Promise<MarkerResult> {
  try {
    // AdvancedMarkerElementを使用しようとする
    if ('google' in window && window.google.maps?.marker?.AdvancedMarkerElement) {
      const { AdvancedMarkerElement } = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary;
      
      // カスタムコンテンツを作成
      let content: HTMLElement | undefined;
      
      if (options.icon) {
        const iconElement = document.createElement('img');
        iconElement.src = options.icon.url;
        if (options.icon.scaledSize) {
          iconElement.style.width = `${options.icon.scaledSize.width}px`;
          iconElement.style.height = `${options.icon.scaledSize.height}px`;
        }
        iconElement.style.cursor = 'pointer';
        content = iconElement;
      }
      
      const advancedMarker = new AdvancedMarkerElement({
        position: options.position,
        map: options.map,
        title: options.title,
        content: content,
        zIndex: options.zIndex,
        gmpDraggable: options.draggable,
      });
      
      return {
        marker: advancedMarker,
        isAdvanced: true
      };
    }
  } catch (error) {
    console.log('AdvancedMarkerElement not available, falling back to legacy Marker');
  }
  
  // フォールバック: 従来のMarkerを使用
  const legacyMarker = new window.google.maps.Marker({
    position: options.position,
    map: options.map,
    title: options.title,
    icon: options.icon,
    animation: options.animation,
    zIndex: options.zIndex,
    draggable: options.draggable,
  });
  
  return {
    marker: legacyMarker,
    isAdvanced: false
  };
}

export function addMarkerListener(
  markerResult: MarkerResult, 
  event: string, 
  handler: () => void
): google.maps.MapsEventListener | undefined {
  if (markerResult.isAdvanced) {
    const advancedMarker = markerResult.marker as google.maps.marker.AdvancedMarkerElement;
    advancedMarker.addListener(event, handler);
    return undefined; // AdvancedMarkerElementのリスナーは別の方法で管理
  } else {
    const legacyMarker = markerResult.marker as google.maps.Marker;
    return legacyMarker.addListener(event, handler);
  }
}

export function removeMarker(markerResult: MarkerResult) {
  if (markerResult.isAdvanced) {
    const advancedMarker = markerResult.marker as google.maps.marker.AdvancedMarkerElement;
    advancedMarker.map = null;
  } else {
    const legacyMarker = markerResult.marker as google.maps.Marker;
    legacyMarker.setMap(null);
  }
}

export function setMarkerAnimation(
  markerResult: MarkerResult, 
  animation: google.maps.Animation | null
) {
  if (!markerResult.isAdvanced) {
    const legacyMarker = markerResult.marker as google.maps.Marker;
    legacyMarker.setAnimation(animation);
  }
  // AdvancedMarkerElementはアニメーションをサポートしていない場合がある
}