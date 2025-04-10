import type { PlasmoCSConfig } from "plasmo"
import { loadMaskSettings, loadCustomStrings } from "~ lib/storage";
import { DEFAULT_PATTERNS } from "~ lib/settings"

// AWS コンソールのページでのみ実行されるように設定
export const config: PlasmoCSConfig = {
  matches: ["https://*.console.aws.amazon.com/*", "https://console.aws.amazon.com/*"],
  all_frames: true
}

// マスキング用のクラス名
const MASK_CLASS = '_4r3edsf-aws-console-masked';
const STYLE_ID = '_4r3edsf-aws-console-masker-style';

// マスキング用のスタイルを追加
const addMaskingStyle = () => {
  // 既存のスタイル要素があれば削除
  removeMaskingStyle();
  
  // 新しいスタイル要素を作成
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .${MASK_CLASS} {
      background-color: #000 !important;
      color: #000 !important;
      border-radius: 2px !important;
      user-select: none !important;
      -webkit-user-select: none !important;
    }
  `;
  document.head.appendChild(style);
};

// マスキングスタイルを削除
const removeMaskingStyle = () => {
  const styleEl = document.getElementById(STYLE_ID);
  if (styleEl) {
    styleEl.remove();
  }
};


// マスキング処理を実行する関数
const applyMasking = async () => {
  // マスキング適用時に毎回設定を読み込む
  const settings = await loadMaskSettings();
  // カスタム文字列を読み込む
  const customStrings = await loadCustomStrings();
  
  // 現在の設定に基づいてアクティブなパターンを構築
  const activePatterns: Record<string, RegExp> = {};
  
  // 設定に基づいてパターンを有効化（ARNを優先するため順序を維持）
  if (settings.maskArn) activePatterns.ARN = DEFAULT_PATTERNS.ARN;
  if (settings.maskAccountId) activePatterns.ACCOUNT_ID = DEFAULT_PATTERNS.ACCOUNT_ID;
  if (settings.maskAccessKey) activePatterns.ACCESS_KEY = DEFAULT_PATTERNS.ACCESS_KEY;
  if (settings.maskSecretKey) activePatterns.SECRET_KEY = DEFAULT_PATTERNS.SECRET_KEY;
  
  // カスタム文字列のパターンを追加 
  if (settings.maskCustomStrings && customStrings.length > 0) {
    customStrings.forEach((str, index) => {
      if (str && str.trim()) {
        // 文字列をエスケープして正規表現に変換
        const escapedStr = str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        activePatterns[`CUSTOM_${index}`] = new RegExp(escapedStr, 'g');
      }
    });
  }
  
  // パターンがなければ処理終了
  if (Object.keys(activePatterns).length === 0) {
    return;
  }
  
  // まず既存のマスキングを解除
  removeMasking();
  
  // マスキング用のスタイルを追加
  addMaskingStyle();
  
  // テキストノードを処理する関数
  const processTextNode = (node: Text) => {
    const originalText = node.nodeValue || "";
    let newText = originalText;
    let hasMatch = false;
    
    // 各パターンでマッチングを行う（順序が重要）
    Object.entries(activePatterns).forEach(([_, pattern]) => {
      // 正規表現のインデックスをリセット
      pattern.lastIndex = 0;
      
      // マッチした部分をspanタグで囲む
      newText = newText.replace(pattern, (match) => {
        hasMatch = true;
        return `<span class="${MASK_CLASS}">${match}</span>`;
      });
    });
    
    // マッチがあった場合のみDOMを変更
    if (hasMatch && node.parentNode) {
      // 一時的なコンテナを作成
      const tempContainer = document.createElement('div');
      tempContainer.innerHTML = newText;
      
      // 親要素を取得
      const parentElement = node.parentNode;
      
      // DocumentFragmentを作成
      const fragment = document.createDocumentFragment();
      
      // 一時コンテナの子要素をすべてフラグメントに移動
      while (tempContainer.firstChild) {
        fragment.appendChild(tempContainer.firstChild);
      }
      
      // テキストノードを新しいフラグメントで置き換え
      parentElement.replaceChild(fragment, node);
    }
  };
  
  // ページ内のすべてのテキストノードを処理
  const walkTextNodes = (root: Node) => {
    // 処理済みノードを記録するSet
    const processedNodes = new Set<Node>();
    
    // TreeWalkerを使用してテキストノードを走査
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // 空のテキストノードはスキップ
          if (!node.nodeValue?.trim()) {
            return NodeFilter.FILTER_REJECT;
          }
          
          // すでに処理済みのノードはスキップ
          if (processedNodes.has(node)) {
            return NodeFilter.FILTER_REJECT;
          }
          
          // script, style タグ内のテキストはスキップ
          const parent = node.parentElement;
          if (parent && (
              parent.tagName === 'SCRIPT' || 
              parent.tagName === 'STYLE')) {
            return NodeFilter.FILTER_REJECT;
          }
          
          // マスク済み要素内のテキストはスキップ
          let currentNode = parent;
          while (currentNode) {
            if (currentNode.classList && currentNode.classList.contains(MASK_CLASS)) {
              return NodeFilter.FILTER_REJECT;
            }
            currentNode = currentNode.parentElement;
          }
          
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    
    // 処理するノードを配列に集める（処理中にDOMが変わるため）
    const textNodes: Text[] = [];
    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node as Text);
      processedNodes.add(node);
    }
    
    // 集めたノードを処理
    textNodes.forEach(processTextNode);
  };
  
  // ページ全体を処理
  walkTextNodes(document.body);
};

// マスキングを解除する関数
const removeMasking = () => {
  // マスク済み要素を元に戻す
  document.querySelectorAll(`.${MASK_CLASS}`).forEach(el => {
    // spanの内容をテキストノードとして抽出
    if (el.parentNode) {
      const textNode = document.createTextNode(el.textContent || '');
      el.parentNode.replaceChild(textNode, el);
    }
  });
  
  // スタイル要素も削除
  removeMaskingStyle();
  
  // テキストノードを正規化（連続するテキストノードを結合）
  document.body.normalize();
};

// メッセージリスナーの設定（ポップアップからの指示を受け取る）
chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
  if (message.action === "applyMasking") {
    // マスキング適用時に設定を読み込んで処理
    applyMasking().then(() => {
      sendResponse({ success: true });
    });
    return true; // 非同期レスポンスのために必要
  } else if (message.action === "removeMasking") {
    removeMasking();
    sendResponse({ success: true });
    return true;
  } else if (message.action === "toggleMasking") {
    
    applyMasking().then(() => {
      sendResponse({ success: true });
    });
    
    return true;
  }
  return true;
});

export {};