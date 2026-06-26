---
name: multi-trader-analysis
description: |
  多交易员 A 股综合分析 — 五位一体（价值投资/技术分析/资金情绪/量化策略/基本面研究），并行分析 + 交叉验证 + 打包输出综合报告。
  Triggers: "多交易员", "multi-trader", "综合分析", "多维度分析", "五维分析", "全面分析股票", "深度分析", "交易员视角"
license: MIT
metadata:
  author: AG9K91
  version: "1.0.0"
  risk_level: read_only
  requires_login: false
  default_install: true
  requires_mcp: false
  tier: read
  dependencies:
    - longbridge-market-data
    - longbridge-fundamentals
    - longbridge-technical
    - longbridge-value-investing
    - longbridge-intel
    - longbridge-quant
    - longbridge-research
---

# Multi-Trader Analysis（多交易员综合分析）

五位一体 A 股综合分析 Workflow：价值投资 / 技术分析 / 资金情绪 / 量化策略 / 基本面研究，五维度并行分析后再由首席策略师交叉验证、打包输出综合报告。

> **Response language**: match the user's input language — 简体中文 / English.
> **Data-source policy**: 依赖长桥证券（Longbridge）数据生态，请先安装相关 Skills。

## 前置依赖

本 Skill 依赖以下 Longbridge Skills（需预先安装）：

```bash
npx skills add https://github.com/longbridge/skills --skill longbridge-market-data -y
npx skills add https://github.com/longbridge/skills --skill longbridge-fundamentals -y
npx skills add https://github.com/longbridge/skills --skill longbridge-technical -y
npx skills add https://github.com/longbridge/skills --skill longbridge-value-investing -y
npx skills add https://github.com/longbridge/skills --skill longbridge-intel -y
npx skills add https://github.com/longbridge/skills --skill longbridge-quant -y
npx skills add https://github.com/longbridge/skills --skill longbridge-research -y
```

## When to use

当用户希望从多个交易策略视角对某只 A 股（或港股/美股）进行全面分析时触发：

- "分析一下 XXX，多交易员视角"
- "对 XXX 做全面分析"
- "多维度分析 XXX"
- "用五维模型分析 XXX"
- "XXX 现在值得买入吗？多角度分析"

## 分析架构

```
输入: 股票代码 (如 600519.SH)
         │
         ▼
┌─────────────────────────────────┐
│  Stage 1: 五位交易员并行分析      │
├─────────────────────────────────┤
│  🏷️  价值投资者  → 格雷厄姆+巴菲特  │
│  📈 技术分析师  → 缠论+指标+形态   │
│  💰 资金情绪    → 北向资金+板块轮动 │
│  🤖 量化策略师  → 因子+波动率+季节性│
│  🔬 研究员      → 评级+预期+竞争   │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────┐
│  Stage 2: 首席策略师  │
│  交叉验证 + 一致性检查 │
│  分歧分析 + 风险汇总   │
│  → 打包输出综合报告    │
└─────────────────────┘
```

## 输出内容

每位交易员返回结构化 JSON（rating / confidence / thesis / key_points / risks / price_target），首席策略师最终打包输出：

- **一致程度评级**（high / medium / low）
- **各交易员观点汇总**（含信心分数）
- **共识与分歧标注**
- **风险按严重程度排序**（最多 5 条）
- **500 字以内综合研判总结**

## 支持的股票市场

- 🇨🇳 A 股（上海/深圳）
- 🇭🇰 港股
- 🇺🇸 美股
- 🇸🇬 新加坡

## 使用示例

```
# 分析贵州茅台
Workflow({scriptPath: "workflows/multi-trader-analysis.js", args: {ticker: "600519.SH"}})

# 分析腾讯
Workflow({scriptPath: "workflows/multi-trader-analysis.js", args: {ticker: "0700.HK"}})

# 分析英伟达
Workflow({scriptPath: "workflows/multi-trader-analysis.js", args: {ticker: "NVDA.US"}})
```

## 免责声明

本 Skill 由 AI 多智能体系统驱动，所有分析结果仅供参考，**不构成任何投资建议**。投资有风险，入市需谨慎。
