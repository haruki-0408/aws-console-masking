import { Storage } from "@plasmohq/storage"
import { DEFAULT_SETTINGS, type SettingsType } from "~ lib/settings"

// ブラウザのExtensionStorageを使用する
export const storage = new Storage()

// Masking設定をストレージにJSON文字列で保存する
export const saveMaskSettings = async (newSettings: SettingsType) => {
    try {
        await storage.set("maskSettings", JSON.stringify(newSettings))
    } catch (error) {
        console.error("設定の保存に失敗しました:", error)
    }
}

// Masking設定をストレージから読み込む
export const loadMaskSettings = async () => {
    try {
    // 保存された設定を読み込む
    const savedSettings = await storage.get("maskSettings")
    if (savedSettings) {
        return {
        ...DEFAULT_SETTINGS,
        ...JSON.parse(savedSettings)
        }
    }
    return DEFAULT_SETTINGS;
    } catch (error) {
    console.error("設定の読み込みに失敗しました:", error)
    return DEFAULT_SETTINGS;
    }
};

// カスタム文字列の配列をストレージに保存する
export const saveCustomStrings = async (customStrings: string[]) => {
    try {
        await storage.set("customStrings", JSON.stringify(customStrings))
    } catch (error) {
        console.error("カスタム文字列の保存に失敗しました:", error)
    }
}

// カスタム文字列の配列をストレージから読み込む
export const loadCustomStrings = async (): Promise<string[]> => {
    try {
        const savedStrings = await storage.get("customStrings")
        if (savedStrings) {
            return JSON.parse(savedStrings)
        }
        return [] // デフォルトは空配列
    } catch (error) {
        console.error("カスタム文字列の読み込みに失敗しました:", error)
        return [] // エラー時も空配列を返す
    }
}