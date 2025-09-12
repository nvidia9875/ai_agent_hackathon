/**
 * Agent Validation Utilities
 * データ検証とバリデーション機能
 */

import { PetInfo, Location, FeatureVector, SearchArea } from '@/types/agents';

/**
 * 入力データ検証のユーティリティ
 */
export class ValidationUtils {
  /**
   * ペット情報を検証
   */
  static validatePetInfo(petInfo: PetInfo): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    // TODO: ペット情報検証の実装
    // 1. 必須フィールドの存在確認
    // 2. データ型と値の妥当性チェック
    // 3. 論理的整合性の確認
    // 4. 警告レベルの問題を特定

    const errors: string[] = [];
    const warnings: string[] = [];

    // 必須フィールドチェック
    if (!petInfo.id) errors.push('Pet ID is required');
    if (!petInfo.name) errors.push('Pet name is required');
    if (!petInfo.type || !['dog', 'cat'].includes(petInfo.type)) {
      errors.push('Pet type must be either "dog" or "cat"');
    }

    // 年齢の妥当性
    if (petInfo.age < 0 || petInfo.age > 30) {
      warnings.push('Pet age seems unusual (0-30 years expected)');
    }

    // 体重の妥当性
    if (petInfo.weight <= 0 || petInfo.weight > 100) {
      warnings.push('Pet weight seems unusual (0.1-100kg expected)');
    }

    // 位置情報の妥当性
    const locationValidation = this.validateLocation(petInfo.lastSeen.location);
    if (!locationValidation.isValid) {
      errors.push('Invalid last seen location');
    }

    // 画像URLの確認
    if (!petInfo.images || petInfo.images.length === 0) {
      warnings.push('No pet images provided - this may reduce accuracy');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 位置情報を検証
   */
  static validateLocation(location: Location): {
    isValid: boolean;
    errors: string[];
  } {
    // TODO: 位置情報検証の実装
    // 1. 緯度・経度の有効範囲チェック
    // 2. 数値型の確認
    // 3. 地理的妥当性の確認

    const errors: string[] = [];

    if (typeof location.lat !== 'number') {
      errors.push('Latitude must be a number');
    } else if (location.lat < -90 || location.lat > 90) {
      errors.push('Latitude must be between -90 and 90');
    }

    if (typeof location.lng !== 'number') {
      errors.push('Longitude must be a number');
    } else if (location.lng < -180 || location.lng > 180) {
      errors.push('Longitude must be between -180 and 180');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 特徴ベクトルを検証
   */
  static validateFeatureVector(vector: FeatureVector): {
    isValid: boolean;
    errors: string[];
  } {
    // TODO: 特徴ベクトル検証の実装
    // 1. 次元数の確認
    // 2. 数値の妥当性チェック
    // 3. 正規化の確認
    // 4. NaN/Infiniteの検出

    const errors: string[] = [];

    if (!Array.isArray(vector.values)) {
      errors.push('Feature vector values must be an array');
      return { isValid: false, errors };
    }

    if (vector.dimension !== vector.values.length) {
      errors.push('Dimension mismatch: declared dimension differs from actual length');
    }

    if (vector.dimension !== 1024) {
      errors.push('Feature vector must be 1024 dimensions');
    }

    // 数値の妥当性チェック
    for (let i = 0; i < vector.values.length; i++) {
      const value = vector.values[i];
      if (typeof value !== 'number') {
        errors.push(`Feature vector value at index ${i} is not a number`);
      } else if (!isFinite(value)) {
        errors.push(`Feature vector contains invalid value at index ${i}`);
      }
    }

    // 正規化チェック
    const magnitude = Math.sqrt(vector.values.reduce((sum, val) => sum + val * val, 0));
    if (Math.abs(magnitude - 1.0) > 0.001) {
      errors.push('Feature vector appears to be unnormalized (magnitude != 1.0)');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 捜索エリアを検証
   */
  static validateSearchArea(area: SearchArea): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    // TODO: 捜索エリア検証の実装
    // 1. 必須フィールドの確認
    // 2. 位置・半径の妥当性
    // 3. 優先度の範囲チェック
    // 4. 推定値の妥当性

    const errors: string[] = [];
    const warnings: string[] = [];

    if (!area.id) errors.push('Search area ID is required');

    // 位置情報の検証
    const locationValidation = this.validateLocation(area.center);
    if (!locationValidation.isValid) {
      errors.push('Invalid search area center location');
    }

    // 半径の妥当性
    if (area.radius <= 0 || area.radius > 50000) { // 最大50km
      errors.push('Search radius must be between 1m and 50km');
    }

    // 優先度の範囲
    if (area.priority < 1 || area.priority > 10) {
      errors.push('Priority must be between 1 and 10');
    }

    // 特性値の範囲
    const characteristics = area.characteristics;
    if (characteristics.accessibility < 0 || characteristics.accessibility > 1) {
      warnings.push('Accessibility should be between 0 and 1');
    }
    if (characteristics.safety < 0 || characteristics.safety > 1) {
      warnings.push('Safety should be between 0 and 1');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 画像URLを検証
   */
  static validateImageUrl(url: string): {
    isValid: boolean;
    errors: string[];
  } {
    // TODO: 画像URL検証の実装
    // 1. URL形式の確認
    // 2. プロトコルの確認
    // 3. 拡張子のチェック
    // 4. アクセス可能性の確認（オプション）

    const errors: string[] = [];

    try {
      const urlObj = new URL(url);
      
      // プロトコルチェック
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        errors.push('Image URL must use HTTP or HTTPS protocol');
      }

      // 拡張子チェック
      const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      const hasValidExtension = validExtensions.some(ext => 
        urlObj.pathname.toLowerCase().endsWith(ext)
      );
      
      if (!hasValidExtension) {
        errors.push('Image URL must have a valid image extension');
      }

    } catch (error) {
      errors.push('Invalid URL format');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 確率値を検証
   */
  static validateProbability(value: number, fieldName: string): {
    isValid: boolean;
    error?: string;
  } {
    // TODO: 確率値検証の実装
    // 1. 数値型の確認
    // 2. 0-1範囲の確認
    // 3. 有限値の確認

    if (typeof value !== 'number') {
      return {
        isValid: false,
        error: `${fieldName} must be a number`
      };
    }

    if (!isFinite(value)) {
      return {
        isValid: false,
        error: `${fieldName} must be a finite number`
      };
    }

    if (value < 0 || value > 1) {
      return {
        isValid: false,
        error: `${fieldName} must be between 0 and 1`
      };
    }

    return { isValid: true };
  }

  /**
   * タイムスタンプを検証
   */
  static validateTimestamp(timestamp: string): {
    isValid: boolean;
    error?: string;
    parsedDate?: Date;
  } {
    // TODO: タイムスタンプ検証の実装
    // 1. ISO 8601形式の確認
    // 2. 有効な日付の確認
    // 3. 未来日時のチェック
    // 4. 過度に古い日時のチェック

    try {
      const date = new Date(timestamp);
      
      if (isNaN(date.getTime())) {
        return {
          isValid: false,
          error: 'Invalid timestamp format'
        };
      }

      const now = new Date();
      const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      
      if (date > now) {
        return {
          isValid: false,
          error: 'Timestamp cannot be in the future'
        };
      }

      if (date < oneYearAgo) {
        return {
          isValid: false,
          error: 'Timestamp is too old (more than 1 year ago)'
        };
      }

      return {
        isValid: true,
        parsedDate: date
      };

    } catch (error) {
      return {
        isValid: false,
        error: 'Failed to parse timestamp'
      };
    }
  }

  /**
   * バッチ検証を実行
   */
  static validateBatch<T>(
    items: T[],
    validator: (item: T) => { isValid: boolean; errors: string[] }
  ): {
    validItems: T[];
    invalidItems: Array<{ item: T; errors: string[] }>;
    overallValid: boolean;
  } {
    // TODO: バッチ検証の実装
    // 1. 各アイテムを個別に検証
    // 2. 有効・無効なアイテムを分類
    // 3. 全体の妥当性を判定

    const validItems: T[] = [];
    const invalidItems: Array<{ item: T; errors: string[] }> = [];

    for (const item of items) {
      const result = validator(item);
      if (result.isValid) {
        validItems.push(item);
      } else {
        invalidItems.push({
          item,
          errors: result.errors
        });
      }
    }

    return {
      validItems,
      invalidItems,
      overallValid: invalidItems.length === 0
    };
  }
}