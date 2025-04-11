// 設定の型定義
export interface SettingsType {
    maskAccountId: boolean;
    maskArn: boolean;
    maskAccessKey: boolean;
    maskSecretKey: boolean;
    maskCustomStrings: boolean;
}
  
// デフォルトのマスキング設定
export const DEFAULT_SETTINGS: SettingsType = {
    maskAccountId: true,
    maskArn: true,
    maskAccessKey: true,
    maskSecretKey: true,
    maskCustomStrings: true,
};

// デフォルトのマスキングパターン
export const DEFAULT_PATTERNS = {
    // ARN パターン（優先度高）
    ARN: /\barn:aws[a-zA-Z-]*:[^\s"']+/g,

    // AWS アカウント ID: 12桁の数字（ハイフンなし、または4桁ごとにハイフン区切り）
    ACCOUNT_ID: /\b(\d{12}|\d{4}-\d{4}-\d{4})\b/g,

    // アクセスキー
    ACCESS_KEY: /\b(AKIA[0-9A-Z]{16})\b/g,

    // シークレットキー
    SECRET_KEY: /\b([0-9a-zA-Z/+]{40})\b/g
};