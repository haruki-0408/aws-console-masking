import { useEffect, useState } from "react"
import styles from "./style.module.scss"
import { DEFAULT_SETTINGS, type SettingsType } from "~ lib/settings"
import { loadMaskSettings, saveMaskSettings } from "~ lib/storage"

// トグルスイッチコンポーネント
const ToggleSwitch = ({ checked, onChange, disabled = false }) => (
  <label className={styles.toggleSwitch}>
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      className={styles.toggleInput}
    />
    <span
      className={`${styles.toggleSlider} ${checked ? styles.toggleChecked : ""} ${disabled ? styles.toggleDisabled : ""}`}
    >
      <span
        className={`${styles.toggleBefore} ${checked ? styles.toggleBeforeChecked : ""}`}
      />
    </span>
  </label>
)

const IndexPopup = () => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [isProcessing, setIsProcessing] = useState(false)

  // 設定を読み込む
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settings = await loadMaskSettings();
        setSettings(settings);
      } catch (error) {
        console.error("設定の読み込みに失敗しました:", error);
      }
    };

    fetchSettings();
  }, []);

  // 設定を保存する
  const handleToggleChange = async (key: string) => {
    const newSettings: SettingsType = {
      ...settings,
      [key]: !settings[key]
    }
    await saveMaskSettings(newSettings)
    setSettings(newSettings)
  }

  // マスキングを適用/解除する
  const toggleMasking = (action: string) => {
    setIsProcessing(true)
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(
          tabs[0].id, 
          { action },
          () => {
            setIsProcessing(false)
            if (chrome.runtime.lastError) {
              console.error(chrome.runtime.lastError)
            }
          }
        )
      } else {
        setIsProcessing(false)
      }
    })
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>AWS Console Masking</h2>

      <div className={styles.section}>
        <p className={styles.caption}>※スクリーンショット前に都度「マスキング」押す必要あり</p>
        <div className={styles.sectionTitle}>マスキング対象:</div>
        
        <label className={styles.toggleRow}>
          <span>アカウント ID</span>
          <ToggleSwitch
            checked={settings.maskAccountId}
            onChange={() => handleToggleChange("maskAccountId")}
          />
        </label>
        
        <label className={styles.toggleRow}>
          <span>ARN</span>
          <ToggleSwitch
            checked={settings.maskArn}
            onChange={() => handleToggleChange("maskArn")}
          />
        </label>
        
        <label className={styles.toggleRow}>
          <span>アクセスキー</span>
          <ToggleSwitch
            checked={settings.maskAccessKey}
            onChange={() => handleToggleChange("maskAccessKey")}
          />
        </label>
        
        <label className={styles.toggleRow}>
          <span>シークレットキー</span>
          <ToggleSwitch
            checked={settings.maskSecretKey}
            onChange={() => handleToggleChange("maskSecretKey")}
          />
        </label>

        <label className={styles.toggleRow}>
          <span>カスタム文字列</span>
          <ToggleSwitch
            checked={settings.maskCustomStrings}
            onChange={() => handleToggleChange("maskCustomStrings")}
          />
        </label>
      </div>

      <div className={styles.buttonContainer}>
        <button 
          onClick={() => toggleMasking("applyMasking")}
          disabled={isProcessing}
          className={styles.primaryButton}
        >
          マスキング
        </button>
        
        <button 
          onClick={() => toggleMasking("removeMasking")}
          disabled={isProcessing}
          className={styles.secondaryButton}
        >
          解除
        </button>
      </div>

      <button 
        onClick={() => chrome.runtime.openOptionsPage()}
        className={styles.optionsButton}
      >
        カスタム文字列設定
      </button>
    </div>
  )
}

export default IndexPopup