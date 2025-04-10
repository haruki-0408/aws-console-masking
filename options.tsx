import { useState, useEffect } from "react"
import { DEFAULT_SETTINGS ,type SettingsType} from "~ lib/settings"
import { loadMaskSettings, saveMaskSettings, loadCustomStrings, saveCustomStrings} from "~ lib/storage"

const OptionsIndex = () => {
  const [settings, setSettings] = useState<SettingsType>(DEFAULT_SETTINGS)
  const [customStrings, setCustomStrings] = useState<string[]>([])
  const [newString, setNewString] = useState("")
  
  useEffect(() => {
    // 保存された設定とカスタム文字列を読み込む
    const loadAllSettings = async () => {
      const savedSettings = await loadMaskSettings()
      const savedCustomStrings = await loadCustomStrings()
      
      setSettings(savedSettings)
      setCustomStrings(savedCustomStrings)
    }
    
    loadAllSettings()
  }, [])
  
  // 新しい文字列を追加
  const addCustomString = async () => {
    if (!newString.trim()) return
    
    // 重複を避ける
    if (!customStrings.includes(newString.trim())) {
      const updatedStrings = [...customStrings, newString.trim()]
      await saveCustomStrings(updatedStrings)
      setCustomStrings(updatedStrings)
    }
    
    // 入力フィールドをクリア
    setNewString("")
  }
  
  // 文字列を削除
  const removeCustomString = async (index: number) => {
    const updatedStrings = [...customStrings]
    updatedStrings.splice(index, 1)
    
    await saveCustomStrings(updatedStrings)
    setCustomStrings(updatedStrings)
  }
  
  // 設定を保存
  const saveSettings = async () => {
    await saveMaskSettings(settings)
    alert("設定を保存しました")
  }
  
  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto", fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ color: "#232F3E" }}>
        AWS Console Masking
      </h1>
      
      <div style={{ marginBottom: "20px" }}>
        <h2>黒塗りしたいお好きな文字列の追加(完全一致)</h2>
        {/* <div style={{ marginTop: "10px", fontSize: "14px", color: "#666" }}>
          <p>※ 設定を保存した後、AWS コンソールページを再読み込みすると変更が反映されます。</p>
        </div> */}
        
        <div style={{ display: "flex", marginBottom: "10px" }}>
          <input
            type="text"
            value={newString}
            onChange={(e) => setNewString(e.target.value)}
            placeholder="マスキングしたい文字列を入力"
            style={{ 
              flex: 1, 
              padding: "8px", 
              marginRight: "10px",
              border: "1px solid #ccc",
              borderRadius: "4px"
            }}
          />
          <button
            onClick={addCustomString}
            style={{
              padding: "8px 16px",
              backgroundColor: "#FF9900",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            追加
          </button>
        </div>
        
        {/* 追加済みの文字列リスト */}
        <div style={{ marginTop: "20px" }}>
          <h3>追加済みの文字列</h3>
          {customStrings.length > 0 ? (
            <ul style={{ listStyleType: "none", padding: 0 }}>
              {customStrings.map((str, index) => (
                <li 
                  key={index}
                  style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "center",
                    padding: "8px",
                    marginBottom: "4px",
                    backgroundColor: "#f5f5f5",
                    borderRadius: "4px"
                  }}
                >
                  <span>{str}</span>
                  <button
                    onClick={() => removeCustomString(index)}
                    style={{
                      backgroundColor: "#e74c3c",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      padding: "4px 8px",
                      cursor: "pointer"
                    }}
                  >
                    削除
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p>カスタム文字列はまだ追加されていません。</p>
          )}
        </div>
      </div>
      
      <button
        onClick={saveSettings}
        style={{
          padding: "10px 20px",
          backgroundColor: "#FF9900",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          fontSize: "16px"
        }}
      >
        設定を保存
      </button>
    </div>
  )
}

export default OptionsIndex