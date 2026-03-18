# SPY Daily Predictor 📈

用真实市场数据 + Claude AI 每天预测 SPY 走势的仪表板。

## 技术栈
- **Next.js 14** — 前端 + API Routes
- **Yahoo Finance** — 免费实时市场数据（SPY、VIX、10Y债券、布伦特原油）
- **Claude API** — AI 分析预测方向、置信度、目标区间
- **Vercel** — 一键部署，自动 HTTPS

---

## 本地运行

```bash
# 1. 安装依赖
npm install

# 2. 填入 API Key（复制 .env.local，填入你的 key）
cp .env.local.example .env.local
# 编辑 .env.local，填入 ANTHROPIC_API_KEY

# 3. 启动开发服务器
npm run dev

# 打开 http://localhost:3000
```

---

## 部署到 Vercel（推荐，免费）

### 步骤一：上传到 GitHub
```bash
# 在 GitHub 新建一个仓库，然后：
git init
git add .
git commit -m "init"
git remote add origin https://github.com/你的用户名/spy-predictor.git
git push -u origin main
```

### 步骤二：Vercel 部署
1. 打开 [vercel.com](https://vercel.com) → 用 GitHub 登录
2. 点击 **"New Project"** → 选择你的 `spy-predictor` 仓库
3. 在 **Environment Variables** 里添加：
   - Key: `ANTHROPIC_API_KEY`
   - Value: `sk-ant-你的key`
4. 点击 **Deploy** — 1分钟后自动上线 ✅

### 步骤三：获取 Anthropic API Key
1. 打开 [console.anthropic.com](https://console.anthropic.com/settings/keys)
2. 点击 **"Create Key"**
3. 复制 key，粘贴到 Vercel 环境变量

---

## 数据说明

| 数据 | 来源 | 更新频率 |
|------|------|---------|
| SPY 价格/OHLV | Yahoo Finance | 实时（交易日） |
| VIX 恐慌指数 | Yahoo Finance | 实时 |
| 10年期美债收益率 | Yahoo Finance | 实时 |
| 布伦特原油 | Yahoo Finance | 实时 |
| AI 预测 | Claude API | 每次点击刷新 / 1小时缓存 |

---

## ⚠️ 免责声明

本工具仅供技术分析参考，**不构成投资建议**。市场预测具有不确定性，请结合自身判断谨慎操作。
 
