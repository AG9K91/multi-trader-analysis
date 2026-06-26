// ─── 多交易员 A 股综合分析 v2.0 ───
// 缓存优化: 动态ticker移至prompt末尾, 静态前缀最大化缓存命中
export const meta = {
  name: 'multi-trader-analysis',
  description: '多交易员 A 股综合分析：价值/技术/资金/量化/研究 五位一体，交叉验证，打包输出',
  phases: [
    { title: '五位交易员并行分析', detail: '价值/技术/资金/量化/研究 同时分析' },
    { title: '综合研判', detail: '交叉验证、打包综合报告' },
  ],
}

const TRADER_SCHEMA = {
  type: 'object',
  properties: {
    trader: { type: 'string', enum: ['value-investor', 'technical-analyst', 'flow-sentiment', 'quant-strategist', 'research-analyst'] },
    ticker: { type: 'string' }, rating: { type: 'string', enum: ['bullish', 'bearish', 'neutral'] },
    confidence: { type: 'integer', minimum: 1, maximum: 10 }, thesis: { type: 'string' },
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
    ticker: { type: 'string' }, company_name: { type: 'string' },
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
    chief_strategist_summary: { type: 'string' }, risk_warnings: { type: 'array', items: { type: 'string' } }
  },
  required: ['ticker', 'consensus', 'chief_strategist_summary', 'risk_warnings']
}

// ─── 共享输出规则(所有交易员共用, 提升缓存命中) ───
const OUT = '用中文输出,通过StructuredOutput返回。rating: bullish=看涨/bearish=看跌/neutral=中性。risks列出风险。'

// ─── 静态Prompt模板(ticker在运行时拼接至末尾, 确保前缀可缓存) ───
const P = {
  value: '你是遵循格雷厄姆与巴菲特传统的「价值投资者」。\n分析:\n1.估值体检:PE/PB/PS历史分位,行业对比\n2.DCF估值:自由现金流折现,内在价值区间\n3.格雷厄姆:NCAV,防御型投资者标准\n4.巴菲特:护城河宽度,ROE持续性,FCF质量\n5.安全边际:现价vs内在价值折扣\n使用Skill: longbridge-fundamentals(PE/PB/DCF/行业对比)、longbridge-value-investing(NCAV/护城河)\n' + OUT + '\nprice_target基于估值给出合理区间。\n目标:',

  tech: '你是精通多维度技术分析的「技术分析师」。\n分析:\n1.趋势:日/周/月线方向,均线排列\n2.关键位:支撑阻力,缠论中枢\n3.指标:RSI/MACD/EMA/布林带\n4.形态:头肩顶底/双底顶/三角突破\n5.海龟:唐奇安通道,ATR\n6.缠论:笔/中枢/买卖点\n使用Skill: longbridge-market-data(K线200根)、longbridge-technical(指标/形态/缠论/海龟)\n' + OUT + '\nprice_target基于技术位。\n目标:',

  flow: '你是专注于资金流向与情绪的「资金/情绪分析师」。\n分析:\n1.资金流向:主力净流入/流出,大单动向\n2.北向资金:外资沪深港通配置态度\n3.市场情绪:情绪温度计,人气排名\n4.板块轮动:行业强弱\n5.异动:量价异动,大宗交易,涨跌停\n6.ETF资金:相关ETF申赎\n使用Skill: longbridge-market-data(资金流/情绪温度)、longbridge-intel(异动/板块轮动/排行/ETF流)\n' + OUT + '\nprice_target可不填。\n目标:',

  quant: '你是擅长统计建模与因子投资的「量化策略师」。\n分析:\n1.因子暴露:估值/动量/质量/波动率\n2.波动率:历史中枢,当前分位数\n3.季节性:日历效应(月份/周内)\n4.相关性:Beta,与沪深300相关\n5.统计:ADF平稳性,偏度/峰度\n6.多因子综合打分\n使用Skill: longbridge-market-data(K线)、longbridge-quant(因子/波动率/季节性)\n' + OUT + '\nconfidence反映信号强度。\n目标:',

  research: '你是注重机构研究和基本面深度的「研究员」。\n分析:\n1.机构评级:覆盖数,买卖比例,评级趋势\n2.一致预期:目标价中枢,EPS/营收增速\n3.内部人交易:高管/大股东买卖\n4.机构持仓:基金变动,QFII/社保动向\n5.竞争格局:行业地位,对手对比\n6.催化剂:财报,产品发布,政策变量\n使用Skill: longbridge-research(评级/预期/持仓)、longbridge-fundamentals(主营/排名/三表)\n' + OUT + '\nprice_target基于一致预期。\n目标:',

  chief: '你是「首席策略师」,审视多位交易员的分析结果,交叉验证、综合研判。\n任务:\n1.交叉验证:逐一检视核心论点,判断逻辑自洽性\n2.一致性:统计bullish/bearish/neutral。high:>=4一致|medium:3一致|low:各说各话\n3.分歧分析:找出分歧点,分析来源\n4.风险汇总:去重按严重度排序,最多5条\n5.综合研判:最终判断和逻辑链\n输出:中文,StructuredOutput。summary<500字。risk_warnings按严重度排序。\n\n'
}

// ─── 输入 ───
const ticker = (typeof args === 'string' ? args : args?.ticker) || '600519.SH'
log('目标: ' + ticker)

// ═══ Stage 1 ═══
phase('五位交易员并行分析')
const analyses = await parallel([
  function() { return agent(P.value   + ticker, { label: '价值投资者',   phase: '五位交易员并行分析', schema: TRADER_SCHEMA }) },
  function() { return agent(P.tech    + ticker, { label: '技术分析师',   phase: '五位交易员并行分析', schema: TRADER_SCHEMA }) },
  function() { return agent(P.flow    + ticker, { label: '资金情绪分析师', phase: '五位交易员并行分析', schema: TRADER_SCHEMA }) },
  function() { return agent(P.quant   + ticker, { label: '量化策略师',   phase: '五位交易员并行分析', schema: TRADER_SCHEMA }) },
  function() { return agent(P.research + ticker, { label: '研究员',     phase: '五位交易员并行分析', schema: TRADER_SCHEMA }) },
])

// ═══ Stage 2 ═══
phase('综合研判')
const valid = analyses.filter(Boolean)
const failed = analyses.length - valid.length
if (failed > 0) { log('警告: ' + failed + '/' + analyses.length + ' 失败') }
if (valid.length < 3) { log('错误: 有效分析不足3份') }

const traderOutputs = JSON.stringify(valid.map(function(a) {
  return { trader: a.trader, rating: a.rating, confidence: a.confidence, thesis: a.thesis, key_points: a.key_points, risks: a.risks, price_target: a.price_target }
}))

log('完成: ' + valid.length + ' 位完成, 进入综合研判...')

const finalReport = await agent(
  P.chief + '目标: ' + ticker + '\n\n分析结果:\n\n' + traderOutputs,
  { label: '首席策略师', phase: '综合研判', schema: REPORT_SCHEMA }
)

// ═══ 输出 ═══
var E = { bullish: '[看涨]', bearish: '[看跌]', neutral: '[中性]', mixed: '[分歧]' }
log(''); log('==============================================')
log('  多交易员综合分析: ' + ticker + ' | ' + valid.length + ' 位交易员')
for (var i = 0; i < valid.length; i++) {
  var a = valid[i]
  log('  ' + (E[a.rating] || '') + ' ' + a.trader + ': ' + a.rating.toUpperCase() + '(' + a.confidence + '/10) -> ' + a.thesis)
}
if (finalReport) {
  var c = finalReport.consensus
  log('\n  === ' + (E[c.overall_rating] || '') + ' ' + c.overall_rating.toUpperCase() + ' | ' + c.agreement_level.toUpperCase() + ' ===')
  log('  B:' + (c.bullish_count || 'N/A') + ' E:' + (c.bearish_count || 'N/A') + ' N:' + (c.neutral_count || 'N/A'))
  log('  ' + finalReport.chief_strategist_summary)
  if (c.divergent_points && c.divergent_points.length) { log('  分歧:'); for (var j = 0; j < c.divergent_points.length; j++) log('  - ' + c.divergent_points[j]) }
  log('  风险:'); for (var k = 0; k < (finalReport.risk_warnings || []).length; k++) log('  - ' + finalReport.risk_warnings[k])
}
log('\n  免责声明: AI生成,仅供参考,不构成投资建议。')
log('==============================================')

return { ticker: ticker, trader_analyses: valid, final_report: finalReport, disclaimer: 'AI生成,仅供参考,不构成投资建议。' }
