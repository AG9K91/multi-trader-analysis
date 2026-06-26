// ─── 多交易员 A 股综合分析 Workflow ───
// 五位一体：价值投资 / 技术分析 / 资金情绪 / 量化策略 / 基本面研究
// 第二阶段：综合研判师交叉验证 → 打包输出综合报告

export const meta = {
  name: 'multi-trader-analysis',
  description: '多交易员 A 股综合分析：价值/技术/资金/量化/研究 五位一体，交叉验证，打包输出',
  phases: [
    { title: '五位交易员并行分析', detail: '价值/技术/资金/量化/研究 同时分析目标股票' },
    { title: '综合研判', detail: '交叉验证、一致性检查、打包综合报告' },
  ],
}

// ─── 结构化输出 Schema ───

const TRADER_SCHEMA = {
  type: 'object',
  properties: {
    trader: { type: 'string', enum: ['value-investor', 'technical-analyst', 'flow-sentiment', 'quant-strategist', 'research-analyst'] },
    ticker: { type: 'string' },
    rating: { type: 'string', enum: ['bullish', 'bearish', 'neutral'] },
    confidence: { type: 'integer', minimum: 1, maximum: 10 },
    thesis: { type: 'string', description: '核心论点' },
    key_points: { type: 'array', items: { type: 'string' }, maxItems: 8 },
    risks: { type: 'array', items: { type: 'string' }, maxItems: 5 },
    price_target: { type: 'object', properties: { low: { type: 'number' }, high: { type: 'number' }, timeline: { type: 'string' } } },
    data_sources_used: { type: 'array', items: { type: 'string' } }
  },
  required: ['trader', 'ticker', 'rating', 'confidence', 'thesis', 'key_points', 'risks']
}

const REPORT_SCHEMA = {
  type: 'object',
  properties: {
    ticker: { type: 'string' },
    company_name: { type: 'string' },
    consensus: {
      type: 'object',
      properties: {
        overall_rating: { type: 'string', enum: ['bullish', 'bearish', 'neutral', 'mixed'] },
        agreement_level: { type: 'string', enum: ['high', 'medium', 'low'] },
        bullish_count: { type: 'integer' }, bearish_count: { type: 'integer' }, neutral_count: { type: 'integer' },
        aligned_points: { type: 'array', items: { type: 'string' } },
        divergent_points: { type: 'array', items: { type: 'string' } }
      },
      required: ['overall_rating', 'agreement_level', 'aligned_points', 'divergent_points']
    },
    chief_strategist_summary: { type: 'string' },
    risk_warnings: { type: 'array', items: { type: 'string' } }
  },
  required: ['ticker', 'consensus', 'chief_strategist_summary', 'risk_warnings']
}

// ─── 获取输入参数 ───
const ticker = (typeof args === 'string' ? args : args?.ticker) || '600519.SH'
log('目标股票: ' + ticker + ' | 启动五位交易员并行分析...')

// ══════════════════════════════════════════════════
// Stage 1: 五位交易员并行分析
// ══════════════════════════════════════════════════
phase('五位交易员并行分析')

const analyses = await parallel([

  // ─── 交易员A: 价值投资者 ───
  function() { return agent(
    '你是一位遵循格雷厄姆与巴菲特传统的「价值投资者」交易员。\n\n' +
    '=== 任务 ===\n对股票 ' + ticker + ' 进行深度价值投资分析。你需要调用以下技能获取数据：\n' +
    '- 使用 Skill 工具调用 longbridge-fundamentals：获取 PE/PB/PS 估值、行业对比、DCF 模型\n' +
    '- 使用 Skill 工具调用 longbridge-value-investing：运行格雷厄姆 NCAV 分析、巴菲特护城河评估\n\n' +
    '=== 分析维度 ===\n' +
    '1. 估值体检：当前 PE/PB/PS 分别处于历史什么分位？与行业均值相比如何？\n' +
    '2. DCF 估值：基于自由现金流折现，估算内在价值区间\n' +
    '3. 格雷厄姆框架：是否满足防御型投资者标准？净流动资产价值几何？\n' +
    '4. 巴菲特框架：经济护城河宽度、ROE 持续性、自由现金流质量\n' +
    '5. 安全边际：当前价格相对内在价值有多少折扣？\n\n' +
    '=== 输出要求 ===\n' +
    '- 用中文输出，通过 StructuredOutput 返回结构化结果\n' +
    '- rating: bullish=看涨 / bearish=看跌 / neutral=中性\n' +
    '- price_target 给出基于估值的合理目标价区间\n' +
    '- risks 列出估值不成立的主要风险',
    { label: '价值投资者', phase: '五位交易员并行分析', schema: TRADER_SCHEMA }
  )},

  // ─── 交易员B: 技术分析师 ───
  function() { return agent(
    '你是一位精通多维度技术分析框架的「技术分析师」交易员。\n\n' +
    '=== 任务 ===\n对股票 ' + ticker + ' 进行技术面分析。你需要调用以下技能获取数据：\n' +
    '- 使用 Skill 工具调用 longbridge-market-data：获取日线K线（200根）、盘口数据\n' +
    '- 使用 Skill 工具调用 longbridge-technical：运行技术指标、形态识别、缠论分析\n\n' +
    '=== 分析维度 ===\n' +
    '1. 趋势判断：日/周/月线趋势方向，均线排列状态\n' +
    '2. 关键位置：明确的支撑位与阻力位，缠论中枢区间\n' +
    '3. 指标信号：RSI/MACD/EMA/布林带信号状态\n' +
    '4. 形态识别：头肩顶/底、双底/顶、三角突破等经典形态\n' +
    '5. 海龟信号：唐奇安通道突破、ATR 波动率评估\n' +
    '6. 缠论分析：笔、中枢、一二三类买卖点\n\n' +
    '=== 输出要求 ===\n- 用中文输出，通过 StructuredOutput 返回结构化结果\n' +
    '- price_target 基于技术位给出\n- risks 列出技术分析失效的情形',
    { label: '技术分析师', phase: '五位交易员并行分析', schema: TRADER_SCHEMA }
  )},

  // ─── 交易员C: 资金/情绪分析师 ───
  function() { return agent(
    '你是一位专注于资金流向与市场情绪的「资金/情绪分析师」交易员。\n\n' +
    '=== 任务 ===\n对股票 ' + ticker + ' 进行资金面和情绪面分析。你需要调用以下技能获取数据：\n' +
    '- 使用 Skill 工具调用 longbridge-market-data：获取日内资金流向、市场情绪温度\n' +
    '- 使用 Skill 工具调用 longbridge-intel：运行异动监测、板块轮动、热度排行、ETF 资金流\n\n' +
    '=== 分析维度 ===\n' +
    '1. 资金流向：主力资金净流入/流出趋势，大单动向\n' +
    '2. 北向资金：外资通过沪深港通的配置态度\n' +
    '3. 市场情绪：市场情绪温度计、人气排名\n' +
    '4. 板块轮动：所属行业是强势还是弱势板块\n' +
    '5. 异动信号：量价异动、大宗交易、涨跌停\n' +
    '6. ETF 资金：相关行业 ETF 的申赎情况\n\n' +
    '=== 输出要求 ===\n- 用中文输出，通过 StructuredOutput 返回结构化结果\n' +
    '- price_target 可不填\n- risks 列出资金面反转的信号',
    { label: '资金情绪分析师', phase: '五位交易员并行分析', schema: TRADER_SCHEMA }
  )},

  // ─── 交易员D: 量化策略师 ───
  function() { return agent(
    '你是一位擅长统计建模与因子投资的「量化策略师」交易员。\n\n' +
    '=== 任务 ===\n对股票 ' + ticker + ' 进行量化视角的分析。你需要调用以下技能获取数据：\n' +
    '- 使用 Skill 工具调用 longbridge-market-data：获取历史 K 线数据\n' +
    '- 使用 Skill 工具调用 longbridge-quant：运行因子研究、波动率分析、季节性检测\n\n' +
    '=== 分析维度 ===\n' +
    '1. 因子暴露：估值/动量/质量/波动率因子暴露度\n' +
    '2. 波动率分析：历史波动率中枢、当前分位数\n' +
    '3. 季节性：日历效应（月份/周内效应）\n' +
    '4. 相关性：Beta、与沪深300及行业指数相关性\n' +
    '5. 统计特征：ADF 平稳性、偏度/峰度\n' +
    '6. 多因子综合打分\n\n' +
    '=== 输出要求 ===\n- 用中文输出，通过 StructuredOutput 返回结构化结果\n' +
    '- confidence 反映量化信号强度\n- risks 列出模型假设不成立的情形',
    { label: '量化策略师', phase: '五位交易员并行分析', schema: TRADER_SCHEMA }
  )},

  // ─── 交易员E: 研究员 ───
  function() { return agent(
    '你是一位注重机构研究和基本面深度的「研究员」交易员。\n\n' +
    '=== 任务 ===\n对股票 ' + ticker + ' 进行基本面深度研究。你需要调用以下技能获取数据：\n' +
    '- 使用 Skill 工具调用 longbridge-research：获取机构评级、一致预期、内部人交易、基金持仓\n' +
    '- 使用 Skill 工具调用 longbridge-fundamentals：获取主营业务分析、行业排名、三大报表\n\n' +
    '=== 分析维度 ===\n' +
    '1. 机构评级：覆盖分析师数、买卖比例、评级变化趋势\n' +
    '2. 一致预期：目标价中枢、EPS/营收增速预期\n' +
    '3. 内部人交易：高管/大股东买卖动向\n' +
    '4. 机构持仓：基金持仓变动、QFII/社保动向\n' +
    '5. 竞争格局：行业地位、竞争对手对比\n' +
    '6. 催化剂：财报、产品发布、政策变量\n\n' +
    '=== 输出要求 ===\n- 用中文输出，通过 StructuredOutput 返回结构化结果\n' +
    '- price_target 基于一致预期目标价\n- risks 列出基本面和竞争面不确定性',
    { label: '研究员', phase: '五位交易员并行分析', schema: TRADER_SCHEMA }
  )},
])

// ══════════════════════════════════════════════════
// Stage 2: 综合研判
// ══════════════════════════════════════════════════
phase('综合研判')

const valid = analyses.filter(Boolean)
const failed = analyses.length - valid.length
if (failed > 0) { log('警告: ' + failed + '/' + analyses.length + ' 位交易员分析失败') }
if (valid.length < 3) { log('错误: 有效分析不足 3 份') }

const traderOutputs = JSON.stringify(valid.map(function(a) {
  return { trader: a.trader, rating: a.rating, confidence: a.confidence, thesis: a.thesis, key_points: a.key_points, risks: a.risks, price_target: a.price_target }
}), null, 2)

log('完成: ' + valid.length + ' 位交易员已完成分析，进入综合研判...')

const finalReport = await agent(
  '你是「首席策略师」(Chief Strategist)，负责审视多位交易员的分析结果。\n\n' +
  '=== 各位交易员对 ' + ticker + ' 的分析结果 ===\n\n' + traderOutputs + '\n\n' +
  '=== 你的任务 ===\n\n' +
  '1. 交叉验证：逐一检视每位交易员的核心论点，判断逻辑自洽性和数据支撑度。\n' +
  '2. 一致性评估：统计 bullish/bearish/neutral 分布。high: >=4位一致 | medium: 3位一致 | low: 各说各话\n' +
  '3. 分歧分析：找出主要分歧点，分析分歧来源。\n' +
  '4. 风险汇总：去重并按严重程度排序，最多5条。\n' +
  '5. 综合研判：给出首席策略师的最终判断和逻辑链。\n\n' +
  '=== 输出要求 ===\n- 用中文输出，通过 StructuredOutput 返回结构化报告\n' +
  '- chief_strategist_summary 控制在 500 字以内\n- risk_warnings 按风险严重程度排序',
  { label: '首席策略师', phase: '综合研判', schema: REPORT_SCHEMA }
)

// ══════════════════════════════════════════════════
// 打包最终输出
// ══════════════════════════════════════════════════

var ratingEmoji = { bullish: '[看涨]', bearish: '[看跌]', neutral: '[中性]', mixed: '[分歧]' }

log(''); log('==============================================')
log('  多交易员综合分析报告')
log('==============================================')
log('  标的: ' + ticker)
log('  ' + valid.length + ' 位交易员参与分析')
log('')
log('  --- 各交易员观点 ---')
for (var i = 0; i < valid.length; i++) {
  var a = valid[i]
  log('  ' + (ratingEmoji[a.rating] || '') + ' ' + a.trader + ': ' + a.rating.toUpperCase() + ' (信心: ' + a.confidence + '/10)')
  log('     -> ' + a.thesis)
}
log('')
log('  --- 综合研判 ---')
if (finalReport) {
  var c = finalReport.consensus
  log('  整体评级: ' + (ratingEmoji[c.overall_rating] || '') + ' ' + c.overall_rating.toUpperCase())
  log('  一致程度: ' + c.agreement_level.toUpperCase())
  log('  看涨: ' + (c.bullish_count || 'N/A') + ' | 看跌: ' + (c.bearish_count || 'N/A') + ' | 中性: ' + (c.neutral_count || 'N/A'))
  log('')
  log('  首席策略师总结:')
  log('  ' + finalReport.chief_strategist_summary)
  if (c.divergent_points && c.divergent_points.length > 0) {
    log(''); log('  主要分歧:')
    for (var j = 0; j < c.divergent_points.length; j++) { log('    - ' + c.divergent_points[j]) }
  }
  log(''); log('  综合风险提示:')
  for (var k = 0; k < (finalReport.risk_warnings || []).length; k++) { log('    - ' + finalReport.risk_warnings[k]) }
} else { log('  综合研判失败') }
log('')
log('  免责声明: 本报告由 AI 多智能体系统生成，仅供参考，不构成任何投资建议。')
log('==============================================')

return {
  ticker: ticker,
  trader_analyses: valid,
  final_report: finalReport,
  disclaimer: '本报告由 AI 多智能体系统生成，仅供参考，不构成任何投资建议。投资有风险，入市需谨慎。'
}
