# 先寫一點點 — 預約表單草稿小幫手

已經約好身心科或心理諮商,卻卡在預約表單的「描述心理困擾與主訴」那一格?
這個網站把那一格拆成七個可以用點選回答的小問題,當下組成一段能直接貼上的草稿。

- 不註冊、不儲存:回答只存在瀏覽器分頁的記憶體裡,關掉就消失。
- 中立代筆:只整理使用者自己說的內容,不診斷、不建議、不評價。
- 沒有 AI 也能用:AI 額度用完或服務中斷時,自動改用瀏覽器內的範本組句。

> 本工具不提供醫療建議、診斷或治療,也不能取代專業人員。

## 架構

```
docs/      靜態網站(GitHub Pages 直接發佈這個資料夾)
worker/    Cloudflare Worker:保管 Claude API Key、每日限額、呼叫 Claude
```

GitHub Pages 只能放靜態檔案,任何寫在前端的金鑰都等於公開。所以金鑰放在 Worker 的
加密 secret 裡,瀏覽器只呼叫 Worker。Worker 不是通用代理:它只接受固定欄位、
自行組提示詞,並限制字數。

## 部署步驟

### 1. 發佈網站

Repo → Settings → Pages → Source 選 **Deploy from a branch**,資料夾選 **/docs**。
此時網站已可使用(離線範本模式)。

### 2. 建立 Claude API Key(不進版控)

1. 到 [Claude Console](https://platform.claude.com/) 建立一個**專用 workspace**,並設定每月花費上限。
2. 在該 workspace 建立 API Key。
3. 金鑰只放兩個地方,兩者都不會進 Git:

```bash
cd worker
npm install
npx wrangler login
npx wrangler secret put ANTHROPIC_API_KEY
```

本機測試則把 `worker/.dev.vars.example` 複製成 `worker/.dev.vars`(已列入 `.gitignore`)。

### 3. 建立限額用的 KV 並部署 Worker

```bash
npx wrangler kv namespace create RATE_LIMIT
```

把回傳的 `id` 貼到 `worker/wrangler.toml`,再部署:

```bash
npx wrangler deploy
```

### 4. 接上前端

把部署後的網址填進 `docs/config.js`:

```js
window.INTAKE_API = "https://mindverse-intake.<你的子網域>.workers.dev/api/draft";
```

## 可調整的設定(`worker/wrangler.toml`)

| 變數 | 預設 | 說明 |
|---|---|---|
| `DAILY_LIMIT_PER_IP` | 50 | 每個來源 IP 每日次數(台北時間換日) |
| `DAILY_LIMIT_GLOBAL` | 400 | 全站每日次數,等於你的每日成本上限 |
| `MODEL` | `claude-opus-5-5` | 使用的 Claude 模型 |
| `ALLOWED_ORIGINS` | GitHub Pages 網址 | 允許呼叫的網站來源 |

## 隱私說明

- 網站沒有 cookie、localStorage、分析或追蹤程式。
- Worker 關閉請求紀錄,不寫入任何使用者輸入。KV 只存「加日期鹽雜湊後的 IP + 當日次數」,48 小時後自動刪除。
- 啟用 AI 模式時,回答會傳給 Anthropic API 處理,並依其政策短期留存;網站首頁會明確告知,並提醒不要填寫可辨識身分的資料。
