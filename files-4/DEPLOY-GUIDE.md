# HCF 官網改版 — 部署指南
> ⚠️ 請按順序操作，先備份再上傳

---

## 第一步：備份（重要！）

在你的 GitHub repo 或本地資料夾：
```bash
# 建立備份資料夾
mkdir backup-before-v2
cp index.html backup-before-v2/
cp faq.html backup-before-v2/
cp classes.html backup-before-v2/
cp team.html backup-before-v2/
cp pricing.html backup-before-v2/
cp philosophy.html backup-before-v2/
cp shark_logo.png backup-before-v2/
```

---

## 第二步：上傳新檔案

### 需要替換的檔案（6個）：
| 下載的檔案 | 改名為 | 說明 |
|-----------|--------|------|
| `index-final-preview.html` | ❌ **不要用這個** | 這是 preview 用的（含 inline 圖片 18MB） |
| 你的 `index-final.html` 源碼 | `index.html` | ⬇️ 看下方說明 |
| `faq-fixed.html` | `faq.html` | 移除 40% + 語言切換 |
| `classes-fixed.html` | `classes.html` | 移除語言切換 |
| `team-fixed.html` | `team.html` | 移除語言切換 |
| `pricing-fixed.html` | `pricing.html` | 移除語言切換 |
| `philosophy-fixed.html` | `philosophy.html` | 移除語言切換 |

### ⚠️ index.html 特別說明：
preview 版本把所有圖片 inline 成 base64（18MB），**不能直接當 index.html 用**。
你需要用我的源碼版本 `index-final.html`，它引用的是外部圖片路徑。

---

## 第三步：上傳新圖片檔案

這些圖片要放到你的網站根目錄（跟 index.html 同一層）：

| 檔案 | 說明 | 來源 |
|------|------|------|
| `shark_logo.png` | Logo（去背版，替換舊的） | 我處理的透明版 |
| `huang_cutout.png` | VS 黃謙和去背 | 7.png 轉透明 |
| `thum_cutout.png` | VS 圖姆去背 | 8.png 轉透明 |
| `vs_clash.png` | VS 碰撞合圖 | 678.png 轉透明 |
| `IMG_5202.JPG` | Hero 背景 + ACT3 | 教練膝擊棚拍 |
| `IMG_8944.jpeg` | ACT1 痛 背景 | 教練帶團課 |
| `IMG_3195.JPG` | ACT2 轉 背景 | 學員打靶 |
| `IMG_5213.jpeg` | ACT5 行動 背景 | 教練站姿 |
| `IMG_7366.jpeg` | ACT4 證明 背景 | 學員獎牌合照 |
| `review_IMG_4194.jpg` | Google 評論截圖 | 莊宇暘 |
| `review_IMG_4190.jpg` | Google 評論截圖 | Eddie Jhou |
| `review_IMG_4187.jpg` | Google 評論截圖 | 陸戰最強砲長 |
| `review_IMG_4199.jpg` | Google 評論截圖 | Pandan Juice |
| `review_IMG_4198.jpg` | Google 評論截圖 | 卓小卓 |
| `review_IMG_4197.jpg` | Google 評論截圖 | ZY Z |
| `review_IMG_4193.jpg` | Google 評論截圖 | 鄒勝傑 |
| `review_IMG_4192.jpg` | Google 評論截圖 | Tien Yu Chen |
| `review_IMG_4189.jpg` | Google 評論截圖 | 陸戰最強砲長合照 |

---

## 第四步：可以刪除的檔案

| 檔案 | 原因 |
|------|------|
| `philosophy-cinematic.css` | 品牌哲學已融入首頁，不再需要 |
| `philosophy-cinematic.js` | 同上 |
| `carousel-config.json` | 如果存在，可能會覆蓋 Hero 背景圖設定 |

---

## 第五步：Git 推送

```bash
git add .
git commit -m "v2.0: VS battle + 五幕敘事 + 最新優惠 + AI鯊魚知識庫 + 真實Google評論"
git push origin main
```

Netlify 會自動偵測到 push 並部署。

---

## 第六步：部署後檢查清單

- [ ] 首頁 Hero 有背景圖
- [ ] 往下滾 VS 對決有動畫 + BGM 播放
- [ ] Marquee 有 MPF07 勝利訊息
- [ ] 五幕痛點敘事有背景圖
- [ ] 最新優惠 4 TIER 正確顯示
- [ ] Google 評論輪播有截圖
- [ ] AI 鯊魚能回答「費用怎麼算」
- [ ] 手機版 VS 選手兩邊都看得到人
- [ ] Nav 全透明
- [ ] 語言切換按鈕消失（全站）
- [ ] Logo 無黑色方塊

---

## ⚠️ 注意事項

1. **carousel-config.json**：如果你伺服器上有這個檔案，JS 會用它載入 Hero 輪播。可能會覆蓋我加的靜態 Hero 背景圖。建議刪除或更新它。

2. **Netlify Functions**：AI 鯊魚現在先用本地知識庫回答，API fallback 仍保留。如果你的 `/.netlify/functions/chat` 仍在運作，兩者會配合：本地能答的秒回，複雜問題走 API。

3. **review 圖片命名**：評論截圖必須是 `review_IMG_XXXX.jpg` 格式（前面有 `review_`），因為 HTML 裡引用的是這個名字。
