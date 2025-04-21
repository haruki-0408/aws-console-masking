import type { PlasmoCSConfig } from "plasmo"
import { loadMaskSettings, loadCustomStrings } from "~ lib/storage"
import { DEFAULT_PATTERNS } from "~ lib/settings"

export const config: PlasmoCSConfig = {
  matches: [
    "https://*.console.aws.amazon.com/*",
    "https://console.aws.amazon.com/*"
  ],
  all_frames: true
}

// 一意な拡張IDプレフィックス
const ATTR_PREFIX = "_4r3edsf"

// データ属性名定義（マスク用 / スタイル注入検知用）
const MASK_ATTR = `data-${ATTR_PREFIX}-mask-overlay`
const STYLE_MARKER_ATTR = `data-${ATTR_PREFIX}-style`

// グローバルでマッチパターンを保持
let activePatterns: { key: string; pattern: RegExp }[] = []

// スタイル注入（各documentごとに一度だけ）
const injectMaskStyle = (targetDoc: Document = document) => {
  if (targetDoc.querySelector(`style[${STYLE_MARKER_ATTR}]`)) return

  const style = targetDoc.createElement("style")
  style.setAttribute(STYLE_MARKER_ATTR, "true")
  style.textContent = `
    [${MASK_ATTR}] {
      position: relative;
      display: inline-block;
    }
    [${MASK_ATTR}]::after {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: #000;
      opacity: 1.0;
      z-index: 9999;
      pointer-events: none;
      border-radius: 2px;
    }
  `
  targetDoc.head.appendChild(style)
}

// マスキング適用処理
const applyMasking = async () => {
  const settings = await loadMaskSettings()
  const customStrings = await loadCustomStrings()

  activePatterns = []

  if (settings.maskArn) activePatterns.push({ key: "ARN", pattern: DEFAULT_PATTERNS.ARN })
  if (settings.maskAccountId) activePatterns.push({ key: "ACCOUNT_ID", pattern: DEFAULT_PATTERNS.ACCOUNT_ID })
  if (settings.maskAccessKey) activePatterns.push({ key: "ACCESS_KEY", pattern: DEFAULT_PATTERNS.ACCESS_KEY })
  if (settings.maskSecretKey) activePatterns.push({ key: "SECRET_KEY", pattern: DEFAULT_PATTERNS.SECRET_KEY })

  if (settings.maskCustomStrings && customStrings.length > 0) {
    customStrings.forEach((str, index) => {
      if (str && str.trim()) {
        const escapedStr = str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        activePatterns.push({ key: `CUSTOM_${index}`, pattern: new RegExp(escapedStr, "g") })
      }
    })
  }

  if (activePatterns.length === 0) return

  removeMasking()
  injectMaskStyle(document)
  walkTextNodes(document.body)
}

// テキストノードを走査してマスキング
const walkTextNodes = (root: Document | HTMLElement, context: { inIframe?: boolean } = {}) => {
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        if (!node.nodeValue?.trim()) return NodeFilter.FILTER_REJECT
        const parent = node.parentElement
        if (!parent || ["SCRIPT", "STYLE"].includes(parent.tagName)) {
          return NodeFilter.FILTER_REJECT
        }
        return NodeFilter.FILTER_ACCEPT
      }
    }
  )

  const textNodes: Text[] = []
  let node
  while ((node = walker.nextNode())) {
    textNodes.push(node as Text)
  }

  textNodes.forEach((textNode) => {
    const content = textNode.nodeValue || ""
    const parent = textNode.parentNode
    if (!parent) return

    const spanContainer = document.createElement("span")
    let lastIndex = 0
    const matches: { start: number; end: number }[] = []

    let firstMatchSet = false
    for (const { key, pattern } of activePatterns) {
      pattern.lastIndex = 0
      for (const match of content.matchAll(pattern)) {
        if (!firstMatchSet) {
          matches.push({ start: match.index!, end: match.index! + match[0].length })
          if (context.inIframe && parent instanceof HTMLElement) {
            console.log(`[iframe match] (${key}):`, match[0])
            console.log("Matched HTML tag:", parent.outerHTML)
          }
        }
      }
      if (matches.length > 0) {
        firstMatchSet = true
        break
      }
    }

    if (matches.length === 0) return

    const uniqueMatches = matches
      .sort((a, b) => a.start - b.start)
      .filter((m, i, arr) => i === 0 || m.start >= arr[i - 1].end)

    uniqueMatches.forEach(({ start, end }) => {
      if (lastIndex < start) {
        spanContainer.appendChild(document.createTextNode(content.slice(lastIndex, start)))
      }

      const matchText = content.slice(start, end)
      const span = document.createElement("span")
      span.textContent = matchText
      span.setAttribute(MASK_ATTR, "true")
      spanContainer.appendChild(span)
      lastIndex = end
    })

    if (lastIndex < content.length) {
      spanContainer.appendChild(document.createTextNode(content.slice(lastIndex)))
    }

    parent.replaceChild(spanContainer, textNode)
  })

  const iframes = root.querySelectorAll?.("iframe") || []
  for (const iframe of iframes) {
    try {
      const iframeDoc = iframe.contentDocument
      if (iframeDoc?.body) {
        injectMaskStyle(iframeDoc)
        walkTextNodes(iframeDoc.body, { inIframe: true })
      }
    } catch (e) {
      console.warn("Skipping iframe (possibly cross-origin):", e)
    }
  }
}

// マスキング除去処理（再帰的にiframe含む）
const removeMasking = () => {
  const unmask = (root: Document | HTMLElement) => {
    root.querySelectorAll(`[${MASK_ATTR}]`).forEach((el) => {
      const parent = el.parentNode
      if (!parent) return

      const textNode = document.createTextNode(el.textContent || "")
      parent.replaceChild(textNode, el)

      if (
        parent instanceof HTMLElement &&
        parent.tagName === "SPAN" &&
        parent.childNodes.length === 0
      ) {
        const grandParent = parent.parentNode
        if (grandParent) {
          grandParent.replaceChild(document.createTextNode(parent.textContent || ""), parent)
        }
      }
    })

    const iframes = root.querySelectorAll?.("iframe") || []
    for (const iframe of iframes) {
      try {
        const iframeDoc = iframe.contentDocument
        if (iframeDoc?.body) {
          unmask(iframeDoc.body)
        }
      } catch (e) {
        console.warn("Skipping iframe in unmask (cross-origin):", e)
      }
    }
  }

  unmask(document)
}

// メッセージリスナー（外部からの指示で処理を実行）
chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
  if (message.action === "applyMasking") {
    applyMasking().then(() => sendResponse({ success: true }))
    return true
  } else if (message.action === "removeMasking") {
    removeMasking()
    sendResponse({ success: true })
    return true
  }
  return true
})

export {}
