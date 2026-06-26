# Multi-Trader Analysis（多交易员综合分析）

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![skills.sh](https://img.shields.io/badge/skills.sh-install-blue)](https://skills.sh/AG9K91/multi-trader-analysis)

五位一体 A 股综合分析 Skill：五位不同策略风格的「交易员」AI 智能体并行分析，再由「首席策略师」交叉验证、打包输出结构化综合报告。

## 交易员阵容

| 交易员 | 策略流派 | 分析维度 | 依赖 Skills |
|--------|---------|---------|------------|
| 🏷️ 价值投资者 | Graham + Buffett | PE/PB/PS · DCF · NCAV · 护城河 · 安全边际 | fundamentals, value-investing |
| 📈 技术分析师 | 多维度技术分析 | K线形态 · RSI/MACD/EMA · 缠论 · SMC · 海龟 | market-data, technical |
| 💰 资金情绪 | Flow & Sentiment | 主力资金 · 北向资金 · 市场情绪 · 板块轮动 | market-data, intel |
| 🤖 量化策略师 | Quant | 因子暴露 · 波动率 · 季节性 · Beta · 多因子打分 | market-data, quant |
| 🔬 研究员 | Fundamental Research | 机构评级 · 一致预期 · 内部人交易 · 竞争格局 | research, fundamentals |

## 输出报告

```json
{
  "ticker": "600519.SH",
  "trader_analyses": [ /* 5 位交易员结构化分析 */ ],
  "consensus": {
    "overall_rating": "bullish|bearish|neutral|mixed",
    "agreement_level": "high|medium|low",
    "aligned_points": ["共识点..."],
    "divergent_points": ["分歧点..."]
  },
  "chief_strategist_summary": "首席策略师 500 字综合研判",
  "risk_warnings": ["按严重程度排序的风险列表"]
}
```

## 快速开始

### 1. 安装前置依赖

```bash
npx skills add https://github.com/longbridge/skills --skill longbridge-market-data -y
npx skills add https://github.com/longbridge/skills --skill longbridge-fundamentals -y
npx skills add https://github.com/longbridge/skills --skill longbridge-technical -y
npx skills add https://github.com/longbridge/skills --skill longbridge-value-investing -y
npx skills add https://github.com/longbridge/skills --skill longbridge-intel -y
npx skills add https://github.com/longbridge/skills --skill longbridge-quant -y
npx skills add https://github.com/longbridge/skills --skill longbridge-research -y
```

### 2. 安装本 Skill

```bash
npx skills add https://github.com/AG9K91/multi-trader-analysis -y
```

### 3. 运行

在 Claude Code 中：
```
分析贵州茅台，用多交易员模式
```

或直接调用 Workflow：
```javascript
Workflow({
  scriptPath: "workflows/multi-trader-analysis.js",
  args: { ticker: "600519.SH" }
})
```

## 支持市场

- 🇨🇳 A 股（上海 600xxx.SH / 深圳 000xxx.SZ、002xxx.SZ、300xxx.SZ）
- 🇭🇰 港股（xxxx.HK）
- 🇺🇸 美股（XXXX.US）
- 🇸🇬 新加坡（xxxx.SG）

## 实测案例

### 紫光股份（000938.SZ）
- 综合评级：🟡 **中性** | 一致程度：高（4/5）
- 核心矛盾：AI 算力成长逻辑 vs 毛利率持续下滑（20.6%→14.6%）+ 社保清仓

### 三花智控（002050.SZ）
- 综合评级：🔴 **看跌** | 一致程度：中
- 核心矛盾：全球热管理龙头（市占率>50%）vs PE 50倍+PEG 3倍+实控人套现

## 免责声明

本 Skill 由 AI 多智能体系统驱动，所有分析结果仅供参考，**不构成任何投资建议**。投资有风险，入市需谨慎。

## License

MIT
