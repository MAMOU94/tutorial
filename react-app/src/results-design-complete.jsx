        {isBiostatsModeEnabled && result && result.mode === 'descriptive' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">
                
                {/* Univariate Analysis - Available for both Bivariate and Correlation Matrix modes */}
                {result.univariate_analysis && (
                    <Card title="Univariate Analysis & Distributions" icon={ChartBarIcon}>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {Object.entries(result.univariate_analysis).map(([varName, stats], idx) => (
                                <div key={idx} className="glass-card-elevated rounded-2xl overflow-hidden group" style={{
                                    background: 'linear-gradient(145deg, rgba(30, 30, 35, 0.6), rgba(15, 15, 20, 0.8))',
                                    backdropFilter: 'blur(16px)',
                                    border: '1px solid rgba(255, 255, 255, 0.03)',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                }}>
                                    <div className="px-6 py-4 flex justify-between items-center" style={{
                                        background: 'rgba(0, 0, 0, 0.3)',
                                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                                    }}>
                                        <h3 className="font-bold text-sm tracking-tight text-[#E9FEFF] truncate pr-2" title={varName}>{varName}</h3>
                                        <span className={`text-[9px] px-2.5 py-1 rounded uppercase tracking-widest font-bold ${
                                            stats.type === 'numeric'
                                                ? 'bg-[#00F5FF]/10 text-[#00F5FF] border border-[#00F5FF]/20'
                                                : 'bg-green-500/10 text-green-400 border border-green-500/20'
                                        }`}>
                                            {stats.type}
                                        </span>
                                    </div>

                                    <div className="p-6">
                                        {/* Stats Summary */}
                                        <div className="mb-5">
                                           {stats.type === 'numeric' ? (
                                               <>
                                                <div className="flex justify-between items-start mb-6">
                                                    <div>
                                                        <p className="text-[10px] font-bold text-[#E5E2E1]/40 tracking-widest uppercase font-['Inter']">MEAN</p>
                                                        <h3 className="text-3xl font-extrabold text-[#E9FEFF] tracking-tight mb-1">{stats.mean?.toFixed(2)}</h3>
                                                    </div>
                                                    <div className="w-8 h-8 rounded-lg bg-[#00F5FF]/10 flex items-center justify-center border border-[#00F5FF]/20">
                                                        <span className="text-[#00F5FF] text-lg font-bold">μ</span>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3 mb-3">
                                                    <div className="p-3 rounded-lg" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                                        <p className="text-[9px] font-bold text-[#E5E2E1]/40 tracking-widest uppercase mb-1">MEDIAN</p>
                                                        <p className="text-lg font-extrabold text-[#E9FEFF] tracking-tight">{stats.median?.toFixed(2)}</p>
                                                    </div>
                                                    <div className="p-3 rounded-lg" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                                        <p className="text-[9px] font-bold text-[#E5E2E1]/40 tracking-widest uppercase mb-1">SD</p>
                                                        <p className="text-lg font-extrabold text-[#E9FEFF] tracking-tight">{stats.sd?.toFixed(2)}</p>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center p-3 rounded-lg" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                                    <div>
                                                        <p className="text-[9px] font-bold text-[#E5E2E1]/40 tracking-widest uppercase">MIN</p>
                                                        <p className="text-base font-extrabold text-[#E9FEFF] tracking-tight">{stats.min?.toFixed(2)}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[9px] font-bold text-[#E5E2E1]/40 tracking-widest uppercase">MAX</p>
                                                        <p className="text-base font-extrabold text-[#E9FEFF] tracking-tight">{stats.max?.toFixed(2)}</p>
                                                    </div>
                                                </div>
                                               </>
                                           ) : (
                                               <div className="space-y-2">
                                                   {Object.entries(stats.counts || {}).slice(0, 3).map(([cat, count], i) => (
                                                       <div key={i} className="flex justify-between items-center p-2 rounded" style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
                                                           <span className="text-xs text-[#E5E2E1]/70 font-medium truncate max-w-[120px]">{cat}</span>
                                                           <span className="text-xs font-bold text-[#00F5FF]">{count} ({stats.percentages?.[cat]}%)</span>
                                                       </div>
                                                   ))}
                                                   {(Object.keys(stats.counts || {}).length > 3) && <div className="text-[10px] text-[#E5E2E1]/30 italic">...</div>}
                                               </div>
                                           )}
                                           <div className="mt-3 p-2 rounded" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                               <p className="text-[9px] font-bold text-[#E5E2E1]/40 tracking-widest uppercase">N (Sample Size)</p>
                                               <p className="text-sm font-extrabold text-[#E9FEFF]">{stats.n}</p>
                                           </div>
                                        </div>

                                        {/* Plot */}
                                        {stats.plot_image ? (
                                            <div className="rounded-xl overflow-hidden relative group/plot" style={{
                                                background: '#050507',
                                                border: '1px solid rgba(255, 255, 255, 0.05)'
                                            }}>
                                                <img src={`data:image/png;base64,${stats.plot_image}`} alt={`Distribution of ${varName}`} className="w-full h-40 object-contain opacity-80 group-hover/plot:opacity-100 transition-opacity" />
                                                <div className="absolute inset-0 bg-black/0 group-hover/plot:bg-[#00F5FF]/5 transition-all duration-300 flex items-center justify-center opacity-0 group-hover/plot:opacity-100">
                                                    <button
                                                       onClick={() => setSelectedImage({ url: `data:image/png;base64,${stats.plot_image}`, title: `Distribution of ${varName}`, plotKey: `distribution_${varName}` })}
                                                       className="bg-[#131313]/90 text-white p-3 rounded-full shadow-lg hover:scale-110 transition-transform border border-[#00F5FF]/20"
                                                       title="View Full Size"
                                                    >
                                                        <Maximize2 size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="h-40 rounded-xl flex items-center justify-center text-xs text-[#E5E2E1]/30" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                                No plot available
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => handleAskAI('Univariate Analysis Report', generateReport(result, 'univariate'))}
                                className="px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold transition-all active:scale-95 group"
                                style={{
                                    background: 'rgba(0, 245, 255, 0.05)',
                                    border: '1px solid rgba(0, 245, 255, 0.15)',
                                    color: '#00F5FF'
                                }}
                            >
                                <Bot size={14} className="group-hover:scale-110 transition-transform" /> Ask AI about Distributions
                            </button>
                        </div>
                    </Card>
                )}

                {result.exploratory_multi_inline && Array.isArray(result.exploratory_multi_inline.runs) && (
                    <Card title="Multi-Analyse Results (Principal View)" icon={Activity}>
                        <div className="space-y-6">
                            {(() => {
                                const relationKey = String(result.exploratory_multi_inline.relation_type || '');
                                const isUnivariateInline = relationKey.startsWith('univariate');
                                return (
                                    <div className="flex flex-wrap items-center gap-2 text-xs">
                                        <span className="px-2 py-1 rounded-full border border-indigo-200 dark:border-indigo-700 bg-indigo-50/70 dark:bg-indigo-900/25 text-indigo-700 dark:text-indigo-300 font-black uppercase tracking-wider">
                                            {exploratoryMultiRelationLabel(result.exploratory_multi_inline.relation_type)}
                                        </span>
                                        <span className="px-2 py-1 rounded-full border border-slate-200 dark:border-slate-700 bg-transparent text-slate-600 dark:text-slate-300 font-semibold">
                                            {isUnivariateInline ? 'Total charts' : 'Total pairs'}: {safeText(result.exploratory_multi_inline.pair_count)}
                                        </span>
                                        <span className="px-2 py-1 rounded-full border border-emerald-200 dark:border-emerald-700 bg-emerald-50/70 dark:bg-emerald-900/25 text-emerald-700 dark:text-emerald-300 font-semibold">
                                            Shown: {safeText(result.exploratory_multi_inline.success_count)}
                                        </span>
                                        {Number(result.exploratory_multi_inline.failed_count) > 0 && (
                                            <span className="px-2 py-1 rounded-full border border-amber-200 dark:border-amber-700 bg-amber-50/70 dark:bg-amber-900/25 text-amber-700 dark:text-amber-300 font-semibold">
                                                Failed: {safeText(result.exploratory_multi_inline.failed_count)}
                                            </span>
                                        )}
                                    </div>
                                );
                            })()}

                            {Array.isArray(result.exploratory_multi_inline.failed_pairs) && result.exploratory_multi_inline.failed_pairs.length > 0 && (
                                <div className="rounded-xl border border-amber-200 dark:border-amber-700/60 bg-amber-50/60 dark:bg-amber-900/15 p-3 space-y-1">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-300">Failed Runs</div>
                                    {result.exploratory_multi_inline.failed_pairs.slice(0, 8).map((entry, idx) => (
                                        <div key={`failed_pair_${idx}`} className="text-xs text-amber-800 dark:text-amber-200">
                                            {safeText(entry?.pairLabel)}: {safeText(entry?.error)}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {result.exploratory_multi_inline.runs.map((run, idx) => {
                                const runData = run?.data || {};
                                const chartPayload = runData?.exploratory_chart;
                                const chartSummary = chartPayload?.summary || null;
                                const chartTypeText = exploratoryChartLabel(run?.chart_type || chartPayload?.chart_type || '');
                                const hasY = Boolean(String(run?.y_var || chartPayload?.y_var || '').trim());
                                const pairLabel = safeText(
                                  run?.pair_label
                                  || (hasY
                                    ? `${safeText(run?.x_var)} × ${safeText(run?.y_var)}`
                                    : `${safeText(run?.x_var)}`)
                                );
                                const interpretationPanel = renderExploratoryInterpretationPanel(chartPayload);
                                return (
                                    <div key={run?.pair_id || `multi_inline_pair_${idx}`} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/45 p-4 space-y-4">
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div>
                                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                                    {hasY ? 'Pair' : 'Chart'} {idx + 1}
                                                </div>
                                                <div className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                                    {pairLabel}
                                                </div>
                                            </div>
                                            <span className="text-[11px] px-2 py-1 rounded-lg border border-sky-200 dark:border-sky-700 bg-sky-50/70 dark:bg-sky-900/25 text-sky-700 dark:text-sky-300 font-semibold">
                                                {chartTypeText}
                                            </span>
                                        </div>

                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Summary</div>
                                        {chartSummary ? (
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                    {renderExploratoryVariableSummary('X Variable', chartPayload?.x_var || run?.x_var, chartSummary?.x_summary)}
                                                    {chartPayload?.y_var && renderExploratoryVariableSummary('Y Variable', chartPayload?.y_var || run?.y_var, chartSummary?.y_summary)}
                                                </div>
                                                {renderExploratoryRelationshipSummary(chartSummary?.relationship)}
                                            </div>
                                        ) : (
                                            <div className="text-xs text-slate-500 dark:text-slate-400">No summary available.</div>
                                        )}

                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Plot</div>
                                        {runData?.image ? (
                                            <div className="relative group rounded-xl overflow-hidden border dark:border-gray-700 shadow-lg bg-white dark:bg-gray-900">
                                                <img
                                                    src={`data:image/png;base64,${runData.image}`}
                                                    alt={`Exploratory chart: ${chartPayload?.chart_type || run?.chart_type}`}
                                                    className="w-full h-auto object-contain"
                                                />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 dark:group-hover:bg-white/5 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                    <button
                                                        onClick={() => setSelectedImage({
                                                            url: `data:image/png;base64,${runData.image}`,
                                                            title: `Pair ${idx + 1}: ${pairLabel}`,
                                                            plotKey: `exploratory_multi_${run?.pair_id || idx}`,
                                                            chartType: chartPayload?.chart_type || run?.chart_type,
                                                            xVar: chartPayload?.x_var || run?.x_var,
                                                            yVar: chartPayload?.y_var || run?.y_var
                                                        })}
                                                        className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 p-3 rounded-full shadow-xl hover:scale-110 transition-transform transform border border-gray-200 dark:border-gray-700"
                                                    >
                                                        <Maximize2 size={24} />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="h-40 rounded-lg bg-gray-50 dark:bg-gray-900 flex items-center justify-center text-xs text-gray-400">
                                                No plot available
                                            </div>
                                        )}

                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Report</div>
                                        {interpretationPanel || (
                                            <div className="text-xs text-slate-500 dark:text-slate-400">
                                                No interpretation report was generated for this pair.
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                )}

                {result.exploratory_chart && (
                    <Card title="Exploratory Charts" icon={Activity}>
                        <div className="space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex flex-wrap items-center gap-3">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Chart Type</span>
                                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                        {exploratoryChartLabel(result.exploratory_chart.chart_type)}
                                    </span>
                                </div>
                                <button
                                    onClick={handleDownloadModelSummaryPdf}
                                    disabled={!modelSummaryReport}
                                    title="Download exploratory report as PDF"
                                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] font-black uppercase tracking-wider transition-colors ${
                                        modelSummaryReport
                                            ? 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                                            : 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/50 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                                    }`}
                                >
                                    <Download size={14} />
                                    Export PDF
                                </button>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                X: <span className="font-mono font-bold text-gray-700 dark:text-gray-300">{safeText(result.exploratory_chart.x_var)}</span>
                                {result.exploratory_chart.y_var ? (
                                    <> • Y: <span className="font-mono font-bold text-gray-700 dark:text-gray-300">{safeText(result.exploratory_chart.y_var)}</span></>
                                ) : null}
                            </div>
                            {result.exploratory_chart.summary && (
                              <div className="space-y-4">
                                <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                  Descriptive Information Panel
                                </div>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                  {renderExploratoryVariableSummary(
                                    'X Variable',
                                    result.exploratory_chart.x_var,
                                    result.exploratory_chart.summary?.x_summary
                                  )}
                                  {result.exploratory_chart.y_var && renderExploratoryVariableSummary(
                                    'Y Variable',
                                    result.exploratory_chart.y_var,
                                    result.exploratory_chart.summary?.y_summary
                                  )}
                                </div>
                                {renderExploratoryRelationshipSummary(result.exploratory_chart.summary?.relationship)}
                                {renderExploratoryInterpretationPanel(result.exploratory_chart)}
                              </div>
                            )}
                            {result.exploratory_chart.plot_error && (
                                <div className="text-xs text-red-600 dark:text-red-400">
                                    {safeText(result.exploratory_chart.plot_error)}
                                </div>
                            )}
                            {result.image ? (
                                <div className="relative group rounded-xl overflow-hidden border dark:border-gray-700 shadow-lg bg-white dark:bg-gray-900">
                                    <img
                                        src={`data:image/png;base64,${result.image}`}
                                        alt={`Exploratory chart: ${result.exploratory_chart.chart_type}`}
                                        className="w-full h-auto object-contain"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 dark:group-hover:bg-white/5 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                        <button
                                            onClick={() => setSelectedImage({
                                              url: `data:image/png;base64,${result.image}`,
                                              title: 'Exploratory Chart',
                                              plotKey: 'exploratory_chart_plot',
                                              chartType: result?.exploratory_chart?.chart_type,
                                              xVar: result?.exploratory_chart?.x_var,
                                              yVar: result?.exploratory_chart?.y_var
                                            })}
                                            className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 p-3 rounded-full shadow-xl hover:scale-110 transition-transform transform border border-gray-200 dark:border-gray-700"
                                        >
                                            <Maximize2 size={24} />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-40 rounded-lg bg-gray-50 dark:bg-gray-900 flex items-center justify-center text-xs text-gray-400">
                                    No plot available
                                </div>
                            )}
                        </div>
                    </Card>
                )}

                {result.exploratory_multi && (
                    <Card title="Multi-Analyse (Bivariate Pairs)" icon={Activity}>
                        <div className="space-y-4">
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span className="px-2 py-1 rounded-full border border-indigo-200 dark:border-indigo-700 bg-indigo-50/70 dark:bg-indigo-900/25 text-indigo-700 dark:text-indigo-300 font-black uppercase tracking-wider">
                                    {exploratoryMultiRelationLabel(result.exploratory_multi.relation_type)}
                                </span>
                                <span className="px-2 py-1 rounded-full border border-slate-200 dark:border-slate-700 bg-transparent text-slate-600 dark:text-slate-300 font-semibold">
                                    Pairs: {safeText(result.exploratory_multi.pair_count)}
                                </span>
                                {Number.isFinite(Number(result.exploratory_multi.significant_pairs)) && (
                                    <span className="px-2 py-1 rounded-full border border-emerald-200 dark:border-emerald-700 bg-emerald-50/70 dark:bg-emerald-900/25 text-emerald-700 dark:text-emerald-300 font-semibold">
                                        Significant: {safeText(result.exploratory_multi.significant_pairs)}
                                    </span>
                                )}
                            </div>
                            {result.exploratory_multi.message && (
                                <div className="text-xs text-slate-600 dark:text-slate-300">
                                    {safeText(result.exploratory_multi.message)}
                                </div>
                            )}
                            {Array.isArray(result.exploratory_multi.pairs) && result.exploratory_multi.pairs.length > 0 ? (
                                <div className="space-y-3">
                                    {result.exploratory_multi.pairs.map((pair, idx) => {
                                        const pairType = String(pair?.pair_type || '').toLowerCase();
                                        const chartType = pairType === 'num_num'
                                            ? 'scatter'
                                            : pairType === 'cat_cat'
                                                ? 'grouped_bar'
                                                : 'grouped_violin';
                                        const summaryTagText = 'Summary only';
                                        const summaryTagClass = 'text-slate-500 dark:text-slate-400';
                                        const defaultOpen = idx < 2;
                                        return (
                                            <details
                                                key={pair?.pair_id || `multi_pair_${idx}`}
                                                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/75 dark:bg-slate-900/45 p-3"
                                                open={defaultOpen}
                                            >
                                                <summary className="cursor-pointer list-none flex flex-wrap items-center justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                                            Pair {idx + 1}
                                                        </div>
                                                        <div className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">
                                                            {safeText(pair?.x_var)} × {safeText(pair?.y_var)}
                                                        </div>
                                                    </div>
                                                    <div className={`text-[11px] font-black ${summaryTagClass}`}>
                                                        {summaryTagText}
                                                    </div>
                                                </summary>
                                                <div className="mt-3 space-y-3">
                                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                                        {renderExploratoryVariableSummary('X Variable', pair?.x_var, pair?.summary?.x_summary)}
                                                        {renderExploratoryVariableSummary('Y Variable', pair?.y_var, pair?.summary?.y_summary)}
                                                    </div>
                                                    {renderExploratoryRelationshipSummary(pair?.summary?.relationship)}
                                                    {renderExploratoryInterpretationPanel({
                                                        chart_type: chartType,
                                                        summary: pair?.summary || {}
                                                    })}
                                                </div>
                                            </details>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                    No pair summaries were returned.
                                </div>
                            )}
                        </div>
                    </Card>
                )}

                {(result.bivariate || result.correlation_matrix) && (
                <div className="space-y-4">
                    {console.log('🔬 Bivariate type:', result.bivariate?.type)}
                    {console.log('🔬 Full bivariate object:', result.bivariate)}
                    
                    {/* Quantitative vs Quantitative - Correlation */}
                    {result.bivariate?.type === 'quantitative_quantitative' && (
                        <Card title="Correlation Analysis" icon={TableIcon}>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                                    <div className="text-xs font-black uppercase tracking-widest text-blue-400 mb-2">Pearson r</div>
                                    <div className="text-3xl font-black text-blue-700 dark:text-blue-300">
                                        {result.bivariate.correlation?.pearson?.toFixed(3) || 'N/A'}
                                    </div>
                                    <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">Linear relationship</div>
                                </div>
                                <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                                    <div className="text-xs font-black uppercase tracking-widest text-purple-400 mb-2">Spearman ρ</div>
                                    <div className="text-3xl font-black text-purple-700 dark:text-purple-300">
                                        {result.bivariate.correlation?.spearman?.toFixed(3) || 'N/A'}
                                    </div>
                                    <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">Monotonic relationship</div>
                                </div>
                                <div className="p-6 bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 rounded-xl border border-green-200 dark:border-green-800">
                                    <div className="text-xs font-black uppercase tracking-widest text-green-400 mb-2">Covariance</div>
                                    <div className="text-3xl font-black text-green-700 dark:text-green-300">
                                        {result.bivariate.correlation?.covariance?.toFixed(3) || 'N/A'}
                                    </div>
                                    <div className="text-xs text-green-600 dark:text-green-400 mt-1">Joint variability</div>
                                </div>
                            </div>
                            <div className="mt-4 flex justify-end gap-2">
                                    <button
                                        onClick={() => handleAskAI('Correlation Report', generateReport(result, 'correlation'))}
                                        className="text-[10px] px-3 py-1 rounded-full border border-blue-200 text-blue-700 dark:text-blue-300 dark:border-blue-700 bg-white/60 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors font-bold uppercase tracking-wider flex items-center gap-2"
                                    >
                                        <Bot size={12} /> Ask AI
                                    </button>
                                    <button
                                        onClick={() => openInterpretation('Correlation Report', generateReport(result, 'correlation'))}
                                        className="text-[10px] px-3 py-1 rounded-full border border-blue-200 text-blue-700 dark:text-blue-300 dark:border-blue-700 bg-white/60 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors font-bold uppercase tracking-wider"
                                    >
                                        View Detailed Report
                                    </button>
                            </div>
                            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800/30">
                                <div className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-2">Correlation Interpretation</div>
                                <div className="text-xs text-blue-700 dark:text-blue-300 space-y-2">
                                    <div><strong>Range:</strong> −1 to +1. Think of it like a slider: +1 is a perfect positive match, -1 is a perfect opposite match, and 0 means no pattern at all.</div>
                                    <div><strong>Pearson r:</strong> Measures straight-line relationships. Use this if your data looks like a line.</div>
                                    <div><strong>Spearman ρ:</strong> Measures rank relationships. Use this if your data is curved or has outliers.</div>
                                    <div><strong>Rule of thumb:</strong> 0.1 is tiny, 0.3 is okay, 0.5+ is strong.</div>
                                    <div><strong>Example:</strong> r = 0.62 means when one variable goes up, the other usually goes up too (moderately strong).</div>
                                </div>
                            </div>
                            {result.image && (
                                <div className="mt-6">
                                    <img src={`data:image/png;base64,${result.image}`} alt="Scatter Plot" className="w-full rounded-xl border dark:border-gray-700 shadow-lg" />
                                </div>
                            )}
                        </Card>
                    )}
                    
                    {/* Qualitative vs Qualitative - Contingency Table */}
                    {result.bivariate?.type === 'qualitative_qualitative' && (
                        <>
                            <Card title="Contingency Table" icon={TableIcon}>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50 dark:bg-black/20 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                            <tr>
                                                <th className="px-6 py-4"></th>
                                                {result.bivariate.contingency_table?.col_names?.map((col, idx) => (
                                                    <th key={idx} className="px-6 py-4">{col}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y dark:divide-gray-800">
                                            {result.bivariate.contingency_table?.table?.map((row, rowIdx) => (
                                                <tr key={rowIdx} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                                                    <td className="px-6 py-4 font-bold text-gray-700 dark:text-gray-300">
                                                        {result.bivariate.contingency_table.row_names[rowIdx]}
                                                    </td>
                                                    {row.map((cell, cellIdx) => (
                                                        <td key={cellIdx} className="px-6 py-4 font-mono text-xs text-gray-600 dark:text-gray-400">
                                                            {cell}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {Number.isFinite(Number(result.bivariate.contingency_table?.cramers_v)) && (
                                    <div className="mt-6 p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                                        <div className="text-xs font-black uppercase tracking-widest text-purple-400 mb-2">Cramér's V</div>
                                        <div className="text-4xl font-black text-purple-700 dark:text-purple-300">
                                            {Number(result.bivariate.contingency_table?.cramers_v).toFixed(3)}
                                        </div>
                                        <div className="text-xs text-purple-600 dark:text-purple-400 mt-2">
                                            Measure of association strength (0 = no association, 1 = perfect association)
                                        </div>
                                    </div>
                                )}
                                <div className="mt-4 flex justify-end gap-2">
                                    <button
                                        onClick={() => handleAskAI('Contingency Table Report', generateReport(result, 'contingency_table'))}
                                        className="text-[10px] px-3 py-1 rounded-full border border-purple-200 text-purple-700 dark:text-purple-300 dark:border-purple-700 bg-white/60 dark:bg-purple-900/10 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors font-bold uppercase tracking-wider flex items-center gap-2"
                                    >
                                        <Bot size={12} /> Ask AI
                                    </button>
                                    <button
                                        onClick={() => openInterpretation('Contingency Table Report', generateReport(result, 'contingency_table'))}
                                        className="text-[10px] px-3 py-1 rounded-full border border-purple-200 text-purple-700 dark:text-purple-300 dark:border-purple-700 bg-white/60 dark:bg-purple-900/10 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors font-bold uppercase tracking-wider"
                                    >
                                        View Detailed Report
                                    </button>
                                </div>
                                <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/10 rounded-xl border border-purple-100 dark:border-purple-800/30">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-purple-500 mb-2">Cramér's V Guide</div>
                                    <div className="text-xs text-purple-700 dark:text-purple-300 space-y-2">
                                        <div><strong>Interpretation:</strong> 0.1 is weak, 0.3 is medium, 0.5 is strong.</div>
                                        <div><strong>Meaning:</strong> It tells you how strongly two categories are linked. It doesn't say "how" (positive/negative), just "how much".</div>
                                        <div><strong>Note:</strong> This descriptive view focuses on counts and patterns. For significance testing, run Inferential mode.</div>
                                        <div><strong>Example:</strong> V = 0.35 means there is a medium-strength link between the categories.</div>
                                    </div>
                                </div>
                                {result.image && (
                                    <div className="mt-6">
                                        <img src={`data:image/png;base64,${result.image}`} alt="Mosaic Plot" className="w-full rounded-xl border dark:border-gray-700 shadow-lg" />
                                    </div>
                                )}
                            </Card>
                        </>
                    )}
                    
                    {/* Mixed - Summary Statistics by Group */}
                    {result.bivariate?.type === 'mixed' && result.summary_stats && (
                        <Card title="Summary Statistics by Group" icon={TableIcon}>
                            <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                <div className="rounded-lg border border-blue-100 dark:border-blue-900/40 bg-blue-50/70 dark:bg-blue-900/10 px-3 py-2">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-blue-500">Groups</div>
                                    <div className="text-sm font-extrabold text-blue-700 dark:text-blue-200">
                                        {Number(result.bivariate?.n_groups) || Object.keys(result.summary_stats || {}).length}
                                    </div>
                                </div>
                                <div className="rounded-lg border border-blue-100 dark:border-blue-900/40 bg-blue-50/70 dark:bg-blue-900/10 px-3 py-2">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-blue-500">Valid N</div>
                                    <div className="text-sm font-extrabold text-blue-700 dark:text-blue-200">
                                        {Number(result.bivariate?.valid_n) || (result.summary_stats_overall?.n ?? 'N/A')}
                                    </div>
                                </div>
                                <div className="rounded-lg border border-blue-100 dark:border-blue-900/40 bg-blue-50/70 dark:bg-blue-900/10 px-3 py-2">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-blue-500">Missing</div>
                                    <div className="text-sm font-extrabold text-blue-700 dark:text-blue-200">
                                        {Number.isFinite(Number(result.bivariate?.missing_n)) ? Number(result.bivariate.missing_n) : (Number.isFinite(Number(result.summary_stats_overall?.missing_n)) ? Number(result.summary_stats_overall.missing_n) : 'N/A')}
                                    </div>
                                </div>
                                <div className="rounded-lg border border-blue-100 dark:border-blue-900/40 bg-blue-50/70 dark:bg-blue-900/10 px-3 py-2">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-blue-500">Overall Mean</div>
                                    <div className="text-sm font-extrabold text-blue-700 dark:text-blue-200">
                                        {Number.isFinite(Number(result.summary_stats_overall?.mean)) ? Number(result.summary_stats_overall.mean).toFixed(3) : 'N/A'}
                                    </div>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 dark:bg-black/20 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                        <tr>
                                            <th className="px-6 py-4">Group</th>
                                            <th className="px-6 py-4">N</th>
                                            <th className="px-6 py-4">%</th>
                                            <th className="px-6 py-4">Mean</th>
                                            <th className="px-6 py-4">Median</th>
                                            <th className="px-6 py-4">SD</th>
                                            <th className="px-6 py-4">Variance</th>
                                            <th className="px-6 py-4">Q1</th>
                                            <th className="px-6 py-4">Q3</th>
                                            <th className="px-6 py-4">IQR</th>
                                            <th className="px-6 py-4">Min</th>
                                            <th className="px-6 py-4">Max</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y dark:divide-gray-800">
                                        {Object.entries(result.summary_stats).map(([groupName, stats], idx) => (
                                            <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                                                <td className="px-6 py-4 font-bold text-gray-700 dark:text-gray-300">
                                                    {groupName}
                                                </td>
                                                <td className="px-6 py-4 font-mono text-xs text-gray-600 dark:text-gray-400">
                                                    {stats.n}
                                                </td>
                                                <td className="px-6 py-4 font-mono text-xs text-gray-600 dark:text-gray-400">
                                                    {Number.isFinite(Number(stats.percent)) ? `${Number(stats.percent).toFixed(1)}%` : 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 font-mono text-xs text-gray-600 dark:text-gray-400">
                                                    {Number.isFinite(Number(stats.mean)) ? Number(stats.mean).toFixed(3) : 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 font-mono text-xs text-gray-600 dark:text-gray-400">
                                                    {Number.isFinite(Number(stats.median)) ? Number(stats.median).toFixed(3) : 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 font-mono text-xs text-gray-600 dark:text-gray-400">
                                                    {Number.isFinite(Number(stats.sd)) ? Number(stats.sd).toFixed(3) : 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 font-mono text-xs text-gray-600 dark:text-gray-400">
                                                    {Number.isFinite(Number(stats.variance)) ? Number(stats.variance).toFixed(3) : 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 font-mono text-xs text-gray-600 dark:text-gray-400">
                                                    {Number.isFinite(Number(stats.q1)) ? Number(stats.q1).toFixed(3) : 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 font-mono text-xs text-gray-600 dark:text-gray-400">
                                                    {Number.isFinite(Number(stats.q3)) ? Number(stats.q3).toFixed(3) : 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 font-mono text-xs text-gray-600 dark:text-gray-400">
                                                    {Number.isFinite(Number(stats.iqr)) ? Number(stats.iqr).toFixed(3) : 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 font-mono text-xs text-gray-600 dark:text-gray-400">
                                                    {Number.isFinite(Number(stats.min)) ? Number(stats.min).toFixed(3) : 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 font-mono text-xs text-gray-600 dark:text-gray-400">
                                                    {Number.isFinite(Number(stats.max)) ? Number(stats.max).toFixed(3) : 'N/A'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800/30">
                                <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">
                                    <strong>📊 Mixed Analysis:</strong> Categorical variable: <code className="bg-blue-100 dark:bg-blue-900/30 px-1 rounded">{result.bivariate.categorical_var}</code>, Quantitative variable: <code className="bg-blue-100 dark:bg-blue-900/30 px-1 rounded">{result.bivariate.quantitative_var}</code>
                                </p>
                            </div>
                            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800/30">
                                <div className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-2">Interpretation Guide</div>
                                <div className="text-xs text-blue-700 dark:text-blue-300 space-y-2">
                                    <div><strong>Compare groups:</strong> Look at the Means and Medians. Are they different? That hints at a group effect.</div>
                                    <div><strong>Formal testing:</strong> We use mathematical tests (t-test, ANOVA) to tell us if these differences are real or just luck.</div>
                                    <div><strong>Visual check:</strong> Look at the Boxplots. If the boxes don't overlap much, the groups are likely different.</div>
                                    <div><strong>Example:</strong> Median A = 12 vs Median B = 8 suggests Group A is generally higher than Group B.</div>
                                </div>
                            </div>
                            <div className="mt-4 flex justify-end gap-2">
                                <button
                                    onClick={() => handleAskAI('Group Summary Report', generateReport(result, 'mixed'))}
                                    className="text-[10px] px-3 py-1 rounded-full border border-blue-200 text-blue-700 dark:text-blue-300 dark:border-blue-700 bg-white/60 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors font-bold uppercase tracking-wider flex items-center gap-2"
                                >
                                    <Bot size={12} /> Ask AI
                                </button>
                                <button
                                    onClick={() => openInterpretation('Group Summary Report', generateReport(result, 'mixed'))}
                                    className="text-[10px] px-3 py-1 rounded-full border border-blue-200 text-blue-700 dark:text-blue-300 dark:border-blue-700 bg-white/60 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors font-bold uppercase tracking-wider"
                                >
                                    View Detailed Report
                                </button>
                            </div>
                            {result.image && (
                                <div className="mt-6">
                                    <img src={`data:image/png;base64,${result.image}`} alt="Boxplot by Group" className="w-full rounded-xl border dark:border-gray-700 shadow-lg" />
                                </div>
                            )}
                        </Card>
                    )}
                    
                    {/* Correlation Matrix Results */}
                    {result?.correlation_matrix && (
                        <Card title={<span className="text-lg font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 drop-shadow-sm">Correlation Matrix Analysis</span>} icon={TableIcon}>
                            <div className="space-y-6">
                                <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                                    <div className="text-xs font-black uppercase tracking-widest text-emerald-500 dark:text-emerald-400 mb-2">Variables Analyzed</div>
                                    <div className="flex flex-wrap gap-2">
                                        {result.correlation_matrix.variables.map((varName, idx) => (
                                            <span key={idx} className="px-3 py-1 bg-white dark:bg-gray-800 rounded-lg text-sm font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700">
                                                {varName}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">
                                        {result.correlation_matrix.n_variables} numeric variables • {
                                          correlationModesInline.length > 0
                                            ? `${correlationModesInline
                                                .map((mode) => (mode === 'pearson' ? 'Pearson' : 'Spearman'))
                                                .join(' & ')} matrix${correlationModesInline.length > 1 ? 'es' : ''}`
                                            : 'No correlation matrix returned'
                                        }
                                    </div>
                                    {result.correlation_matrix?.selected_method && (
                                      <div className="text-xs text-teal-700 dark:text-teal-300 mt-1 font-semibold">
                                        Selected by Shapiro rule: {result.correlation_matrix.selected_method === 'pearson' ? 'Pearson' : 'Spearman'}
                                        {result.correlation_matrix.use_both_override ? ' (bypass enabled: both returned)' : ''}
                                      </div>
                                    )}
                                </div>
                                {result.correlation_matrix?.shapiro && Object.keys(result.correlation_matrix.shapiro).length > 0 && (
                                  <div className="p-3 rounded-xl border border-teal-200 dark:border-teal-800/50 bg-teal-50/50 dark:bg-teal-900/15">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-teal-500 mb-2">
                                      Shapiro Normality Check
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      {Object.entries(result.correlation_matrix.shapiro).map(([name, stats]) => (
                                        <div key={name} className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 bg-transparent border border-teal-100 dark:border-teal-800/35">
                                          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate" title={name}>{name}</span>
                                          <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400">
                                              p = {stats?.formatted_p || 'N/A'}
                                            </span>
                                            <span className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider ${
                                              stats?.is_normal
                                                ? 'bg-emerald-100/80 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                                : 'bg-rose-100/80 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                                            }`}>
                                              {stats?.is_normal ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                                              {stats?.is_normal ? 'Normal' : 'Not Normal'}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                <div className="flex gap-2">
                                    {correlationModesInline.map(type => (
                                        <button
                                          key={type}
                                          onClick={() => setCorrViewInline(type)}
                                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                                            corrViewInline === type
                                              ? 'bg-emerald-600 text-white border-emerald-600'
                                              : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                                          }`}
                                        >
                                          {type === 'pearson' ? 'Pearson' : 'Spearman'}
                                        </button>
                                    ))}
                                    <label className="flex items-center gap-2 text-[11px] font-bold text-gray-600 dark:text-gray-300 ml-2">
                                        <input
                                          type="checkbox"
                                          checked={showScatterInline}
                                          onChange={(e) => setShowScatterInline(e.target.checked)}
                                          className="rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                        />
                                        Show Linearity Scatter Plot
                                    </label>
                                </div>

                                {/* Scatter Plot Variable Selection */}
                                {showScatterInline && result.correlation_matrix?.variables && result.correlation_matrix.variables.length >= 2 && (
                                  <div className="mt-3 flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-zinc-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                    <span className="text-xs font-bold text-gray-600 dark:text-gray-400">Select variables:</span>
                                    <ModernSelect
                                      value={scatterVarX || result.correlation_matrix.variables[0]}
                                      onChange={setScatterVarX}
                                      options={toDropdownOptions(result.correlation_matrix.variables)}
                                      compact
                                      className="min-w-[170px]"
                                      menuClassName="max-h-48"
                                    />
                                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">vs</span>
                                    <ModernSelect
                                      value={scatterVarY || result.correlation_matrix.variables[1]}
                                      onChange={setScatterVarY}
                                      options={toDropdownOptions(result.correlation_matrix.variables)}
                                      compact
                                      className="min-w-[170px]"
                                      menuClassName="max-h-48"
                                    />
                                    <button
                                      onClick={() => runAnalysis({ scatterOnly: true })}
                                      disabled={loading}
                                      className="ml-2 px-4 py-1.5 bg-gradient-to-r from-primary to-cyan-600 text-white text-xs font-bold rounded-lg shadow-md hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                      </svg>
                                      Update Scatter
                                    </button>
                                  </div>
                                )}

                                {/* Pearson Correlation Matrix & Heatmap */}
                                {corrViewInline === 'pearson' && Array.isArray(result.correlation_matrix.pearson) && (
                                  <>
                                    <div>
                                        <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-3">Pearson Correlation Matrix</h3>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-gray-50 dark:bg-black/20 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                    <tr>
                                                        <th className="px-4 py-3"></th>
                                                        {result.correlation_matrix.variables.map((varName, idx) => (
                                                            <th key={idx} className="px-4 py-3 text-[11px] font-black text-gray-600 dark:text-gray-200">{varName}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y dark:divide-gray-800">
                                                    {result.correlation_matrix.pearson.map((row, rowIdx) => (
                                                        <tr key={rowIdx} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                                                            <td className="px-4 py-3 text-[11px] font-black text-gray-700 dark:text-gray-200">
                                                                {result.correlation_matrix.variables[rowIdx]}
                                                            </td>
                                                            {row.map((cell, cellIdx) => {
                                                                return (
                                                                    <td key={cellIdx} className="px-3 py-2 text-center">
                                                                        <span className={`corr-value-chip ${getCorrelationChipClass(cell, 'pearson')}`}>
                                                                          {formatCorrelationCell(cell)}
                                                                        </span>
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                    
                                    {result.heatmap_image && (
                                        <div className="mt-6 relative group">
                                            <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-3">Pearson Correlation Heatmap</h3>
                                            <div className="relative rounded-xl overflow-hidden border dark:border-gray-700 shadow-lg inline-block bg-white dark:bg-gray-900">
                                                <img src={`data:image/png;base64,${result.heatmap_image}`} alt="Correlation Heatmap" className="w-full max-w-2xl" />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 dark:group-hover:bg-white/5 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                    <button 
                                                        onClick={() => setSelectedImage({ url: `data:image/png;base64,${result.heatmap_image}`, title: "Pearson Correlation Heatmap", plotKey: 'heatmap_plot' })}
                                                        className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 p-3 rounded-full shadow-xl hover:scale-110 transition-transform transform border border-gray-200 dark:border-gray-700"
                                                        title="View Full Size"
                                                    >
                                                        <Maximize2 size={24} />
                                                    </button>
                                                </div>
                                            </div>
                                            {correlationPearsonHeatmapFeatures && (
                                                <div className="mt-3 p-3 text-xs rounded-lg border border-emerald-100 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200">
                                                    <div><span className="font-black">Metric:</span> {correlationPearsonHeatmapFeatures.metric || 'Pearson r'}</div>
                                                    <div>
                                                        <span className="font-black">Grid:</span>{' '}
                                                        {Number.isFinite(Number(correlationPearsonHeatmapFeatures?.dimensions?.rows)) ? Number(correlationPearsonHeatmapFeatures.dimensions.rows) : 'N/A'}
                                                        {' '}x{' '}
                                                        {Number.isFinite(Number(correlationPearsonHeatmapFeatures?.dimensions?.columns)) ? Number(correlationPearsonHeatmapFeatures.dimensions.columns) : 'N/A'}
                                                    </div>
                                                    <div>
                                                        <span className="font-black">Range:</span>{' '}
                                                        {Number.isFinite(Number(correlationPearsonHeatmapFeatures?.summary?.min)) ? Number(correlationPearsonHeatmapFeatures.summary.min).toFixed(4) : 'N/A'}
                                                        {' '}to{' '}
                                                        {Number.isFinite(Number(correlationPearsonHeatmapFeatures?.summary?.max)) ? Number(correlationPearsonHeatmapFeatures.summary.max).toFixed(4) : 'N/A'}
                                                    </div>
                                                    {Array.isArray(correlationPearsonHeatmapFeatures?.top_cells) && correlationPearsonHeatmapFeatures.top_cells.length > 0 && (
                                                        <div className="mt-1">
                                                            <span className="font-black">Strongest links:</span>{' '}
                                                            {correlationPearsonHeatmapFeatures.top_cells.slice(0, 3).map((cell, idx) => (
                                                                <span key={`corr_pearson_link_${idx}`} className="font-mono">
                                                                    {idx > 0 ? ' | ' : ''}
                                                                    {String(cell?.row || 'N/A')} x {String(cell?.column || 'N/A')} = {Number.isFinite(Number(cell?.value)) ? Number(cell.value).toFixed(3) : 'N/A'}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                  </>
                                )}

                                {/* Spearman Correlation Matrix & Heatmap */}
                                    {corrViewInline === 'spearman' && Array.isArray(result.correlation_matrix.spearman) && (
                                  <>
                                    <div>
                                        <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-3">Spearman Correlation Matrix</h3>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-gray-50 dark:bg-black/20 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                    <tr>
                                                        <th className="px-4 py-3"></th>
                                                        {result.correlation_matrix.variables.map((varName, idx) => (
                                                            <th key={idx} className="px-4 py-3 text-[11px] font-black text-gray-600 dark:text-gray-200">{varName}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y dark:divide-gray-800">
                                                    {result.correlation_matrix.spearman.map((row, rowIdx) => (
                                                        <tr key={rowIdx} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                                                            <td className="px-4 py-3 text-[11px] font-black text-gray-700 dark:text-gray-200">
                                                                {result.correlation_matrix.variables[rowIdx]}
                                                            </td>
                                                            {row.map((cell, cellIdx) => {
                                                                return (
                                                                    <td key={cellIdx} className="px-3 py-2 text-center">
                                                                        <span className={`corr-value-chip ${getCorrelationChipClass(cell, 'spearman')}`}>
                                                                          {formatCorrelationCell(cell)}
                                                                        </span>
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {result.spearman_heatmap_image && (
                                        <div className="mt-6 relative group">
                                            <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-3">Spearman Correlation Heatmap</h3>
                                            <div className="relative rounded-xl overflow-hidden border dark:border-gray-700 shadow-lg inline-block bg-white dark:bg-gray-900">
                                                <img src={`data:image/png;base64,${result.spearman_heatmap_image}`} alt="Spearman Correlation Heatmap" className="w-full max-w-2xl" />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 dark:group-hover:bg-white/5 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                    <button 
                                                        onClick={() => setSelectedImage({ url: `data:image/png;base64,${result.spearman_heatmap_image}`, title: "Spearman Correlation Heatmap", plotKey: 'spearman_heatmap_plot' })}
                                                        className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 p-3 rounded-full shadow-xl hover:scale-110 transition-transform transform border border-gray-200 dark:border-gray-700"
                                                        title="View Full Size"
                                                    >
                                                        <Maximize2 size={24} />
                                                    </button>
                                                </div>
                                            </div>
                                            {correlationSpearmanHeatmapFeatures && (
                                                <div className="mt-3 p-3 text-xs rounded-lg border border-emerald-100 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200">
                                                    <div><span className="font-black">Metric:</span> {correlationSpearmanHeatmapFeatures.metric || 'Spearman rho'}</div>
                                                    <div>
                                                        <span className="font-black">Grid:</span>{' '}
                                                        {Number.isFinite(Number(correlationSpearmanHeatmapFeatures?.dimensions?.rows)) ? Number(correlationSpearmanHeatmapFeatures.dimensions.rows) : 'N/A'}
                                                        {' '}x{' '}
                                                        {Number.isFinite(Number(correlationSpearmanHeatmapFeatures?.dimensions?.columns)) ? Number(correlationSpearmanHeatmapFeatures.dimensions.columns) : 'N/A'}
                                                    </div>
                                                    <div>
                                                        <span className="font-black">Range:</span>{' '}
                                                        {Number.isFinite(Number(correlationSpearmanHeatmapFeatures?.summary?.min)) ? Number(correlationSpearmanHeatmapFeatures.summary.min).toFixed(4) : 'N/A'}
                                                        {' '}to{' '}
                                                        {Number.isFinite(Number(correlationSpearmanHeatmapFeatures?.summary?.max)) ? Number(correlationSpearmanHeatmapFeatures.summary.max).toFixed(4) : 'N/A'}
                                                    </div>
                                                    {Array.isArray(correlationSpearmanHeatmapFeatures?.top_cells) && correlationSpearmanHeatmapFeatures.top_cells.length > 0 && (
                                                        <div className="mt-1">
                                                            <span className="font-black">Strongest links:</span>{' '}
                                                            {correlationSpearmanHeatmapFeatures.top_cells.slice(0, 3).map((cell, idx) => (
                                                                <span key={`corr_spearman_link_${idx}`} className="font-mono">
                                                                    {idx > 0 ? ' | ' : ''}
                                                                    {String(cell?.row || 'N/A')} x {String(cell?.column || 'N/A')} = {Number.isFinite(Number(cell?.value)) ? Number(cell.value).toFixed(3) : 'N/A'}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        )}
                                  </>
                                )}

                                {/* Linearity check */}
                                {showScatterInline && (
                                  <div className="mt-6 space-y-2">
                                    <div className="flex gap-2 items-center">
                                        <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Linearity Check (Scatterplot Matrix)</h3>
                                        <div className="flex gap-2">
                                            {correlationModesInline.map(type => (
                                                <button
                                                  key={type}
                                                  onClick={() => setLinearityViewInline(type)}
                                                  className={`px-3 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                                                    linearityViewInline === type
                                                      ? 'bg-emerald-600 text-white border-emerald-600'
                                                      : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                                                  }`}
                                                >
                                                  {type === 'pearson' ? 'Pearson (raw)' : 'Spearman (ranks)'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="relative rounded-xl overflow-hidden border dark:border-gray-700 shadow-lg inline-block bg-white dark:bg-gray-900">
                                        { (linearityViewInline === 'pearson' ? result.linearity_plot_image : result.spearman_linearity_plot_image) ? (
                                            <img 
                                                src={`data:image/png;base64,${linearityViewInline === 'pearson' ? result.linearity_plot_image : result.spearman_linearity_plot_image}`} 
                                                alt="Linearity Scatterplot Matrix" 
                                                className="w-full max-w-3xl" 
                                            />
                                        ) : (
                                            <div className="w-full max-w-3xl h-64 flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                                                No scatterplot matrix returned.
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 dark:group-hover:bg-white/5 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                            <button 
                                                onClick={() => {
                                                    const isPearsonLinearity = linearityViewInline === 'pearson';
                                                    const img = isPearsonLinearity ? result.linearity_plot_image : result.spearman_linearity_plot_image;
                                                    if (!img) return;
                                                    setSelectedImage({
                                                      url: `data:image/png;base64,${img}`,
                                                      title: isPearsonLinearity
                                                        ? 'Linearity Scatterplot Matrix (Pearson)'
                                                        : 'Linearity Scatterplot Matrix (Spearman)',
                                                      plotKey: isPearsonLinearity ? 'linearity_plot' : 'spearman_linearity_plot'
                                                    });
                                                }}
                                                className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 p-3 rounded-full shadow-xl hover:scale-110 transition-transform transform border border-gray-200 dark:border-gray-700"
                                                title="View Full Size"
                                            >
                                                <Maximize2 size={24} />
                                            </button>
                                        </div>
                                    </div>
                                  </div>
                                )}
                                
                                <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-800/30">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-2">Correlation Matrix Guide</div>
                                    <div className="text-xs text-emerald-700 dark:text-emerald-300 space-y-2">
                                        <div><strong>Range:</strong> −1 to +1. + means they move together, - means they move opposite.</div>
                                        <div><strong>Rule of thumb:</strong> ≥ 0.7 is a strong link, 0.4–0.7 is moderate, &lt; 0.4 is weak.</div>
                                        <div><strong>Pearson vs Spearman:</strong> Pearson checks for straight lines, Spearman checks for general trends (ranks).</div>
                                        <div><strong>CI band:</strong> If enabled in Plot Editor, the trend-line confidence interval follows your alpha setting (CI = 1 − α).</div>
                                        <div><strong>Use case:</strong> Check if two predictors are basically saying the same thing (multicollinearity).</div>
                                        <div><strong>Example:</strong> |r| = 0.82 between X and Y means they are very strongly linked (almost copies).</div>
                                    </div>
                                </div>
                                <div className="mt-4 flex justify-end gap-2">
                                    <button
                                        onClick={() => handleAskAI('Correlation Matrix Report', generateReport(result, 'correlation_matrix'))}
                                        className="text-[10px] px-3 py-1 rounded-full border border-emerald-200 text-emerald-700 dark:text-emerald-300 dark:border-emerald-700 bg-white/60 dark:bg-emerald-900/10 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors font-bold uppercase tracking-wider flex items-center gap-2"
                                    >
                                        <Bot size={12} /> Ask AI
                                    </button>
                                    <button
                                        onClick={() => openInterpretation('Correlation Matrix Report', generateReport(result, 'correlation_matrix'))}
                                        className="text-[10px] px-3 py-1 rounded-full border border-emerald-200 text-emerald-700 dark:text-emerald-300 dark:border-emerald-700 bg-white/60 dark:bg-emerald-900/10 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors font-bold uppercase tracking-wider"
                                    >
                                        View Detailed Report
                                    </button>
                                </div>
                            </div>
                        </Card>
                        )}
                </div>
                )}
            </div>
        )}

        {/* Regression Analysis Results */}
        {isBiostatsModeEnabled && result && result.mode && result.mode.startsWith('regression') && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">
                <div className="space-y-4">
                     <h3 className="text-xs font-black uppercase tracking-[0.2em] text-teal-500 bg-teal-50 dark:bg-teal-900/20 px-3 py-1 rounded-full w-fit">
                        Regression Model Results
                    </h3>

                    <div className="rounded-2xl border border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-900/10 p-4">
                      <div className="flex flex-col gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-teal-600 dark:text-teal-300">Model Memory</p>
                          <p className="text-xs text-teal-700 dark:text-teal-200 mt-1">
                            Save this fitted model with a custom name. We store equation/formula, coefficients, evaluation details, and variable-type profile.
                          </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            value={modelMemoryDraftName}
                            onChange={(event) => setModelMemoryDraftName(event.target.value)}
                            placeholder="Model name (e.g. Diabetes Risk v1)"
                            className="flex-1 rounded-lg border border-teal-200/80 dark:border-teal-700/70 bg-white/90 dark:bg-slate-900/80 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-100"
                          />
                          <button
                            type="button"
                            onClick={handleSaveModelToMemory}
                            disabled={!isRegressionResultReadyForMemory || loading}
                            className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-black uppercase tracking-[0.12em] transition-colors ${
                              !isRegressionResultReadyForMemory || loading
                                ? 'cursor-not-allowed bg-slate-300/70 dark:bg-slate-700/70 text-slate-500 dark:text-slate-300'
                                : 'bg-teal-600 text-white hover:bg-teal-500'
                            }`}
                          >
                            <CircuitBoard size={14} />
                            Save Model
                          </button>
                        </div>
                        <p className="text-[10px] text-teal-700/80 dark:text-teal-300/80">
                          Saved items appear in the lateral panel: <span className="font-bold">Model Memory</span>.
                        </p>
                      </div>
                    </div>

                    {result.auto_selection?.enabled && (
                        <Card title="Auto Selection Summary" icon={Activity}>
                            <div className="space-y-4">
                                <div className="text-xs text-gray-600 dark:text-gray-300">
                                    Strategy: <strong>{result.auto_selection.strategy || 'auto'}</strong>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {toArray(result.auto_selection.selected_predictors || result.predictors).map((p) => (
                                        <span key={p} className="px-3 py-1 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 rounded-lg text-xs font-bold border border-teal-200 dark:border-teal-800">
                                            {p}
                                        </span>
                                    ))}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                    Candidates: {result.auto_selection.candidate_count ?? 'N/A'} • Evaluated models: {result.auto_selection.evaluated_models ?? 'N/A'}
                                </div>
                                {result.auto_selection.best_metrics && (
                                    <div className="text-xs text-gray-600 dark:text-gray-300">
                                        Best metric: {result.auto_selection.best_metric || 'N/A'} • Value: {Number.isFinite(result.auto_selection.best_metrics.value) ? fmt(result.auto_selection.best_metrics.value, 4) : 'N/A'}
                                    </div>
                                )}
                            </div>
                        </Card>
                    )}
                    
                    {/* Model Performance Stats */}
                    {/* Model Performance Stats */}
                    <Card title="Model Performance" icon={Activity}>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {result.mode === 'regression_linear' ? (
                                <>
                                    <div className="p-6 bg-teal-50/50 dark:bg-teal-900/10 rounded-xl border border-teal-100 dark:border-teal-800">
                                        <div className="text-xs font-black uppercase tracking-widest text-teal-500 mb-2">R-Squared</div>
                                        <div className="text-3xl font-black text-teal-700 dark:text-teal-300">
                                            {result.model_stats.r_squared.toFixed(4)}
                                        </div>
                                        <div className="text-xs text-teal-600 dark:text-teal-400 mt-1">
                                            {(result.model_stats.r_squared * 100).toFixed(2)}% variance explained
                                        </div>
                                    </div>
                                    <div className="p-6 bg-teal-50/50 dark:bg-teal-900/10 rounded-xl border border-teal-100 dark:border-teal-800">
                                        <div className="text-xs font-black uppercase tracking-widest text-teal-500 mb-2">Adj. R-Squared</div>
                                        <div className="text-3xl font-black text-teal-700 dark:text-teal-300">
                                            {result.model_stats.adj_r_squared.toFixed(4)}
                                        </div>
                                        <div className="text-xs text-teal-600 dark:text-teal-400 mt-1">Adjusted for complexity</div>
                                    </div>
                                    <div className="p-6 bg-purple-50/50 dark:bg-purple-900/10 rounded-xl border border-purple-100 dark:border-purple-800">
                                         <div className="text-xs font-black uppercase tracking-widest text-purple-500 mb-2">Residual Std Error</div>
                                         <div className="text-2xl font-black text-purple-700 dark:text-purple-300">
                                            {result.model_stats.sigma.toFixed(4)}
                                         </div>
                                    </div>
                                    <div className="p-6 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-800">
                                         <div className="text-xs font-black uppercase tracking-widest text-indigo-500 mb-2">Model F-Test</div>
                                         <div className="text-xl font-black text-indigo-700 dark:text-indigo-300">
                                            p = {result.model_stats.p_value_model < 0.001 ? "< .001" : result.model_stats.p_value_model.toFixed(4)}
                                         </div>
                                         <div className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                                            F({result.model_stats.df_num}, {result.model_stats.df_den}) = {result.model_stats.f_statistic.toFixed(2)}
                                         </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="p-6 bg-teal-50/50 dark:bg-teal-900/10 rounded-xl border border-teal-100 dark:border-teal-800">
                                        <div className="text-xs font-black uppercase tracking-widest text-teal-500 mb-2">Pseudo R² (McFadden)</div>
                                        <div className="text-3xl font-black text-teal-700 dark:text-teal-300">
                                            {result.model_stats?.pseudo_r2_mcfadden != null ? result.model_stats.pseudo_r2_mcfadden.toFixed(4) : "N/A"}
                                        </div>
                                        <div className="text-xs text-teal-600 dark:text-teal-400 mt-1">
                                            {result.model_stats?.pseudo_r2_mcfadden > 0.2 ? "Good fit" : "Low fit"}
                                        </div>
                                    </div>
                                    <div className="p-6 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-800">
                                        <div className="text-xs font-black uppercase tracking-widest text-emerald-500 mb-2">Pseudo R² (Nagelkerke)</div>
                                        <div className="text-3xl font-black text-emerald-700 dark:text-emerald-300">
                                            {result.model_stats?.pseudo_r2_nagelkerke != null ? result.model_stats.pseudo_r2_nagelkerke.toFixed(4) : "N/A"}
                                        </div>
                                        <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Scaled Cox &amp; Snell</div>
                                    </div>
                                    <div className="p-6 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800">
                                         <div className="text-xs font-black uppercase tracking-widest text-blue-500 mb-2">AIC</div>
                                         <div className="text-2xl font-black text-blue-700 dark:text-blue-300">
                                            {result.model_stats?.aic != null ? result.model_stats.aic.toFixed(2) : "N/A"}
                                         </div>
                                         <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">Akaike Info Criterion</div>
                                    </div>
                                    <div className="p-6 bg-sky-50/50 dark:bg-sky-900/10 rounded-xl border border-sky-100 dark:border-sky-800">
                                         <div className="text-xs font-black uppercase tracking-widest text-sky-500 mb-2">BIC</div>
                                         <div className="text-2xl font-black text-sky-700 dark:text-sky-300">
                                            {result.model_stats?.bic != null ? result.model_stats.bic.toFixed(2) : "N/A"}
                                         </div>
                                         <div className="text-xs text-sky-600 dark:text-sky-400 mt-1">Bayesian Info Criterion</div>
                                    </div>
                                    <div className="p-6 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-800">
                                         <div className="text-xs font-black uppercase tracking-widest text-indigo-500 mb-2">
                                            {result.mode === 'regression_logistic' ? 'AUC Score' : 'Ordered Levels'}
                                         </div>
                                         <div className="text-3xl font-black text-indigo-700 dark:text-indigo-300">
                                            {result.mode === 'regression_logistic'
                                              ? (result.evaluation?.test?.auc != null ? result.evaluation.test.auc.toFixed(4) : "N/A")
                                              : (result.model_stats?.n_levels != null ? result.model_stats.n_levels : "N/A")}
                                         </div>
                                         <div className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                                            {result.mode === 'regression_logistic' ? 'Area Under Curve (Test)' : 'Outcome categories'}
                                         </div>
                                    </div>
                                    <div className="p-6 bg-gray-50/50 dark:bg-gray-900/10 rounded-xl border border-gray-100 dark:border-gray-800">
                                         <div className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Residual Deviance</div>
                                         <div className="text-xl font-black text-gray-700 dark:text-gray-300">
                                            {(result.model_stats?.residual_deviance ?? result.model_stats?.resid_deviance) != null
                                              ? (result.model_stats?.residual_deviance ?? result.model_stats?.resid_deviance).toFixed(2)
                                              : "N/A"}
                                         </div>
                                         <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            df: {result.model_stats?.df_resid ?? '-'}
                                         </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {result.mode === 'regression_linear' && (
                            <div className="mt-8">
                                <div className="p-5 bg-teal-50/60 dark:bg-teal-900/10 rounded-xl border border-teal-100 dark:border-teal-800/40">
                                    <div className="text-xs font-black uppercase tracking-widest text-teal-600 mb-3">{getLinearRegressionDisplayLabel(result)} Guide</div>
                                    <div className="text-xs text-teal-700 dark:text-teal-300 space-y-2">
                                        <div><strong>R² (R-Squared):</strong> How much of the "story" does your model explain? 1.0 is 100% (perfect), 0.0 is 0% (useless).</div>
                                        <div><strong>Adj. R²:</strong> Validated R². Use this to compare models if you add more variables.</div>
                                        <div><strong>F‑test p-value:</strong> Is the model better than just guessing the average? (p &lt; α = {alphaForStars} means Yes).</div>
                                        <div><strong>Residual Std. Error:</strong> On average, how far off are the model's predictions? Lower is better.</div>
                                        <div><strong>Example:</strong> R² = 0.62 means the model explains 62% of the variation in the data.</div>
                                    </div>
                                </div>
                                <div className="mt-4 flex justify-end gap-2">
                                    <button
                                        onClick={() => handleAskAI(`${getLinearRegressionDisplayLabel(result)} Report`, generateReport(result, 'linear_regression'))}
                                        className="text-[10px] px-3 py-1 rounded-full border border-teal-200 text-teal-700 dark:text-teal-300 dark:border-teal-700 bg-white/60 dark:bg-teal-900/10 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors font-bold uppercase tracking-wider flex items-center gap-2"
                                    >
                                        <Bot size={12} /> Ask AI
                                    </button>
                                    <button
                                        onClick={() => openInterpretation(`${getLinearRegressionDisplayLabel(result)} Report`, generateReport(result, 'linear_regression'))}
                                        className="text-[10px] px-3 py-1 rounded-full border border-teal-200 text-teal-700 dark:text-teal-300 dark:border-teal-700 bg-white/60 dark:bg-teal-900/10 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors font-bold uppercase tracking-wider"
                                    >
                                        View Detailed Report
                                    </button>
                                </div>
                            </div>
                        )}

                        {result.mode === 'regression_logistic' && (
                            <div className="mt-8">
                                <div className="p-5 bg-indigo-50/60 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-800/40">
                                    <div className="text-xs font-black uppercase tracking-widest text-indigo-500 mb-3">Interpretation Guide</div>
                                    <div className="text-xs text-indigo-700 dark:text-indigo-300 space-y-2">
                                        <div><strong>Pseudo R² (McFadden):</strong> Logistic regression's version of R². 0.2 to 0.4 is actually considered a very good fit!</div>
                                        <div><strong>Pseudo R² (Nagelkerke):</strong> Tries to act like normal R² (0 to 1). Higher is better.</div>
                                        <div><strong>AIC / BIC:</strong> "Complexity Score". Lower is better. Use these to pick the best model among several.</div>
                                        <div><strong>Residual Deviance:</strong> "Error Score". Lower means the model fits closer to the data.</div>
                                        <div><strong>AUC (Test):</strong> How good is it at separating Yes from No? 0.5 is a coin toss, 1.0 is perfect. &gt;0.8 is great.</div>
                                        <div><strong>Example:</strong> AUC = 0.84 means the model does an excellent job distinguishing classes.</div>
                                    </div>
                                </div>
                                <div className="mt-4 flex justify-end gap-2">
                                    <button
                                        onClick={() => handleAskAI('Logistic Regression Details', generateReport(result, 'logistic_regression'))}
                                        className="text-[10px] px-3 py-1 rounded-full border border-indigo-200 text-indigo-700 dark:text-indigo-300 dark:border-indigo-700 bg-white/60 dark:bg-indigo-900/10 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors font-bold uppercase tracking-wider flex items-center gap-2"
                                    >
                                        <Bot size={12} /> Ask AI
                                    </button>
                                    <button
                                        onClick={() => openInterpretation('Logistic Regression Details', generateReport(result, 'logistic_regression'))}
                                        className="text-[10px] px-3 py-1 rounded-full border border-indigo-200 text-indigo-700 dark:text-indigo-300 dark:border-indigo-700 bg-white/60 dark:bg-indigo-900/10 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors font-bold uppercase tracking-wider"
                                    >
                                        Interpretation Details
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Train/Test Evaluation for Logistic Regression */}
                        {result.evaluation && (
                            <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-8">
                                <h4 className="text-sm font-black uppercase tracking-widest text-indigo-500 mb-6 flex items-center gap-2">
                                    <ShieldCheck className="w-5 h-5" />
                                    Model Evaluation (Train vs Test)
                                </h4>
                                <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
                                  Split used: {Number.isFinite(Number(result.evaluation?.split_info?.train_percent))
                                    ? `${Number(result.evaluation.split_info.train_percent)}`
                                    : '80'}
                                  /{Number.isFinite(Number(result.evaluation?.split_info?.test_percent))
                                    ? `${Number(result.evaluation.split_info.test_percent)}`
                                    : '20'} (Train/Test)
                                </p>
                                
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Metrics Comparison Table */}
                                    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs text-gray-400 uppercase tracking-wider font-bold">
                                                <tr>
                                                    <th className="px-6 py-4 text-left">Metric</th>
                                                    <th className="px-6 py-4 text-center text-blue-600 dark:text-blue-400">
                                                      Train Set ({result.evaluation?.split_info?.train_size || 0}
                                                      {Number.isFinite(Number(result.evaluation?.split_info?.train_percent))
                                                        ? ` • ${Number(result.evaluation.split_info.train_percent)}%`
                                                        : ''})
                                                    </th>
                                                    <th className="px-6 py-4 text-center text-purple-600 dark:text-purple-400">
                                                      Test Set ({result.evaluation?.split_info?.test_size || 0}
                                                      {Number.isFinite(Number(result.evaluation?.split_info?.test_percent))
                                                        ? ` • ${Number(result.evaluation.split_info.test_percent)}%`
                                                        : ''})
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                                {[
                                                    { label: 'Accuracy', key: 'accuracy', format: v => (v != null) ? (v * 100).toFixed(1) + '%' : 'N/A' },
                                                    { label: 'Precision', key: 'precision', format: v => (v != null) ? v.toFixed(3) : 'N/A' },
                                                    { label: 'Recall (Sensitivity)', key: 'recall', format: v => (v != null) ? v.toFixed(3) : 'N/A' },
                                                    { label: 'Specificity', key: 'specificity', format: v => (v != null) ? v.toFixed(3) : 'N/A' },
                                                    { label: 'NPV', key: 'npv', format: v => (v != null) ? v.toFixed(3) : 'N/A' },
                                                    { label: 'F1 Score', key: 'f1_score', format: v => (v != null) ? v.toFixed(3) : 'N/A' },
                                                    { label: 'Balanced Accuracy', key: 'balanced_accuracy', format: v => (v != null) ? (v * 100).toFixed(1) + '%' : 'N/A' },
                                                    { label: 'MCC', key: 'mcc', format: v => (v != null) ? v.toFixed(3) : 'N/A' },
                                                    { label: 'Log Loss', key: 'log_loss', format: v => (v != null) ? v.toFixed(4) : 'N/A' },
                                                    { label: 'Brier Score', key: 'brier', format: v => (v != null) ? v.toFixed(4) : 'N/A' },
                                                ].map((metric) => (
                                                    <tr key={metric.key} className="hover:bg-gray-50/50 dark:hover:bg-white/5">
                                                        <td className="px-6 py-4 font-bold text-gray-600 dark:text-gray-300">{metric.label}</td>
                                                        <td className="px-6 py-4 text-center font-mono text-blue-700 dark:text-blue-300 font-bold">
                                                            {metric.format(result.evaluation?.train?.[metric.key])}
                                                        </td>
                                                        <td className="px-6 py-4 text-center font-mono text-purple-700 dark:text-purple-300 font-bold">
                                                            {metric.format(result.evaluation?.test?.[metric.key])}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Confusion Matrices */}
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-2 gap-4">
                                            {/* Train Matrix */}
                                            <div className="p-4 bg-gray-50 dark:bg-gray-800/20 rounded-xl border border-gray-200 dark:border-gray-700">
                                                <div className="text-xs font-black uppercase text-gray-400 mb-3 text-center">Train Confusion Matrix</div>
                                                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                                                    <div className="col-span-1"></div>
                                                    <div className="font-bold text-gray-500">Pred 0</div>
                                                    <div className="font-bold text-gray-500">Pred 1</div>
                                                    
                                                    <div className="font-bold text-gray-500 flex items-center justify-center">Actual 0</div>
                                                    <div className="bg-green-100 dark:bg-green-900/20 p-2 rounded text-green-700 dark:text-green-300 font-bold border border-green-200 dark:border-green-800">
                                                        TN: {result.evaluation?.train?.confusion_matrix?.tn ?? '-'}
                                                    </div>
                                                    <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded text-red-700 dark:text-red-300 font-bold border border-red-100 dark:border-red-900">
                                                        FP: {result.evaluation?.train?.confusion_matrix?.fp ?? '-'}
                                                    </div>
                                                    
                                                    <div className="font-bold text-gray-500 flex items-center justify-center">Actual 1</div>
                                                    <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded text-red-700 dark:text-red-300 font-bold border border-red-100 dark:border-red-900">
                                                        FN: {result.evaluation?.train?.confusion_matrix?.fn ?? '-'}
                                                    </div>
                                                    <div className="bg-green-100 dark:bg-green-900/20 p-2 rounded text-green-700 dark:text-green-300 font-bold border border-green-200 dark:border-green-800">
                                                        TP: {result.evaluation?.train?.confusion_matrix?.tp ?? '-'}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Test Matrix */}
                                            <div className="p-4 bg-gray-50 dark:bg-gray-800/20 rounded-xl border border-gray-200 dark:border-gray-700">
                                                <div className="text-xs font-black uppercase text-gray-400 mb-3 text-center">Test Confusion Matrix</div>
                                                 <div className="grid grid-cols-2 gap-2 text-center text-xs">
                                                    <div className="col-span-1"></div>
                                                    <div className="font-bold text-gray-500">Pred 0</div>
                                                    <div className="font-bold text-gray-500">Pred 1</div>
                                                    
                                                    <div className="font-bold text-gray-500 flex items-center justify-center">Actual 0</div>
                                                    <div className="bg-green-100 dark:bg-green-900/20 p-2 rounded text-green-700 dark:text-green-300 font-bold border border-green-200 dark:border-green-800">
                                                        TN: {result.evaluation?.test?.confusion_matrix?.tn ?? '-'}
                                                    </div>
                                                    <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded text-red-700 dark:text-red-300 font-bold border border-red-100 dark:border-red-900">
                                                        FP: {result.evaluation?.test?.confusion_matrix?.fp ?? '-'}
                                                    </div>
                                                    
                                                    <div className="font-bold text-gray-500 flex items-center justify-center">Actual 1</div>
                                                    <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded text-red-700 dark:text-red-300 font-bold border border-red-100 dark:border-red-900">
                                                        FN: {result.evaluation?.test?.confusion_matrix?.fn ?? '-'}
                                                    </div>
                                                    <div className="bg-green-100 dark:bg-green-900/20 p-2 rounded text-green-700 dark:text-green-300 font-bold border border-green-200 dark:border-green-800">
                                                        TP: {result.evaluation?.test?.confusion_matrix?.tp ?? '-'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 p-5 bg-blue-50/60 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800/40">
                                    <div className="text-xs font-black uppercase tracking-widest text-blue-500 mb-3">Prediction Metrics Guide</div>
                                    <div className="text-xs text-blue-700 dark:text-blue-300 space-y-2">
                                        <div><strong>Accuracy:</strong> Percentage of correct guesses. (Watch out if one class is rare!)</div>
                                        <div><strong>Precision:</strong> When it says "Yes", how often is it right?</div>
                                        <div><strong>Recall (Sensitivity):</strong> When it's actually "Yes", how often does it catch it?</div>
                                        <div><strong>Specificity:</strong> When it's actually "No", how often does it correctly say "No"?</div>
                                        <div><strong>NPV:</strong> When it says "No", how often is it right?</div>
                                        <div><strong>F1 Score:</strong> Balance between Precision and Recall. Good single number to maximize.</div>
                                        <div><strong>Balanced Accuracy:</strong> Average of Recall and Specificity. Better than Accuracy if classes are uneven.</div>
                                        <div><strong>MCC:</strong> The "Grandmaster" metric. +1 is perfect, 0 is random guessing, -1 is perfectly wrong.</div>
                                        <div><strong>Example:</strong> Precision = 0.90 means 90% of the "Positive" flags were actually correct.</div>
                                    </div>
                                </div>
                                <div className="mt-4 flex justify-end">
                                    <button
                                        onClick={() => openInterpretation('Prediction Metrics Report', generateReport(result, 'logistic_evaluation'))}
                                        className="text-[10px] px-3 py-1 rounded-full border border-blue-200 text-blue-700 dark:text-blue-300 dark:border-blue-700 bg-white/60 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors font-bold uppercase tracking-wider"
                                    >
                                        View Detailed Report
                                    </button>
                                </div>
                            </div>
                        )}
                        
                        {result.mode === 'regression_logistic' && (
                            <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-8">
                                <h4 className="text-sm font-black uppercase tracking-widest text-teal-500 mb-6 flex items-center gap-2">
                                    <Activity className="w-5 h-5" />
                                    Goodness-of-Fit Tests
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="p-6 bg-teal-50/50 dark:bg-teal-900/10 rounded-xl border border-teal-100 dark:border-teal-800">
                                        <div className="text-xs font-black uppercase tracking-widest text-teal-500 mb-2">Likelihood Ratio Test</div>
                                        <div className="text-xl font-black text-teal-700 dark:text-teal-300">
                                            p = {result.model_stats?.lr_p_value != null ? (result.model_stats.lr_p_value < 0.001 ? "< .001" : result.model_stats.lr_p_value.toFixed(4)) : "N/A"}
                                        </div>
                                        <div className="text-xs text-teal-600 dark:text-teal-400 mt-1">
                                            χ²({result.model_stats?.lr_df ?? '-'}) = {result.model_stats?.lr_statistic != null ? result.model_stats.lr_statistic.toFixed(3) : "N/A"}
                                        </div>
                                    </div>
                                    <div className="p-6 bg-amber-50/50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-800">
                                        <div className="text-xs font-black uppercase tracking-widest text-amber-500 mb-2">Hosmer–Lemeshow</div>
                                        <div className="text-xl font-black text-amber-700 dark:text-amber-300">
                                            p = {result.fit_tests?.hosmer_lemeshow?.p_value != null ? (result.fit_tests.hosmer_lemeshow.p_value < 0.001 ? "< .001" : result.fit_tests.hosmer_lemeshow.p_value.toFixed(4)) : "N/A"}
                                        </div>
                                        <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                            χ²({result.fit_tests?.hosmer_lemeshow?.df ?? '-'}) = {result.fit_tests?.hosmer_lemeshow?.statistic != null ? result.fit_tests.hosmer_lemeshow.statistic.toFixed(3) : "N/A"} • groups: {result.fit_tests?.hosmer_lemeshow?.groups ?? '-'}
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-6 p-5 bg-teal-50/60 dark:bg-teal-900/10 rounded-xl border border-teal-100 dark:border-teal-800/40">
                                    <div className="text-xs font-black uppercase tracking-widest text-teal-600 mb-3">Fit Tests Guide</div>
                                    <div className="text-xs text-teal-700 dark:text-teal-300 space-y-2">
                                        <div><strong>Likelihood Ratio Test:</strong> "Does my model work better than a blank one?" p &lt; α = {alphaForStars} means YES.</div>
                                        <div><strong>Hosmer–Lemeshow:</strong> "Do the predicted probabilities match reality?" Here, we WANT p &gt; α = {alphaForStars}. Small p means bad fit.</div>
                                        <div><strong>Example:</strong> LR p &lt; 0.001 (Good) and HL p = 0.45 (Good) suggests the model is solid.</div>
                                    </div>
                                </div>
                                <div className="mt-4 flex justify-end">
                                    <button
                                        onClick={() => openInterpretation('Fit Tests Report', generateReport(result, 'fit_tests'))}
                                        className="text-[10px] px-3 py-1 rounded-full border border-teal-200 text-teal-700 dark:text-teal-300 dark:border-teal-700 bg-white/60 dark:bg-teal-900/10 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors font-bold uppercase tracking-wider"
                                    >
                                        View Detailed Report
                                    </button>
                                </div>
                            </div>
                        )}
                        
                        {(result.mode === 'regression_linear' ? getLinearRegressionEquation(result) : result.formula) && (
                            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900/30 rounded-xl border border-gray-100 dark:border-gray-800 space-y-2">
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                        {result.mode === 'regression_linear' ? 'Equation' : 'Formula'}
                                    </span>
                                    <code className="text-sm font-mono text-indigo-600 dark:text-indigo-400 font-bold break-words">
                                        {result.mode === 'regression_linear' ? getLinearRegressionEquation(result) : result.formula}
                                    </code>
                                </div>
                                {result.mode === 'regression_linear' && result.response_variable && (
                                    <p className="text-xs text-gray-600 dark:text-gray-300">
                                        <span className="font-black uppercase tracking-widest text-gray-400 mr-2">Y</span>
                                        represents <span className="font-semibold text-gray-800 dark:text-gray-100">{result.response_variable}</span>.
                                    </p>
                                )}
                            </div>
                        )}
                    </Card>

                    {result.linear_evaluation && result.mode === 'regression_linear' && (
                        <Card title="Model Evaluation (Train vs Test)" icon={ShieldCheck}>
                            <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
                              Split used: {Number.isFinite(Number(result.linear_evaluation?.split_info?.train_percent))
                                ? `${Number(result.linear_evaluation.split_info.train_percent)}`
                                : '80'}
                              /{Number.isFinite(Number(result.linear_evaluation?.split_info?.test_percent))
                                ? `${Number(result.linear_evaluation.split_info.test_percent)}`
                                : '20'} (Train/Test)
                            </p>
                            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs text-gray-400 uppercase tracking-wider font-bold">
                                        <tr>
                                            <th className="px-6 py-4 text-left">Metric</th>
                                            <th className="px-6 py-4 text-center text-blue-600 dark:text-blue-400">
                                              Train ({result.linear_evaluation?.split_info?.train_size || 0}
                                              {Number.isFinite(Number(result.linear_evaluation?.split_info?.train_percent))
                                                ? ` • ${Number(result.linear_evaluation.split_info.train_percent)}%`
                                                : ''})
                                            </th>
                                            <th className="px-6 py-4 text-center text-purple-600 dark:text-purple-400">
                                              Test ({result.linear_evaluation?.split_info?.test_size || 0}
                                              {Number.isFinite(Number(result.linear_evaluation?.split_info?.test_percent))
                                                ? ` • ${Number(result.linear_evaluation.split_info.test_percent)}%`
                                                : ''})
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {[
                                            { label: 'RMSE', key: 'rmse', format: v => (v != null) ? v.toFixed(4) : 'N/A' },
                                            { label: 'MAE', key: 'mae', format: v => (v != null) ? v.toFixed(4) : 'N/A' },
                                            { label: 'R²', key: 'r2', format: v => (v != null) ? v.toFixed(4) : 'N/A' },
                                            { label: 'Accuracy', key: 'accuracy', format: v => (v != null) ? `${v.toFixed(1)}%` : 'N/A' },
                                        ].map((metric) => (
                                            <tr key={metric.key} className="hover:bg-gray-50/50 dark:hover:bg-white/5">
                                                <td className="px-6 py-4 font-bold text-gray-600 dark:text-gray-300">{metric.label}</td>
                                                <td className="px-6 py-4 text-center font-mono text-blue-700 dark:text-blue-300 font-bold">
                                                    {metric.format(result.linear_evaluation?.train?.[metric.key])}
                                                </td>
                                                <td className="px-6 py-4 text-center font-mono text-purple-700 dark:text-purple-300 font-bold">
                                                    {metric.format(result.linear_evaluation?.test?.[metric.key])}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800/30">
                                <div className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-2">Interpretation</div>
                                <div className="text-xs text-blue-700 dark:text-blue-300 space-y-2">
                                    <div><strong>RMSE/MAE:</strong> Lower means better prediction accuracy.</div>
                                    <div><strong>R²:</strong> Higher means more variance explained.</div>
                                    <div><strong>Accuracy:</strong> Higher means predictions are closer to actual values (error-based).</div>
                                </div>
                            </div>
                            <div className="mt-4 flex justify-end">
                                <button
                                    onClick={() => openInterpretation('Model Evaluation Report', generateReport(result, 'linear_evaluation'))}
                                    className="text-[10px] px-3 py-1 rounded-full border border-blue-200 text-blue-700 dark:text-blue-300 dark:border-blue-700 bg-white/60 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors font-bold uppercase tracking-wider"
                                >
                                    View Detailed Report
                                </button>
                            </div>
                        </Card>
                    )}

                    {/* Coefficients Table */}
                    <Card title="Model Coefficients" icon={TableIcon}>
                         <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 dark:bg-black/20 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                    <tr>
                                        <th className="px-6 py-4">Term</th>
                                        <th className="px-6 py-4">Estimate</th>
                                        <th className="px-6 py-4">Std. Error</th>
                                        <th className="px-6 py-4">{result.mode === 'regression_linear' ? 't-value' : 'z-value'}</th>
                                        <th className="px-6 py-4">p-value</th>
                                        {result.mode === 'regression_logistic' && (
                                            <>
                                                <th className="px-6 py-4">Odds Ratio</th>
                                                <th className="px-6 py-4">{ciPercentForAlpha}% CI</th>
                                            </>
                                        )}
                                        <th className="px-6 py-4">Sig.</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y dark:divide-gray-800">
                                    {result.coefficients && result.coefficients.length > 0 ? result.coefficients.map((row, idx) => (
                                        <tr key={idx} className={`hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors ${row.significance ? 'bg-green-50/10 dark:bg-green-900/5' : ''}`}>
                                            <td className="px-6 py-4 font-bold text-gray-700 dark:text-gray-300">
                                                {row.Term}
                                            </td>
                                            <td className="px-6 py-4 font-mono text-xs text-gray-600 dark:text-gray-400 font-semibold">
                                                {row.Estimate != null ? row.Estimate.toFixed(4) : "N/A"}
                                            </td>
                                            <td className="px-6 py-4 font-mono text-xs text-gray-500">
                                                {row.StdError != null && !isNaN(row.StdError) ? row.StdError.toFixed(4) : "N/A"}
                                            </td>
                                            <td className="px-6 py-4 font-mono text-xs text-gray-500">
                                                {result.mode === 'regression_linear' 
                                                    ? (row.tValue != null ? row.tValue.toFixed(3) : "N/A")
                                                    : (row.zValue != null ? row.zValue.toFixed(3) : "N/A")
                                                }
                                            </td>
                                            <td className={`px-6 py-4 font-mono text-xs font-bold ${row.significance ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                                                {row.formatted_p || "N/A"}
                                            </td>
                                            {result.mode === 'regression_logistic' && (
                                                <>
                                                    <td className="px-6 py-4 font-mono text-xs text-indigo-600 dark:text-indigo-400 font-bold">
                                                        {row.OddsRatio != null && isFinite(row.OddsRatio) ? row.OddsRatio.toExponential(2) : 'NA'}
                                                    </td>
                                                    <td className="px-6 py-4 font-mono text-xs text-gray-500">
                                                        [{row.CI_2_5 != null && isFinite(row.CI_2_5) ? row.CI_2_5.toExponential(2) : 'NA'} - {row.CI_97_5 != null && isFinite(row.CI_97_5) ? row.CI_97_5.toExponential(2) : 'NA'}]
                                                    </td>
                                                </>
                                            )}
                                            <td className="px-6 py-4 text-xs font-bold text-gray-600 dark:text-gray-400">
                                                {row.significance || ""}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={result.mode === 'regression_logistic' ? 8 : 6} className="px-6 py-4 text-center text-gray-500">
                                                No coefficients available.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-2 px-6 pb-2">
                             <p className="text-[10px] text-gray-500 dark:text-gray-400 italic">
                                Significance levels: *** p &lt; 0.001; ** p &lt; 0.01; * p &lt; α ({alphaForStars}); . p &lt; 0.1
                            </p>
                        </div>

                        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900/30 rounded-xl border border-gray-100 dark:border-gray-800">
                            <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Coefficient Interpretation</div>
                            <div className="text-xs text-gray-600 dark:text-gray-300 space-y-2">
                                <div><strong>Estimate:</strong> The effect size. Positive (+) means it increases the outcome, Negative (-) decreases it.</div>
                                <div><strong>p‑value:</strong> "Is this effect real?" p &lt; α ({alphaForStars}) means it's statistically significant (likely real).</div>
                                {result.mode === 'regression_logistic' ? (
                                    <>
                                        <div><strong>Odds Ratio:</strong> "Multiplier for the chance". 1.0 = No effect. &gt;1.0 = More likely. &lt;1.0 = Less likely.</div>
                                        <div><strong>{ciPercentForAlpha}% CI:</strong> The range we are {ciPercentForAlpha}% sure the true value lies in. If it crosses 1.0, we aren't sure of the direction.</div>
                                        <div><strong>Example:</strong> OR = 1.5 means for every 1 unit increase, the odds go up by 50% (1.5x).</div>
                                    </>
                                ) : (
                                    <>
                                        <div><strong>t‑value:</strong> How many "standard errors" away from zero? Bigger number (positive or negative) is stronger evidence.</div>
                                        <div><strong>Example:</strong> Estimate = −2.0 means if you increase X by 1, Y drops by 2.</div>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={() => openInterpretation('Coefficient Analysis Report', generateReport(result, 'coefficient_summary'))}
                                className="text-[10px] px-3 py-1 rounded-full border border-gray-200 text-gray-700 dark:text-gray-300 dark:border-gray-700 bg-white/60 dark:bg-gray-900/20 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors font-bold uppercase tracking-wider"
                            >
                                View Detailed Report
                            </button>
                        </div>
                    </Card>

                    {result.mode === 'regression_linear' && hasSinglePredictorLinearModel(result) && result.regression_scatter_plot_image && (
                         <Card title="Simple Linear Regression Scatterplot" icon={ChartBarIcon}>
                             <div className="relative group rounded-xl overflow-hidden border dark:border-gray-700 shadow-lg">
                                <img
                                  src={`data:image/png;base64,${result.regression_scatter_plot_image}`}
                                  alt="Simple linear regression scatterplot"
                                  className="w-full object-contain bg-white"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 dark:group-hover:bg-white/5 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                    <button
                                        onClick={() => setSelectedImage({
                                          url: `data:image/png;base64,${result.regression_scatter_plot_image}`,
                                          title: 'Simple Linear Regression Scatterplot',
                                          plotKey: 'regression_scatter_plot'
                                        })}
                                        className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 p-3 rounded-full shadow-xl hover:scale-110 transition-transform transform border border-gray-200 dark:border-gray-700"
                                        title="View Full Size"
                                    >
                                        <Maximize2 size={24} />
                                    </button>
                                </div>
                            </div>
                            <p className="mt-3 text-xs text-gray-600 dark:text-gray-300">
                                Observed values with the fitted OLS line and an optional confidence band driven by alpha. This plot is shown when the linear model uses exactly one predictor.
                            </p>
                         </Card>
                    )}

                    {result.mode === 'regression_linear' && result.regression_publication_plot_image && (
                         <Card title="Academic Paper Coefficient Plot" icon={ChartBarIcon}>
                             <div className="relative group rounded-xl overflow-hidden border dark:border-gray-700 shadow-lg">
                                <img
                                  src={`data:image/png;base64,${result.regression_publication_plot_image}`}
                                  alt="Regression coefficient plot with confidence intervals"
                                  className="w-full object-contain bg-white"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 dark:group-hover:bg-white/5 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                    <button
                                        onClick={() => setSelectedImage({
                                          url: `data:image/png;base64,${result.regression_publication_plot_image}`,
                                          title: `${getLinearRegressionDisplayLabel(result)} Coefficient Plot`,
                                          plotKey: 'regression_publication_plot'
                                        })}
                                        className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 p-3 rounded-full shadow-xl hover:scale-110 transition-transform transform border border-gray-200 dark:border-gray-700"
                                        title="View Full Size"
                                    >
                                        <Maximize2 size={24} />
                                    </button>
                                </div>
                            </div>
                            <p className="mt-3 text-xs text-gray-600 dark:text-gray-300">
                                Publication-style coefficient plot with {ciPercentForAlpha}% confidence intervals. Intercept is omitted to keep the academic summary focused on predictor effects.
                            </p>
                         </Card>
                    )}

                    {/* Diagnostic Plots */}
                    {result.image ? (
                         <Card title="Diagnostic Plots" icon={Maximize2}>
                             <div className="relative group rounded-xl overflow-hidden border dark:border-gray-700 shadow-lg">
                                <img src={`data:image/png;base64,${result.image}`} alt="Regression Diagnostics" className="w-full object-contain bg-white" />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 dark:group-hover:bg-white/5 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                    <button 
                                        onClick={() => setSelectedImage({ url: `data:image/png;base64,${result.image}`, title: "Diagnostic Plots", plotKey: 'diagnostic_plot' })}
                                        className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 p-3 rounded-full shadow-xl hover:scale-110 transition-transform transform border border-gray-200 dark:border-gray-700"
                                        title="View Full Size"
                                    >
                                        <Maximize2 size={24} />
                                    </button>
                                </div>
                            </div>
                        </Card>
                    ) : result.plot_error ? (
                         <Card title="Diagnostic Plot Error" icon={Maximize2}>
                             <div className="p-6 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-800/30 text-center space-y-3">
                                 <div className="text-red-500 font-black text-xs uppercase tracking-widest mb-2">Plot Generation Failed</div>
                                 <p className="text-sm text-red-600 dark:text-red-400 font-medium">{result.plot_error}</p>
                                 <p className="text-[10px] text-red-400 dark:text-red-500/50 uppercase mt-4">Check R dependencies (pROC) or data suitability</p>
                             </div>
                         </Card>
                    ) : null}
                </div>
                
                {/* Prediction Section for Logistic Regression */}
                {result.mode === 'regression_logistic' && (
                  <Card title="Predict Classification" icon={Sparkles} className="bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800 mt-6">
                      <div className="flex flex-col sm:flex-row items-center gap-6">
                          <div className="flex-1">
                              <p className="font-bold text-indigo-900 dark:text-indigo-100 mb-1">Make Predictions on New Data</p>
                              <p className="text-xs text-indigo-700 dark:text-indigo-300">Upload a CSV file containing the same predictor variables to generate class predictions using this model.</p>
                          </div>
                          <div className="flex items-center gap-3">
                              <input
                                  type="file"
                                  accept=".csv"
                                  onChange={handlePredictionUpload}
                                  className="hidden"
                                  id="prediction-upload-input"
                              />
                              <label 
                                  htmlFor="prediction-upload-input"
                                  className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/20 cursor-pointer transition-transform hover:scale-105"
                              >
                                  <UploadCloud size={18} />
                                  Upload & Predict
                              </label>
                          </div>
                      </div>
                  </Card>
                )}
            </div>
        )}
        
        {/* Prediction Results (Logistic) */}
        {isBiostatsModeEnabled && result && (result.mode === 'predict_logistic' || result.mode === 'predict_memory_logistic') && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">
                 <div className="flex items-center justify-between p-6 bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 shadow-sm">
                     <div className="flex items-center gap-4">
                         <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl text-indigo-600">
                             <Sparkles size={24} />
                         </div>
                         <div>
                             <h2 className="text-xl font-black text-gray-800 dark:text-white">Prediction Results</h2>
                             <p className="text-sm text-gray-500">
                               Generated class predictions for {result.count ?? result.prediction_results?.length ?? 0} rows
                               {result.source_model_name ? ` • Model: ${result.source_model_name}` : ''}
                             </p>
                         </div>
                     </div>
                     <Button 
                         onClick={() => (
                           result.mode === 'predict_memory_logistic' && result.source_model_id
                             ? handleUseModelMemoryEntry(result.source_model_id)
                             : runAnalysis()
                         )}
                         variant="secondary"
                         className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
                     >
                         {result.mode === 'predict_memory_logistic' ? 'Load Model Setup' : 'Back to Model'}
                     </Button>
                 </div>

                 {Array.isArray(result.warnings) && result.warnings.length > 0 && (
                   <Card title="Prediction Notes" icon={Info}>
                     <div className="space-y-2">
                       {result.warnings.map((warningText, warningIndex) => (
                         <p key={`prediction_warning_${warningIndex}`} className="text-xs text-amber-700 dark:text-amber-300">
                           {warningText}
                         </p>
                       ))}
                     </div>
                   </Card>
                 )}
                 
                 <Card title="Predicted Probabilities & Classes" icon={TableIcon}>
                     <div className="overflow-x-auto max-h-[500px]">
                         <table className="w-full text-left border-collapse relative">
                             <thead className="sticky top-0 bg-white dark:bg-gray-800 shadow-sm z-10">
                                 <tr className="border-b border-gray-100 dark:border-gray-700 text-xs font-black text-gray-400 uppercase tracking-wider">
                                     <th className="px-6 py-4">Row ID</th>
                                     <th className="px-6 py-4 text-indigo-600">Probability</th>
                                     <th className="px-6 py-4 text-indigo-600">Predicted Class</th>
                                     {result.prediction_results?.[0]?.Predicted_Label && <th className="px-6 py-4">Label</th>}
                                     {/* Show first few predictors if space permits */}
                                     {result.prediction_results?.[0] && Object.keys(result.prediction_results[0])
                                         .filter(k => !['Predicted_Prob', 'Predicted_Class', 'Predicted_Label', 'Row_ID'].includes(k))
                                         .map(k => <th key={k} className="px-6 py-4 truncate max-w-[100px] text-gray-500">{k}</th>)
                                     }
                                 </tr>
                             </thead>
                             <tbody className="divide-y border-gray-100 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300">
                                 {result.prediction_results?.map((row, i) => (
                                     <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                         <td className="px-6 py-4 font-mono text-xs opacity-50">{row.Row_ID ?? (i + 1)}</td>
                                         <td className="px-6 py-4 font-bold">{row.Predicted_Prob}</td>
                                         <td className="px-6 py-4">
                                             <span className={`px-2 py-1 rounded-md font-bold text-xs ${
                                                 row.Predicted_Class == 1 
                                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' 
                                                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                             }`}>
                                                 {row.Predicted_Class}
                                             </span>
                                         </td>
                                         {row.Predicted_Label && <td className="px-6 py-4">{row.Predicted_Label}</td>}
                                         {Object.keys(row)
                                             .filter(k => !['Predicted_Prob', 'Predicted_Class', 'Predicted_Label', 'Row_ID'].includes(k))
                                             .map(k => <td key={k} className="px-6 py-4 truncate max-w-[100px] opacity-70">{row[k]}</td>)
                                         }
                                     </tr>
                                 ))}
                             </tbody>
                         </table>
                     </div>
                 </Card>
            </div>
        )}

        {/* Prediction Results (Linear from Model Memory) */}
        {isBiostatsModeEnabled && result && result.mode === 'predict_memory_linear' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">
                 <div className="flex items-center justify-between p-6 bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 shadow-sm">
                     <div className="flex items-center gap-4">
                         <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl text-emerald-600">
                             <Sparkles size={24} />
                         </div>
                         <div>
                             <h2 className="text-xl font-black text-gray-800 dark:text-white">Linear Prediction Results</h2>
                             <p className="text-sm text-gray-500">
                               Generated predicted values for {result.count ?? result.prediction_results?.length ?? 0} rows
                               {result.source_model_name ? ` • Model: ${result.source_model_name}` : ''}
                             </p>
                         </div>
                     </div>
                     <Button
                         disabled={!result.source_model_id}
                         onClick={() => (
                           result.source_model_id
                             ? handleUseModelMemoryEntry(result.source_model_id)
                             : null
                         )}
                         variant="secondary"
                         className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
                     >
                         Load Model Setup
                     </Button>
                 </div>

                 {Array.isArray(result.warnings) && result.warnings.length > 0 && (
                   <Card title="Prediction Notes" icon={Info}>
                     <div className="space-y-2">
                       {result.warnings.map((warningText, warningIndex) => (
                         <p key={`linear_prediction_warning_${warningIndex}`} className="text-xs text-amber-700 dark:text-amber-300">
                           {warningText}
                         </p>
                       ))}
                     </div>
                   </Card>
                 )}

                 <Card title="Predicted Values" icon={TableIcon}>
                     <div className="overflow-x-auto max-h-[500px]">
                         <table className="w-full text-left border-collapse relative">
                             <thead className="sticky top-0 bg-white dark:bg-gray-800 shadow-sm z-10">
                                 <tr className="border-b border-gray-100 dark:border-gray-700 text-xs font-black text-gray-400 uppercase tracking-wider">
                                     <th className="px-6 py-4">Row ID</th>
                                     <th className="px-6 py-4 text-emerald-600">Predicted Value</th>
                                     {result.prediction_results?.[0] && Object.keys(result.prediction_results[0])
                                         .filter((keyName) => !['Predicted_Value', 'Row_ID'].includes(keyName))
                                         .map((keyName) => (
                                           <th key={keyName} className="px-6 py-4 truncate max-w-[120px] text-gray-500">{keyName}</th>
                                         ))
                                     }
                                 </tr>
                             </thead>
                             <tbody className="divide-y border-gray-100 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300">
                                 {result.prediction_results?.map((row, index) => (
                                     <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                         <td className="px-6 py-4 font-mono text-xs opacity-50">{row.Row_ID ?? (index + 1)}</td>
                                         <td className="px-6 py-4 font-bold text-emerald-700 dark:text-emerald-300">{row.Predicted_Value}</td>
                                         {Object.keys(row)
                                             .filter((keyName) => !['Predicted_Value', 'Row_ID'].includes(keyName))
                                             .map((keyName) => (
                                               <td key={keyName} className="px-6 py-4 truncate max-w-[120px] opacity-70">{row[keyName]}</td>
                                             ))
                                         }
                                     </tr>
                                 ))}
                             </tbody>
                         </table>
                     </div>
                 </Card>
            </div>
        )}

        {/* Multivariate Analysis Results */}
        {isBiostatsModeEnabled && result && result.mode && result.mode.startsWith('multivariate') && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">
                <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700">
                    <div className="p-3 bg-pink-100 dark:bg-pink-900/30 rounded-lg text-pink-600 shadow-inner">
                        <Layout size={24}/>
                    </div>
                    <div>
                        <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest">Multivariate Analysis</p>
                        <p className="text-xl font-black text-gray-800 dark:text-gray-100">
                            {multivariateResultLabel}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-8">
                     {/* Main Visualization */}
                     <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                        {/* Biplot / Cluster Plot / Dendrogram */}
                        <Card
                          title={
                            isMultivariateHclustResult
                              ? 'Dendrogram'
                              : isMultivariateCaResult
                                ? 'CA Map'
                              : isMultivariateMcaResult
                                ? 'MCA Map'
                                : isMultivariateCoinertiaResult
                                  ? 'Co-Inertia Map'
                                  : isMultivariateBcaResult
                                    ? 'BCA Projection'
                                  : isMultivariatePcaBiplotResult
                                    ? ((result?.auto_cluster_before_pca || result?.auto_cluster_before_pca_biplot || result?.auto_cluster_after_pca || result?.auto_cluster_after_pca_biplot) ? 'Clustered PCA Biplot' : 'PCA Biplot')
                                    : isMultivariatePcaResult
                                      ? ((result?.auto_cluster_before_pca || result?.auto_cluster_before_pca_biplot || result?.auto_cluster_after_pca || result?.auto_cluster_after_pca_biplot) ? 'Clustered PCA Projection' : 'PCA Projection')
                                    : 'Projection Plot'
                          }
                          icon={Maximize2}
                          className="xl:col-span-2"
                        >
                             {result.image || result.biplot_image ? (
                                <div className="relative group rounded-xl overflow-hidden border dark:border-gray-700 shadow-lg">
                                    <img 
                                        src={`data:image/png;base64,${result.image || result.biplot_image}`} 
                                        alt="Multivariate Plot" 
                                        className="w-full object-contain bg-white max-h-[600px]" 
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 dark:group-hover:bg-white/5 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                        <button 
                                            onClick={() => setSelectedImage({ url: `data:image/png;base64,${result.image || result.biplot_image}`, title: "Analysis Plot", plotKey: 'analysis_plot' })}
                                            className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 p-3 rounded-full shadow-xl hover:scale-110 transition-transform transform border border-gray-200 dark:border-gray-700"
                                        >
                                            <Maximize2 size={24} />
                                        </button>
                                    </div>
                                </div>
                             ) : (
                                <div className="p-12 text-center text-gray-400 italic">No main plot generated</div>
                             )}
                        </Card>

                        {isMultivariateHclustResult && result.biplot_image && (
                            <Card title="Hierarchical Cluster Biplot" icon={ChartBarIcon} className="xl:col-span-2">
                                <div className="relative group rounded-xl overflow-hidden border dark:border-gray-700 shadow-lg">
                                    <img
                                        src={`data:image/png;base64,${result.biplot_image}`}
                                        alt="Hierarchical Cluster Biplot"
                                        className="w-full object-contain bg-white max-h-[560px]"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 dark:group-hover:bg-white/5 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                        <button
                                            onClick={() => setSelectedImage({ url: `data:image/png;base64,${result.biplot_image}`, title: 'Hierarchical Cluster Biplot', plotKey: 'analysis_plot' })}
                                            className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 p-3 rounded-full shadow-xl hover:scale-110 transition-transform transform border border-gray-200 dark:border-gray-700"
                                        >
                                            <Maximize2 size={24} />
                                        </button>
                                    </div>
                                </div>
                            </Card>
                        )}

                        {/* Secondary Plot: Scree */}
                        {showMultivariateScree && (
                            <Card title="Scree Plot (Variance)" icon={ChartBarIcon} className="xl:col-span-2">
                                <div className="relative group rounded-xl overflow-hidden border dark:border-gray-700 shadow-lg">
                                    <img
                                        src={`data:image/png;base64,${result.scree_plot_image}`}
                                        alt="Scree Plot"
                                        className="w-full object-contain bg-white max-h-[400px]"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 dark:group-hover:bg-white/5 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                        <button
                                            onClick={() => setSelectedImage({ url: `data:image/png;base64,${result.scree_plot_image}`, title: 'Scree Plot', plotKey: 'scree_plot' })}
                                            className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 p-3 rounded-full shadow-xl hover:scale-110 transition-transform transform border border-gray-200 dark:border-gray-700"
                                        >
                                            <Maximize2 size={24} />
                                        </button>
                                    </div>
                                </div>
                            </Card>
                        )}

                        {showClusterDiagnosticsPanel && (
                            <Card title="Cluster Diagnostics" icon={ChartBarIcon} className="xl:col-span-2">
                                <div className="space-y-4">
                                    <div className="flex flex-wrap gap-2">
                                        {clusterDiagnosticsCases.map((item) => (
                                            <button
                                                key={item.key}
                                                type="button"
                                                onClick={() => setClusterDiagnosticsView(item.key)}
                                                className={`px-3 py-1.5 rounded-full border text-[11px] font-black uppercase tracking-wider transition-colors ${
                                                    clusterDiagnosticsView === item.key
                                                        ? 'border-indigo-400 bg-indigo-50 text-indigo-700 dark:border-indigo-500/70 dark:bg-indigo-900/30 dark:text-indigo-200'
                                                        : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600'
                                                }`}
                                            >
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>

                                    {clusterDiagnosticsView === 'optimization' && showClusterOptimizationCard && (
                                        <div className="space-y-4">
                                            <div className="text-xs text-gray-600 dark:text-gray-300">
                                                {optimizationContextIsManualValidation
                                                    ? 'Manual k validation summary. The clustering still uses your selected k; this panel only compares it against the silhouette method.'
                                                    : optimizationContextIsPcaAuto
                                                    ? 'PCA auto-clustering optimization summary.'
                                                    : optimizationContextIsMcaAuto
                                                        ? 'MCA auto-clustering optimization summary.'
                                                        : 'K-means optimization summary.'}
                                            </div>
                                            {optimizationContextIsManualValidation && manualClusterValidationScope === 'sampled_rows' && (
                                                <div className="p-3 text-xs text-amber-700 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-100 dark:border-amber-800/30">
                                                    Validation uses sampled rows for scalability.
                                                </div>
                                            )}
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                {optimizationExpectElbow && (
                                                    result.elbow_plot_image ? (
                                                        <div className="relative group rounded-xl overflow-hidden border dark:border-gray-700 shadow-lg">
                                                            <img
                                                                src={`data:image/png;base64,${result.elbow_plot_image}`}
                                                                alt="Elbow Method Plot"
                                                                className="w-full object-contain bg-white max-h-[400px]"
                                                            />
                                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 dark:group-hover:bg-white/5 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                                <button
                                                                    onClick={() => setSelectedImage({ url: `data:image/png;base64,${result.elbow_plot_image}`, title: 'Elbow Method', plotKey: 'elbow_plot' })}
                                                                    className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 p-3 rounded-full shadow-xl hover:scale-110 transition-transform transform border border-gray-200 dark:border-gray-700"
                                                                >
                                                                    <Maximize2 size={24} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="p-6 text-center text-xs text-gray-400 italic">No elbow plot was generated.</div>
                                                    )
                                                )}

                                                {optimizationExpectSilhouette && (
                                                    result.silhouette_trend_plot_image ? (
                                                        <div className="relative group rounded-xl overflow-hidden border dark:border-gray-700 shadow-lg">
                                                            <img
                                                                src={`data:image/png;base64,${result.silhouette_trend_plot_image}`}
                                                                alt="Silhouette Method Plot"
                                                                className="w-full object-contain bg-white max-h-[400px]"
                                                            />
                                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 dark:group-hover:bg-white/5 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                                <button
                                                                    onClick={() => setSelectedImage({ url: `data:image/png;base64,${result.silhouette_trend_plot_image}`, title: 'Silhouette Method', plotKey: 'silhouette_trend_plot' })}
                                                                    className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 p-3 rounded-full shadow-xl hover:scale-110 transition-transform transform border border-gray-200 dark:border-gray-700"
                                                                >
                                                                    <Maximize2 size={24} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="p-6 text-center text-xs text-gray-400 italic">No silhouette method plot was generated.</div>
                                                    )
                                                )}
                                            </div>

                                            {(result.elbow_plot_error || result.silhouette_trend_plot_error) && (
                                                <div className="p-3 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-800/30">
                                                    {result.elbow_plot_error || result.silhouette_trend_plot_error}
                                                </div>
                                            )}
                                            {optimizationContextIsManualValidation && manualClusterValidationWarning && (
                                                <div className="p-3 text-xs text-amber-700 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-100 dark:border-amber-800/30">
                                                    {manualClusterValidationWarning}
                                                </div>
                                            )}

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-700 text-center">
                                                    <div className="text-[10px] uppercase tracking-wide text-gray-500 font-bold">{optimizationContextIsManualValidation ? 'Manual K Used' : 'K Used'}</div>
                                                    <div className="text-lg font-black text-indigo-600 dark:text-indigo-400">{Number.isFinite(optimizationKUsed) ? optimizationKUsed : 'N/A'}</div>
                                                    {Number.isFinite(optimizationRequestedK) && (
                                                        <div className="text-[10px] text-gray-400">Requested: {optimizationRequestedK}</div>
                                                    )}
                                                </div>
                                                {optimizationExpectElbow && (
                                                    <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-700 text-center">
                                                        <div className="text-[10px] uppercase tracking-wide text-gray-500 font-bold">Elbow Suggested K</div>
                                                        <div className="text-lg font-black text-indigo-600 dark:text-indigo-400">{Number.isFinite(optimizationElbowK) ? optimizationElbowK : 'N/A'}</div>
                                                    </div>
                                                )}
                                                {optimizationExpectSilhouette && (
                                                    <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-700 text-center">
                                                        <div className="text-[10px] uppercase tracking-wide text-gray-500 font-bold">Silhouette Best K</div>
                                                        <div className="text-lg font-black text-indigo-600 dark:text-indigo-400">{Number.isFinite(optimizationSilhouetteK) ? optimizationSilhouetteK : 'N/A'}</div>
                                                    </div>
                                                )}
                                                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-700 text-center">
                                                    <div className="text-[10px] uppercase tracking-wide text-gray-500 font-bold">{optimizationContextIsManualValidation ? 'Selected K Avg Silhouette' : 'Avg Silhouette'}</div>
                                                    <div className="text-lg font-black text-indigo-600 dark:text-indigo-400">{optimizationAvgSilhouette != null ? optimizationAvgSilhouette.toFixed(4) : 'N/A'}</div>
                                                </div>
                                                {optimizationContextIsManualValidation && (
                                                    <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-700 text-center">
                                                        <div className="text-[10px] uppercase tracking-wide text-gray-500 font-bold">Best K Avg Silhouette</div>
                                                        <div className="text-lg font-black text-indigo-600 dark:text-indigo-400">{manualClusterValidationAvgBest != null ? manualClusterValidationAvgBest.toFixed(4) : 'N/A'}</div>
                                                    </div>
                                                )}
                                            </div>
                                            {optimizationMethod && (
                                                <div className="text-[11px] text-gray-600 dark:text-gray-300">
                                                    <span className="font-black">{optimizationContextIsManualValidation ? 'Validation method:' : 'Optimization method:'}</span>{' '}
                                                    {optimizationContextIsManualValidation ? 'silhouette comparison (does not change the clustering)' : String(optimizationMethod).toLowerCase()}
                                                </div>
                                            )}

                                            {optimizationData && Array.isArray(optimizationData.k_values) && (
                                                <div className="overflow-x-auto">
                                                    <table className="min-w-full text-xs text-left text-gray-500 dark:text-gray-400">
                                                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                                            <tr>
                                                                <th scope="col" className="px-2 py-1">K</th>
                                                                <th scope="col" className="px-2 py-1">Total WSS</th>
                                                                <th scope="col" className="px-2 py-1">Avg Silhouette</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {optimizationData.k_values.map((k, i) => {
                                                                const isSelectedK = Number(k) === Number(optimizationKUsed);
                                                                const isBestSilhouetteK = Number(k) === Number(optimizationSilhouetteK);
                                                                const kLabelSuffix = optimizationContextIsManualValidation
                                                                    ? (isSelectedK && isBestSilhouetteK
                                                                        ? ' (manual + best)'
                                                                        : (isSelectedK ? ' (manual)' : (isBestSilhouetteK ? ' (best)' : '')))
                                                                    : '';
                                                                let rowClassName = 'bg-white dark:bg-gray-800 border-b dark:border-gray-700';
                                                                if (optimizationContextIsManualValidation && isSelectedK && isBestSilhouetteK) {
                                                                    rowClassName = 'bg-violet-100 dark:bg-violet-900/40 font-bold';
                                                                } else if (optimizationContextIsManualValidation && isSelectedK) {
                                                                    rowClassName = 'bg-emerald-100 dark:bg-emerald-900/40 font-bold';
                                                                } else if (optimizationContextIsManualValidation && isBestSilhouetteK) {
                                                                    rowClassName = 'bg-indigo-100 dark:bg-indigo-900/40 font-bold';
                                                                } else if (isSelectedK) {
                                                                    rowClassName = 'bg-indigo-100 dark:bg-indigo-900 font-bold';
                                                                }
                                                                return (
                                                                <tr key={k} className={rowClassName}>
                                                                    <td className="px-2 py-1">
                                                                        {k}
                                                                        {kLabelSuffix}
                                                                    </td>
                                                                    <td className="px-2 py-1">
                                                                        {Number.isFinite(Number(optimizationData.wss?.[i])) ? Number(optimizationData.wss?.[i]).toFixed(2) : '-'}
                                                                    </td>
                                                                    <td className="px-2 py-1">
                                                                        {k > 1 && Number.isFinite(Number(optimizationData.silhouette?.[i])) ? Number(optimizationData.silhouette?.[i]).toFixed(4) : '-'}
                                                                    </td>
                                                                </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {clusterDiagnosticsView === 'dendrogram' && showClusterDendrogramCard && (
                                        clusterDendrogramImage ? (
                                            <div className="relative group rounded-xl overflow-hidden border dark:border-gray-700 shadow-lg">
                                                <img
                                                    src={`data:image/png;base64,${clusterDendrogramImage}`}
                                                    alt={clusterDendrogramTitle}
                                                    className="w-full object-contain bg-white max-h-[460px]"
                                                />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 dark:group-hover:bg-white/5 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                    <button
                                                        onClick={() => setSelectedImage({ url: `data:image/png;base64,${clusterDendrogramImage}`, title: clusterDendrogramTitle, plotKey: 'dendrogram_plot' })}
                                                        className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 p-3 rounded-full shadow-xl hover:scale-110 transition-transform transform border border-gray-200 dark:border-gray-700"
                                                    >
                                                        <Maximize2 size={24} />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-4 text-xs rounded-lg border border-red-100 dark:border-red-800/30 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-300">
                                                {clusterDendrogramError || 'Hierarchical dendrogram could not be generated.'}
                                            </div>
                                        )
                                    )}

                                    {clusterDiagnosticsView === 'silhouette_plot' && showClusterSilhouette && (
                                        <div className="space-y-4">
                                            {result.silhouette_plot_image ? (
                                                <div className="relative group rounded-xl overflow-hidden border dark:border-gray-700 shadow-lg">
                                                    <img
                                                        src={`data:image/png;base64,${result.silhouette_plot_image}`}
                                                        alt="Silhouette Plot"
                                                        className="w-full object-contain bg-white max-h-[400px]"
                                                    />
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 dark:group-hover:bg-white/5 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                        <button
                                                            onClick={() => setSelectedImage({ url: `data:image/png;base64,${result.silhouette_plot_image}`, title: 'Silhouette Plot', plotKey: 'silhouette_plot' })}
                                                            className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 p-3 rounded-full shadow-xl hover:scale-110 transition-transform transform border border-gray-200 dark:border-gray-700"
                                                        >
                                                            <Maximize2 size={24} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="p-6 text-center text-xs text-gray-400 italic">No silhouette plot was generated.</div>
                                            )}
                                            {result.silhouette_error && (
                                                <div className="p-3 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-800/30">
                                                    {result.silhouette_error}
                                                </div>
                                            )}
                                            <div className="text-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-700">
                                                <span className="text-xs uppercase tracking-wide text-gray-500 font-bold block mb-1">Average Silhouette Width</span>
                                                <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{clusterSilhouetteAvg != null ? clusterSilhouetteAvg.toFixed(4) : 'N/A'}</span>
                                            </div>
                                        </div>
                                    )}

                                    {clusterDiagnosticsView === 'silhouette_table' && silhouetteTableRows.length > 0 && (
                                        <div className="space-y-3">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-700 text-center">
                                                    <div className="text-[10px] uppercase tracking-wide text-gray-500 font-bold">Average Silhouette</div>
                                                    <div className="text-lg font-black text-indigo-600 dark:text-indigo-400">{clusterSilhouetteAvg != null ? clusterSilhouetteAvg.toFixed(4) : 'N/A'}</div>
                                                </div>
                                                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-700 text-center">
                                                    <div className="text-[10px] uppercase tracking-wide text-gray-500 font-bold">Rows In Table</div>
                                                    <div className="text-lg font-black text-indigo-600 dark:text-indigo-400">{silhouetteTableTotalRows}</div>
                                                </div>
                                            </div>
                                            <div className="text-xs text-gray-600 dark:text-gray-300">
                                                {silhouetteTableTruncated
                                                    ? `Showing first ${silhouetteTableRows.length} of ${silhouetteTableTotalRows} silhouette rows.`
                                                    : `Silhouette rows: ${silhouetteTableTotalRows}.`}
                                                {silhouetteTableScope === 'sampled_rows' ? ' Preview is based on sampled rows used for silhouette validation.' : ''}
                                            </div>
                                            <div className="overflow-x-auto max-h-[360px] rounded-lg border border-gray-100 dark:border-gray-700">
                                                <table className="w-full text-xs text-left">
                                                    <thead className="bg-gray-50 dark:bg-gray-900 font-bold text-gray-500 uppercase">
                                                        <tr>
                                                            <th className="p-2">Observation</th>
                                                            <th className="p-2">Cluster</th>
                                                            <th className="p-2">Neighbor Cluster</th>
                                                            <th className="p-2">Silhouette Width</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y dark:divide-gray-800">
                                                        {silhouetteTableRows.map((row, idx) => (
                                                            <tr key={`silhouette_row_${idx}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                                <td className="p-2 truncate max-w-[180px]" title={String(row?.Observation ?? '')}>
                                                                    {String(row?.Observation ?? 'N/A')}
                                                                </td>
                                                                <td className="p-2">{String(row?.Cluster ?? 'N/A')}</td>
                                                                <td className="p-2">{String(row?.Neighbor_Cluster ?? 'N/A')}</td>
                                                                <td className="p-2 font-mono">
                                                                    {Number.isFinite(Number(row?.Silhouette_Width))
                                                                        ? Number(row.Silhouette_Width).toFixed(4)
                                                                        : 'N/A'}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                </div>
                            </Card>
                        )}

                         {/* Heatmap Plot */}
                         {result.heatmap_image && !isMultivariateHclustResult && (
                              <Card title="Clustered Heatmap" icon={ChartBarIcon} className="xl:col-span-2">
                                  <div className="relative group rounded-xl overflow-hidden border dark:border-gray-700 shadow-lg">
                                     <img 
                                         src={`data:image/png;base64,${result.heatmap_image}`} 
                                         alt="Heatmap" 
                                         className="w-full object-contain bg-white max-h-[600px]" 
                                     />
                                     <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 dark:group-hover:bg-white/5 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                         <button 
                                             onClick={() => setSelectedImage({ url: `data:image/png;base64,${result.heatmap_image}`, title: "Clustered Heatmap", plotKey: 'heatmap_plot' })}
                                             className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 p-3 rounded-full shadow-xl hover:scale-110 transition-transform transform border border-gray-200 dark:border-gray-700"
                                         >
                                             <Maximize2 size={24} />
                                         </button>
                                     </div>
                                  </div>
                              </Card>
                         )}
                     </div>

                     {/* Tables / Stats */}
                     <div className="space-y-8">
                        {/* PCA Biplot Pre-Clustering */}
                        {(isMultivariatePcaResult || isMultivariatePcaBiplotResult) && (result.auto_cluster_before_pca || result.auto_cluster_before_pca_biplot || result.auto_cluster_after_pca || result.auto_cluster_after_pca_biplot) && (
                            <Card title="Auto-Clustering Around PCA" icon={TableIcon}>
                                <div className="space-y-2 text-xs">
                                    <div className="p-3 rounded-lg border border-indigo-100 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-900/20">
                                        <div><span className="font-black">Stage:</span> {String(result.auto_cluster_stage_used || (result.auto_cluster_after_pca || result.auto_cluster_after_pca_biplot ? 'after' : 'before')).toLowerCase()}</div>
                                        <div><span className="font-black">Method:</span> {String(result.auto_cluster_method || result.auto_cluster_method_requested || '').toLowerCase().includes('hierarchical') ? 'hierarchical' : (String(result.auto_cluster_method || result.auto_cluster_method_requested || '').toLowerCase().includes('kmeans') ? 'kmeans' : 'unknown')}</div>
                                        {String(result.auto_cluster_stage_used || (result.auto_cluster_after_pca || result.auto_cluster_after_pca_biplot ? 'after' : 'before')).toLowerCase() === 'after' && Number.isFinite(Number(result.auto_cluster_dims_used)) && (
                                            <div>
                                                <span className="font-black">PCA score dimensions used:</span>{' '}
                                                {Number(result.auto_cluster_dims_used)}
                                                {Number.isFinite(Number(result.auto_cluster_dims_total)) ? ` / ${Number(result.auto_cluster_dims_total)}` : ''}
                                                {Number.isFinite(Number(result.auto_cluster_retained_variance_pct)) ? ` (${Number(result.auto_cluster_retained_variance_pct).toFixed(2)}% variance)` : ''}
                                            </div>
                                        )}
                                        {String(result.auto_cluster_method || result.auto_cluster_method_requested || '').toLowerCase().includes('kmeans') && String(result.auto_cluster_optimization_method || '').toLowerCase() !== 'manual_k' && (
                                            <div><span className="font-black">Kmeans optimization:</span> {String(result.auto_cluster_optimization_method || 'both').toLowerCase()}</div>
                                        )}
                                        <div><span className="font-black">K:</span> {Number.isFinite(Number(result.auto_cluster_k)) ? Number(result.auto_cluster_k) : 'N/A'}</div>
                                        {String(result.auto_cluster_method || result.auto_cluster_method_requested || '').toLowerCase().includes('kmeans') && String(result.auto_cluster_optimization_method || '').toLowerCase() !== 'manual_k' && (
                                            <div><span className="font-black">Elbow K:</span> {Number.isFinite(Number(result.auto_cluster_elbow_k)) ? Number(result.auto_cluster_elbow_k) : 'N/A'}</div>
                                        )}
                                        {String(result.auto_cluster_method || result.auto_cluster_method_requested || '').toLowerCase().includes('kmeans') && String(result.auto_cluster_optimization_method || '').toLowerCase() !== 'manual_k' && (
                                            <div><span className="font-black">Silhouette K:</span> {Number.isFinite(Number(result.auto_cluster_silhouette_k)) ? Number(result.auto_cluster_silhouette_k) : 'N/A'}</div>
                                        )}
                                        <div><span className="font-black">Avg Silhouette:</span> {Number.isFinite(Number(result.auto_cluster_avg_silhouette)) ? Number(result.auto_cluster_avg_silhouette).toFixed(4) : 'N/A'}</div>
                                        {manualClusterKEnabledResult && (
                                            <div>
                                                <span className="font-black">Manual k used:</span>{' '}
                                                {manualClusterKUsedResult != null ? manualClusterKUsedResult : 'N/A'}
                                                {manualClusterKRequestedResult != null && manualClusterKUsedResult !== manualClusterKRequestedResult
                                                    ? ` (requested ${manualClusterKRequestedResult})`
                                                    : ''}
                                            </div>
                                        )}
                                        {manualClusterKWarningResult && (
                                            <div className="text-amber-700 dark:text-amber-200">{manualClusterKWarningResult}</div>
                                        )}
                                        <div><span className="font-black">Grouping used in PCA plot:</span> {result.grouping_variable || 'Auto Clusters'}</div>
                                    </div>
                                </div>
                            </Card>
                        )}
                        {(isMultivariatePcaResult || isMultivariatePcaBiplotResult) && Boolean(result.auto_cluster_requested) && !(result.auto_cluster_before_pca || result.auto_cluster_before_pca_biplot || result.auto_cluster_after_pca || result.auto_cluster_after_pca_biplot) && result.auto_cluster_warning && (
                            <Card title="Pre-Clustering Note" icon={TableIcon}>
                                <div className="p-3 text-xs rounded-lg border border-amber-100 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-900/20 text-amber-700 dark:text-amber-200">
                                    {result.auto_cluster_warning}
                                </div>
                            </Card>
                        )}
                        {heatmapPublicationFeatures && String(heatmapPublicationFeatures.context || '').toLowerCase() !== 'hclust_clustered' && (
                            <Card title="Heatmap Publication Features" icon={TableIcon}>
                                <div className="space-y-3">
                                    <div className="p-3 text-xs rounded-lg border border-cyan-100 dark:border-cyan-800 bg-cyan-50/60 dark:bg-cyan-900/20 text-cyan-800 dark:text-cyan-200">
                                        <div><span className="font-black">Context:</span> {heatmapPublicationFeatures.context || 'heatmap'}</div>
                                        <div><span className="font-black">Metric:</span> {heatmapPublicationFeatures.metric || 'Value'}</div>
                                        <div>
                                            <span className="font-black">Grid:</span>{' '}
                                            {Number.isFinite(Number(heatmapPublicationFeatures?.dimensions?.rows)) ? Number(heatmapPublicationFeatures.dimensions.rows) : 'N/A'}
                                            {' '}x{' '}
                                            {Number.isFinite(Number(heatmapPublicationFeatures?.dimensions?.columns)) ? Number(heatmapPublicationFeatures.dimensions.columns) : 'N/A'}
                                            {' '}(
                                            {Number.isFinite(Number(heatmapPublicationFeatures?.dimensions?.cells)) ? Number(heatmapPublicationFeatures.dimensions.cells) : 'N/A'} cells)
                                        </div>
                                        <div><span className="font-black">Valid cells:</span> {Number.isFinite(Number(heatmapPublicationFeatures.valid_cells)) ? Number(heatmapPublicationFeatures.valid_cells) : 'N/A'}</div>
                                        <div>
                                            <span className="font-black">Range:</span>{' '}
                                            {Number.isFinite(Number(heatmapPublicationFeatures?.summary?.min)) ? Number(heatmapPublicationFeatures.summary.min).toFixed(4) : 'N/A'}
                                            {' '}to{' '}
                                            {Number.isFinite(Number(heatmapPublicationFeatures?.summary?.max)) ? Number(heatmapPublicationFeatures.summary.max).toFixed(4) : 'N/A'}
                                        </div>
                                        <div>
                                            <span className="font-black">Median / Mean:</span>{' '}
                                            {Number.isFinite(Number(heatmapPublicationFeatures?.summary?.median)) ? Number(heatmapPublicationFeatures.summary.median).toFixed(4) : 'N/A'}
                                            {' '} /{' '}
                                            {Number.isFinite(Number(heatmapPublicationFeatures?.summary?.mean)) ? Number(heatmapPublicationFeatures.summary.mean).toFixed(4) : 'N/A'}
                                        </div>
                                    </div>
                                    {heatmapPublicationTopCells.length > 0 && (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs text-left">
                                                <thead className="bg-gray-50 dark:bg-gray-900 font-bold text-gray-500 uppercase">
                                                    <tr>
                                                        <th className="p-2">Row</th>
                                                        <th className="p-2">Column</th>
                                                        <th className="p-2">Value</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y dark:divide-gray-800">
                                                    {heatmapPublicationTopCells.map((cell, idx) => (
                                                        <tr key={`heatmap_top_cell_${idx}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                            <td className="p-2 font-semibold truncate max-w-[180px]" title={String(cell?.row || '')}>{String(cell?.row || 'N/A')}</td>
                                                            <td className="p-2 font-semibold truncate max-w-[180px]" title={String(cell?.column || '')}>{String(cell?.column || 'N/A')}</td>
                                                            <td className="p-2 font-mono">{Number.isFinite(Number(cell?.value)) ? Number(cell.value).toFixed(4) : 'N/A'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        )}
                        {isMultivariateHclustResult && Array.isArray(result.cluster_assignments) && result.cluster_assignments.length > 0 && (
                            <Card title="Cluster Classification (Individuals)" icon={TableIcon}>
                                    <div className="space-y-2">
                                        <div className="text-xs text-gray-600 dark:text-gray-300">
                                        {Number.isFinite(Number(result?.k))
                                            ? <>{manualClusterKEnabledResult ? 'Manual clusters selected:' : 'Optimal clusters selected:'} <span className="font-black text-indigo-600 dark:text-indigo-300">k = {Number(result.k)}</span></>
                                            : <>Cluster labels generated for individuals.</>}
                                        {result.cluster_assignments_truncated ? ' Showing first 1000 rows.' : ''}
                                    </div>
                                    {manualClusterKEnabledResult && (
                                        <div className="text-xs text-emerald-700 dark:text-emerald-200 rounded-lg border border-emerald-100 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-900/20 p-3">
                                            Manual k is active for this analysis.
                                            {' '}Used k = {manualClusterKUsedResult != null ? manualClusterKUsedResult : 'N/A'}.
                                            {manualClusterKRequestedResult != null && manualClusterKUsedResult !== manualClusterKRequestedResult
                                                ? ` Requested k = ${manualClusterKRequestedResult}.`
                                                : ''}
                                            {manualClusterKWarningResult ? ` ${manualClusterKWarningResult}` : ''}
                                        </div>
                                    )}
                                    <div className="overflow-x-auto max-h-[360px] rounded-lg border border-gray-100 dark:border-gray-700">
                                        <table className="w-full text-xs text-left">
                                            <thead className="bg-gray-50 dark:bg-gray-900 font-bold text-gray-500 uppercase">
                                                <tr>
                                                    {Object.keys(result.cluster_assignments[0] || {}).map((col) => (
                                                        <th key={`hclust_assign_head_${col}`} className="p-2">{col}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y dark:divide-gray-800">
                                                {result.cluster_assignments.slice(0, 1000).map((row, idx) => (
                                                    <tr key={`hclust_assign_row_${idx}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                        {Object.keys(result.cluster_assignments[0] || {}).map((col) => (
                                                            <td key={`hclust_assign_${idx}_${col}`} className="p-2 truncate max-w-[220px]" title={String(row?.[col] ?? '')}>
                                                                {String(row?.[col] ?? 'N/A')}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </Card>
                        )}

                        {/* Eigenvalues */}
                        {result.eigenvalues && (
                            <Card title={eigenvaluesTitle} icon={TableIcon}>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-gray-50 dark:bg-gray-900 font-bold text-gray-500 uppercase">
                                            <tr>
                                                <th className="p-2">{eigenvaluesAxisLabel}</th>
                                                <th className="p-2">Eigenvalue</th>
                                                <th className="p-2">% Var</th>
                                                <th className="p-2">Cum %</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y dark:divide-gray-800">
                                            {result.eigenvalues.slice(0, 10).map((row, i) => (
                                                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                    <td className="p-2 font-bold">{resolveEigenAxisLabel(row)}</td>
                                                    <td className="p-2">{row.Eigenvalue}</td>
                                                    <td className="p-2">{row.Variance_Percent}%</td>
                                                    <td className="p-2">{row.Cumulative_Percent}%</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        )}

                        {/* Loadings */}
                        {result.loadings && (isPcaFamilyResult || isMultivariateCoinertiaResult) && (
                            <Card title={loadingsTitle} icon={TableIcon}>
                                <div className="overflow-x-auto max-h-[400px]">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-gray-50 dark:bg-gray-900 font-bold text-gray-500 uppercase">
                                            <tr>
                                                <th className="p-2">Variable</th>
                                                <th className="p-2">{loadingsAxisLabel1}</th>
                                                <th className="p-2">{loadingsAxisLabel2}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y dark:divide-gray-800">
                                            {result.loadings.map((row, i) => (
                                                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                    <td className="p-2 font-bold truncate max-w-[100px]" title={row.Variable}>{row.Variable}</td>
                                                    <td className="p-2">{fmt(resolveLoadingValue(row, loadingsAxisLabel1), 3)}</td>
                                                    <td className="p-2">{fmt(resolveLoadingValue(row, loadingsAxisLabel2), 3)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        )}

                        {showCaMcaIntervalPanel && (
                            <Card title="Created Intervals (CA)" icon={TableIcon}>
                                <div className="space-y-3">
                                    <div className="text-[11px] leading-relaxed text-gray-600 dark:text-gray-300 rounded-lg border border-indigo-100 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-900/20 p-3">
                                        <div>
                                            <span className="font-black">Requested bins:</span>{' '}
                                            {Number.isFinite(Number(result?.ca_mca_numeric_binning?.bins_requested))
                                                ? Number(result.ca_mca_numeric_binning.bins_requested)
                                                : 'N/A'}
                                        </div>
                                        {Array.isArray(result?.ca_mca_numeric_binning?.transformed_variables) && result.ca_mca_numeric_binning.transformed_variables.length > 0 && (
                                            <div>
                                                <span className="font-black">Binned variables:</span>{' '}
                                                {result.ca_mca_numeric_binning.transformed_variables.join(', ')}
                                            </div>
                                        )}
                                    </div>
                                    {caIntervalContingencyTable ? (
                                        <div className="rounded-lg border border-gray-100 dark:border-gray-700 p-2">
                                            {caIntervalContingencyTable.title && (
                                                <div className="text-xs font-black text-gray-700 dark:text-gray-200 mb-2">
                                                    {caIntervalContingencyTable.title}
                                                </div>
                                            )}
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-xs text-left">
                                                    <thead className="bg-gray-50 dark:bg-gray-900 font-bold text-gray-500 uppercase">
                                                        <tr>
                                                            <th className="p-2">{caIntervalContingencyTable.rowLabel || 'Interval'}</th>
                                                            {caIntervalContingencyTable.columnLevels.map((level) => (
                                                                <th key={`ca_cont_col_${level}`} className="p-2">{level}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y dark:divide-gray-800">
                                                        {caIntervalContingencyTable.rows.map((row, rowIdx) => (
                                                            <tr key={`ca_cont_row_${rowIdx}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                                <td className="p-2 font-mono">{row.interval}</td>
                                                                {caIntervalContingencyTable.columnLevels.map((level) => (
                                                                    <td key={`ca_cont_cell_${rowIdx}_${level}`} className="p-2">
                                                                        {Number.isFinite(Number(row.counts?.[level])) ? Number(row.counts[level]) : 0}
                                                                    </td>
                                                                ))}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ) : (
                                        caMcaIntervalTables.map((intervalBlock, blockIdx) => (
                                            <div
                                                key={`ca_mca_interval_block_${intervalBlock.variableName}_${blockIdx}`}
                                                className="rounded-lg border border-gray-100 dark:border-gray-700 p-2"
                                            >
                                                <div className="text-xs font-black text-gray-700 dark:text-gray-200 mb-2">
                                                    {intervalBlock.variableName}
                                                </div>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-xs text-left">
                                                        <thead className="bg-gray-50 dark:bg-gray-900 font-bold text-gray-500 uppercase">
                                                            <tr>
                                                                <th className="p-2">Interval</th>
                                                                <th className="p-2">Count</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y dark:divide-gray-800">
                                                            {intervalBlock.rows.map((row, rowIdx) => (
                                                                <tr key={`ca_mca_interval_row_${blockIdx}_${rowIdx}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                                    <td className="p-2 font-mono">{row.interval}</td>
                                                                    <td className="p-2">{Number.isFinite(Number(row.count)) ? Number(row.count) : 'N/A'}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </Card>
                        )}

                        {/* CA Coordinates */}
                        {(result.ca_row_coordinates || result.ca_col_coordinates) && (
                            <Card title="CA Coordinates" icon={TableIcon}>
                                <div className="space-y-3">
                                    {result.ca_summary && (
                                        <div className="text-[11px] leading-relaxed text-gray-600 dark:text-gray-300 rounded-lg border border-indigo-100 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-900/20 p-3">
                                            <div>
                                                <span className="font-black">Table:</span>{' '}
                                                {result.ca_summary.row_variable} × {result.ca_summary.column_variable}
                                                {' '}({result.ca_summary.row_levels} × {result.ca_summary.col_levels}, N = {result.ca_summary.total_n})
                                            </div>
                                            <div>
                                                <span className="font-black">Dimensions:</span>{' '}
                                                {Number.isFinite(Number(result.ca_summary.retained_dimensions))
                                                    ? Number(result.ca_summary.retained_dimensions)
                                                    : 'N/A'}
                                                {' '}retained
                                                {Number.isFinite(Number(result.ca_summary.theoretical_max_dimensions))
                                                    ? ` / ${Number(result.ca_summary.theoretical_max_dimensions)} theoretical max`
                                                    : ''}
                                            </div>
                                            {result.ca_chi_square && !result.ca_chi_square.error && (
                                                <>
                                                    <div>
                                                        <span className="font-black">Chi-square:</span>{' '}
                                                        {Number.isFinite(Number(result.ca_chi_square.statistic))
                                                            ? Number(result.ca_chi_square.statistic).toFixed(3)
                                                            : 'N/A'}
                                                        {' '} (df = {Number.isFinite(Number(result.ca_chi_square.df)) ? Number(result.ca_chi_square.df) : 'N/A'})
                                                        {', '}p = {Number.isFinite(Number(result.ca_chi_square.p_value)) ? Number(result.ca_chi_square.p_value).toExponential(2) : 'N/A'}
                                                    </div>
                                                    <div>
                                                        <span className="font-black">Cramer's V:</span>{' '}
                                                        {Number.isFinite(Number(result.ca_chi_square.cramers_v))
                                                            ? Number(result.ca_chi_square.cramers_v).toFixed(4)
                                                            : 'N/A'}
                                                    </div>
                                                </>
                                            )}
                                            {result.ca_chi_square?.error && (
                                                <div>
                                                    <span className="font-black">Chi-square:</span> {result.ca_chi_square.error}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {caNotes.length > 0 && (
                                        <div className="space-y-2">
                                            {caNotes.map((note, noteIdx) => (
                                                <div
                                                    key={`ca_note_${noteIdx}`}
                                                    className="text-[11px] text-amber-700 dark:text-amber-200 rounded-lg border border-amber-100 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-900/20 p-3"
                                                >
                                                    {note}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {result.ca_row_coordinates && (
                                        <div className="overflow-x-auto max-h-[220px] rounded-lg border border-gray-100 dark:border-gray-700">
                                            <table className="w-full text-xs text-left">
                                                <thead className="bg-gray-50 dark:bg-gray-900 font-bold text-gray-500 uppercase">
                                                    <tr>
                                                        <th className="p-2">Row Level</th>
                                                        {caRowCoordinateColumns.length > 0 ? (
                                                            caRowCoordinateColumns.map((dimName) => (
                                                                <th key={`ca_row_dim_header_${dimName}`} className="p-2">{dimName}</th>
                                                            ))
                                                        ) : (
                                                            <th className="p-2">Coordinates</th>
                                                        )}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y dark:divide-gray-800">
                                                    {result.ca_row_coordinates.slice(0, 12).map((row, i) => (
                                                        <tr key={`ca_row_${i}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                            <td className="p-2 font-semibold truncate max-w-[140px]" title={row.Level}>{row.Level}</td>
                                                            {caRowCoordinateColumns.length > 0 ? (
                                                                caRowCoordinateColumns.map((dimName) => (
                                                                    <td key={`ca_row_${i}_${dimName}`} className="p-2 font-mono">{fmt(row?.[dimName], 3)}</td>
                                                                ))
                                                            ) : (
                                                                <td className="p-2 font-mono">N/A</td>
                                                            )}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                    {result.ca_col_coordinates && (
                                        <div className="overflow-x-auto max-h-[220px] rounded-lg border border-gray-100 dark:border-gray-700">
                                            <table className="w-full text-xs text-left">
                                                <thead className="bg-gray-50 dark:bg-gray-900 font-bold text-gray-500 uppercase">
                                                    <tr>
                                                        <th className="p-2">Column Level</th>
                                                        {caColCoordinateColumns.length > 0 ? (
                                                            caColCoordinateColumns.map((dimName) => (
                                                                <th key={`ca_col_dim_header_${dimName}`} className="p-2">{dimName}</th>
                                                            ))
                                                        ) : (
                                                            <th className="p-2">Coordinates</th>
                                                        )}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y dark:divide-gray-800">
                                                    {result.ca_col_coordinates.slice(0, 12).map((row, i) => (
                                                        <tr key={`ca_col_${i}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                            <td className="p-2 font-semibold truncate max-w-[140px]" title={row.Level}>{row.Level}</td>
                                                            {caColCoordinateColumns.length > 0 ? (
                                                                caColCoordinateColumns.map((dimName) => (
                                                                    <td key={`ca_col_${i}_${dimName}`} className="p-2 font-mono">{fmt(row?.[dimName], 3)}</td>
                                                                ))
                                                            ) : (
                                                                <td className="p-2 font-mono">N/A</td>
                                                            )}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        )}

                        {/* MCA Coordinates */}
                        {(result.mca_category_coordinates || result.mca_individual_coordinates) && (
                            <Card title="MCA Coordinates" icon={TableIcon}>
                                <div className="space-y-3">
                                    {result.mca_summary && (
                                        <div className="text-[11px] leading-relaxed text-gray-600 dark:text-gray-300 rounded-lg border border-indigo-100 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-900/20 p-3">
                                            <div>
                                                <span className="font-black">Variables:</span>{' '}
                                                {Array.isArray(result.mca_summary.variables) ? result.mca_summary.variables.join(', ') : 'N/A'}
                                            </div>
                                            <div>
                                                <span className="font-black">Rows:</span>{' '}
                                                {Number.isFinite(Number(result.mca_summary.total_n)) ? Number(result.mca_summary.total_n) : 'N/A'}
                                                {' '}| <span className="font-black">Modalities:</span>{' '}
                                                {Number.isFinite(Number(result.mca_summary.total_modalities)) ? Number(result.mca_summary.total_modalities) : 'N/A'}
                                            </div>
                                            <div>
                                                <span className="font-black">Dimensions:</span>{' '}
                                                {Number.isFinite(Number(result.mca_summary.retained_dimensions))
                                                    ? Number(result.mca_summary.retained_dimensions)
                                                    : 'N/A'}
                                                {' '}retained
                                                {Number.isFinite(Number(result.mca_summary.theoretical_max_dimensions))
                                                    ? ` / ${Number(result.mca_summary.theoretical_max_dimensions)} theoretical max`
                                                    : ''}
                                            </div>
                                        </div>
                                    )}
                                    {result.mca_grouping_source === 'auto_clustering' && (
                                        <div className="text-[11px] leading-relaxed text-indigo-700 dark:text-indigo-200 rounded-lg border border-indigo-100 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-900/20 p-3">
                                            <div>
                                                <span className="font-black">Grouping:</span>{' '}
                                                {String(result.mca_auto_clustering_strategy || '').toLowerCase() === 'kmeans_large_n'
                                                    && String(result.mca_auto_clustering_method_requested || '').toLowerCase() === 'hierarchical'
                                                    ? 'MCA auto-clusters (Hierarchical requested, switched to scalable k-means for large n).'
                                                    : (String(result.mca_auto_clustering_method || '').toLowerCase() === 'hierarchical'
                                                        ? 'MCA auto-clusters (Ward.D2 + Euclidean).'
                                                        : 'MCA auto-clusters (k-means).')}
                                            </div>
                                            <div>
                                                <span className="font-black">Stage:</span>{' '}
                                                {String(result.mca_auto_clustering_stage_used || result.mca_auto_clustering_stage_requested || 'after').toLowerCase()}
                                                {' '}|{' '}
                                                <span className="font-black">Final k:</span>{' '}
                                                {Number.isFinite(Number(result.mca_auto_cluster_k)) ? Number(result.mca_auto_cluster_k) : 'N/A'}
                                                {String(result.mca_auto_clustering_method || '').toLowerCase() === 'kmeans' && String(result.mca_auto_cluster_optimization_method || '').toLowerCase() !== 'manual_k' ? (
                                                  <>
                                                    {' '}| <span className="font-black">Elbow k:</span>{' '}
                                                    {Number.isFinite(Number(result.mca_auto_cluster_elbow_k)) ? Number(result.mca_auto_cluster_elbow_k) : 'N/A'}
                                                  </>
                                                ) : null}
                                                {String(result.mca_auto_clustering_method || '').toLowerCase() === 'kmeans' && String(result.mca_auto_cluster_optimization_method || '').toLowerCase() !== 'manual_k' ? (
                                                  <>
                                                    {' '}| <span className="font-black">Silhouette k:</span>{' '}
                                                    {Number.isFinite(Number(result.mca_auto_cluster_silhouette_k)) ? Number(result.mca_auto_cluster_silhouette_k) : 'N/A'}
                                                  </>
                                                ) : null}
                                            </div>
                                            <div>
                                                <span className="font-black">Method:</span>{' '}
                                                {String(result.mca_auto_clustering_method || '').toLowerCase() === 'hierarchical'
                                                    ? 'Hierarchical (Ward.D2)'
                                                    : 'K-means'}
                                                {String(result.mca_auto_clustering_method_requested || '').toLowerCase()
                                                  && String(result.mca_auto_clustering_method || '').toLowerCase()
                                                  && String(result.mca_auto_clustering_method_requested || '').toLowerCase()
                                                    !== String(result.mca_auto_clustering_method || '').toLowerCase()
                                                  ? (
                                                    <>
                                                      {' '}| <span className="font-black">Requested:</span>{' '}
                                                      {String(result.mca_auto_clustering_method_requested || '').toLowerCase() === 'hierarchical'
                                                        ? 'Hierarchical'
                                                        : 'K-means'}
                                                    </>
                                                  )
                                                  : null}
                                                {String(result.mca_auto_clustering_method || '').toLowerCase() === 'kmeans' && String(result.mca_auto_cluster_optimization_method || '').toLowerCase() !== 'manual_k' ? (
                                                  <>
                                                    {' '}| <span className="font-black">Kmeans optimization:</span>{' '}
                                                    {String(result.mca_auto_cluster_optimization_method || 'both').toLowerCase()}
                                                  </>
                                                ) : null}
                                                {' '}| <span className="font-black">Avg silhouette:</span>{' '}
                                                {Number.isFinite(Number(result.mca_auto_cluster_avg_silhouette))
                                                    ? Number(result.mca_auto_cluster_avg_silhouette).toFixed(4)
                                                    : 'N/A'}
                                            </div>
                                            {manualClusterKEnabledResult && (
                                                <div>
                                                    <span className="font-black">Manual k used:</span>{' '}
                                                    {manualClusterKUsedResult != null ? manualClusterKUsedResult : 'N/A'}
                                                    {manualClusterKRequestedResult != null && manualClusterKUsedResult !== manualClusterKRequestedResult
                                                        ? ` (requested ${manualClusterKRequestedResult})`
                                                        : ''}
                                                </div>
                                            )}
                                            {manualClusterKWarningResult && (
                                                <div>{manualClusterKWarningResult}</div>
                                            )}
                                        </div>
                                    )}

                                    {mcaNotes.length > 0 && (
                                        <div className="space-y-2">
                                            {mcaNotes.map((note, noteIdx) => (
                                                <div
                                                    key={`mca_note_${noteIdx}`}
                                                    className="text-[11px] text-amber-700 dark:text-amber-200 rounded-lg border border-amber-100 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-900/20 p-3"
                                                >
                                                    {note}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {result.mca_category_coordinates && (
                                        <div className="overflow-x-auto max-h-[220px] rounded-lg border border-gray-100 dark:border-gray-700">
                                            <table className="w-full text-xs text-left">
                                                <thead className="bg-gray-50 dark:bg-gray-900 font-bold text-gray-500 uppercase">
                                                    <tr>
                                                        <th className="p-2">Category</th>
                                                        <th className="p-2">Variable</th>
                                                        <th className="p-2">Level</th>
                                                        {mcaCategoryCoordinateColumns.length > 0 ? (
                                                            mcaCategoryCoordinateColumns.map((dimName) => (
                                                                <th key={`mca_cat_dim_header_${dimName}`} className="p-2">{dimName}</th>
                                                            ))
                                                        ) : (
                                                            <th className="p-2">Coordinates</th>
                                                        )}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y dark:divide-gray-800">
                                                    {result.mca_category_coordinates.slice(0, 12).map((row, i) => (
                                                        <tr key={`mca_cat_${i}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                            <td className="p-2 font-semibold truncate max-w-[180px]" title={row.Category}>{row.Category}</td>
                                                            <td className="p-2">{row.Variable}</td>
                                                            <td className="p-2">{row.Level}</td>
                                                            {mcaCategoryCoordinateColumns.length > 0 ? (
                                                                mcaCategoryCoordinateColumns.map((dimName) => (
                                                                    <td key={`mca_cat_${i}_${dimName}`} className="p-2 font-mono">{fmt(row?.[dimName], 3)}</td>
                                                                ))
                                                            ) : (
                                                                <td className="p-2 font-mono">N/A</td>
                                                            )}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {result.mca_individual_coordinates && (
                                        <div className="overflow-x-auto max-h-[220px] rounded-lg border border-gray-100 dark:border-gray-700">
                                            <table className="w-full text-xs text-left">
                                                <thead className="bg-gray-50 dark:bg-gray-900 font-bold text-gray-500 uppercase">
                                                    <tr>
                                                        <th className="p-2">Observation</th>
                                                        {mcaIndividualCoordinateColumns.length > 0 ? (
                                                            mcaIndividualCoordinateColumns.map((dimName) => (
                                                                <th key={`mca_row_dim_header_${dimName}`} className="p-2">{dimName}</th>
                                                            ))
                                                        ) : (
                                                            <th className="p-2">Coordinates</th>
                                                        )}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y dark:divide-gray-800">
                                                    {result.mca_individual_coordinates.slice(0, 12).map((row, i) => (
                                                        <tr key={`mca_row_${i}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                            <td className="p-2 font-semibold">{row.Observation}</td>
                                                            {mcaIndividualCoordinateColumns.length > 0 ? (
                                                                mcaIndividualCoordinateColumns.map((dimName) => (
                                                                    <td key={`mca_row_${i}_${dimName}`} className="p-2 font-mono">{fmt(row?.[dimName], 3)}</td>
                                                                ))
                                                            ) : (
                                                                <td className="p-2 font-mono">N/A</td>
                                                            )}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {Number.isFinite(Number(result.mca_individual_count_total)) && Number(result.mca_individual_count_total) > 12 && (
                                        <div className="text-[11px] text-gray-500 dark:text-gray-400">
                                            Showing first 12 individuals out of {Number(result.mca_individual_count_total)}.
                                        </div>
                                    )}
                                </div>
                            </Card>
                        )}

                        {/* Co-Inertia Summary */}
                        {(result.coinertia_summary || result.coinertia_individual_coordinates) && (
                            <Card title="Co-Inertia Summary" icon={TableIcon}>
                                <div className="space-y-3">
                                    {result.coinertia_summary && (
                                        <div className="text-[11px] leading-relaxed text-gray-600 dark:text-gray-300 rounded-lg border border-indigo-100 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-900/20 p-3">
                                            <div>
                                                <span className="font-black">Block X:</span>{' '}
                                                {Array.isArray(result.coinertia_summary.x_variables) ? result.coinertia_summary.x_variables.join(', ') : 'N/A'}
                                            </div>
                                            <div>
                                                <span className="font-black">Block Y:</span>{' '}
                                                {Array.isArray(result.coinertia_summary.y_variables) ? result.coinertia_summary.y_variables.join(', ') : 'N/A'}
                                            </div>
                                            <div>
                                                <span className="font-black">Rows:</span>{' '}
                                                {Number.isFinite(Number(result.coinertia_summary.total_n)) ? Number(result.coinertia_summary.total_n) : 'N/A'}
                                                {' '}| <span className="font-black">Retained axes:</span>{' '}
                                                {Number.isFinite(Number(result.coinertia_summary.retained_dimensions)) ? Number(result.coinertia_summary.retained_dimensions) : 'N/A'}
                                            </div>
                                            <div>
                                                <span className="font-black">Total shared covariance:</span>{' '}
                                                {Number.isFinite(Number(result.coinertia_total_covariance)) ? Number(result.coinertia_total_covariance).toFixed(4) : 'N/A'}
                                            </div>
                                        </div>
                                    )}

                                    {Array.isArray(result.coinertia_notes) && result.coinertia_notes.length > 0 && (
                                        <div className="space-y-2">
                                            {result.coinertia_notes.map((note, noteIdx) => (
                                                <div
                                                    key={`coinertia_note_${noteIdx}`}
                                                    className="text-[11px] text-amber-700 dark:text-amber-200 rounded-lg border border-amber-100 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-900/20 p-3"
                                                >
                                                    {note}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {result.coinertia_individual_coordinates && (
                                        <div className="overflow-x-auto max-h-[220px] rounded-lg border border-gray-100 dark:border-gray-700">
                                            <table className="w-full text-xs text-left">
                                                <thead className="bg-gray-50 dark:bg-gray-900 font-bold text-gray-500 uppercase">
                                                    <tr>
                                                        <th className="p-2">Observation</th>
                                                        <th className="p-2">Dim1</th>
                                                        <th className="p-2">Dim2</th>
                                                        <th className="p-2">X Dim1</th>
                                                        <th className="p-2">Y Dim1</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y dark:divide-gray-800">
                                                    {result.coinertia_individual_coordinates.slice(0, 12).map((row, i) => (
                                                        <tr key={`coinertia_row_${i}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                            <td className="p-2 font-semibold">{row.Observation}</td>
                                                            <td className="p-2 font-mono">{fmt(row?.Dim1, 3)}</td>
                                                            <td className="p-2 font-mono">{fmt(row?.Dim2, 3)}</td>
                                                            <td className="p-2 font-mono">{fmt(row?.X_Dim1, 3)}</td>
                                                            <td className="p-2 font-mono">{fmt(row?.Y_Dim1, 3)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        )}

                        {/* BCA Group Summary */}
                        {result.bca_group_summary && (
                            <Card title="BCA Group Summary" icon={TableIcon}>
                                <div className="space-y-3">
                                    <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-gray-700">
                                        <table className="w-full text-xs text-left">
                                            <thead className="bg-gray-50 dark:bg-gray-900 font-bold text-gray-500 uppercase">
                                                <tr>
                                                    <th className="p-2">Group</th>
                                                    <th className="p-2">N</th>
                                                    <th className="p-2">Proportion</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y dark:divide-gray-800">
                                                {result.bca_group_summary.map((row, i) => (
                                                    <tr key={`bca_group_${i}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                        <td className="p-2 font-semibold truncate max-w-[140px]" title={row.Group}>{row.Group}</td>
                                                        <td className="p-2 font-mono">{row.N}</td>
                                                        <td className="p-2 font-mono">{Number.isFinite(Number(row.Proportion)) ? `${(Number(row.Proportion) * 100).toFixed(1)}%` : 'N/A'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="text-[11px] text-gray-500 dark:text-gray-400">
                                        Between-class inertia ratio: {Number.isFinite(Number(result.between_inertia_ratio)) ? Number(result.between_inertia_ratio).toFixed(4) : 'N/A'}
                                    </div>
                                </div>
                            </Card>
                        )}

                        {/* K-Means Centers */}
                        {result.cluster_centers && (
                            <Card title="Cluster Centers" icon={TableIcon}>
                                <div className="overflow-x-auto max-h-[400px]">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-gray-50 dark:bg-gray-900 font-bold text-gray-500 uppercase">
                                            <tr>
                                                <th className="p-2">Cluster</th>
                                                <th className="p-2">Size</th>
                                                {result.predictors.slice(0, 2).map(p => <th key={p} className="p-2 truncate max-w-[80px]" title={p}>{p}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y dark:divide-gray-800">
                                            {result.cluster_centers.map((row, i) => (
                                                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                    <td className="p-2 font-bold text-pink-600">#{i+1}</td>
                                                    <td className="p-2 font-mono">{result.cluster_sizes && result.cluster_sizes[i]}</td>
                                                    {result.predictors.slice(0, 2).map(p => (
                                                        <td key={p} className="p-2">{fmt(row[p], 2)}</td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <p className="text-[10px] text-gray-400 p-2 italic">Showing first 2 variables only.</p>
                                </div>
                            </Card>
                        )}
                     </div>
                </div>
            </div>
        )}

        {/* Inferential Statistics Results */}
        {console.log('🔍 Checking inferential mode. result:', result, 'mode:', result?.mode, 'is inferential?:', result?.mode === 'inferential')}
        {isBiostatsModeEnabled && result && (result.mode === 'inferential' || result?.correlation_matrix) && (
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">
                {isOneValueResult && (
                    <section className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-cyan-500 bg-cyan-50 dark:bg-cyan-900/20 px-3 py-1 rounded-full w-fit">
                            Step 03: One Value Comparison
                        </h3>
                        <Card title="One Value Comparison" icon={FlaskConical}>
                            <div className="space-y-6">
                                <div className="p-4 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-xl border border-cyan-100 dark:border-cyan-800/30">
                                    <h4 className="font-bold text-cyan-900 dark:text-cyan-100 mb-2">
                                        {result.one_value?.message || result.message || 'One-value comparison result was not returned by R.'}
                                    </h4>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                        <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Variable</div>
                                        <div className="text-lg font-black text-gray-800 dark:text-gray-100">{result.one_value?.variable || result.target_variable || responseVar || 'N/A'}</div>
                                    </div>
                                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                        <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Data Type</div>
                                        <div className="text-lg font-black text-gray-800 dark:text-gray-100">{result.one_value?.data_type || result.target_type || 'N/A'}</div>
                                    </div>
                                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                        <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Selected Test</div>
                                        <div className="text-sm font-black text-gray-800 dark:text-gray-100">{result.one_value?.selected_test || result.test_type || 'N/A'}</div>
                                    </div>
                                </div>

                                {result.ttest && (
                                  <div className="rounded-lg border border-cyan-200 dark:border-cyan-800 bg-cyan-50/60 dark:bg-cyan-900/20 p-3 text-xs space-y-1">
                                    <div><span className="font-black">Test:</span> {result.ttest.test_name || 'One-sample t-test'}</div>
                                    <div><span className="font-black">t:</span> {Number.isFinite(Number(result.ttest.statistic)) ? Number(result.ttest.statistic).toFixed(3) : 'N/A'} | <span className="font-black">df:</span> {Number.isFinite(Number(result.ttest.df)) ? Number(result.ttest.df).toFixed(3) : 'N/A'} | <span className="font-black">p:</span> {result.ttest.formatted_p || 'N/A'}</div>
                                    <div><span className="font-black">Mean:</span> {Number.isFinite(Number(result.ttest.mean1)) ? Number(result.ttest.mean1).toFixed(3) : 'N/A'} | <span className="font-black">Reference:</span> {Number.isFinite(Number(result.ttest.mean2)) ? Number(result.ttest.mean2).toFixed(3) : 'N/A'}</div>
                                    {result.shapiro && Object.values(result.shapiro)[0] && (
                                      <div><span className="font-black">Normality (Shapiro):</span> {Object.values(result.shapiro)[0]?.formatted_p || 'N/A'} ({Object.values(result.shapiro)[0]?.is_normal ? 'normal' : 'not normal'})</div>
                                    )}
                                  </div>
                                )}

                                {result.wilcoxon && (
                                  <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-900/20 p-3 text-xs space-y-1">
                                    <div><span className="font-black">Test:</span> {result.wilcoxon.test_name || 'Wilcoxon Signed-Rank Test (One-Sample)'}</div>
                                    <div><span className="font-black">Statistic:</span> {Number.isFinite(Number(result.wilcoxon.statistic)) ? Number(result.wilcoxon.statistic).toFixed(3) : 'N/A'} | <span className="font-black">p:</span> {result.wilcoxon.formatted_p || 'N/A'}</div>
                                    <div><span className="font-black">Median:</span> {Number.isFinite(Number(result.wilcoxon.median1)) ? Number(result.wilcoxon.median1).toFixed(3) : 'N/A'} | <span className="font-black">Reference:</span> {Number.isFinite(Number(result.wilcoxon.median2)) ? Number(result.wilcoxon.median2).toFixed(3) : 'N/A'}</div>
                                  </div>
                                )}

                                {result.one_value?.proportion_test && (
                                  <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50/60 dark:bg-green-900/20 p-3 text-xs space-y-1">
                                    <div><span className="font-black">Test:</span> {result.one_value.proportion_test.method || 'Proportion test'}</div>
                                    <div><span className="font-black">{result.one_value.proportion_test.statistic_label || 'Statistic'}:</span> {Number.isFinite(Number(result.one_value.proportion_test.statistic)) ? Number(result.one_value.proportion_test.statistic).toFixed(3) : 'N/A'} | <span className="font-black">p:</span> {result.one_value.proportion_test.formatted_p || 'N/A'}</div>
                                    <div><span className="font-black">Observed p:</span> {Number.isFinite(Number(result.one_value.observed_proportion)) ? Number(result.one_value.observed_proportion).toFixed(4) : 'N/A'} | <span className="font-black">Reference p0:</span> {Number.isFinite(Number(result.one_value.reference_proportion)) ? Number(result.one_value.reference_proportion).toFixed(4) : 'N/A'}</div>
                                    <div><span className="font-black">Success:</span> {result.one_value.success_level || 'N/A'} ({result.one_value.observed_successes ?? 'N/A'}/{result.one_value.n_total ?? 'N/A'})</div>
                                  </div>
                                )}

                                {(result.one_value?.chisq_gof || result.chisq_gof) && (
                                  <div className="rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-900/20 p-3 text-xs space-y-1">
                                    {(() => {
                                      const gof = result.one_value?.chisq_gof || result.chisq_gof;
                                      const cats = Array.isArray(gof?.categories) ? gof.categories : [];
                                      const observed = Array.isArray(gof?.observed) ? gof.observed.map((v, i) => `${cats[i] || `C${i + 1}`}: ${Number(v).toFixed(3)}`).join(' | ') : 'N/A';
                                      const expected = Array.isArray(gof?.expected) ? gof.expected.map((v, i) => `${cats[i] || `C${i + 1}`}: ${Number(v).toFixed(3)}`).join(' | ') : 'N/A';
                                      return (
                                        <>
                                          <div><span className="font-black">Test:</span> Chi-square goodness-of-fit</div>
                                          <div><span className="font-black">Chi-squared:</span> {Number.isFinite(Number(gof?.statistic)) ? Number(gof.statistic).toFixed(3) : 'N/A'} | <span className="font-black">df:</span> {Number.isFinite(Number(gof?.df)) ? Number(gof.df).toFixed(3) : 'N/A'} | <span className="font-black">p:</span> {gof?.formatted_p || 'N/A'}</div>
                                          <div><span className="font-black">Observed:</span> {observed}</div>
                                          <div><span className="font-black">Expected:</span> {expected}</div>
                                        </>
                                      );
                                    })()}
                                  </div>
                                )}

                                {result.image && (
                                  <div className="rounded-lg border border-cyan-200 dark:border-cyan-800 bg-white/70 dark:bg-black/20 p-3 space-y-3">
                                    <div className="flex items-center justify-between gap-3">
                                      <div>
                                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-300">Publication Plot</div>
                                        <div className="text-[11px] text-cyan-700 dark:text-cyan-300">Distribution and inferential summary combined in one figure.</div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => setSelectedImage({ url: `data:image/png;base64,${result.image}`, title: 'One Value Publication Plot', plotKey: 'one_value_plot' })}
                                          className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 p-2 rounded-full shadow border border-gray-200 dark:border-gray-700 hover:scale-105 transition-transform"
                                          title="View fullscreen"
                                        >
                                          <Maximize2 size={14} />
                                        </button>
                                        <button
                                          onClick={() => {
                                            const link = document.createElement('a');
                                            link.href = `data:image/png;base64,${result.image}`;
                                            link.download = 'one_value_publication_plot.png';
                                            link.click();
                                          }}
                                          className="text-[10px] px-2.5 py-1.5 rounded-full border border-cyan-200 text-cyan-700 dark:text-cyan-300 dark:border-cyan-700 bg-white/70 dark:bg-cyan-900/10 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-colors font-bold uppercase tracking-wider"
                                        >
                                          Download
                                        </button>
                                      </div>
                                    </div>
                                    <img
                                      src={`data:image/png;base64,${result.image}`}
                                      alt="One-value publication plot"
                                      className="w-full rounded-lg border border-cyan-100 dark:border-cyan-900/60 shadow-sm bg-white"
                                    />
                                  </div>
                                )}
                            </div>
                        </Card>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => handleAskAI('One Value Comparison Report', generateReport(result, 'one_value'))}
                                className="text-[10px] px-3 py-1 rounded-full border border-cyan-200 text-cyan-700 dark:text-cyan-300 dark:border-cyan-700 bg-white/60 dark:bg-cyan-900/10 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-colors font-bold uppercase tracking-wider flex items-center gap-2"
                            >
                                <Bot size={12} /> Ask AI
                            </button>
                            <button
                                onClick={() => openInterpretation('One Value Comparison Report', generateReport(result, 'one_value'))}
                                className="text-[10px] px-3 py-1 rounded-full border border-cyan-200 text-cyan-700 dark:text-cyan-300 dark:border-cyan-700 bg-white/60 dark:bg-cyan-900/10 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-colors font-bold uppercase tracking-wider"
                            >
                                View Detailed Report
                            </button>
                        </div>
                    </section>
                )}
                {isChiSquareResult && (
                    <section className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1 rounded-full w-fit">
                            Step 03: Chi-Square Test
                        </h3>
                        <Card title="Chi-Square Test of Independence" icon={FlaskConical}>
                            <div className="space-y-6">
                                <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800/30">
                                    <h4 className="font-bold text-indigo-900 dark:text-indigo-100 mb-2">
                                        {result.chisq?.message || 'Chi-Square result was not returned by R.'}
                                    </h4>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                        <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Chi-Square (<span className="font-serif italic">x2</span>)</div>
                                        <div className="text-2xl font-black text-gray-800 dark:text-gray-100">{Number.isFinite(Number(result.chisq?.statistic)) ? Number(result.chisq.statistic).toFixed(3) : 'N/A'}</div>
                                    </div>
                                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                        <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">p-value</div>
                                        <div className={`text-2xl font-black ${result.chisq?.is_significant ? 'text-green-600 dark:text-green-400' : 'text-gray-800 dark:text-gray-100'}`}>
                                            {result.chisq?.formatted_p || 'N/A'}
                                        </div>
                                    </div>
                                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                        <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Cramer's V</div>
                                        <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{Number.isFinite(Number(result.chisq?.cramers_v)) ? Number(result.chisq.cramers_v).toFixed(3) : 'N/A'}</div>
                                        <div className="text-[10px] text-blue-500 uppercase font-bold mt-1">{result.chisq?.effect_size_label || 'N/A'}</div>
                                    </div>
                                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                        <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">df</div>
                                        <div className="text-2xl font-black text-gray-800 dark:text-gray-100">{Number.isFinite(Number(result.chisq?.df)) ? Number(result.chisq.df).toFixed(3) : 'N/A'}</div>
                                    </div>
                                </div>
                                <div className="rounded-lg border border-indigo-100 dark:border-indigo-800 bg-white/70 dark:bg-black/20 p-3 text-xs text-indigo-700 dark:text-indigo-300">
                                    <span className="font-black uppercase tracking-wider text-indigo-500">Correction:</span>{' '}
                                    {result.chisq?.correction_label || 'N/A'} (option: {result.chisq?.correction_option || 'auto'})
                                </div>
                            </div>
                        </Card>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => handleAskAI('Chi-Square Test Report', generateReport(result, 'chisq'))}
                                className="text-[10px] px-3 py-1 rounded-full border border-indigo-200 text-indigo-700 dark:text-indigo-300 dark:border-indigo-700 bg-white/60 dark:bg-indigo-900/10 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors font-bold uppercase tracking-wider flex items-center gap-2"
                            >
                                <Bot size={12} /> Ask AI
                            </button>
                            <button
                                onClick={() => openInterpretation('Chi-Square Test Report', generateReport(result, 'chisq'))}
                                className="text-[10px] px-3 py-1 rounded-full border border-indigo-200 text-indigo-700 dark:text-indigo-300 dark:border-indigo-700 bg-white/60 dark:bg-indigo-900/10 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors font-bold uppercase tracking-wider"
                            >
                                View Detailed Report
                            </button>
                        </div>
                    </section>
                )}

                {!isChiSquareResult && !isOneValueResult && !result.correlation_matrix && (
                <>
                {/* Extraction Guide & Header */}
                <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1 rounded-full w-fit">
                        Extraction of Shapiro-Wilk test result
                    </h3>
                    <Card title="Statistical Interpretation Guide" icon={Activity}>
                        <div className="bg-indigo-50 dark:bg-indigo-900/10 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-800/50 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <h4 className="text-[10px] font-black uppercase text-indigo-500 tracking-[0.2em]">The Test (What we check)</h4>
                                    <ul className="text-xs space-y-2 text-gray-600 dark:text-gray-400 font-medium">
                                        <li className="flex gap-2"><strong>Goal:</strong> We want to see if the data follows a standard Bell Curve (Normal).</li>
                                        <li className="flex gap-2"><strong>Target:</strong> We actually HOPE for a high p-value here (p &gt; α = {alphaForStars}).</li>
                                    </ul>
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-[10px] font-black uppercase text-indigo-500 tracking-[0.2em]">The Verdict (α = {alpha})</h4>
                                    <ul className="text-xs space-y-2 text-gray-600 dark:text-gray-400 font-medium">
                                        <li className="flex gap-2">If <strong>p ≥ α</strong>: It IS Normal (Passes). We can use standard math (Parametric).</li>
                                        <li className="flex gap-2">If <strong>p &lt; α</strong>: It is NOT Normal (Fails). We should use rank-based math (Non-Parametric).</li>
                                    </ul>
                                </div>
                            </div>
                            <div className="text-xs text-indigo-700 dark:text-indigo-300 mt-4">
                                <strong>Example:</strong> p = 0.12 (larger than α = {alphaForStars}) is GREAT. It means the data looks normal.
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Normality Results */}
                <section className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card title="P-Value results" icon={CheckCircle2}>
                            <div className="flex overflow-x-auto pb-4 gap-4 snap-x">
                                {result.shapiro && Object.entries(result.shapiro).map(([spec, res]) => (
                                    <div key={spec} className={`p-4 rounded-xl border min-w-[280px] snap-start flex-shrink-0 ${res.is_normal ? 'bg-green-50/40 border-green-100 dark:bg-green-900/10 dark:border-green-800' : 'bg-amber-50/40 border-amber-100 dark:bg-amber-900/10 dark:border-amber-800'}`}>
                                        <div className="flex justify-between items-start mb-1">
                                            <p className="text-xs font-black uppercase text-gray-400">{spec}</p>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter ${res.is_normal ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                {res.is_normal ? 'Normal' : 'Skewed'}
                                            </span>
                                        </div>
                                        <p className="text-sm font-semibold mb-2">{res.message}</p>
                                        <div className="flex flex-col gap-2 border-t dark:border-gray-800 pt-4 mt-2">
                                            <div className="flex justify-between items-center bg-gray-50 dark:bg-black/20 p-2 rounded-lg border dark:border-gray-800">
                                                <span className="text-[10px] font-black uppercase text-gray-400">test p-value:</span>
                                                <span className={`text-sm font-mono font-black ${res.is_normal ? 'text-green-600' : 'text-amber-600'}`}>p = {res.formatted_p}</span>
                                            </div>
                                            <div className="flex justify-between items-center px-2">
                                                <span className="text-[10px] font-black uppercase text-gray-300">test statistic (W):</span>
                                                <span className="text-xs font-mono font-bold text-indigo-400">{res.statistic?.toFixed(4)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        <Card title="Conclusion & Direction" icon={Activity}>
                            <div className="h-full flex flex-col justify-center gap-4">
                                {Object.values(result.shapiro || {}).every(r => r.is_normal) ? (
                                    <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-100 dark:border-green-800 text-center space-y-3">
                                        <div className="inline-block p-3 bg-green-500 text-white rounded-full shadow-lg shadow-green-500/30">
                                            <CheckCircle2 size={32} />
                                        </div>
                                        <h4 className="text-xl font-black text-green-700 dark:text-green-400">Parametric Ready</h4>
                                        <p className="text-sm text-green-600 dark:text-green-500 font-medium">All groups follow a normal distribution. You may proceed with ANOVA or T-Tests.</p>
                                    </div>
                                ) : (
                                    <div className="p-6 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-800 text-center space-y-3">
                                        <div className="inline-block p-3 bg-amber-500 text-white rounded-full shadow-lg shadow-amber-500/30">
                                            <Activity size={32} />
                                        </div>
                                        <h4 className="text-xl font-black text-amber-700 dark:text-amber-400">Non-Parametric Suggested</h4>
                                        <p className="text-sm text-amber-600 dark:text-amber-500 font-medium">One or more groups are NOT normal. It is recommended to use Kruskal-Wallis or Mann-Whitney tests.</p>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>
                </section>
                {(result.shapiro_group_qq_plot_image || result.residual_qq_plot_image) && (
                    <Card title="Normality Q-Q Plot" icon={Activity}>
                        <div className="flex flex-col items-center justify-center space-y-4 p-4">
                            <div className="relative group w-full max-w-4xl bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border-2 dark:border-gray-800 p-2 shadow-2xl">
                                <img
                                    src={`data:image/png;base64,${result.shapiro_group_qq_plot_image || result.residual_qq_plot_image}`}
                                    alt={result.shapiro_group_qq_plot_image ? "Shapiro Q-Q Plot by Group" : "Residual Q-Q Plot"}
                                    className="w-full h-auto rounded-xl"
                                />
                                <button
                                    onClick={() => setSelectedImage({
                                        url: `data:image/png;base64,${result.shapiro_group_qq_plot_image || result.residual_qq_plot_image}`,
                                        title: result.shapiro_group_qq_plot_image ? 'Shapiro Q-Q Plot by Group' : 'Residual Q-Q Plot',
                                        plotKey: result.shapiro_group_qq_plot_image ? 'shapiro_group_qq_plot' : 'residual_qq_plot'
                                    })}
                                    className="absolute top-3 right-3 z-20 bg-white/95 dark:bg-gray-900/95 text-gray-700 dark:text-gray-200 p-2 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:scale-105 transition-transform"
                                    title="View Fullscreen"
                                >
                                    <Maximize2 size={18} />
                                </button>
                                <div className="absolute inset-0 z-10 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button
                                        onClick={() => {
                                            const link = document.createElement('a');
                                            link.href = `data:image/png;base64,${result.shapiro_group_qq_plot_image || result.residual_qq_plot_image}`;
                                            link.download = result.shapiro_group_qq_plot_image ? 'shapiro_normality_qq_plot.png' : 'residual_normality_qq_plot.png';
                                            link.click();
                                        }}
                                        className="px-6 py-3 bg-white text-black rounded-xl font-black text-xs uppercase tracking-widest shadow-2xl hover:scale-105 transition-transform"
                                    >
                                        Download High-Res Plot
                                    </button>
                                </div>
                            </div>
                            <p className="text-xs font-black uppercase tracking-[0.3em] text-gray-400 text-center bg-gray-50 dark:bg-gray-800/50 px-4 py-2 rounded-full">
                                {result.shapiro_group_qq_plot_image ? 'Group-wise normality diagnostics for Shapiro-Wilk' : 'Residual normality diagnostic Q-Q plot'}
                            </p>
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 text-center">
                                Tip: This plot is editable in fullscreen mode (title, labels, and position steps).
                            </p>
                        </div>
                    </Card>
                )}
                {!result.shapiro_group_qq_plot_image && !result.residual_qq_plot_image && result.shapiro_group_qq_plot_error && (
                    <Card title="Normality Q-Q Plot" icon={Activity}>
                        <div className="p-6 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-800/30 text-center space-y-3">
                            <div className="text-red-500 font-black text-xs uppercase tracking-widest mb-2">Plot Generation Failed</div>
                            <p className="text-sm text-red-600 dark:text-red-400 font-medium">{result.shapiro_group_qq_plot_error}</p>
                        </div>
                    </Card>
                )}
                <div className="flex justify-end gap-2">
                    <button
                        onClick={() => handleAskAI('Normality Test Report', generateReport(result, 'normality'))}
                        className="text-[10px] px-3 py-1 rounded-full border border-indigo-200 text-indigo-700 dark:text-indigo-300 dark:border-indigo-700 bg-white/60 dark:bg-indigo-900/10 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors font-bold uppercase tracking-wider flex items-center gap-2"
                    >
                        <Bot size={12} /> Ask AI
                    </button>
                    <button
                        onClick={() => openInterpretation('Normality Test Report', generateReport(result, 'normality'))}
                        className="text-[10px] px-3 py-1 rounded-full border border-indigo-200 text-indigo-700 dark:text-indigo-300 dark:border-indigo-700 bg-white/60 dark:bg-indigo-900/10 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors font-bold uppercase tracking-wider"
                    >
                        View Detailed Report
                    </button>
                </div>
                </>
                )}

                {/* Bartlett's Test Results (Parametric only) */}
                {(() => {
                    const isSrh = result.test_type === 'scheirer_ray_hare' || result.srh;
                    const showBartlett = !isSrh && (result.bartlett || result.levene) && (result.path_taken === 'parametric' || result.anova || result.ttest || result.rm_anova || result.is_factorial || result.main_effect_A || result.main_effect_B || result.interaction);
                    if (!showBartlett) return null;
                    if (result.levene) {
                        const vt = result.levene;
                        const hasWelchAnova = result.anova && String(result.anova.test_type || '').toLowerCase() === 'welch';
                        const hasWelchT = result.ttest && String(result.ttest.test_type || '').toLowerCase() === 'welch';
                        const unequalHint = hasWelchAnova
                          ? "Welch's ANOVA is used."
                          : hasWelchT
                            ? "Welch's t-test is used."
                            : "Welch's method is recommended.";
                        return (
                            <section className="space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1 rounded-full w-fit">
                                    Step 02: Homogeneity of Variance
                                </h3>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <Card title="Levene's Test Results" icon={CheckCircle2}>
                                        <div className="space-y-4">
                                            <div className="p-4 rounded-xl border bg-indigo-50/40 border-indigo-100 dark:bg-indigo-900/10 dark:border-indigo-800">
                                                <p className="text-sm font-semibold mb-3">{vt?.message || "Levene's test for equality of variances."}</p>

                                                <div className="flex flex-col gap-2 border-t dark:border-gray-800 pt-4 mt-2">
                                                    <div className="flex justify-between items-center bg-gray-50 dark:bg-black/20 p-2 rounded-lg border dark:border-gray-800">
                                                        <span className="text-[10px] font-black uppercase text-gray-400">test p-value:</span>
                                                        <span className={`text-sm font-mono font-black ${vt?.is_homogeneous === true ? 'text-green-600' : vt?.is_homogeneous === false ? 'text-amber-600' : 'text-slate-600 dark:text-slate-300'}`}>p = {vt?.formatted_p || 'N/A'}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center px-2">
                                                        <span className="text-[10px] font-black uppercase text-gray-300">F statistic:</span>
                                                        <span className="text-xs font-mono font-bold text-indigo-400">{Number.isFinite(Number(vt?.statistic)) ? Number(vt.statistic).toFixed(4) : 'N/A'}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center px-2">
                                                        <span className="text-[10px] font-black uppercase text-gray-300">df1:</span>
                                                        <span className="text-xs font-mono font-bold text-indigo-400">{Number.isFinite(Number(vt?.df1)) ? Number(vt.df1).toFixed(3) : 'N/A'}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center px-2">
                                                        <span className="text-[10px] font-black uppercase text-gray-300">df2:</span>
                                                        <span className="text-xs font-mono font-bold text-indigo-400">{Number.isFinite(Number(vt?.df2)) ? Number(vt.df2).toFixed(3) : 'N/A'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>

                                    <Card title="Homogeneity Interpretation" icon={Activity}>
                                        <div className="h-full flex flex-col justify-center gap-4">
                                            {vt?.is_homogeneous === true ? (
                                                <div className="p-6 bg-green-50 dark:bg-green-900/10 rounded-2xl border border-green-100 dark:border-green-800 text-center space-y-3">
                                                    <div className="inline-block p-3 bg-green-500 text-white rounded-full shadow-lg shadow-green-500/30">
                                                        <CheckCircle2 size={32} />
                                                    </div>
                                                    <h4 className="text-xl font-black text-green-700 dark:text-green-400">Equal Variances</h4>
                                                    <p className="text-sm text-green-600 dark:text-green-500 font-medium">Variances are statistically equal. Homogeneity assumption is satisfied.</p>
                                                </div>
                                            ) : vt?.is_homogeneous === false ? (
                                                <div className="p-6 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-800 text-center space-y-3">
                                                    <div className="inline-block p-3 bg-amber-500 text-white rounded-full shadow-lg shadow-amber-500/30">
                                                        <Activity size={32} />
                                                    </div>
                                                    <h4 className="text-xl font-black text-amber-700 dark:text-amber-400">Unequal Variances</h4>
                                                    <p className="text-sm text-amber-600 dark:text-amber-500 font-medium">Variances are NOT equal. {unequalHint}</p>
                                                </div>
                                            ) : (
                                                <div className="p-6 bg-slate-50 dark:bg-slate-900/10 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-3">
                                                    <div className="inline-block p-3 bg-slate-400 text-white rounded-full shadow-lg shadow-slate-400/30">
                                                        <Activity size={32} />
                                                    </div>
                                                    <h4 className="text-xl font-black text-slate-700 dark:text-slate-300">Levene Test Unavailable</h4>
                                                    <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Variance results were not returned for these groups.</p>
                                                </div>
                                            )}
                                        </div>
                                    </Card>
                                </div>
                                <div className="mt-4 flex justify-end gap-2">
                                    <button
                                        onClick={() => handleAskAI("Levene's Test Report", generateReport(result, 'levene'))}
                                        className="text-[10px] px-3 py-1 rounded-full border border-indigo-200 text-indigo-700 dark:text-indigo-300 dark:border-indigo-700 bg-white/60 dark:bg-indigo-900/10 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors font-bold uppercase tracking-wider flex items-center gap-2"
                                    >
                                        <Bot size={12} /> Ask AI
                                    </button>
                                    <button
                                        onClick={() => openInterpretation("Levene's Test Report", generateReport(result, 'levene'))}
                                        className="text-[10px] px-3 py-1 rounded-full border border-indigo-200 text-indigo-700 dark:text-indigo-300 dark:border-indigo-700 bg-white/60 dark:bg-indigo-900/10 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors font-bold uppercase tracking-wider"
                                    >
                                        View Detailed Report
                                    </button>
                                </div>
                            </section>
                        );
                    }
                    return (
                        <section className="space-y-4">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1 rounded-full w-fit">
                                Step 02: Homogeneity of Variance
                            </h3>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <Card title="Bartlett's Test Results" icon={CheckCircle2}>
                                    <div className="space-y-4">
                                        <div className="p-4 rounded-xl border bg-indigo-50/40 border-indigo-100 dark:bg-indigo-900/10 dark:border-indigo-800">
                                            <p className="text-sm font-semibold mb-3">{result.bartlett.message}</p>

                                            <div className="flex flex-col gap-2 border-t dark:border-gray-800 pt-4 mt-2">
                                                <div className="flex justify-between items-center bg-gray-50 dark:bg-black/20 p-2 rounded-lg border dark:border-gray-800">
                                                    <span className="text-[10px] font-black uppercase text-gray-400">test p-value:</span>
                                                    <span className={`text-sm font-mono font-black ${result.bartlett.is_homogeneous ? 'text-green-600' : 'text-amber-600'}`}>p = {result.bartlett.formatted_p}</span>
                                                </div>
                                                <div className="flex justify-between items-center px-2">
                                                    <span className="text-[10px] font-black uppercase text-gray-300">Chi-squared:</span>
                                                    <span className="text-xs font-mono font-bold text-indigo-400">{result.bartlett.statistic?.toFixed(4)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Card>

                                <Card title="Homogeneity Interpretation" icon={Activity}>
                                    <div className="h-full flex flex-col justify-center gap-4">
                                        {result.bartlett.is_homogeneous ? (
                                            <div className="p-6 bg-green-50 dark:bg-green-900/10 rounded-2xl border border-green-100 dark:border-green-800 text-center space-y-3">
                                                <div className="inline-block p-3 bg-green-500 text-white rounded-full shadow-lg shadow-green-500/30">
                                                    <CheckCircle2 size={32} />
                                                </div>
                                                <h4 className="text-xl font-black text-green-700 dark:text-green-400">Equal Variances</h4>
                                                <p className="text-sm text-green-600 dark:text-green-500 font-medium">Variances are statistically equal. Homogeneity assumption is satisfied.</p>
                                            </div>
                                        ) : (
                                            <div className="p-6 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-800 text-center space-y-3">
                                                <div className="inline-block p-3 bg-amber-500 text-white rounded-full shadow-lg shadow-amber-500/30">
                                                    <Activity size={32} />
                                                </div>
                                                <h4 className="text-xl font-black text-amber-700 dark:text-amber-400">Unequal Variances</h4>
                                                <p className="text-sm text-amber-600 dark:text-amber-500 font-medium">Variances are NOT equal. This may affect the reliability of certain parametric tests.</p>
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            </div>
                            <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-800/30">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2">Bartlett's Test Guide</div>
                                <div className="text-xs text-indigo-700 dark:text-indigo-300 space-y-2">
                                    <div><strong>Assumption:</strong> "Are the groups equally spread out?" (We want "Yes").</div>
                                    <div><strong>Decision:</strong> p &ge; α ({alpha}) means "Yes, equal spread" (Good). p &lt; α ({alpha}) means "No, different spread" (Caution).</div>
                                    <div><strong>Note:</strong> If this fails (p &lt; α = {alpha}), we might need special tests (like Welch's ANOVA) to be accurate.</div>
                                    <div><strong>Example:</strong> p = 0.03 means Variances are unequal. Standard ANOVA might be wrong.</div>
                                </div>
                            </div>
                            <div className="mt-4 flex justify-end gap-2">
                                <button
                                    onClick={() => handleAskAI('Bartlett\'s Test Report', generateReport(result, 'bartlett'))}
                                    className="text-[10px] px-3 py-1 rounded-full border border-indigo-200 text-indigo-700 dark:text-indigo-300 dark:border-indigo-700 bg-white/60 dark:bg-indigo-900/10 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors font-bold uppercase tracking-wider flex items-center gap-2"
                                >
                                    <Bot size={12} /> Ask AI
                                </button>
                                <button
                                    onClick={() => openInterpretation('Bartlett\'s Test Report', generateReport(result, 'bartlett'))}
                                    className="text-[10px] px-3 py-1 rounded-full border border-indigo-200 text-indigo-700 dark:text-indigo-300 dark:border-indigo-700 bg-white/60 dark:bg-indigo-900/10 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors font-bold uppercase tracking-wider"
                                >
                                    View Detailed Report
                                </button>
                            </div>
                        </section>
                    );
                })()}

                {/* Mauchly + Sphericity Correction (RM-ANOVA Path) */}
                {result.path_taken === 'parametric' && result.rm_anova && (
                    <section className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-purple-500 bg-purple-50 dark:bg-purple-900/20 px-3 py-1 rounded-full w-fit">
                            Step 02: Mauchly Test & Correction
                        </h3>
	                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card title="Mauchly's Sphericity Test" icon={Activity}>
                                <div className="p-5 rounded-xl border bg-purple-50/40 border-purple-100 dark:bg-purple-900/10 dark:border-purple-800 space-y-4">
                                    <div className="flex justify-between items-center bg-gray-50 dark:bg-black/20 px-3 py-2.5 rounded-lg border dark:border-gray-800">
                                        <span className="text-xs font-black uppercase text-gray-500">W statistic:</span>
                                        <span className="text-sm font-mono font-bold text-purple-400">
                                            {fmt(result.rm_anova.mauchly_w, 4)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center bg-gray-50 dark:bg-black/20 px-3 py-2.5 rounded-lg border dark:border-gray-800">
                                        <span className="text-xs font-black uppercase text-gray-500">p-value:</span>
                                        <span className={`text-sm font-mono font-black ${result.rm_anova.sphericity_violated ? 'text-amber-600' : 'text-green-600'}`}>
                                            p = {result.rm_anova.mauchly_formatted_p || 'N/A'}
                                        </span>
                                    </div>
                                    <div className={`text-sm leading-relaxed font-bold ${result.rm_anova.sphericity_violated ? 'text-amber-600' : 'text-green-600'}`}>
                                        {result.rm_anova.sphericity_violated ? 'Sphericity violated: correction required.' : 'Sphericity satisfied: no correction required.'}
                                    </div>
                                </div>
                            </Card>

                            <Card title="Correction Decision (Greenhouse-Geisser / Huynh-Feldt)" icon={Activity}>
                                <div className="p-5 rounded-xl border bg-purple-50/40 border-purple-100 dark:bg-purple-900/10 dark:border-purple-800 space-y-4">
                                    <div className="flex justify-between items-center bg-gray-50 dark:bg-black/20 px-3 py-2.5 rounded-lg border dark:border-gray-800">
                                        <span className="text-xs font-black uppercase text-gray-500">applied:</span>
                                        <span className="text-sm font-mono font-bold text-purple-400">
                                            {formatCorrectionName(result.rm_anova.correction_used, true)}
                                        </span>
                                    </div>
                                    <div className="text-sm leading-relaxed font-mono text-gray-700 dark:text-gray-300">
                                        Greenhouse-Geisser: eps = {fmt(result.rm_anova.gg_epsilon, 3)} | p = {result.rm_anova.gg_formatted_p || 'N/A'}
                                    </div>
                                    <div className="text-sm leading-relaxed font-mono text-gray-700 dark:text-gray-300">
                                        Huynh-Feldt: eps = {fmt(result.rm_anova.hf_epsilon, 3)} | p = {result.rm_anova.hf_formatted_p || 'N/A'}
                                    </div>
                                    <div className="text-sm leading-relaxed font-mono text-gray-700 dark:text-gray-300 border-t dark:border-gray-800 pt-3">
                                        Uncorrected p = {result.rm_anova.formatted_p_uncorrected || 'N/A'} | Final p = {result.rm_anova.formatted_p || 'N/A'}
                                    </div>
                                </div>
                            </Card>
                        </div>
                        <Card title="Sphericity Interpretation" icon={Activity}>
                            <div className="space-y-4">
                                <div className={`p-5 rounded-xl border ${
                                    result.rm_anova.sphericity_violated
                                        ? 'bg-amber-50/50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-700'
                                        : 'bg-green-50/50 border-green-200 dark:bg-green-900/20 dark:border-green-700'
                                }`}>
                                    <div className={`text-base font-black leading-snug ${
                                        result.rm_anova.sphericity_violated
                                            ? 'text-amber-700 dark:text-amber-300'
                                            : 'text-green-700 dark:text-green-300'
                                    }`}>
	                                        {result.rm_anova.sphericity_violated
	                                            ? `Mauchly indicates sphericity is violated (p = ${result.rm_anova.mauchly_formatted_p || fmtP(result.rm_anova.mauchly_p_value)}).`
	                                            : `Mauchly indicates sphericity is satisfied (p = ${result.rm_anova.mauchly_formatted_p || fmtP(result.rm_anova.mauchly_p_value)}).`}
	                                    </div>
		                                    <p className="mt-3 text-sm leading-relaxed text-gray-700 dark:text-gray-200">
		                                        {result.rm_anova.sphericity_violated
		                                            ? `Use the ${result.rm_anova.correction_used === 'none' ? 'available corrected' : formatCorrectionName(result.rm_anova.correction_used)} p-value for inference in Step 03.`
		                                            : 'Use the standard uncorrected RM ANOVA result in Step 03.'}
		                                    </p>
		                                    <div className="mt-4 p-4 rounded-lg border border-purple-100 dark:border-purple-800 bg-white/70 dark:bg-black/20">
		                                        <div className="text-xs font-black uppercase tracking-wider text-purple-500 mb-2">
		                                            Correction Decision Rule
		                                        </div>
		                                        <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-200">
		                                            If sphericity is violated, the app uses Huynh-Feldt when epsilon is greater than 0.75 (milder violation). Otherwise, it uses Greenhouse-Geisser (more conservative for stronger violation).
		                                        </p>
		                                        {result.rm_anova.sphericity_violated && (
		                                            <p className="mt-3 text-sm leading-relaxed font-mono text-gray-600 dark:text-gray-300">
		                                                This analysis: HF epsilon = {fmt(result.rm_anova.hf_epsilon, 3)}, then selected {formatCorrectionName(result.rm_anova.correction_used, true)}.
		                                            </p>
		                                        )}
		                                    </div>
			                                </div>
		                            </div>
		                        </Card>
	                    </section>
	                )}

                {/* Factorial ANOVA Results */}
                {result.is_factorial && result.main_effect_A && (
                    <>
                        <section className="space-y-4">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-purple-500 bg-purple-50 dark:bg-purple-900/20 px-3 py-1 rounded-full w-fit">
                                {`Step 03: ${result.test_type === 'scheirer_ray_hare' || result.srh
                                  ? 'Scheirer-Ray-Hare Results'
                                  : (result.test_type === 'art_factorial' || result.art)
                                    ? 'ART Factorial Results'
                                    : 'ANOVA Factorial Results'}`}
                            </h3>
                            {(result.anova_robust || result.robust_method) && (
                                <div className="rounded-xl border px-4 py-3 text-xs font-semibold border-amber-300/70 dark:border-amber-700/60 bg-amber-50/60 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300">
                                    Robust ANOVA Factorial used (HC3) due to unequal variances.
                                </div>
                            )}
                            {(() => {
                                const rows = Array.isArray(result.anova_table_rows) ? result.anova_table_rows : [];
                                if (rows.length === 0) return null;

                                const statLabel = (result.test_type === 'scheirer_ray_hare' || result.srh) ? 'H' : 'F';
                                const normalizeKey = (value) => String(value || '')
                                    .trim()
                                    .toLowerCase()
                                    .replace(/\*/g, ':')
                                    .replace(/×/g, ':')
                                    .replace(/\s+/g, '');
                                const asNumber = (value) => {
                                    const n = Number(value);
                                    return Number.isFinite(n) ? n : null;
                                };
                                const formatValue = (value, digits = 3) => (
                                    value == null ? '' : fmt(value, digits)
                                );
                                const factorAKey = normalizeKey(result.main_effect_A?.factor_name || result.factor1);
                                const factorBKey = normalizeKey(result.main_effect_B?.factor_name || result.factor2);
                                const interactionEffect = result.interaction || null;
                                const hasStratum = rows.some((row) => row && row.stratum);

                                const resolveEffectForSource = (source) => {
                                    const key = normalizeKey(source);
                                    if (!key || key === 'residual' || key === 'residuals' || key === 'total') return null;
                                    if (factorAKey && key === factorAKey) return result.main_effect_A || null;
                                    if (factorBKey && key === factorBKey) return result.main_effect_B || null;
                                    if (key === 'interaction' || key.includes(':')) return interactionEffect;
                                    return null;
                                };

                                const tableRows = rows.map((row, idx) => {
                                    const sourceRaw = String(row?.source || `Source ${idx + 1}`);
                                    const sourceLabel = sourceRaw.includes(':')
                                        ? sourceRaw.split(':').map((part) => part.trim()).join(' × ')
                                        : sourceRaw.trim();
                                    const isResidual = Boolean(row?.is_residual) || normalizeKey(sourceRaw).startsWith('residual');
                                    const effect = isResidual ? null : resolveEffectForSource(sourceRaw);
                                    const etaNum = asNumber(effect?.eta_squared);
                                    const etaLabel = String(effect?.effect_size_label || '').trim()
                                        || (etaNum != null ? effectSizeLabel(etaNum) : '');
                                    const pNum = asNumber(row?.p_value);
                                    return {
                                        key: `two_way_complete_row_${idx}`,
                                        source: hasStratum && row?.stratum
                                            ? `${sourceLabel} [${row.stratum}]`
                                            : sourceLabel,
                                        ss: asNumber(row?.sum_sq),
                                        df: asNumber(row?.df),
                                        ms: asNumber(row?.mean_sq),
                                        stat: isResidual ? null : asNumber(row?.statistic),
                                        pText: isResidual ? '' : (pNum != null
                                            ? (row?.formatted_p && row.formatted_p !== 'N/A' ? row.formatted_p : fmtP(pNum))
                                            : ''),
                                        eta: etaNum,
                                        etaLabel,
                                        isResidual
                                    };
                                });

                                return (
                                    <Card title="Complete Two-Way ANOVA Table With Residual" icon={Activity}>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-gray-50 dark:bg-black/20 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                    <tr>
                                                        <th className="px-4 py-3">Effect / Source</th>
                                                        <th className="px-4 py-3 text-right">SS</th>
                                                        <th className="px-4 py-3 text-right">df</th>
                                                        <th className="px-4 py-3 text-right">MS</th>
                                                        <th className="px-4 py-3 text-right">{statLabel}</th>
                                                        <th className="px-4 py-3 text-right">p</th>
                                                        <th className="px-4 py-3 text-right">Eta²</th>
                                                        <th className="px-4 py-3 text-right">Effect size</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                                    {tableRows.map((row) => (
                                                        <tr
                                                            key={row.key}
                                                            className={row.isTotal ? 'bg-slate-50 dark:bg-slate-900/20' : row.isResidual ? 'bg-indigo-50/40 dark:bg-indigo-900/10' : ''}
                                                        >
                                                            <td className={`px-4 py-3 ${row.isTotal ? 'font-black text-slate-700 dark:text-slate-200' : 'font-semibold text-gray-700 dark:text-gray-200'}`}>
                                                                {row.source}
                                                            </td>
                                                            <td className="px-4 py-3 text-right font-mono">{formatValue(row.ss, 4)}</td>
                                                            <td className="px-4 py-3 text-right font-mono">{formatValue(row.df, 3)}</td>
                                                            <td className="px-4 py-3 text-right font-mono">{formatValue(row.ms, 4)}</td>
                                                            <td className="px-4 py-3 text-right font-mono">{formatValue(row.stat, 4)}</td>
                                                            <td className="px-4 py-3 text-right font-mono">{row.pText}</td>
                                                            <td className="px-4 py-3 text-right font-mono">{formatValue(row.eta, 3)}</td>
                                                            <td className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-200">{row.etaLabel || ''}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </Card>
                                );
                            })()}

                            {/* Interaction Plot */}
                            {result.interaction_plot_generated && (result.interaction_plot_image || result.image) && (
                                <Card title="Interaction Plot" icon={Activity}>
                                    <div className="flex flex-col items-center justify-center space-y-4 p-4">
                                        <div className="relative group w-full max-w-4xl bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border-2 dark:border-gray-800 p-2 shadow-2xl">
                                            <img 
                                                src={`data:image/png;base64,${result.interaction_plot_image || result.image}`} 
                                                alt="Interaction Plot" 
                                                className="w-full h-auto rounded-xl"
                                            />
                                            <button
                                                onClick={() => setSelectedImage({
                                                    url: `data:image/png;base64,${result.interaction_plot_image || result.image}`,
                                                    title: 'Interaction Plot',
                                                    plotKey: 'interaction_plot'
                                                })}
                                                className="absolute top-3 right-3 z-20 bg-white/95 dark:bg-gray-900/95 text-gray-700 dark:text-gray-200 p-2 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:scale-105 transition-transform"
                                                title="View Fullscreen"
                                            >
                                                <Maximize2 size={18} />
                                            </button>
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <button 
                                                    onClick={() => {
                                                        const link = document.createElement('a');
                                                        link.href = `data:image/png;base64,${result.interaction_plot_image || result.image}`;
                                                        link.download = `interaction_plot.png`;
                                                        link.click();
                                                    }}
                                                    className="px-6 py-3 bg-white text-black rounded-xl font-black text-xs uppercase tracking-widest shadow-2xl hover:scale-105 transition-transform"
                                                >
                                                    Download Interaction Plot
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-xs font-black uppercase tracking-[0.3em] text-gray-400 text-center bg-gray-50 dark:bg-gray-800/50 px-4 py-2 rounded-full">
                                            {result.interaction.is_significant ? 'Significant Interaction - Lines are NOT Parallel' : 'No Interaction - Lines are Parallel'}
                                        </p>
                                    </div>
                                </Card>
                            )}

                            {/* Post-hoc for ANOVA Factorial */}
                            {((result.tukey && result.tukey.length > 0)
                              || (result.games_howell && result.games_howell.length > 0)
                              || (result.holm_posthoc && result.holm_posthoc.length > 0)
                              || (result.art_posthoc && result.art_posthoc.length > 0)
                              || (result.dunn && result.dunn.length > 0)) && (
                                <section className="space-y-4">
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1 rounded-full w-fit">
                                        Step 04: Post-hoc Results
                                    </h3>

                                    {result.tukey && result.tukey.length > 0 && (
                                        <Card title="Pairwise Comparisons (Tukey HSD)" icon={Activity}>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-sm">
                                                    <thead className="bg-gray-50 dark:bg-black/20 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                        <tr>
                                                            <th className="px-6 py-4">Term</th>
                                                            <th className="px-6 py-4">Comparison</th>
                                                            <th className="px-6 py-4">Mean Diff</th>
                                                            <th className="px-6 py-4">{ciPercentForAlpha}% CI (±)</th>
                                                            <th className="px-6 py-4">P-Value (Adj)</th>
                                                            <th className="px-6 py-4">Result</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y dark:divide-gray-800">
                                                        {result.tukey.map((item, idx) => (
                                                            <tr key={`two_way_tukey_${idx}`} className={`hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors ${item.is_significant ? 'bg-green-50/20 dark:bg-green-900/5' : ''}`}>
                                                                <td className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300">
                                                                    {item.term || 'N/A'}
                                                                </td>
                                                                <td className="px-6 py-4 font-bold text-gray-700 dark:text-gray-300">
                                                                    {item.comparison}
                                                                </td>
                                                                <td className="px-6 py-4 font-mono text-xs text-gray-600 dark:text-gray-400">
                                                                    {Number.isFinite(Number(item.diff)) ? Number(item.diff).toFixed(4) : 'N/A'}
                                                                </td>
                                                                <td className="px-6 py-4 font-mono text-xs text-gray-500 dark:text-gray-500">
                                                                    {(() => {
                                                                        const lwr = Number(item?.lwr);
                                                                        const upr = Number(item?.upr);
                                                                        if (!Number.isFinite(lwr) || !Number.isFinite(upr)) return 'N/A';
                                                                        const diff = Number(item?.diff);
                                                                        const center = Number.isFinite(diff) ? diff : ((lwr + upr) / 2);
                                                                        const halfWidth = (upr - lwr) / 2;
                                                                        return `${center.toFixed(4)} ± ${halfWidth.toFixed(4)}`;
                                                                    })()}
                                                                </td>
                                                                <td className={`px-6 py-4 font-mono text-xs font-black ${item.is_significant ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                                                                    p = {item.formatted_p}
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    {item.is_significant ? (
                                                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 rounded text-[10px] font-black uppercase">
                                                                            {getSignificanceStars(item) || '*'}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 rounded text-[10px] font-black uppercase">ns</span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </Card>
                                    )}

                                    {result.games_howell && result.games_howell.length > 0 && (
                                        <Card title="Pairwise Comparisons (Games-Howell)" icon={Activity}>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-sm">
                                                    <thead className="bg-gray-50 dark:bg-black/20 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                        <tr>
                                                            <th className="px-6 py-4">Term</th>
                                                            <th className="px-6 py-4">Comparison</th>
                                                            <th className="px-6 py-4">Mean Diff</th>
                                                            <th className="px-6 py-4">{ciPercentForAlpha}% CI</th>
                                                            <th className="px-6 py-4">t-statistic</th>
                                                            <th className="px-6 py-4">df</th>
                                                            <th className="px-6 py-4">P-Value (Adj)</th>
                                                            <th className="px-6 py-4">Result</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y dark:divide-gray-800">
                                                        {result.games_howell.map((item, idx) => (
                                                            <tr key={`two_way_gh_${idx}`} className={`hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors ${item.is_significant ? 'bg-green-50/20 dark:bg-green-900/5' : ''}`}>
                                                                <td className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300">
                                                                    {item.term || 'N/A'}
                                                                </td>
                                                                <td className="px-6 py-4 font-bold text-gray-700 dark:text-gray-300">
                                                                    {item.comparison}
                                                                </td>
                                                                <td className="px-6 py-4 font-mono text-xs text-gray-600 dark:text-gray-400">
                                                                    {Number.isFinite(Number(item.diff)) ? Number(item.diff).toFixed(4) : 'N/A'}
                                                                </td>
                                                                <td className="px-6 py-4 font-mono text-xs text-gray-500 dark:text-gray-500">
                                                                    [{Number.isFinite(Number(item.lwr)) ? Number(item.lwr).toFixed(2) : 'N/A'}, {Number.isFinite(Number(item.upr)) ? Number(item.upr).toFixed(2) : 'N/A'}]
                                                                </td>
                                                                <td className="px-6 py-4 font-mono text-xs text-gray-600 dark:text-gray-400">
                                                                    {Number.isFinite(Number(item.t_stat)) ? Number(item.t_stat).toFixed(3) : 'N/A'}
                                                                </td>
                                                                <td className="px-6 py-4 font-mono text-xs text-gray-500 dark:text-gray-500">
                                                                    {Number.isFinite(Number(item.df)) ? Number(item.df).toFixed(2) : 'N/A'}
                                                                </td>
                                                                <td className={`px-6 py-4 font-mono text-xs font-black ${item.is_significant ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                                                                    p = {item.formatted_p}
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    {item.is_significant ? (
                                                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 rounded text-[10px] font-black uppercase">
                                                                            {getSignificanceStars(item) || '*'}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 rounded text-[10px] font-black uppercase">ns</span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </Card>
                                    )}

                                    {result.holm_posthoc && result.holm_posthoc.length > 0 && (
                                        <Card title="Pairwise Comparisons (Holm Corrected)" icon={Activity}>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-sm">
                                                    <thead className="bg-gray-50 dark:bg-black/20 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                        <tr>
                                                            <th className="px-6 py-4">Term</th>
                                                            <th className="px-6 py-4">Comparison</th>
                                                            <th className="px-6 py-4">Mean Diff</th>
                                                            <th className="px-6 py-4">Statistic</th>
                                                            <th className="px-6 py-4">df</th>
                                                            <th className="px-6 py-4">P-Value (Adj)</th>
                                                            <th className="px-6 py-4">Result</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y dark:divide-gray-800">
                                                        {result.holm_posthoc.map((item, idx) => (
                                                            <tr key={`two_way_holm_${idx}`} className={`hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors ${item.is_significant ? 'bg-green-50/20 dark:bg-green-900/5' : ''}`}>
                                                                <td className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300">{item.term || 'N/A'}</td>
                                                                <td className="px-6 py-4 font-bold text-gray-700 dark:text-gray-300">{item.comparison}</td>
                                                                <td className="px-6 py-4 font-mono text-xs text-gray-600 dark:text-gray-400">{Number.isFinite(Number(item.diff)) ? Number(item.diff).toFixed(4) : 'N/A'}</td>
                                                                <td className="px-6 py-4 font-mono text-xs text-gray-600 dark:text-gray-400">{Number.isFinite(Number(item.t_stat ?? item.statistic)) ? Number(item.t_stat ?? item.statistic).toFixed(3) : 'N/A'}</td>
                                                                <td className="px-6 py-4 font-mono text-xs text-gray-500 dark:text-gray-500">{Number.isFinite(Number(item.df)) ? Number(item.df).toFixed(2) : 'N/A'}</td>
                                                                <td className={`px-6 py-4 font-mono text-xs font-black ${item.is_significant ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>p = {item.formatted_p}</td>
                                                                <td className="px-6 py-4">
                                                                    {item.is_significant ? (
                                                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 rounded text-[10px] font-black uppercase">{getSignificanceStars(item) || '*'}</span>
                                                                    ) : (
                                                                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 rounded text-[10px] font-black uppercase">ns</span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </Card>
                                    )}

                                    {result.art_posthoc && result.art_posthoc.length > 0 && (
                                        <Card title="Pairwise Contrasts (ART + Holm)" icon={Activity}>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-sm">
                                                    <thead className="bg-gray-50 dark:bg-black/20 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                        <tr>
                                                            <th className="px-6 py-4">Term</th>
                                                            <th className="px-6 py-4">Comparison</th>
                                                            <th className="px-6 py-4">Mean Diff</th>
                                                            <th className="px-6 py-4">Statistic</th>
                                                            <th className="px-6 py-4">df</th>
                                                            <th className="px-6 py-4">P-Value (Adj)</th>
                                                            <th className="px-6 py-4">Result</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y dark:divide-gray-800">
                                                        {result.art_posthoc.map((item, idx) => (
                                                            <tr key={`two_way_art_${idx}`} className={`hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors ${item.is_significant ? 'bg-green-50/20 dark:bg-green-900/5' : ''}`}>
                                                                <td className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300">{item.term || 'N/A'}</td>
                                                                <td className="px-6 py-4 font-bold text-gray-700 dark:text-gray-300">{item.comparison}</td>
                                                                <td className="px-6 py-4 font-mono text-xs text-gray-600 dark:text-gray-400">{Number.isFinite(Number(item.diff)) ? Number(item.diff).toFixed(4) : 'N/A'}</td>
                                                                <td className="px-6 py-4 font-mono text-xs text-gray-600 dark:text-gray-400">{Number.isFinite(Number(item.t_stat ?? item.statistic)) ? Number(item.t_stat ?? item.statistic).toFixed(3) : 'N/A'}</td>
                                                                <td className="px-6 py-4 font-mono text-xs text-gray-500 dark:text-gray-500">{Number.isFinite(Number(item.df)) ? Number(item.df).toFixed(2) : 'N/A'}</td>
                                                                <td className={`px-6 py-4 font-mono text-xs font-black ${item.is_significant ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>p = {item.formatted_p}</td>
                                                                <td className="px-6 py-4">
                                                                    {item.is_significant ? (
                                                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 rounded text-[10px] font-black uppercase">{getSignificanceStars(item) || '*'}</span>
                                                                    ) : (
                                                                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 rounded text-[10px] font-black uppercase">ns</span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </Card>
                                    )}

                                    {result.dunn && result.dunn.length > 0 && (
                                        <Card title="Pairwise Comparisons (Dunn Bonferroni)" icon={Activity}>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-sm">
                                                    <thead className="bg-gray-50 dark:bg-black/20 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                        <tr>
                                                            <th className="px-6 py-4">Term</th>
                                                            <th className="px-6 py-4">Comparison</th>
                                                            <th className="px-6 py-4">Z</th>
                                                            <th className="px-6 py-4">P-Value (Adj)</th>
                                                            <th className="px-6 py-4">Result</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y dark:divide-gray-800">
                                                        {result.dunn.map((item, idx) => (
                                                            <tr key={`two_way_dunn_${idx}`} className={`hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors ${item.is_significant ? 'bg-green-50/20 dark:bg-green-900/5' : ''}`}>
                                                                <td className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300">{item.term || 'N/A'}</td>
                                                                <td className="px-6 py-4 font-bold text-gray-700 dark:text-gray-300">{item.comparison}</td>
                                                                <td className="px-6 py-4 font-mono text-xs text-gray-600 dark:text-gray-400">{Number.isFinite(Number(item.z_value ?? item.statistic)) ? Number(item.z_value ?? item.statistic).toFixed(3) : 'N/A'}</td>
                                                                <td className={`px-6 py-4 font-mono text-xs font-black ${item.is_significant ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>p = {item.formatted_p}</td>
                                                                <td className="px-6 py-4">
                                                                    {item.is_significant ? (
                                                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 rounded text-[10px] font-black uppercase">{getSignificanceStars(item) || '*'}</span>
                                                                    ) : (
                                                                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 rounded text-[10px] font-black uppercase">ns</span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </Card>
                                    )}
                                </section>
                            )}
                            {result.posthoc_strategy && (
                                <div className="mt-4 rounded-xl border border-indigo-300/70 dark:border-indigo-700/60 bg-indigo-50/60 dark:bg-indigo-900/20 px-4 py-3 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                                    {result.posthoc_strategy}
                                </div>
                            )}
                            <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/10 rounded-xl border border-purple-100 dark:border-purple-800/30">
                                <div className="text-[10px] font-black uppercase tracking-widest text-purple-500 mb-2">
                                    {result.test_type === 'scheirer_ray_hare' || result.srh
                                      ? 'Scheirer-Ray-Hare Guide'
                                      : (result.test_type === 'art_factorial' || result.art)
                                        ? 'ART Factorial Guide'
                                        : 'ANOVA Factorial Guide'}
                                </div>
                                    <div className="text-xs text-purple-700 dark:text-purple-300 space-y-2">
                                        {result.test_type === 'scheirer_ray_hare' || result.srh ? (
                                            <>
                                                <div><strong>Test type:</strong> Non-parametric ANOVA Factorial on ranked data (Scheirer-Ray-Hare).</div>
                                                <div><strong>Main effects:</strong> "Does Factor A/B change the ranked outcome?" (p &lt; α = {alpha} means Yes).</div>
                                                <div><strong>Interaction:</strong> "Does Factor A work differently depending on Factor B?" (p &lt; α = {alpha} means Yes).</div>
                                            </>
                                        ) : (result.test_type === 'art_factorial' || result.art) ? (
                                            <>
                                                <div><strong>Test type:</strong> Aligned Rank Transform (ART) factorial analysis for repeated/mixed non-parametric designs.</div>
                                                <div><strong>Main effects:</strong> Tested on aligned ranks for each factor.</div>
                                                <div><strong>Interaction:</strong> If significant, prioritize simple effects and corrected pairwise contrasts.</div>
                                                <div><strong>Post-hoc:</strong> Holm-adjusted contrasts are reported in Step 04.</div>
                                            </>
                                        ) : (
                                            <>
                                                <div><strong>Main effects:</strong> "Does Factor A change the result?" (p &lt; α = {alpha} means Yes).</div>
                                                <div><strong>Interaction:</strong> "Does Factor A work differently depending on Factor B?" (p &lt; α = {alpha} means Yes).</div>
                                                <div><strong>Effect size (eta-squared):</strong> Conventional benchmarks are 0.01 (small), 0.06 (medium), and 0.14 (large).</div>
                                                <div><strong>Interaction interpretation:</strong> If interaction p &lt; α ({alpha}), report simple effects rather than isolated main effects.</div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            <div className="mt-4 flex justify-end gap-2">
                                <button
                                    onClick={() => handleAskAI(
                                      result.test_type === 'scheirer_ray_hare' || result.srh
                                        ? 'Scheirer-Ray-Hare Report'
                                        : (result.test_type === 'art_factorial' || result.art)
                                          ? 'ART Factorial Report'
                                          : 'ANOVA Factorial Report',
                                      generateReport(result, 'two_way_anova')
                                    )}
                                    className="text-[10px] px-3 py-1 rounded-full border border-purple-200 text-purple-700 dark:text-purple-300 dark:border-purple-700 bg-white/60 dark:bg-purple-900/10 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors font-bold uppercase tracking-wider flex items-center gap-2"
                                >
                                    <Bot size={12} /> Ask AI
                                </button>
                                <button
                                    onClick={() => openInterpretation(
                                      result.test_type === 'scheirer_ray_hare' || result.srh
                                        ? 'Scheirer-Ray-Hare Report'
                                        : (result.test_type === 'art_factorial' || result.art)
                                          ? 'ART Factorial Report'
                                          : 'ANOVA Factorial Report',
                                      generateReport(result, 'two_way_anova')
                                    )}
                                    className="text-[10px] px-3 py-1 rounded-full border border-purple-200 text-purple-700 dark:text-purple-300 dark:border-purple-700 bg-white/60 dark:bg-purple-900/10 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors font-bold uppercase tracking-wider"
                                >
                                    View Detailed Report
                                </button>
                            </div>
                        </section>
                    </>
                )}

                {/* Repeated Measures ANOVA Results */}
                {result.rm_anova && (
                    <section className="space-y-5">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-purple-500 bg-purple-50 dark:bg-purple-900/20 px-3 py-1 rounded-full w-fit">
                            Step 03: Repeated Measures ANOVA
                        </h3>
                        
	                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                            <Card title="RM ANOVA Panel" icon={Activity} className="xl:col-span-2">
                                <div className="space-y-5">
                                    <div className="rounded-2xl border border-purple-100 dark:border-purple-800 bg-white/70 dark:bg-black/20 p-4">
                                        <div className="text-xs font-black uppercase tracking-widest text-purple-500">
                                            ANOVA Result
                                        </div>
                                        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <div className="rounded-lg border border-purple-100 dark:border-purple-800 bg-purple-50/60 dark:bg-purple-900/20 p-4">
                                                <div className="text-xs font-black uppercase tracking-wider text-gray-500">Final p-value</div>
                                                <div className={`mt-1 text-lg font-mono font-black ${result.rm_anova.is_significant ? 'text-purple-600' : 'text-gray-600'}`}>
                                                    p = {result.rm_anova.formatted_p || fmtP(result.rm_anova.p_value)}
                                                </div>
                                            </div>
                                            <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-black/20 p-4">
                                                <div className="text-xs font-black uppercase tracking-wider text-gray-500">F-statistic</div>
                                                <div className="mt-1 text-lg font-mono font-black text-purple-500">
                                                    F = {fmt(result.rm_anova.statistic, 3)}
                                                </div>
                                            </div>
                                            <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-black/20 p-4">
                                                <div className="text-xs font-black uppercase tracking-wider text-gray-500">Degrees of freedom</div>
                                                <div className="mt-1 text-lg font-mono font-black text-purple-500">
                                                    df = {fmt(result.rm_anova.df1, 3)}, {fmt(result.rm_anova.df2, 3)}
                                                </div>
                                            </div>
                                        </div>
                                        <p className="mt-4 text-sm leading-relaxed text-gray-700 dark:text-gray-200">
                                            {result.rm_anova.message}
                                        </p>
                                        <div className="mt-3 rounded-lg border border-purple-100 dark:border-purple-800 bg-white/70 dark:bg-black/20 p-3 text-sm leading-relaxed text-purple-700 dark:text-purple-200">
                                            <span className="font-black uppercase tracking-wider text-purple-500">Significance and Effect:</span>{' '}
                                            {rmAnovaEffectSummary(result.rm_anova).text}
                                        </div>
                                        <div className="mt-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-black/30 p-3">
                                            <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">Console Output (aov-style)</div>
                                            <pre className="mt-2 whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-gray-700 dark:text-gray-200">
                                                {buildRmAnovaROutput(result.rm_anova, result.rm_anova_posthoc, result.rm_anova_table_rows)}
                                            </pre>
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-purple-100 dark:border-purple-800 bg-white/70 dark:bg-black/20 p-4">
                                        <div className="text-xs font-black uppercase tracking-widest text-purple-500">
                                            Correction & Sphericity
                                        </div>
                                        <div className="mt-3 max-h-[430px] overflow-y-auto pr-1 space-y-3">
                                            <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-black/20 p-4">
                                                <div className="text-xs font-black uppercase tracking-wider text-gray-500">Correction used</div>
                                                <div className="mt-1 text-lg font-mono font-black text-purple-500">
                                                    {result.rm_anova.correction_used === 'none'
                                                      ? 'None (uncorrected)'
                                                      : formatCorrectionName(result.rm_anova.correction_used, true)}
                                                </div>
                                            </div>
                                            <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-black/20 p-4">
                                                <div className="text-xs font-black uppercase tracking-wider text-gray-500">Mauchly test</div>
                                                <div className="mt-1 text-base leading-relaxed font-mono font-bold text-gray-700 dark:text-gray-200">
                                                    W = {fmt(result.rm_anova.mauchly_w, 4)} | p = {result.rm_anova.mauchly_formatted_p || fmtP(result.rm_anova.mauchly_p_value)}
                                                </div>
                                            </div>
                                            <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-black/20 p-4">
                                                <div className="text-xs font-black uppercase tracking-wider text-gray-500">Adjusted p-values</div>
                                                <div className="mt-1 text-base leading-relaxed font-mono font-bold text-gray-700 dark:text-gray-200">
                                                    Greenhouse-Geisser: eps = {fmt(result.rm_anova.gg_epsilon, 3)} | p = {result.rm_anova.gg_formatted_p || fmtP(result.rm_anova.gg_p_value)}
                                                </div>
                                                <div className="text-base leading-relaxed font-mono font-bold text-gray-700 dark:text-gray-200">
                                                    Huynh-Feldt: eps = {fmt(result.rm_anova.hf_epsilon, 3)} | p = {result.rm_anova.hf_formatted_p || fmtP(result.rm_anova.hf_p_value)}
                                                </div>
                                                <div className="mt-2 text-sm leading-relaxed font-mono text-gray-500 dark:text-gray-400">
                                                    Uncorrected p = {result.rm_anova.formatted_p_uncorrected || fmtP(result.rm_anova.p_uncorrected)}
                                                </div>
                                            </div>
	                                        </div>
	                                    </div>
	                                </div>
	                            </Card>

                            <div className="space-y-6">
                                <Card title="Significance Indication" icon={Activity}>
                                    {result.rm_anova.is_significant ? (
                                        <div className="p-7 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-100 dark:border-green-800 text-center space-y-4">
                                            <div className="inline-block p-3 bg-green-500 text-white rounded-full shadow-lg shadow-green-500/30">
                                                <CheckCircle2 size={30} />
                                            </div>
                                            <h4 className="text-xl font-black text-green-700 dark:text-green-400">Significant Effect</h4>
                                            <p className="text-sm leading-relaxed text-green-700 dark:text-green-300 font-medium">
                                                Repeated-condition means are significantly different (p = {result.rm_anova.formatted_p || fmtP(result.rm_anova.p_value)}).
                                            </p>
                                            <p className="text-sm leading-relaxed text-green-800 dark:text-green-200 font-medium">
                                                {rmAnovaEffectSummary(result.rm_anova).text}
                                            </p>
                                            <div className="text-left text-sm leading-relaxed text-green-800 dark:text-green-200 bg-white/60 dark:bg-black/20 border border-green-100 dark:border-green-800 rounded-lg p-3">
                                                {result.rm_anova_posthoc
                                                    ? 'Next: use Step 04 pairwise results to identify which conditions differ.'
                                                    : 'Next: run pairwise post-hoc tests to locate which conditions differ.'}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-7 bg-gray-50 dark:bg-gray-900/30 rounded-2xl border border-gray-200 dark:border-gray-700 text-center space-y-4">
                                            <div className="inline-block p-3 bg-gray-500 text-white rounded-full shadow-lg shadow-gray-500/30">
                                                <AlertCircle size={30} />
                                            </div>
                                            <h4 className="text-xl font-black text-gray-700 dark:text-gray-300">Not Significant</h4>
                                            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300 font-medium">
                                                No statistically significant repeated-condition effect was detected.
                                            </p>
                                            <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-200 font-medium">
                                                {rmAnovaEffectSummary(result.rm_anova).text}
                                            </p>
                                            <div className="text-left text-sm leading-relaxed text-gray-700 dark:text-gray-300 bg-white/70 dark:bg-black/20 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                                                Next: report non-significant RM ANOVA; post-hoc testing is not required.
                                            </div>
                                        </div>
	                                    )}
	                                </Card>
	                            </div>
		                        </div>

                        {result.rm_spaghetti_ci_plot_image && (
                            <Card title={`Spaghetti Plot + Mean ± ${ciPercentForAlpha}% CI`} icon={Activity}>
                                <div className="flex flex-col items-center justify-center space-y-4 p-4">
                                    <div className="relative group w-full max-w-5xl bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border-2 dark:border-gray-800 p-2 shadow-2xl">
                                        <img
                                            src={`data:image/png;base64,${result.rm_spaghetti_ci_plot_image}`}
                                            alt={`RM ANOVA Spaghetti Plot with Mean and ${ciPercentForAlpha}% CI`}
                                            className="w-full h-auto rounded-xl"
                                        />
                                    </div>
                                </div>
                            </Card>
                        )}

	                         <div className="flex justify-end gap-2">
                            <button
                                onClick={() => handleAskAI('RM ANOVA Report', generateReport(result, 'rm_anova'))}
                                className="text-[10px] px-3 py-1 rounded-full border border-purple-200 text-purple-700 dark:text-purple-300 dark:border-purple-700 bg-white/60 dark:bg-purple-900/10 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors font-bold uppercase tracking-wider flex items-center gap-2"
                            >
                                <Bot size={12} /> Ask AI
                            </button>
                            <button
                                onClick={() => openInterpretation('RM ANOVA Report', generateReport(result, 'rm_anova'))}
                                className="text-[10px] px-3 py-1 rounded-full border border-purple-200 text-purple-700 dark:text-purple-300 dark:border-purple-700 bg-white/60 dark:bg-purple-900/10 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors font-bold uppercase tracking-wider"
                            >
                                View Detailed Report
                            </button>
                        </div>

                        {/* Post-hoc for RM ANOVA */}
                        {result.rm_anova_posthoc && (
                            <>
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-purple-500 bg-purple-50 dark:bg-purple-900/20 px-3 py-1 rounded-full w-fit">
                                    Step 04: Post-hoc Pairwise Tests
                                </h3>
                                <Card title="Pairwise Paired t-Tests (Bonferroni)" icon={Activity}>
                                    <div className="space-y-4">
                                         <div className="text-xs text-slate-600 dark:text-slate-300">
                                            Post-hoc method: pairwise paired t-test with Bonferroni correction.
                                         </div>
                                         <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-gray-50 dark:bg-black/20 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                    <tr>
                                                        <th className="px-6 py-4">Comparison</th>
                                                        <th className="px-6 py-4">P-Value</th>
                                                        <th className="px-6 py-4">Sig</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y dark:divide-gray-800">
                                                {result.rm_anova_posthoc.map((item, idx) => (
                                                    <tr key={idx} className={item.is_significant ? "bg-green-50/20" : ""}>
                                                        <td className="px-6 py-4 font-bold text-gray-700 dark:text-gray-300">{item.comparison}</td>
                                                        <td className={`px-6 py-4 font-mono font-black ${item.is_significant ? "text-green-600" : "text-gray-400"}`}>
                                                            {item.formatted_p}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {item.is_significant ? 
                                                                <span className="bg-green-100 text-green-800 text-[10px] uppercase font-bold px-2 py-1 rounded">Significant</span> : 
                                                                <span className="text-gray-400 text-[10px] uppercase">NS</span>
                                                            }
                                                        </td>
                                                    </tr>
                                                ))}
                                                </tbody>
                                            </table>
                                         </div>
                                    </div>
                                </Card>
                            </>
                        )}
                    </section>
                )}

                {/* One-way (non-factorial, non-RM): supports parametric + 2-group non-parametric cards */}
                {!result.is_factorial && !result.rm_anova && (
                    <>
                        {/* T-Test Results (Two-Group Comparison) */}
                        {result.ttest && (
                            <section className="space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-cyan-500 bg-cyan-50 dark:bg-cyan-900/20 px-3 py-1 rounded-full w-fit">
                                    Step 03: {result.ttest.test_name}
                                </h3>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <Card title="T-Test Results" icon={Activity}>
                                        <div className="space-y-4">
                                            <div className="p-4 rounded-xl border bg-cyan-50/40 border-cyan-100 dark:bg-cyan-900/10 dark:border-cyan-800">
                                                <p className="text-sm font-semibold mb-3">{result.ttest.message}</p>
                                                <div className="flex flex-col gap-2 border-t dark:border-gray-800 pt-4 mt-2">
                                                    <div className="flex justify-between items-center bg-gray-50 dark:bg-black/20 p-2 rounded-lg border dark:border-gray-800">
                                                        <span className="text-[10px] font-black uppercase text-gray-400">test p-value:</span>
                                                        <span className={`text-sm font-mono font-black ${result.ttest.is_significant ? 'text-cyan-600' : 'text-gray-600'}`}>p = {result.ttest.formatted_p}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center bg-gray-50 dark:bg-black/20 p-2 rounded-lg border dark:border-gray-800">
                                                        <span className="text-[10px] font-black uppercase text-gray-400">t-statistic:</span>
                                                        <span className="text-sm font-mono font-black text-gray-700 dark:text-gray-300">t = {result.ttest.statistic.toFixed(4)}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center bg-gray-50 dark:bg-black/20 p-2 rounded-lg border dark:border-gray-800">
                                                        <span className="text-[10px] font-black uppercase text-gray-400">degrees of freedom:</span>
                                                        <span className="text-sm font-mono font-black text-gray-700 dark:text-gray-300">df = {result.ttest.df.toFixed(2)}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center bg-gray-50 dark:bg-black/20 p-2 rounded-lg border dark:border-gray-800">
                                                        <span className="text-[10px] font-black uppercase text-gray-400">Cohen's d:</span>
                                                        <span className="text-sm font-mono font-black text-gray-700 dark:text-gray-300">d = {result.ttest.cohens_d.toFixed(3)} ({result.ttest.effect_size})</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                    
                                    <Card title="Group Comparison" icon={Activity}>
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-4 rounded-xl border bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800">
                                                    <p className="text-[10px] font-black uppercase text-gray-400 mb-2">Group 1: {result.ttest.group1}</p>
                                                    <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{result.ttest.mean1.toFixed(3)}</p>
                                                </div>
                                                <div className="p-4 rounded-xl border bg-purple-50 dark:bg-purple-900/10 border-purple-100 dark:border-purple-800">
                                                    <p className="text-[10px] font-black uppercase text-gray-400 mb-2">Group 2: {result.ttest.group2}</p>
                                                    <p className="text-2xl font-black text-purple-600 dark:text-purple-400">{result.ttest.mean2.toFixed(3)}</p>
                                                </div>
                                            </div>
                                            <div className="p-4 rounded-xl border bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700">
                                                <p className="text-[10px] font-black uppercase text-gray-400 mb-2">Mean Difference</p>
                                                <p className="text-2xl font-black text-gray-700 dark:text-gray-300">{result.ttest.mean_diff.toFixed(3)}</p>
                                                <p className="text-xs text-gray-500 mt-2">{ciPercentForAlpha}% CI: [{result.ttest.ci_lower.toFixed(3)}, {result.ttest.ci_upper.toFixed(3)}]</p>
                                            </div>
                                        </div>
                                    </Card>
                                </div>
                                {renderPublicationDescriptiveTable(result)}
                                
                                <Card title="Interpretation" icon={Activity}>
                                    {result.ttest.is_significant ? (
                                        <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-100 dark:border-green-800 text-center space-y-3">
                                            <div className="inline-block p-3 bg-green-500 text-white rounded-full shadow-lg shadow-green-500/30">
                                                <Activity size={32} />
                                            </div>
                                            <h4 className="text-xl font-black text-green-700 dark:text-green-400">Significant Difference</h4>
                                            <p className="text-sm text-green-600 dark:text-green-500 font-medium">The two groups differ significantly with a {result.ttest.effect_size} effect size (Cohen's d = {result.ttest.cohens_d.toFixed(3)}).</p>
                                        </div>
                                    ) : (
                                        <div className="p-6 bg-gray-50 dark:bg-gray-900/20 rounded-2xl border border-gray-200 dark:border-gray-700 text-center space-y-3">
                                            <div className="inline-block p-3 bg-gray-400 text-white rounded-full shadow-lg shadow-gray-400/30">
                                                <Activity size={32} />
                                            </div>
                                            <h4 className="text-xl font-black text-gray-700 dark:text-gray-400">No Significant Difference</h4>
                                            <p className="text-sm text-gray-600 dark:text-gray-500 font-medium">The two groups do not differ significantly. Effect size: {result.ttest.effect_size} (Cohen's d = {result.ttest.cohens_d.toFixed(3)}).</p>
                                        </div>
                                    )}
                                </Card>
                                {(result.ttest_mean_ci_plot_image || result.two_group_publication_plot_image) && (
                                    <Card title="Publication Plot (Two-Group)" icon={Activity}>
                                        <div className="flex flex-col items-center justify-center space-y-4 p-4">
                                            <div className="relative group w-full max-w-4xl bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border-2 dark:border-gray-800 p-2 shadow-2xl">
                                                <img
                                                    src={`data:image/png;base64,${result.ttest_mean_ci_plot_image || result.two_group_publication_plot_image}`}
                                                    alt="Two-group publication plot (t-test)"
                                                    className="w-full h-auto rounded-xl"
                                                />
                                                <button
                                                    onClick={() => setSelectedImage({
                                                        url: `data:image/png;base64,${result.ttest_mean_ci_plot_image || result.two_group_publication_plot_image}`,
                                                        title: 'Publication Plot (Two-Group)',
                                                        plotKey: 'two_group_publication_plot'
                                                    })}
                                                    className="absolute top-3 right-3 z-20 bg-white/95 dark:bg-gray-900/95 text-gray-700 dark:text-gray-200 p-2 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:scale-105 transition-transform"
                                                    title="View Fullscreen"
                                                >
                                                    <Maximize2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </Card>
                                )}
                                <div className="mt-4 p-4 bg-cyan-50 dark:bg-cyan-900/10 rounded-xl border border-cyan-100 dark:border-cyan-800/30">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-cyan-500 mb-2">T‑Test Guide</div>
                                    <div className="text-xs text-cyan-700 dark:text-cyan-300 space-y-2">
                                        <div><strong>Null hypothesis (H0):</strong> mean_1 = mean_2.</div>
                                        <div><strong>Decision rule:</strong> Reject H0 when p &lt; α ({alpha}).</div>
                                        <div><strong>Effect size:</strong> Cohen's d benchmarks are 0.2 (small), 0.5 (medium), and 0.8 (large).</div>
                                        <div><strong>Recommended reporting:</strong> t(df) = statistic, p = value, d = value, and {ciPercentForAlpha}% CI.</div>
                                    </div>
                                </div>
                                <div className="mt-4 flex justify-end gap-2">
                                    <button
                                        onClick={() => handleAskAI('T-Test Report', generateReport(result, 't_test'))}
                                        className="text-[10px] px-3 py-1 rounded-full border border-cyan-200 text-cyan-700 dark:text-cyan-300 dark:border-cyan-700 bg-white/60 dark:bg-cyan-900/10 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-colors font-bold uppercase tracking-wider flex items-center gap-2"
                                    >
                                        <Bot size={12} /> Ask AI
                                    </button>
                                    <button
                                        onClick={() => openInterpretation('T-Test Report', generateReport(result, 't_test'))}
                                    className="text-[10px] px-3 py-1 rounded-full border border-cyan-200 text-cyan-700 dark:text-cyan-300 dark:border-cyan-700 bg-white/60 dark:bg-cyan-900/10 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-colors font-bold uppercase tracking-wider"
                                >
                                    View Detailed Report
                                </button>
                                </div>
                            </section>
                        )}

                        {/* Mann-Whitney U Results */}
                        {result.mann_whitney && (
                            <section className="space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-orange-500 bg-orange-50 dark:bg-orange-900/20 px-3 py-1 rounded-full w-fit">
                                    Step 03: Mann-Whitney U Test (Non-Parametric)
                                </h3>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="space-y-6">
                                    <Card title="Test Statistics" icon={Activity}>
                                        <div className="space-y-4">
                                            <div className="p-4 rounded-xl border bg-orange-50/40 border-orange-100 dark:bg-orange-900/10 dark:border-orange-800">
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex justify-between items-center bg-gray-50 dark:bg-black/20 p-2 rounded-lg border dark:border-gray-800">
                                                        <span className="text-[10px] font-black uppercase text-gray-400">p-value:</span>
                                                        <span className={`text-sm font-mono font-black ${result.mann_whitney.is_significant ? 'text-green-600' : 'text-gray-600'}`}>p = {result.mann_whitney.formatted_p}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center bg-gray-50 dark:bg-black/20 p-2 rounded-lg border dark:border-gray-800">
                                                        <span className="text-[10px] font-black uppercase text-gray-400">U-statistic:</span>
                                                        <span className="text-sm font-mono font-black text-gray-700 dark:text-gray-300">
                                                            U = {Number.isFinite(Number(result.mann_whitney.statistic))
                                                                ? Number(result.mann_whitney.statistic).toFixed(2)
                                                                : 'N/A'}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center bg-gray-50 dark:bg-black/20 p-2 rounded-lg border dark:border-gray-800">
                                                        <span className="text-[10px] font-black uppercase text-gray-400">Rank-biserial:</span>
                                                        <span className="text-sm font-mono font-black text-gray-700 dark:text-gray-300">
                                                            r_rb = {Number.isFinite(Number(result.mann_whitney.rank_biserial))
                                                                ? Number(result.mann_whitney.rank_biserial).toFixed(3)
                                                                : (result.mann_whitney.rank_biserial_formatted || 'N/A')}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center bg-gray-50 dark:bg-black/20 p-2 rounded-lg border dark:border-gray-800">
                                                        <span className="text-[10px] font-black uppercase text-gray-400">Effect size:</span>
                                                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                            {result.mann_whitney.rank_biserial_effect || 'N/A'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                    </div>
                                    
                                    <Card title="Interpretation" icon={Activity}>
                                        {result.mann_whitney.is_significant ? (
                                            <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-100 dark:border-green-800 text-center space-y-3">
                                                <div className="inline-block p-3 bg-green-500 text-white rounded-full shadow-lg shadow-green-500/30">
                                                    <Activity size={32} />
                                                </div>
                                                <h4 className="text-xl font-black text-green-700 dark:text-green-400">Significant Difference</h4>
                                                <p className="text-sm text-green-600 dark:text-green-500 font-medium">{result.mann_whitney.message}</p>
                                                {result.mann_whitney.rank_biserial_interpretation && (
                                                    <p className="text-xs text-green-700 dark:text-green-300 font-medium">{result.mann_whitney.rank_biserial_interpretation}</p>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="p-6 bg-gray-50 dark:bg-gray-900/20 rounded-2xl border border-gray-200 dark:border-gray-700 text-center space-y-3">
                                                <div className="inline-block p-3 bg-gray-400 text-white rounded-full shadow-lg shadow-gray-400/30">
                                                    <Activity size={32} />
                                                </div>
                                                <h4 className="text-xl font-black text-gray-700 dark:text-gray-400">No Significant Difference</h4>
                                                <p className="text-sm text-gray-600 dark:text-gray-500 font-medium">{result.mann_whitney.message}</p>
                                                {result.mann_whitney.rank_biserial_interpretation && (
                                                    <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">{result.mann_whitney.rank_biserial_interpretation}</p>
                                                )}
                                            </div>
                                        )}
                                    </Card>
                                </div>
                                {(result.mann_whitney_boxplot_image || result.two_group_publication_plot_image) && (
                                    <Card title="Publication Plot (Two-Group)" icon={Activity}>
                                        <div className="flex flex-col items-center justify-center space-y-4 p-4">
                                            <div className="relative group w-full max-w-4xl bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border-2 dark:border-gray-800 p-2 shadow-2xl">
                                                <img
                                                    src={`data:image/png;base64,${result.mann_whitney_boxplot_image || result.two_group_publication_plot_image}`}
                                                    alt="Two-group publication plot (Mann-Whitney)"
                                                    className="w-full h-auto rounded-xl"
                                                />
                                                <button
                                                    onClick={() => setSelectedImage({
                                                        url: `data:image/png;base64,${result.mann_whitney_boxplot_image || result.two_group_publication_plot_image}`,
                                                        title: 'Publication Plot (Two-Group)',
                                                        plotKey: 'two_group_publication_plot'
                                                    })}
                                                    className="absolute top-3 right-3 z-20 bg-white/95 dark:bg-gray-900/95 text-gray-700 dark:text-gray-200 p-2 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:scale-105 transition-transform"
                                                    title="View Fullscreen"
                                                >
                                                    <Maximize2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </Card>
                                )}
                                <div className="mt-4 flex justify-end gap-2">
                                    <button
                                        onClick={() => handleAskAI('Mann-Whitney U Report', generateReport(result, 'mann_whitney'))}
                                        className="text-[10px] px-3 py-1 rounded-full border border-orange-200 text-orange-700 dark:text-orange-300 dark:border-orange-700 bg-white/60 dark:bg-orange-900/10 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors font-bold uppercase tracking-wider flex items-center gap-2"
                                    >
                                        <Bot size={12} /> Ask AI
                                    </button>
                                     <button
                                        onClick={() => openInterpretation('Mann-Whitney U Report', generateReport(result, 'mann_whitney'))}
                                        className="text-[10px] px-3 py-1 rounded-full border border-orange-200 text-orange-700 dark:text-orange-300 dark:border-orange-700 bg-white/60 dark:bg-orange-900/10 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors font-bold uppercase tracking-wider"
                                    >
                                        View Detailed Report
                                    </button>
                                </div>
                            </section>
                        )}

                        {/* Wilcoxon Signed-Rank Results */}
                        {result.wilcoxon && (
                            <section className="space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-teal-500 bg-teal-50 dark:bg-teal-900/20 px-3 py-1 rounded-full w-fit">
                                    Step 03: Wilcoxon Signed-Rank Test (Paired Non-Parametric)
                                </h3>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="space-y-6">
                                    <Card title="Test Statistics" icon={Activity}>
                                        <div className="space-y-4">
                                            <div className="p-4 rounded-xl border bg-teal-50/40 border-teal-100 dark:bg-teal-900/10 dark:border-teal-800">
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex justify-between items-center bg-gray-50 dark:bg-black/20 p-2 rounded-lg border dark:border-gray-800">
                                                        <span className="text-[10px] font-black uppercase text-gray-400">p-value:</span>
                                                        <span className={`text-sm font-mono font-black ${result.wilcoxon.is_significant ? 'text-green-600' : 'text-gray-600'}`}>p = {result.wilcoxon.formatted_p}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center bg-gray-50 dark:bg-black/20 p-2 rounded-lg border dark:border-gray-800">
                                                        <span className="text-[10px] font-black uppercase text-gray-400">Wilcoxon statistic (V):</span>
                                                        <span className="text-sm font-mono font-black text-gray-700 dark:text-gray-300">
                                                            V = {Number.isFinite(Number(result.wilcoxon.statistic))
                                                                ? Number(result.wilcoxon.statistic).toFixed(2)
                                                                : 'N/A'}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center bg-gray-50 dark:bg-black/20 p-2 rounded-lg border dark:border-gray-800">
                                                        <span className="text-[10px] font-black uppercase text-gray-400">Rank-biserial correlation:</span>
                                                        <span className="text-sm font-mono font-black text-gray-700 dark:text-gray-300">
                                                            r_rb = {Number.isFinite(Number(result.wilcoxon.rank_biserial))
                                                                ? Number(result.wilcoxon.rank_biserial).toFixed(3)
                                                                : (result.wilcoxon.rank_biserial_formatted || 'N/A')}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center bg-gray-50 dark:bg-black/20 p-2 rounded-lg border dark:border-gray-800">
                                                        <span className="text-[10px] font-black uppercase text-gray-400">Effect size:</span>
                                                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                            {result.wilcoxon.rank_biserial_effect || 'N/A'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                    </div>
                                    
                                    <Card title="Interpretation" icon={Activity}>
                                        {result.wilcoxon.is_significant ? (
                                            <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-100 dark:border-green-800 text-center space-y-3">
                                                <div className="inline-block p-3 bg-green-500 text-white rounded-full shadow-lg shadow-green-500/30">
                                                    <Activity size={32} />
                                                </div>
                                                <h4 className="text-xl font-black text-green-700 dark:text-green-400">Significant Shift</h4>
                                                <p className="text-sm text-green-600 dark:text-green-500 font-medium">{result.wilcoxon.message}</p>
                                                {result.wilcoxon.rank_biserial_interpretation && (
                                                    <p className="text-xs text-green-700 dark:text-green-300 font-medium">{result.wilcoxon.rank_biserial_interpretation}</p>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="p-6 bg-gray-50 dark:bg-gray-900/20 rounded-2xl border border-gray-200 dark:border-gray-700 text-center space-y-3">
                                                <div className="inline-block p-3 bg-gray-400 text-white rounded-full shadow-lg shadow-gray-400/30">
                                                    <Activity size={32} />
                                                </div>
                                                <h4 className="text-xl font-black text-gray-700 dark:text-gray-400">No Significant Shift</h4>
                                                <p className="text-sm text-gray-600 dark:text-gray-500 font-medium">{result.wilcoxon.message}</p>
                                                {result.wilcoxon.rank_biserial_interpretation && (
                                                    <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">{result.wilcoxon.rank_biserial_interpretation}</p>
                                                )}
                                            </div>
                                        )}
                                    </Card>
                                </div>
                                {(result.wilcoxon_plot_image || result.two_group_publication_plot_image || result.image) && (
                                    <Card title="Publication Plot (Two-Group)" icon={Activity}>
                                        <div className="flex flex-col items-center justify-center space-y-4 p-4">
                                            <div className="relative group w-full max-w-4xl bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border-2 dark:border-gray-800 p-2 shadow-2xl">
                                                <img
                                                    src={`data:image/png;base64,${result.wilcoxon_plot_image || result.two_group_publication_plot_image || result.image}`}
                                                    alt="Two-group publication plot (Wilcoxon)"
                                                    className="w-full h-auto rounded-xl"
                                                />
                                                <button
                                                    onClick={() => setSelectedImage({
                                                        url: `data:image/png;base64,${result.wilcoxon_plot_image || result.two_group_publication_plot_image || result.image}`,
                                                        title: 'Publication Plot (Two-Group)',
                                                        plotKey: 'two_group_publication_plot'
                                                    })}
                                                    className="absolute top-3 right-3 z-20 bg-white/95 dark:bg-gray-900/95 text-gray-700 dark:text-gray-200 p-2 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:scale-105 transition-transform"
                                                    title="View Fullscreen"
                                                >
                                                    <Maximize2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </Card>
                                )}
                                <div className="mt-4 flex justify-end gap-2">
                                    <button
                                        onClick={() => handleAskAI('Wilcoxon Test Report', generateReport(result, 'wilcoxon'))}
                                        className="text-[10px] px-3 py-1 rounded-full border border-teal-200 text-teal-700 dark:text-teal-300 dark:border-teal-700 bg-white/60 dark:bg-teal-900/10 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors font-bold uppercase tracking-wider flex items-center gap-2"
                                    >
                                        <Bot size={12} /> Ask AI
                                    </button>
                                     <button
                                        onClick={() => openInterpretation('Wilcoxon Test Report', generateReport(result, 'wilcoxon'))}
                                        className="text-[10px] px-3 py-1 rounded-full border border-teal-200 text-teal-700 dark:text-teal-300 dark:border-teal-700 bg-white/60 dark:bg-teal-900/10 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors font-bold uppercase tracking-wider"
                                    >
                                        View Detailed Report
                                    </button>
                                </div>
                            </section>
                        )}

                        {/* ANOVA Results */}
                        {result.anova && (
                            <section className="space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1 rounded-full w-fit">
                                    Step 03: {result.anova.test_type === 'welch' ? "Welch's ANOVA" : "One-Way ANOVA"}
                                </h3>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <Card title="ANOVA Test Results" icon={Activity}>
                                        <div className="space-y-4">
                                            <div className="p-4 rounded-xl border bg-indigo-50/40 border-indigo-100 dark:bg-indigo-900/10 dark:border-indigo-800">
                                                <p className="text-sm font-semibold mb-3">{result.anova.message}</p>
                                                <div className="flex flex-col gap-2 border-t dark:border-gray-800 pt-4 mt-2">
                                                    <div className="flex justify-between items-center bg-gray-50 dark:bg-black/20 p-2 rounded-lg border dark:border-gray-800">
                                                        <span className="text-[10px] font-black uppercase text-gray-400">test p-value:</span>
                                                        <span className={`text-sm font-mono font-black ${result.anova.is_significant ? 'text-indigo-600' : 'text-gray-600'}`}>p = {result.anova.formatted_p}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center px-2">
                                                        <span className="text-[10px] font-black uppercase text-gray-300">F-statistic:</span>
                                                        <span className="text-xs font-mono font-bold text-indigo-400">{result.anova.statistic?.toFixed(4)}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center px-2">
                                                        <span className="text-[10px] font-black uppercase text-gray-300">df1:</span>
                                                        <span className="text-xs font-mono font-bold text-indigo-400">
                                                            {Number.isFinite(Number(result.anova.df_between ?? result.anova.df1))
                                                                ? Number(result.anova.df_between ?? result.anova.df1).toFixed(3)
                                                                : 'N/A'}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center px-2">
                                                        <span className="text-[10px] font-black uppercase text-gray-300">df2:</span>
                                                        <span className="text-xs font-mono font-bold text-indigo-400">
                                                            {Number.isFinite(Number(result.anova.df_within ?? result.anova.df2))
                                                                ? Number(result.anova.df_within ?? result.anova.df2).toFixed(3)
                                                                : 'N/A'}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center px-2">
                                                        <span className="text-[10px] font-black uppercase text-gray-300">effect magnitude:</span>
                                                        <span className="text-xs font-mono font-bold text-indigo-400 text-right">
                                                            {Number.isFinite(Number(result.anova.eta_squared ?? result.anova.effect_size))
                                                                ? `${String(result.anova.effect_size_label || 'unknown')} (eta-squared = ${Number(result.anova.eta_squared ?? result.anova.effect_size).toFixed(3)})`
                                                                : 'N/A'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>

                                    <Card title="ANOVA Interpretation" icon={Activity}>
                                        <div className="h-full flex flex-col justify-center gap-4">
                                            {result.anova.is_significant ? (
                                                <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-100 dark:border-green-800 text-center space-y-3">
                                                    <div className="inline-block p-3 bg-green-500 text-white rounded-full shadow-lg shadow-green-500/30">
                                                        <Activity size={32} />
                                                    </div>
                                                    <h4 className="text-xl font-black text-green-700 dark:text-green-400">Significant Difference</h4>
                                                    <p className="text-sm text-green-600 dark:text-green-500 font-medium">
                                                        {Number.isFinite(Number(result.anova.eta_squared ?? result.anova.effect_size))
                                                            ? `${String(result.anova.effect_size_label || 'unknown')} effect magnitude (eta-squared = ${Number(result.anova.eta_squared ?? result.anova.effect_size).toFixed(3)}).`
                                                            : 'Effect magnitude unavailable.'}
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="p-6 bg-gray-50 dark:bg-gray-900/20 rounded-2xl border border-gray-100 dark:border-gray-800 text-center space-y-3">
                                                    <div className="inline-block p-3 bg-gray-400 text-white rounded-full shadow-lg shadow-gray-400/30">
                                                        <Activity size={32} />
                                                    </div>
                                                    <h4 className="text-xl font-black text-gray-700 dark:text-gray-400">No Significance</h4>
                                                    <p className="text-sm text-gray-600 dark:text-gray-500 font-medium">
                                                        {Number.isFinite(Number(result.anova.eta_squared ?? result.anova.effect_size))
                                                            ? `${String(result.anova.effect_size_label || 'unknown')} effect magnitude (eta-squared = ${Number(result.anova.eta_squared ?? result.anova.effect_size).toFixed(3)}).`
                                                            : 'Effect magnitude unavailable.'}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </Card>
                                </div>
                                {Array.isArray(result.anova_table_rows) && result.anova_table_rows.length > 0 && (
                                    <Card title="ANOVA Table" icon={Activity}>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-gray-50 dark:bg-black/20 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                    <tr>
                                                        <th className="px-4 py-3">Source</th>
                                                        <th className="px-4 py-3 text-right">Df</th>
                                                        <th className="px-4 py-3 text-right">Sum Sq</th>
                                                        <th className="px-4 py-3 text-right">Mean Sq</th>
                                                        <th className="px-4 py-3 text-right">F value</th>
                                                        <th className="px-4 py-3 text-right">Pr(&gt;F)</th>
                                                        <th className="px-4 py-3 text-right">Sig</th>
                                                        <th className="px-4 py-3 text-right">Stars</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                                    {result.anova_table_rows.map((row, idx) => (
                                                        <tr key={`one_way_anova_row_${idx}`} className={row?.is_residual ? 'bg-indigo-50/40 dark:bg-indigo-900/10' : ''}>
                                                            <td className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">{row?.source || 'N/A'}</td>
                                                            <td className="px-4 py-3 text-right font-mono">{row?.df != null && Number.isFinite(Number(row.df)) ? fmt(row.df, 3) : ''}</td>
                                                            <td className="px-4 py-3 text-right font-mono">{row?.sum_sq != null && Number.isFinite(Number(row.sum_sq)) ? fmt(row.sum_sq, 4) : ''}</td>
                                                            <td className="px-4 py-3 text-right font-mono">{row?.mean_sq != null && Number.isFinite(Number(row.mean_sq)) ? fmt(row.mean_sq, 4) : ''}</td>
                                                            <td className="px-4 py-3 text-right font-mono">{row?.is_residual ? '' : (row?.statistic != null && Number.isFinite(Number(row.statistic)) ? fmt(row.statistic, 4) : '')}</td>
                                                            <td className="px-4 py-3 text-right font-mono">{row?.is_residual ? '' : ((row?.p_value != null && Number.isFinite(Number(row.p_value))) ? (row?.formatted_p || fmtP(row?.p_value)) : '')}</td>
                                                            <td className="px-4 py-3 text-right font-mono">
                                                                {row?.is_residual ? '' : (row?.p_value != null && Number.isFinite(Number(row.p_value))
                                                                    ? (Number(row.p_value) < (Number.isFinite(Number(result?.alpha)) ? Number(result.alpha) : alpha) ? 'Yes' : 'No')
                                                                    : '')}
                                                            </td>
                                                            <td className="px-4 py-3 text-right font-mono">
                                                                {row?.is_residual ? '' : (row?.p_value != null && Number.isFinite(Number(row.p_value))
                                                                    ? (Number(row.p_value) < 0.001 ? '***' : Number(row.p_value) < 0.01 ? '**' : Number(row.p_value) < (Number.isFinite(Number(result?.alpha)) ? Number(result.alpha) : alpha) ? '*' : '')
                                                                    : '')}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="mt-3 text-[11px] font-mono text-gray-600 dark:text-gray-300">
                                            Stars: *** p &lt; 0.001, ** p &lt; 0.01, * p &lt; α ({Number.isFinite(Number(result?.alpha)) ? Number(result.alpha) : alpha})
                                        </div>
                                    </Card>
                                )}
                                {renderPublicationDescriptiveTable(result)}
                                <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-800/30">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2">ANOVA Guide</div>
                                    <div className="text-xs text-indigo-700 dark:text-indigo-300 space-y-2">
                                        <div><strong>Null hypothesis (H0):</strong> all group means are equal.</div>
                                        <div><strong>Decision rule:</strong> Reject H0 when p &lt; α ({Number.isFinite(Number(result?.alpha)) ? Number(result.alpha) : alpha}).</div>
                                        <div><strong>Interpretation:</strong> A significant omnibus result requires multiplicity-adjusted post-hoc testing.</div>
                                        <div><strong>Recommended reporting:</strong> F(df1, df2) = statistic, p = value, followed by post-hoc results.</div>
                                        <div><strong>Post-hoc:</strong> {result.anova.test_type === 'welch' ? 'Games-Howell (used after Welch ANOVA when variances are unequal).' : 'Tukey HSD (used when variances are equal).'}</div>
                                    </div>
                                </div>
                                {(result.mean_ci_plot_image || result.anova_residual_plot_image || result.residual_qq_plot_image) && (
                                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                                        {result.mean_ci_plot_image && (
                                            <Card title={`Mean ± ${ciPercentForAlpha}% CI Plot`} icon={Activity}>
                                                <div className="relative group">
                                                    <img
                                                        src={`data:image/png;base64,${result.mean_ci_plot_image}`}
                                                        alt={`Group mean with ${ciPercentForAlpha}% confidence intervals`}
                                                        className="w-full h-auto rounded-xl"
                                                    />
                                                    <button
                                                        onClick={() => setSelectedImage({
                                                            url: `data:image/png;base64,${result.mean_ci_plot_image}`,
                                                            title: `Mean ± ${ciPercentForAlpha}% CI Plot`,
                                                            plotKey: 'mean_ci_plot'
                                                        })}
                                                        className="absolute top-3 right-3 z-20 bg-white/95 dark:bg-gray-900/95 text-gray-700 dark:text-gray-200 p-2 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:scale-105 transition-transform"
                                                        title="View Fullscreen"
                                                    >
                                                        <Maximize2 size={16} />
                                                    </button>
                                                </div>
                                            </Card>
                                        )}
                                        {result.anova_residual_plot_image && (
                                            <Card title="Residuals vs Fitted" icon={Activity}>
                                                <div className="relative group">
                                                    <img
                                                        src={`data:image/png;base64,${result.anova_residual_plot_image}`}
                                                        alt="ANOVA residuals vs fitted"
                                                        className="w-full h-auto rounded-xl"
                                                    />
                                                    <button
                                                        onClick={() => setSelectedImage({
                                                            url: `data:image/png;base64,${result.anova_residual_plot_image}`,
                                                            title: 'Residuals vs Fitted',
                                                            plotKey: 'anova_residual_plot'
                                                        })}
                                                        className="absolute top-3 right-3 z-20 bg-white/95 dark:bg-gray-900/95 text-gray-700 dark:text-gray-200 p-2 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:scale-105 transition-transform"
                                                        title="View Fullscreen"
                                                    >
                                                        <Maximize2 size={16} />
                                                    </button>
                                                </div>
                                            </Card>
                                        )}
                                        {result.residual_qq_plot_image && (
                                            <Card title="Residual Q-Q Plot" icon={Activity}>
                                                <div className="relative group">
                                                    <img
                                                        src={`data:image/png;base64,${result.residual_qq_plot_image}`}
                                                        alt="ANOVA residual Q-Q plot"
                                                        className="w-full h-auto rounded-xl"
                                                    />
                                                    <button
                                                        onClick={() => setSelectedImage({
                                                            url: `data:image/png;base64,${result.residual_qq_plot_image}`,
                                                            title: 'Residual Q-Q Plot',
                                                            plotKey: 'residual_qq_plot'
                                                        })}
                                                        className="absolute top-3 right-3 z-20 bg-white/95 dark:bg-gray-900/95 text-gray-700 dark:text-gray-200 p-2 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:scale-105 transition-transform"
                                                        title="View Fullscreen"
                                                    >
                                                        <Maximize2 size={16} />
                                                    </button>
                                                </div>
                                            </Card>
                                        )}
                                    </div>
                                )}
                                <div className="mt-4 flex justify-end gap-2">
                                    <button
                                        onClick={() => handleAskAI('ANOVA Report', generateReport(result, 'anova'))}
                                        className="text-[10px] px-3 py-1 rounded-full border border-indigo-200 text-indigo-700 dark:text-indigo-300 dark:border-indigo-700 bg-white/60 dark:bg-indigo-900/10 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors font-bold uppercase tracking-wider flex items-center gap-2"
                                    >
                                        <Bot size={12} /> Ask AI
                                    </button>
                                    <button
                                        onClick={() => openInterpretation('ANOVA Report', generateReport(result, 'anova'))}
                                    className="text-[10px] px-3 py-1 rounded-full border border-indigo-200 text-indigo-700 dark:text-indigo-300 dark:border-indigo-700 bg-white/60 dark:bg-indigo-900/10 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors font-bold uppercase tracking-wider"
                                >
                                    View Detailed Report
                                </button>
                                </div>
                            </section>
                        )}
                        
                        {/* Tukey HSD Post-Hoc Test Results */}
                        {result.tukey && (
                            <section className="space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1 rounded-full w-fit">
                                    Step 04: Tukey HSD Post-hoc Test
                                </h3>
                                
                                <div className="flex flex-col gap-6">
                                    <Card title="Pairwise Comparisons (Tukey HSD)" icon={Activity}>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-gray-50 dark:bg-black/20 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                    <tr>
                                                        <th className="px-6 py-4">Comparison</th>
                                                        <th className="px-6 py-4">Mean Diff</th>
                                                        <th className="px-6 py-4">{ciPercentForAlpha}% CI (±)</th>
                                                        <th className="px-6 py-4">P-Value (Adj)</th>
                                                        <th className="px-6 py-4">Result</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y dark:divide-gray-800">
                                                    {result.tukey.map((item, idx) => (
                                                        <tr key={idx} className={`hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors ${item.is_significant ? 'bg-green-50/20 dark:bg-green-900/5' : ''}`}>
                                                            <td className="px-6 py-4 font-bold text-gray-700 dark:text-gray-300">
                                                                {item.comparison}
                                                            </td>
                                                            <td className="px-6 py-4 font-mono text-xs text-gray-600 dark:text-gray-400">
                                                                {item.diff.toFixed(4)}
                                                            </td>
                                                            <td className="px-6 py-4 font-mono text-xs text-gray-500 dark:text-gray-500">
                                                                {(() => {
                                                                    const diff = Number(item?.diff);
                                                                    const lwr = Number(item?.lwr);
                                                                    const upr = Number(item?.upr);
                                                                    const hasBounds = Number.isFinite(lwr) && Number.isFinite(upr);
                                                                    if (!hasBounds) return 'N/A';
                                                                    const center = Number.isFinite(diff) ? diff : ((lwr + upr) / 2);
                                                                    const halfWidth = (upr - lwr) / 2;
                                                                    return `${center.toFixed(4)} ± ${halfWidth.toFixed(4)}`;
                                                                })()}
                                                            </td>
                                                            <td className={`px-6 py-4 font-mono text-xs font-black ${item.is_significant ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                                                                p = {item.formatted_p}
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                {item.is_significant ? (
                                                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 rounded text-[10px] font-black uppercase">
                                                                        {getSignificanceStars(item) || '*'}
                                                                    </span>
                                                                ) : (
                                                                    <span className="px-2 py-0.5 bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 rounded text-[10px] font-black uppercase">ns</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </Card>
                                    {renderPosthocDescriptiveTable(result, 'Post-hoc Descriptive Table (Tukey)')}
                                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-800/30">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2">Tukey HSD Guide</div>
                                        <div className="text-xs text-indigo-700 dark:text-indigo-300 space-y-2">
                                            <div><strong>What is this?:</strong> It compares every group against every other group (like a round-robin tournament).</div>
                                            <div><strong>Adjusted p-values:</strong> We cheat a bit (adjust the math) so we don't find accidental "fake" differences.</div>
                                            <div><strong>Interpretation:</strong> p &lt; α ({alpha})? Those two specific groups are different.</div>
                                            <div><strong>Example:</strong> "A vs B" has p=0.02. That means A and B are truly different.</div>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex justify-end gap-2">
                                        <button
                                            onClick={() => handleAskAI('Post-hoc Test Report (Tukey)', generateReport(result, 'post_hoc'))}
                                            className="text-[10px] px-3 py-1 rounded-full border border-indigo-200 text-indigo-700 dark:text-indigo-300 dark:border-indigo-700 bg-white/60 dark:bg-indigo-900/10 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors font-bold uppercase tracking-wider flex items-center gap-2"
                                        >
                                            <Bot size={12} /> Ask AI
                                        </button>
                                        <button
                                            onClick={() => openInterpretation('Post-hoc Test Report (Tukey)', generateReport(result, 'post_hoc'))}
                                            className="text-[10px] px-3 py-1 rounded-full border border-indigo-200 text-indigo-700 dark:text-indigo-300 dark:border-indigo-700 bg-white/60 dark:bg-indigo-900/10 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors font-bold uppercase tracking-wider"
                                        >
                                            View Detailed Report
                                        </button>
                                    </div>

                                    {result.image ? (
                                        <Card title="Tukey HSD Publication Plot" icon={Activity}>
                                            <div className="flex flex-col items-center justify-center space-y-4 p-4">
                                                <div className="relative group w-full max-w-4xl bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border-2 dark:border-gray-800 p-2 shadow-2xl">
                                                    <img 
                                                        src={`data:image/png;base64,${result.image}`} 
                                                        alt="Tukey HSD publication boxplot" 
                                                        className="w-full h-auto rounded-xl"
                                                    />
                                                    <button
                                                        onClick={() => setSelectedImage({ url: `data:image/png;base64,${result.image}`, title: 'Tukey HSD Publication Plot', plotKey: 'tukey_plot' })}
                                                        className="absolute top-3 right-3 z-20 bg-white/95 dark:bg-gray-900/95 text-gray-700 dark:text-gray-200 p-2 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:scale-105 transition-transform"
                                                        title="View Fullscreen"
                                                    >
                                                        <Maximize2 size={18} />
                                                    </button>
                                                    <div className="absolute inset-0 z-10 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <button 
                                                            onClick={() => {
                                                                const link = document.createElement('a');
                                                                link.href = `data:image/png;base64,${result.image}`;
                                                                link.download = `tukey_plot_result.png`;
                                                                link.click();
                                                            }}
                                                            className="px-6 py-3 bg-white text-black rounded-xl font-black text-xs uppercase tracking-widest shadow-2xl hover:scale-105 transition-transform"
                                                        >
                                                            Download High-Res Plot
                                                        </button>
                                                    </div>
                                                </div>
                                                <p className="text-xs font-black uppercase tracking-[0.3em] text-gray-400 text-center bg-gray-50 dark:bg-gray-800/50 px-4 py-2 rounded-full">
                                                    Publication-Ready Boxplot with CLD, Mean {ciPercentForAlpha}% CI, and Median Markers
                                                </p>
                                                <p className="text-[11px] text-slate-600 dark:text-slate-300 text-center">
                                                    Tip: This plot is editable in fullscreen mode (title, labels, and position steps).
                                                </p>
                                            </div>
                                        </Card>
                                    ) : result.plot_error ? (
                                        <Card title="Visualization Error" icon={Activity}>
                                            <div className="p-6 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-800/30 text-center space-y-3">
                                                <div className="text-red-500 font-black text-xs uppercase tracking-widest mb-2">Plot Generation Failed</div>
                                                <p className="text-sm text-red-600 dark:text-red-400 font-medium">{result.plot_error}</p>
                                                <p className="text-[10px] text-red-400 dark:text-red-500/50 uppercase mt-4">Check R dependencies (ggplot2, multcompView)</p>
                                            </div>
                                        </Card>
                                    ) : null}
                                </div>
                            </section>
                        )}
                        
                        {/* Games-Howell Post-Hoc Test Results (Welch's ANOVA) */}
                        {result.games_howell && (
                            <section className="space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-3 py-1 rounded-full w-fit">
                                    Step 04: Games-Howell Post-hoc Test
                                </h3>
                                
                                <div className="flex flex-col gap-6">
                                    <Card title="Pairwise Comparisons (Games-Howell)" icon={Activity}>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-gray-50 dark:bg-black/20 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                    <tr>
                                                        <th className="px-6 py-4">Comparison</th>
                                                        <th className="px-6 py-4">Mean Diff</th>
                                                        <th className="px-6 py-4">{ciPercentForAlpha}% CI</th>
                                                        <th className="px-6 py-4">t-statistic</th>
                                                        <th className="px-6 py-4">df</th>
                                                        <th className="px-6 py-4">P-Value (Adj)</th>
                                                        <th className="px-6 py-4">Result</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y dark:divide-gray-800">
                                                    {result.games_howell.map((item, idx) => (
                                                        <tr key={idx} className={`hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors ${item.is_significant ? 'bg-green-50/20 dark:bg-green-900/5' : ''}`}>
                                                            <td className="px-6 py-4 font-bold text-gray-700 dark:text-gray-300">
                                                                {item.comparison}
                                                            </td>
                                                            <td className="px-6 py-4 font-mono text-xs text-gray-600 dark:text-gray-400">
                                                                {item.diff.toFixed(4)}
                                                            </td>
                                                            <td className="px-6 py-4 font-mono text-xs text-gray-500 dark:text-gray-500">
                                                                [{item.lwr.toFixed(2)}, {item.upr.toFixed(2)}]
                                                            </td>
                                                            <td className="px-6 py-4 font-mono text-xs text-gray-600 dark:text-gray-400">
                                                                {item.t_stat.toFixed(3)}
                                                            </td>
                                                            <td className="px-6 py-4 font-mono text-xs text-gray-500 dark:text-gray-500">
                                                                {item.df.toFixed(2)}
                                                            </td>
                                                            <td className={`px-6 py-4 font-mono text-xs font-black ${item.is_significant ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                                                                p = {item.formatted_p}
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                {item.is_significant ? (
                                                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 rounded text-[10px] font-black uppercase">Significant</span>
                                                                ) : (
                                                                    <span className="px-2 py-0.5 bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 rounded text-[10px] font-black uppercase">NS</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-800/30">
                                            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                                                <strong>Note:</strong> Games-Howell test is used because variances are unequal ({result.levene ? "Levene's test failed" : "Bartlett's test failed"}). This test does not assume equal variances and uses Welch-Satterthwaite degrees of freedom.
                                            </p>
                                        </div>
                                    </Card>
                                    {renderPublicationDescriptiveTable(result)}
                                    <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-800/30">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-2">Games‑Howell Guide</div>
                                        <div className="text-xs text-amber-700 dark:text-amber-300 space-y-2">
                                            <div><strong>What is this?:</strong> Like Tukey, but used when the groups have different variances (spreads) or sizes.</div>
                                            <div><strong>Interpretation:</strong> p &lt; α ({alpha})? Those two specific groups are different.</div>
                                            <div><strong>Why use it?:</strong> It's safer when your data is messy (unequal spread).</div>
                                            <div><strong>Example:</strong> "A vs C" has p=0.01. They are different.</div>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex justify-end gap-2">
                                        <button
                                            onClick={() => handleAskAI('Post-hoc Test Report (Games-Howell)', generateReport(result, 'post_hoc'))}
                                            className="text-[10px] px-3 py-1 rounded-full border border-green-200 text-green-700 dark:text-green-300 dark:border-green-700 bg-white/60 dark:bg-green-900/10 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors font-bold uppercase tracking-wider flex items-center gap-2"
                                        >
                                            <Bot size={12} /> Ask AI
                                        </button>
                                        <button
                                            onClick={() => openInterpretation('Post-hoc Test Report (Games-Howell)', generateReport(result, 'post_hoc'))}
                                            className="text-[10px] px-3 py-1 rounded-full border border-amber-200 text-amber-700 dark:text-amber-300 dark:border-amber-700 bg-white/60 dark:bg-amber-900/10 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors font-bold uppercase tracking-wider"
                                        >
                                            View Detailed Report
                                        </button>
                                    </div>
                                    {result.image ? (
                                        <Card title="Games-Howell Visualization" icon={Activity}>
                                            <div className="flex flex-col items-center justify-center space-y-4 p-4">
                                                <div className="relative group w-full max-w-4xl bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border-2 dark:border-gray-800 p-2 shadow-2xl">
                                                    <img
                                                        src={`data:image/png;base64,${result.image}`}
                                                        alt="Games-Howell Boxplot"
                                                        className="w-full h-auto rounded-xl"
                                                    />
                                                    <button
                                                        onClick={() => setSelectedImage({ url: `data:image/png;base64,${result.image}`, title: 'Games-Howell Visualization', plotKey: 'games_howell_plot' })}
                                                        className="absolute top-3 right-3 z-20 bg-white/95 dark:bg-gray-900/95 text-gray-700 dark:text-gray-200 p-2 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:scale-105 transition-transform"
                                                        title="View Fullscreen"
                                                    >
                                                        <Maximize2 size={18} />
                                                    </button>
                                                </div>
                                                <p className="text-[11px] text-slate-600 dark:text-slate-300 text-center">
                                                    Tip: This plot is editable in fullscreen mode (title, labels, and position steps).
                                                </p>
                                            </div>
                                        </Card>
                                    ) : null}
                                </div>
                            </section>
                        )}
                    </>
                )}

                {/* Non-Parametric Path: Friedman Test (Paired > 2 Groups) */}
                {result.path_taken === 'non-parametric' && result.friedman && (
                    <section className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-3 py-1 rounded-full w-fit">
                            Step 03: Friedman Test (Repeated Measures)
                        </h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card title="Friedman Test Statistics" icon={Activity}>
                                <div className="space-y-4">
                                    <div className="p-4 rounded-xl border bg-amber-50/40 border-amber-100 dark:bg-amber-900/10 dark:border-amber-800">
                                        <div className="flex flex-col gap-2 border-t dark:border-gray-800 pt-4 mt-2">
                                            <div className="flex justify-between items-center bg-gray-50 dark:bg-black/20 p-2 rounded-lg border dark:border-gray-800">
                                                <span className="text-[10px] font-black uppercase text-gray-400">p-value:</span>
                                                <span className={`text-sm font-mono font-black ${result.friedman.is_significant ? 'text-amber-600' : 'text-gray-600'}`}>p = {result.friedman.formatted_p}</span>
                                            </div>
                                            <div className="flex justify-between items-center px-2">
                                                <span className="text-[10px] font-black uppercase text-gray-300">Chi-squared:</span>
                                                <span className="text-xs font-mono font-bold text-amber-400">{result.friedman.statistic?.toFixed(4)}</span>
                                            </div>
                                             <div className="flex justify-between items-center px-2">
                                                <span className="text-[10px] font-black uppercase text-gray-300">df:</span>
                                                <span className="text-xs font-mono font-bold text-amber-400">{result.friedman.df}</span>
                                            </div>
                                        </div>
                                        <div className="mt-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-black/30 p-3">
                                            <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">Console Output (friedman.test)</div>
                                            <pre className="mt-2 whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-gray-700 dark:text-gray-200">
                                                {buildFriedmanROutput(result.friedman, result.friedman_posthoc)}
                                            </pre>
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            <Card title="Interpretation" icon={Activity}>
                                <div className="h-full flex flex-col justify-center gap-4">
                                    {result.friedman.is_significant ? (
                                        <div className="p-6 bg-green-50 dark:bg-green-900/10 rounded-2xl border border-green-100 dark:border-green-800 text-center space-y-3">
                                            <div className="inline-block p-3 bg-green-500 text-white rounded-full shadow-lg shadow-green-500/30">
                                                <Activity size={32} />
                                            </div>
                                            <h4 className="text-xl font-black text-green-700 dark:text-green-400">Significant Difference</h4>
                                            <p className="text-sm text-green-600 dark:text-green-500 font-medium">Rankings change significantly across time/conditions.</p>
                                        </div>
                                    ) : (
                                        <div className="p-6 bg-gray-50 dark:bg-gray-900/20 rounded-2xl border border-gray-100 dark:border-gray-800 text-center space-y-3">
                                            <div className="inline-block p-3 bg-gray-400 text-white rounded-full shadow-lg shadow-gray-400/30">
                                                <Activity size={32} />
                                            </div>
                                            <h4 className="text-xl font-black text-gray-700 dark:text-gray-400">No Significance</h4>
                                            <p className="text-sm text-gray-600 dark:text-gray-500 font-medium">No consistent change across conditions.</p>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </div>
                        
                         <div className="flex justify-end gap-2">
                            <button
                                onClick={() => handleAskAI('Friedman Test Report', generateReport(result, 'friedman'))}
                                className="text-[10px] px-3 py-1 rounded-full border border-amber-200 text-amber-700 dark:text-amber-300 dark:border-amber-700 bg-white/60 dark:bg-amber-900/10 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors font-bold uppercase tracking-wider flex items-center gap-2"
                            >
                                <Bot size={12} /> Ask AI
                            </button>
                            <button
                                onClick={() => openInterpretation('Friedman Test Report', generateReport(result, 'friedman'))}
                                className="text-[10px] px-3 py-1 rounded-full border border-amber-200 text-amber-700 dark:text-amber-300 dark:border-amber-700 bg-white/60 dark:bg-amber-900/10 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors font-bold uppercase tracking-wider"
                            >
                                View Detailed Report
                            </button>
	                        </div>

                        {result.friedman_spaghetti_iqr_plot_image && (
                            <Card title="Spaghetti Plot + Median ± IQR" icon={Activity}>
                                <div className="flex flex-col items-center justify-center space-y-4 p-4">
                                    <div className="relative group w-full max-w-5xl bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border-2 dark:border-gray-800 p-2 shadow-2xl">
                                        <img
                                            src={`data:image/png;base64,${result.friedman_spaghetti_iqr_plot_image}`}
                                            alt="Friedman Spaghetti Plot with Median and IQR"
                                            className="w-full h-auto rounded-xl"
                                        />
                                    </div>
                                </div>
                            </Card>
                        )}

                         {/* Friedman Post-hoc */}
                        {result.friedman_posthoc && (
                            <Card title="Pairwise Comparisons (Nemenyi)" icon={Activity}>
                                <div className="space-y-4">
                                     <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-gray-50 dark:bg-black/20 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                <tr>
                                                    <th className="px-6 py-4">Comparison</th>
                                                    <th className="px-6 py-4">Q</th>
                                                    <th className="px-6 py-4">P-Value</th>
                                                    <th className="px-6 py-4">Result</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y dark:divide-gray-800">
                                            {result.friedman_posthoc.map((item, idx) => (
                                                <tr key={idx} className={item.is_significant ? "bg-green-50/20" : ""}>
                                                    <td className="px-6 py-4 font-bold text-gray-700 dark:text-gray-300">{item.comparison}</td>
                                                    <td className="px-6 py-4 font-mono text-xs text-gray-600 dark:text-gray-400">
                                                        {Number.isFinite(Number(item.statistic)) ? Number(item.statistic).toFixed(3) : 'N/A'}
                                                    </td>
                                                    <td className={`px-6 py-4 font-mono font-black ${item.is_significant ? "text-green-600" : "text-gray-400"}`}>
                                                        {item.formatted_p}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {item.is_significant ? 
                                                            <span className="bg-green-100 text-green-800 text-[10px] uppercase font-bold px-2 py-1 rounded">Significant</span> : 
                                                            <span className="text-gray-400 text-[10px] uppercase">NS</span>
                                                        }
                                                    </td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                     </div>
                                </div>
                            </Card>
                        )}
                    </section>
                )}

                {/* Non-Parametric Path: Kruskal-Wallis & Dunn */}
                {result.path_taken === 'non-parametric' && result.kruskal && (
                    <>
                        <section className="space-y-4">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-3 py-1 rounded-full w-fit">
                                Step 03: Kruskal-Wallis (Non-Parametric)
                            </h3>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <Card title="Kruskal-Wallis Results" icon={Activity}>
                                    <div className="space-y-4">
                                        <div className="p-4 rounded-xl border bg-amber-50/40 border-amber-100 dark:bg-amber-900/10 dark:border-amber-800">
                                            <p className="text-sm font-semibold mb-3">{result.kruskal.message}</p>
                                            <div className="flex flex-col gap-2 border-t dark:border-gray-800 pt-4 mt-2">
                                                <div className="flex justify-between items-center bg-gray-50 dark:bg-black/20 p-2 rounded-lg border dark:border-gray-800">
                                                    <span className="text-[10px] font-black uppercase text-gray-400">test p-value:</span>
                                                    <span className={`text-sm font-mono font-black ${result.kruskal.is_significant ? 'text-amber-600' : 'text-gray-600'}`}>p = {result.kruskal.formatted_p}</span>
                                                </div>
                                                <div className="flex justify-between items-center px-2">
                                                    <span className="text-[10px] font-black uppercase text-gray-300">Chi-squared:</span>
                                                    <span className="text-xs font-mono font-bold text-amber-400">{result.kruskal.statistic?.toFixed(4)}</span>
                                                </div>
                                                 <div className="flex justify-between items-center px-2">
                                                    <span className="text-[10px] font-black uppercase text-gray-300">df:</span>
                                                    <span className="text-xs font-mono font-bold text-amber-400">{result.kruskal.df}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Card>

                                <Card title="Kruskal Interpretation" icon={Activity}>
                                    <div className="h-full flex flex-col justify-center gap-4">
                                        {result.kruskal.is_significant ? (
                                            <div className="p-6 bg-green-50 dark:bg-green-900/10 rounded-2xl border border-green-100 dark:border-green-800 text-center space-y-3">
                                                <div className="inline-block p-3 bg-green-500 text-white rounded-full shadow-lg shadow-green-500/30">
                                                    <Activity size={32} />
                                                </div>
                                                <h4 className="text-xl font-black text-green-700 dark:text-green-400">Significant Difference</h4>
                                                <p className="text-sm text-green-600 dark:text-green-500 font-medium">Median values differ significantly. Proceed with Dunn's test below.</p>
                                            </div>
                                        ) : (
                                            <div className="p-6 bg-gray-50 dark:bg-gray-900/20 rounded-2xl border border-gray-100 dark:border-gray-800 text-center space-y-3">
                                                <div className="inline-block p-3 bg-gray-400 text-white rounded-full shadow-lg shadow-gray-400/30">
                                                    <Activity size={32} />
                                                </div>
                                                <h4 className="text-xl font-black text-gray-700 dark:text-gray-400">No Significance</h4>
                                                <p className="text-sm text-gray-600 dark:text-gray-500 font-medium">No significant difference observed in group distributions.</p>
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            </div>
                            {renderPublicationDescriptiveTable(result)}
                            <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-800/30">
                                <div className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-2">Kruskal‑Wallis Guide</div>
                                <div className="text-xs text-amber-700 dark:text-amber-300 space-y-2">
                                    <div><strong>Null hypothesis (H0):</strong> group distributions are equal in central tendency.</div>
                                    <div><strong>Decision rule:</strong> Reject H0 when p &lt; α ({alpha}).</div>
                                    <div><strong>Interpretation:</strong> A significant omnibus result should be followed by Dunn pairwise tests.</div>
                                    <div><strong>Recommended reporting:</strong> chi-square(df) = statistic, p = value.</div>
                                </div>
                            </div>
                            <div className="mt-4 flex justify-end gap-2">
                                <button
                                    onClick={() => handleAskAI('Kruskal‑Wallis Report', generateReport(result, 'kruskal_wallis'))}
                                    className="text-[10px] px-3 py-1 rounded-full border border-green-200 text-green-700 dark:text-green-300 dark:border-green-700 bg-white/60 dark:bg-green-900/10 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors font-bold uppercase tracking-wider flex items-center gap-2"
                                >
                                    <Bot size={12} /> Ask AI
                                </button>
                                <button
                                    onClick={() => openInterpretation('Kruskal‑Wallis Report', generateReport(result, 'kruskal_wallis'))}
                                    className="text-[10px] px-3 py-1 rounded-full border border-amber-200 text-amber-700 dark:text-amber-300 dark:border-amber-700 bg-white/60 dark:bg-amber-900/10 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors font-bold uppercase tracking-wider"
                                >
                                    View Detailed Report
                                </button>
                            </div>
                        </section>

                        {/* Dunn's Post-Hoc Test Results */}
                        {result.dunn && (
                            <section className="space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-3 py-1 rounded-full w-fit">
                                    Step 04: Dunn's Post-hoc Test
                                </h3>
                                
                                <div className="flex flex-col gap-6">
                                    <Card title="Pairwise Comparisons (Bonferroni)" icon={Activity}>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-gray-50 dark:bg-black/20 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                    <tr>
                                                        <th className="px-6 py-4">Comparison</th>
                                                        <th className="px-6 py-4">Z-Statistic</th>
                                                        <th className="px-6 py-4">P-Value (Adj)</th>
                                                        <th className="px-6 py-4">Result</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y dark:divide-gray-800">
                                                    {result.dunn.map((item, idx) => (
                                                        <tr key={idx} className={`hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors ${item.is_significant ? 'bg-green-50/20 dark:bg-green-900/5' : ''}`}>
                                                            <td className="px-6 py-4 font-bold text-gray-700 dark:text-gray-300">
                                                                {item.comparison}
                                                            </td>
                                                            <td className="px-6 py-4 font-mono text-xs text-gray-600 dark:text-gray-400">
                                                                {Number.isFinite(Number(item.z_value ?? item.statistic))
                                                                    ? Number(item.z_value ?? item.statistic).toFixed(4)
                                                                    : 'N/A'}
                                                            </td>
                                                            <td className={`px-6 py-4 font-mono text-xs font-black ${item.is_significant ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                                                                p = {item.formatted_p}
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                {item.is_significant ? (
                                                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 rounded text-[10px] font-black uppercase">Significant</span>
                                                                ) : (
                                                                    <span className="px-2 py-0.5 bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 rounded text-[10px] font-black uppercase">NS</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </Card>
                                    {renderPosthocDescriptiveTable(result)}
                                    <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-800/30">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-2">Dunn’s Test Guide</div>
                                        <div className="text-xs text-amber-700 dark:text-amber-300 space-y-2">
                                            <div><strong>Purpose:</strong> Pairwise rank-based comparisons after a significant Kruskal-Wallis test.</div>
                                            <div><strong>Adjusted p-values:</strong> Bonferroni correction controls family-wise Type I error.</div>
                                            <div><strong>Decision rule:</strong> Adjusted p &lt; α ({alpha}) indicates a significant pairwise difference.</div>
                                            <div><strong>Recommended reporting:</strong> comparison, z statistic, adjusted p-value, and direction from medians.</div>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex justify-end gap-2">
                                        <button
                                            onClick={() => handleAskAI('Post-hoc Test Report (Dunn)', generateReport(result, 'post_hoc'))}
                                            className="text-[10px] px-3 py-1 rounded-full border border-green-200 text-green-700 dark:text-green-300 dark:border-green-700 bg-white/60 dark:bg-green-900/10 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors font-bold uppercase tracking-wider flex items-center gap-2"
                                        >
                                            <Bot size={12} /> Ask AI (Dual)
                                        </button>
                                        <button
                                            onClick={() => openInterpretation('Post-hoc Test Report (Dunn)', generateReport(result, 'post_hoc'))}
                                            className="text-[10px] px-3 py-1 rounded-full border border-amber-200 text-amber-700 dark:text-amber-300 dark:border-amber-700 bg-white/60 dark:bg-amber-900/10 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors font-bold uppercase tracking-wider"
                                        >
                                            View Detailed Report
                                        </button>
                                    </div>

                                    {result.image ? (
                                        <Card title="Dunn Publication Plot" icon={Activity}>
                                            <div className="flex flex-col items-center justify-center space-y-4 p-4">
                                                <div className="relative group w-full max-w-4xl bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border-2 dark:border-gray-800 p-2 shadow-2xl">
                                                    <img 
                                                        src={`data:image/png;base64,${result.image}`} 
                                                        alt="Dunn publication boxplot" 
                                                        className="w-full h-auto rounded-xl"
                                                    />
                                                    <button
                                                        onClick={() => setSelectedImage({ url: `data:image/png;base64,${result.image}`, title: 'Dunn Publication Plot', plotKey: 'dunn_plot' })}
                                                        className="absolute top-3 right-3 z-20 bg-white/95 dark:bg-gray-900/95 text-gray-700 dark:text-gray-200 p-2 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:scale-105 transition-transform"
                                                        title="View Fullscreen"
                                                    >
                                                        <Maximize2 size={18} />
                                                    </button>
                                                    <div className="absolute inset-0 z-10 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <button 
                                                            onClick={() => {
                                                                const link = document.createElement('a');
                                                                link.href = `data:image/png;base64,${result.image}`;
                                                                link.download = `dunn_plot_result.png`;
                                                                link.click();
                                                            }}
                                                            className="px-6 py-3 bg-white text-black rounded-xl font-black text-xs uppercase tracking-widest shadow-2xl hover:scale-105 transition-transform"
                                                        >
                                                            Download High-Res Plot
                                                        </button>
                                                    </div>
                                                </div>
                                                <p className="text-xs font-black uppercase tracking-[0.3em] text-gray-400 text-center bg-gray-50 dark:bg-gray-800/50 px-4 py-2 rounded-full">
                                                    Publication-Ready Boxplot with CLD, Mean {ciPercentForAlpha}% CI, and Median Markers
                                                </p>
                                                <p className="text-[11px] text-slate-600 dark:text-slate-300 text-center">
                                                    Tip: This plot is editable in fullscreen mode (title, labels, and position steps).
                                                </p>
                                            </div>
                                        </Card>
                                    ) : result.plot_error ? (
                                        <Card title="Visualization Error" icon={Activity}>
                                            <div className="p-6 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-800/30 text-center space-y-3">
                                                <div className="text-red-500 font-black text-xs uppercase tracking-widest mb-2">Plot Generation Failed</div>
                                                <p className="text-sm text-red-600 dark:text-red-400 font-medium">{result.plot_error}</p>
                                                <p className="text-[10px] text-red-400 dark:text-red-500/50 uppercase mt-4">Check R dependencies (ggplot2, multcompView)</p>
                                            </div>
                                        </Card>
                                    ) : null}
                                </div>
                            </section>
                        )}
                    </>
                )}

                {modelSummaryReport && (
                    <section className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 bg-slate-100 dark:bg-slate-900/40 px-3 py-1 rounded-full w-fit">
                                Step 05: Model Summary Fields
                            </h3>
                            <div className="inline-flex flex-wrap items-center gap-2">
                                <button
                                    onClick={handleDownloadModelSummaryPdf}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                    title="Download Step 05 as PDF"
                                >
                                    <Download size={14} />
                                    PDF
                                </button>
                                <button
                                    onClick={handleDownloadModelSummaryCsv}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                    title="Download Step 05 as CSV"
                                >
                                    <Download size={14} />
                                    CSV
                                </button>
                                <button
                                    onClick={handleDownloadModelSummaryXlsx}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                    title="Download Step 05 as XLSX"
                                >
                                    <Download size={14} />
                                    XLSX
                                </button>
                            </div>
                        </div>
                        <Card title="Final Academic Report (R Output)" icon={Activity}>
                            <div className="space-y-4">
                                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-black/20 p-4 space-y-3">
                                    <div className="text-xs font-black uppercase tracking-widest text-slate-500">Report Metadata</div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <label className="space-y-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
                                            Report Title
                                            <input
                                                value={reportTitle}
                                                onChange={(e) => setReportTitle(e.target.value)}
                                                placeholder="e.g. Effect of Treatment on Outcome"
                                                className="mt-1 w-full rounded-lg border border-slate-200/80 dark:border-slate-700 bg-white/80 dark:bg-slate-900/70 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-cyan-300/40"
                                            />
                                        </label>
                                        <label className="space-y-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
                                            Author
                                            <input
                                                value={reportAuthor}
                                                onChange={(e) => setReportAuthor(e.target.value)}
                                                placeholder="e.g. Dr. Jane Doe"
                                                className="mt-1 w-full rounded-lg border border-slate-200/80 dark:border-slate-700 bg-white/80 dark:bg-slate-900/70 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-cyan-300/40"
                                            />
                                        </label>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-black/20 p-3">
                                        <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Mode</div>
                                        <div className="mt-1 text-sm font-mono font-bold text-slate-700 dark:text-slate-200">{modelSummaryReport.mode}</div>
                                    </div>
                                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-black/20 p-3">
                                        <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Path</div>
                                        <div className="mt-1 text-sm font-mono font-bold text-slate-700 dark:text-slate-200">{modelSummaryReport.pathTaken}</div>
                                    </div>
                                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-black/20 p-3">
                                        <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Test Type</div>
                                        <div className="mt-1 text-sm font-mono font-bold text-slate-700 dark:text-slate-200">{modelSummaryReport.testType}</div>
                                    </div>
                                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-black/20 p-3">
                                        <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Sample Type</div>
                                        <div className="mt-1 text-sm font-mono font-bold text-slate-700 dark:text-slate-200">{modelSummaryReport.sampleType}</div>
                                    </div>
                                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-black/20 p-3">
                                        <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Groups</div>
                                        <div className="mt-1 text-sm font-mono font-bold text-slate-700 dark:text-slate-200">{modelSummaryReport.nGroups}</div>
                                    </div>
                                </div>

                                {modelSummaryReport.shapiroRows.length > 0 && !modelSummaryReport.twoWay?.isNonParametric && (
                                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-black/20 p-4 space-y-3">
                                        <div className="text-xs font-black uppercase tracking-widest text-slate-500">Shapiro (Compact)</div>
                                        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                                            <table className="min-w-full text-xs text-left">
                                                <thead className="bg-slate-100 dark:bg-slate-800 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-300">
                                                    <tr>
                                                        <th className="px-3 py-2 font-black">Group</th>
                                                        <th className="px-3 py-2 font-black">N</th>
                                                        <th className="px-3 py-2 font-black">Shapiro p</th>
                                                        <th className="px-3 py-2 font-black">Normal</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                                    {modelSummaryReport.shapiroRows.map((row, idx) => (
                                                        <tr key={`summary_shapiro_${idx}`} className="bg-white dark:bg-black/20">
                                                            <td className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-200">{row.group}</td>
                                                            <td className="px-3 py-2 font-mono text-slate-700 dark:text-slate-200">{row.n}</td>
                                                            <td className="px-3 py-2 font-mono text-slate-700 dark:text-slate-200">{row.p}</td>
                                                            <td className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-200">{row.normal}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                                    {modelSummaryReport.homogeneitySummary && !modelSummaryReport.twoWay?.isNonParametric && (
                                        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-black/20 p-4 space-y-3">
                                            <div className="text-xs font-black uppercase tracking-widest text-slate-500">Homogeneity Test</div>
                                            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                                                <table className="min-w-full text-xs text-left">
                                                    <thead className="bg-slate-100 dark:bg-slate-800 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-300">
                                                        <tr>
                                                            <th className="px-3 py-2 font-black">Test</th>
                                                            <th className="px-3 py-2 font-black">Statistic</th>
                                                            <th className="px-3 py-2 font-black">df</th>
                                                            <th className="px-3 py-2 font-black">p-value</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                                        <tr className="bg-white dark:bg-black/20">
                                                            <td className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-200">{modelSummaryReport.homogeneitySummary.testName}</td>
                                                            <td className="px-3 py-2 font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.homogeneitySummary.statLabel} = {modelSummaryReport.homogeneitySummary.statistic}</td>
                                                            <td className="px-3 py-2 font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.homogeneitySummary.df}</td>
                                                            <td className="px-3 py-2 font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.homogeneitySummary.p}</td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                            {modelSummaryReport.homogeneitySummary.message && (
                                                <div className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                                                    {modelSummaryReport.homogeneitySummary.message}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                {modelSummaryReport.rmAnova ? (
                                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-black/20 p-4 space-y-2">
                                        <div className="text-xs font-black uppercase tracking-widest text-slate-500">Mauchly And Sphericity</div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                            <div><span className="font-black text-slate-500">Mauchly W:</span> <span className="font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.mauchlyW}</span></div>
                                            <div><span className="font-black text-slate-500">Mauchly p:</span> <span className="font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.mauchly}</span></div>
                                            <div><span className="font-black text-slate-500">Greenhouse-Geisser:</span> <span className="font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.ggSummary}</span></div>
                                            <div><span className="font-black text-slate-500">Huynh-Feldt:</span> <span className="font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.hfSummary}</span></div>
                                            <div><span className="font-black text-slate-500">Selected correction:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{modelSummaryReport.correction}</span></div>
                                        </div>
                                    </div>
                                ) : (modelSummaryReport.tTest || modelSummaryReport.anova || modelSummaryReport.twoWay?.showAssumptions) ? (
                                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-black/20 p-4 space-y-2">
                                        <div className="text-xs font-black uppercase tracking-widest text-slate-500">Assumption Snapshot</div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                            <div><span className="font-black text-slate-500">Normality:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{modelSummaryReport.allNormal}</span></div>
                                            <div><span className="font-black text-slate-500">{modelSummaryReport.bartlettLabel || 'Homogeneity'}:</span> <span className="font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.bartlett}</span></div>
                                        </div>
                                    </div>
                                ) : null}

                                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-black/20 p-4 space-y-3">
                                        <div className="text-xs font-black uppercase tracking-widest text-slate-500">
                                            {modelSummaryReport.rmAnova
                                                ? 'RM ANOVA'
                                                : modelSummaryReport.tTest
                                                    ? (modelSummaryReport.tTest.testName || 'Student t-test')
                                                : modelSummaryReport.oneValue
                                                    ? (modelSummaryReport.oneValue.testName || 'One Value Comparison')
                                                : modelSummaryReport.correlationMatrix
                                                    ? (modelSummaryReport.correlationMatrix.testName || 'Correlation Matrix')
                                                : modelSummaryReport.twoWay
                                                    ? modelSummaryReport.twoWay.testName
                                                    : modelSummaryReport.anova
                                                        ? modelSummaryReport.anova.testName
                                                    : modelSummaryReport.chisq
                                                        ? modelSummaryReport.chisq.testName
                                                    : modelSummaryReport.kruskal
                                                        ? modelSummaryReport.kruskal.testName
                                                    : modelSummaryReport.friedman
                                                        ? modelSummaryReport.friedman.testName
                                                    : modelSummaryReport.twoGroupNonParam
                                                        ? modelSummaryReport.twoGroupNonParam.testName
                                                        : 'Primary Result'}
                                        </div>
                                    {modelSummaryReport.rmAnova ? (
                                        <>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                                <div><span className="font-black text-slate-500">F-statistic:</span> <span className="font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.rmAnova.statistic}</span></div>
                                                <div><span className="font-black text-slate-500">df:</span> <span className="font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.rmAnova.df}</span></div>
                                                <div><span className="font-black text-slate-500">Final p:</span> <span className="font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.rmAnova.p}</span></div>
                                                <div><span className="font-black text-slate-500">Uncorrected p:</span> <span className="font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.rmAnova.pUncorrected}</span></div>
                                            </div>
                                            <div className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                                                {modelSummaryReport.rmAnova.message || modelSummaryReport.finalMessage}
                                            </div>
                                            <div className="rounded-lg border border-purple-100 dark:border-purple-800 bg-white/70 dark:bg-black/20 p-3 text-xs leading-relaxed text-purple-700 dark:text-purple-200">
                                                <span className="font-black uppercase tracking-wider text-purple-500">Significance and Effect:</span>{' '}
                                                {modelSummaryReport.rmAnova.significanceEffect || 'N/A'}
                                            </div>
                                            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-black/20 p-3">
                                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Console Output (aov-style)</div>
                                                <pre className="mt-2 whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-slate-700 dark:text-slate-200">
                                                    {modelSummaryReport.rmAnova.rOutput || 'RM ANOVA output not available.'}
                                                </pre>
                                            </div>
                                        </>
                                    ) : modelSummaryReport.tTest ? (
                                        <>
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-black/10 p-3 space-y-1 text-sm">
                                                    <div><span className="font-black text-slate-500">Test:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{modelSummaryReport.tTest.testName}</span></div>
                                                    <div><span className="font-black text-slate-500">Sample Type:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{modelSummaryReport.sampleType}</span></div>
                                                    <div><span className="font-black text-slate-500">t-statistic:</span> <span className="font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.tTest.statistic}</span></div>
                                                    <div><span className="font-black text-slate-500">df:</span> <span className="font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.tTest.df}</span></div>
                                                    <div><span className="font-black text-slate-500">p-value:</span> <span className="font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.tTest.p}</span></div>
                                                    <div><span className="font-black text-slate-500">Mean ({modelSummaryReport.tTest.group1}):</span> <span className="font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.tTest.mean1}</span></div>
                                                </div>
                                                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-black/10 p-3 space-y-1 text-sm">
                                                    <div><span className="font-black text-slate-500">Mean ({modelSummaryReport.tTest.group2}):</span> <span className="font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.tTest.mean2}</span></div>
                                                    <div><span className="font-black text-slate-500">Mean difference:</span> <span className="font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.tTest.meanDiff}</span></div>
                                                    <div><span className="font-black text-slate-500">{ciPercentForAlpha}% CI:</span> <span className="font-mono text-slate-700 dark:text-slate-200">[{modelSummaryReport.tTest.ci}]</span></div>
                                                    <div><span className="font-black text-slate-500">Cohen's d:</span> <span className="font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.tTest.cohensD}</span></div>
                                                    {modelSummaryReport.tTest.comparisonRow && (
                                                        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-black/20 p-2">
                                                            <table className="min-w-full text-[11px] text-left">
                                                                <thead className="bg-slate-100 dark:bg-slate-800 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-300">
                                                                    <tr>
                                                                        <th className="px-2 py-1 font-black">Comparison</th>
                                                                        <th className="px-2 py-1 font-black">t</th>
                                                                        <th className="px-2 py-1 font-black">df</th>
                                                                        <th className="px-2 py-1 font-black">p</th>
                                                                        <th className="px-2 py-1 font-black">Sig</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    <tr className="bg-white/90 dark:bg-black/20">
                                                                        <td className="px-2 py-1 font-semibold text-slate-700 dark:text-slate-200">{modelSummaryReport.tTest.comparisonRow.comparison}</td>
                                                                        <td className="px-2 py-1 font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.tTest.comparisonRow.t}</td>
                                                                        <td className="px-2 py-1 font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.tTest.comparisonRow.df}</td>
                                                                        <td className="px-2 py-1 font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.tTest.comparisonRow.p}</td>
                                                                        <td className="px-2 py-1 font-mono font-bold text-slate-700 dark:text-slate-200">{modelSummaryReport.tTest.comparisonRow.sig}</td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
                                                    {modelSummaryReport.tTest.comparisonRow && (
                                                        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-black/20 p-2">
                                                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Significance Guide</div>
                                                            <table className="min-w-full text-[11px] text-left">
                                                                <thead className="bg-slate-100 dark:bg-slate-800 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-300">
                                                                    <tr>
                                                                        <th className="px-2 py-1 font-black">p-value</th>
                                                                        <th className="px-2 py-1 font-black">Stars</th>
                                                                        <th className="px-2 py-1 font-black">Meaning</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                                                    <tr className="bg-white/90 dark:bg-black/20">
                                                                        <td className="px-2 py-1 font-mono text-slate-700 dark:text-slate-200">p &lt; α ({alphaForStars})</td>
                                                                        <td className="px-2 py-1 font-mono font-bold text-slate-700 dark:text-slate-200">*</td>
                                                                        <td className="px-2 py-1 text-slate-700 dark:text-slate-200">Significant</td>
                                                                    </tr>
                                                                    <tr className="bg-white/90 dark:bg-black/20">
                                                                        <td className="px-2 py-1 font-mono text-slate-700 dark:text-slate-200">p &lt; 0.01</td>
                                                                        <td className="px-2 py-1 font-mono font-bold text-slate-700 dark:text-slate-200">**</td>
                                                                        <td className="px-2 py-1 text-slate-700 dark:text-slate-200">Very significant</td>
                                                                    </tr>
                                                                    <tr className="bg-white/90 dark:bg-black/20">
                                                                        <td className="px-2 py-1 font-mono text-slate-700 dark:text-slate-200">p &lt; 0.001</td>
                                                                        <td className="px-2 py-1 font-mono font-bold text-slate-700 dark:text-slate-200">***</td>
                                                                        <td className="px-2 py-1 text-slate-700 dark:text-slate-200">Highly significant</td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
                                                    <div className={`pt-1 leading-relaxed font-medium ${modelSummaryReport.tTest.isSignificant ? 'text-green-700 dark:text-green-300' : 'text-slate-700 dark:text-slate-200'}`}>
                                                        <span className="font-black text-slate-500">Interpretation:</span> {modelSummaryReport.tTest.significanceEffect}
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    ) : modelSummaryReport.oneValue ? (
                                        <>
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-black/10 p-3 space-y-1 text-sm">
                                                    <div><span className="font-black text-slate-500">Test:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{modelSummaryReport.oneValue.testName}</span></div>
                                                    <div><span className="font-black text-slate-500">Sample Type:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{modelSummaryReport.sampleType}</span></div>
                                                    <div><span className="font-black text-slate-500">Variable:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{modelSummaryReport.oneValue.variable}</span></div>
                                                    <div><span className="font-black text-slate-500">Data type:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{modelSummaryReport.oneValue.dataType}</span></div>
                                                    <div><span className="font-black text-slate-500">Selected test:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{modelSummaryReport.oneValue.selectedTest}</span></div>
                                                    <div><span className="font-black text-slate-500">{modelSummaryReport.oneValue.statisticLabel}:</span> <span className="font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.oneValue.statistic}</span></div>
                                                    <div><span className="font-black text-slate-500">p-value:</span> <span className="font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.oneValue.p}</span></div>
                                                </div>
                                                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-black/10 p-3 space-y-1 text-sm">
                                                    <div><span className="font-black text-slate-500">Significant:</span> <span className={`font-semibold ${modelSummaryReport.oneValue.significant === 'Yes' ? 'text-green-700 dark:text-green-300' : 'text-slate-700 dark:text-slate-200'}`}>{modelSummaryReport.oneValue.significant}</span></div>
                                                    <div><span className="font-black text-slate-500">Success category:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{modelSummaryReport.oneValue.successLevel}</span></div>
                                                    <div><span className="font-black text-slate-500">Observed proportion:</span> <span className="font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.oneValue.observedProportion}</span></div>
                                                    <div><span className="font-black text-slate-500">Reference proportion:</span> <span className="font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.oneValue.referenceProportion}</span></div>
                                                    <div><span className="font-black text-slate-500">Observed / N:</span> <span className="font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.oneValue.observedSuccess} / {modelSummaryReport.oneValue.nTotal}</span></div>
                                                    <div><span className="font-black text-slate-500">GOF observed:</span> <span className="font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.oneValue.gofObserved}</span></div>
                                                    <div><span className="font-black text-slate-500">GOF expected:</span> <span className="font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.oneValue.gofExpected}</span></div>
                                                </div>
                                            </div>
                                            <div className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                                                {modelSummaryReport.oneValue.message || modelSummaryReport.finalMessage}
                                            </div>
                                        </>
                                    ) : modelSummaryReport.correlationMatrix ? (
                                        <>
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-black/10 p-3 space-y-1 text-sm">
                                                    <div><span className="font-black text-slate-500">Test:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{modelSummaryReport.correlationMatrix.testName}</span></div>
                                                    <div><span className="font-black text-slate-500">Variable count:</span> <span className="font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.correlationMatrix.variableCount}</span></div>
                                                    <div><span className="font-black text-slate-500">Returned methods:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{(modelSummaryReport.correlationMatrix.availableMethods || []).join(', ') || 'N/A'}</span></div>
                                                    <div><span className="font-black text-slate-500">Selected method:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{modelSummaryReport.correlationMatrix.selectedMethod}</span></div>
                                                    <div><span className="font-black text-slate-500">Use both override:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{modelSummaryReport.correlationMatrix.useBoth}</span></div>
                                                    <div><span className="font-black text-slate-500">All normal:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{modelSummaryReport.correlationMatrix.allNormal}</span></div>
                                                </div>
                                                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-black/10 p-3 space-y-1 text-sm">
                                                    <div><span className="font-black text-slate-500">Pearson heatmap:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{modelSummaryReport.correlationMatrix.pearsonHeatmap}</span></div>
                                                    <div><span className="font-black text-slate-500">Pearson linearity:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{modelSummaryReport.correlationMatrix.pearsonLinearity}</span></div>
                                                    <div><span className="font-black text-slate-500">Spearman heatmap:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{modelSummaryReport.correlationMatrix.spearmanHeatmap}</span></div>
                                                    <div><span className="font-black text-slate-500">Spearman linearity:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{modelSummaryReport.correlationMatrix.spearmanLinearity}</span></div>
                                                    <div><span className="font-black text-slate-500">Variables:</span> <span className="font-mono text-slate-700 dark:text-slate-200">{(modelSummaryReport.correlationMatrix.variables || []).join(', ') || 'N/A'}</span></div>
                                                </div>
                                            </div>
                                            {modelSummaryReport.correlationMatrix.pearson?.matrixRows?.length > 0 && (
                                                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-black/20 p-3 space-y-2">
                                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Pearson Correlation Table</div>
                                                    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                                                        <table className="min-w-full text-[11px] text-left">
                                                            <thead className="bg-slate-100 dark:bg-slate-800 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-300">
                                                                <tr>
                                                                    <th className="px-2 py-1 font-black">Variable</th>
                                                                    {(modelSummaryReport.correlationMatrix.pearson.matrixHeaders || []).map((header) => (
                                                                        <th key={`summary_corr_pearson_h_${header}`} className="px-2 py-1 font-black">{header}</th>
                                                                    ))}
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                                                {modelSummaryReport.correlationMatrix.pearson.matrixRows.map((row) => (
                                                                    <tr key={`summary_corr_pearson_row_${row.variable}`} className="bg-white/90 dark:bg-black/20">
                                                                        <td className="px-2 py-1 font-semibold text-slate-700 dark:text-slate-200">{row.variable}</td>
                                                                        {(row.values || []).map((value, idx) => (
                                                                            <td key={`summary_corr_pearson_${row.variable}_${idx}`} className="px-2 py-1 font-mono text-slate-700 dark:text-slate-200">{value}</td>
                                                                        ))}
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}
                                            {modelSummaryReport.correlationMatrix.spearman?.matrixRows?.length > 0 && (
                                                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-black/20 p-3 space-y-2">
                                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Spearman Correlation Table</div>
                                                    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                                                        <table className="min-w-full text-[11px] text-left">
                                                            <thead className="bg-slate-100 dark:bg-slate-800 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-300">
                                                                <tr>
                                                                    <th className="px-2 py-1 font-black">Variable</th>
                                                                    {(modelSummaryReport.correlationMatrix.spearman.matrixHeaders || []).map((header) => (
                                                                        <th key={`summary_corr_spearman_h_${header}`} className="px-2 py-1 font-black">{header}</th>
                                                                    ))}
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                                                {modelSummaryReport.correlationMatrix.spearman.matrixRows.map((row) => (
                                                                    <tr key={`summary_corr_spearman_row_${row.variable}`} className="bg-white/90 dark:bg-black/20">
                                                                        <td className="px-2 py-1 font-semibold text-slate-700 dark:text-slate-200">{row.variable}</td>
                                                                        {(row.values || []).map((value, idx) => (
                                                                            <td key={`summary_corr_spearman_${row.variable}_${idx}`} className="px-2 py-1 font-mono text-slate-700 dark:text-slate-200">{value}</td>
                                                                        ))}
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                                {modelSummaryReport.correlationMatrix.pearsonHeatmapImage && (
                                                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-black/20 p-3 space-y-2">
                                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Pearson Heatmap</div>
                                                        <img
                                                            src={modelSummaryReport.correlationMatrix.pearsonHeatmapImage}
                                                            alt="Pearson correlation heatmap"
                                                            className="w-full rounded-lg border border-slate-200 dark:border-slate-700"
                                                        />
                                                    </div>
                                                )}
                                                {modelSummaryReport.correlationMatrix.pearsonLinearityImage && (
                                                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-black/20 p-3 space-y-2">
                                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Pearson Linearity Check</div>
                                                        <img
                                                            src={modelSummaryReport.correlationMatrix.pearsonLinearityImage}
                                                            alt="Pearson linearity check"
                                                            className="w-full rounded-lg border border-slate-200 dark:border-slate-700"
                                                        />
                                                    </div>
                                                )}
                                                {modelSummaryReport.correlationMatrix.spearmanHeatmapImage && (
                                                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-black/20 p-3 space-y-2">
                                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Spearman Heatmap</div>
                                                        <img
                                                            src={modelSummaryReport.correlationMatrix.spearmanHeatmapImage}
                                                            alt="Spearman correlation heatmap"
                                                            className="w-full rounded-lg border border-slate-200 dark:border-slate-700"
                                                        />
                                                    </div>
                                                )}
                                                {modelSummaryReport.correlationMatrix.spearmanLinearityImage && (
                                                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-black/20 p-3 space-y-2">
                                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Spearman Linearity Check</div>
                                                        <img
                                                            src={modelSummaryReport.correlationMatrix.spearmanLinearityImage}
                                                            alt="Spearman linearity check"
                                                            className="w-full rounded-lg border border-slate-200 dark:border-slate-700"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                            {modelSummaryReport.correlationMatrix.pearson && (
                                                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-black/20 p-3 space-y-2">
                                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Pearson Summary</div>
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                                                        <div><span className="font-black text-slate-500">Strongest pair:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{modelSummaryReport.correlationMatrix.pearson.strongestPair}</span></div>
                                                        <div><span className="font-black text-slate-500">Strongest r:</span> <span className="font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.correlationMatrix.pearson.strongestValue}</span></div>
                                                        <div><span className="font-black text-slate-500">Strong pairs (|r| &gt; 0.7):</span> <span className="font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.correlationMatrix.pearson.strongPairs}</span></div>
                                                    </div>
                                                </div>
                                            )}
                                            {modelSummaryReport.correlationMatrix.spearman && (
                                                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-black/20 p-3 space-y-2">
                                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Spearman Summary</div>
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                                                        <div><span className="font-black text-slate-500">Strongest pair:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{modelSummaryReport.correlationMatrix.spearman.strongestPair}</span></div>
                                                        <div><span className="font-black text-slate-500">Strongest rho:</span> <span className="font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.correlationMatrix.spearman.strongestValue}</span></div>
                                                        <div><span className="font-black text-slate-500">Strong pairs (|rho| &gt; 0.7):</span> <span className="font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.correlationMatrix.spearman.strongPairs}</span></div>
                                                    </div>
                                                </div>
                                            )}
                                            {modelSummaryReport.correlationMatrix.decision && (
                                                <div className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                                                    {modelSummaryReport.correlationMatrix.decision}
                                                </div>
                                            )}
                                            {modelSummaryReport.correlationMatrix.strongestMessage && (
                                                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-black/20 p-3 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                                                    <span className="font-black text-slate-500">Strongest correlation message:</span> {modelSummaryReport.correlationMatrix.strongestMessage}
                                                </div>
                                            )}
                                        </>
                                    ) : modelSummaryReport.twoWay ? (
                                        <>
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-black/10 p-3 space-y-1 text-sm">
                                                    <div><span className="font-black text-slate-500">Test:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{modelSummaryReport.twoWay.testName}</span></div>
                                                    <div><span className="font-black text-slate-500">Sample Type:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{modelSummaryReport.sampleType}</span></div>
                                                <div><span className="font-black text-slate-500">Type:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{modelSummaryReport.twoWay.variant}</span></div>
                                                {modelSummaryReport.twoWay.robustMethod && (
                                                    <div><span className="font-black text-slate-500">Robust method:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{modelSummaryReport.twoWay.robustMethod}</span></div>
                                                )}
                                                {modelSummaryReport.twoWay.posthocLabel && modelSummaryReport.twoWay.posthocLabel !== 'N/A' && (
                                                    <div><span className="font-black text-slate-500">Post-hoc:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{modelSummaryReport.twoWay.posthocLabel}</span></div>
                                                )}
                                                <div><span className="font-black text-slate-500">Statistic:</span> <span className="font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.twoWay.statLabel}</span></div>
                                            </div>
                                                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-black/10 p-3 space-y-1 text-sm">
                                                    <div><span className="font-black text-slate-500">Interaction p-value:</span> <span className="font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.twoWay.interaction?.p || 'N/A'}</span></div>
                                                    <div><span className="font-black text-slate-500">Interaction Sig:</span> <span className={`font-semibold ${modelSummaryReport.twoWay.interaction?.sig === 'Yes' ? 'text-green-700 dark:text-green-300' : 'text-slate-700 dark:text-slate-200'}`}>{modelSummaryReport.twoWay.interaction?.sig || 'N/A'}</span></div>
                                                    <div className="pt-1 leading-relaxed font-medium text-slate-700 dark:text-slate-200">
                                                        <span className="font-black text-slate-500">Interpretation:</span>{' '}
                                                        {modelSummaryReport.twoWay.interaction?.message || modelSummaryReport.twoWay.message || modelSummaryReport.finalMessage}
                                                    </div>
                                                </div>
                                            </div>
                                            {Array.isArray(modelSummaryReport.anovaTableRows) && modelSummaryReport.anovaTableRows.length > 0 && (() => {
                                                const rows = modelSummaryReport.anovaTableRows;
                                                const effects = Array.isArray(modelSummaryReport.twoWay?.effects)
                                                    ? modelSummaryReport.twoWay.effects
                                                    : [];
                                                const mainA = effects.find((effect) => effect?.role === 'main_a') || null;
                                                const mainB = effects.find((effect) => effect?.role === 'main_b') || null;
                                                const interaction = effects.find((effect) => effect?.role === 'interaction') || null;
                                                const hasStratum = rows.some((row) => row && row.stratum);
                                                const statLabel = modelSummaryReport.twoWay?.statLabel || 'F';
                                                const normalizeKey = (value) => String(value || '')
                                                    .trim()
                                                    .toLowerCase()
                                                    .replace(/\*/g, ':')
                                                    .replace(/×/g, ':')
                                                    .replace(/\s+/g, '');
                                                const asNumber = (value) => {
                                                    const n = Number(value);
                                                    return Number.isFinite(n) ? n : null;
                                                };
                                                const formatValue = (value, digits = 3) => (
                                                    value == null ? '' : fmt(value, digits)
                                                );
                                                const factorAKey = normalizeKey(mainA?.effect);
                                                const factorBKey = normalizeKey(mainB?.effect);

                                                const resolveEffectForSource = (source) => {
                                                    const sourceKey = normalizeKey(source);
                                                    if (!sourceKey || sourceKey === 'residual' || sourceKey === 'residuals' || sourceKey === 'total') return null;
                                                    if (factorAKey && sourceKey === factorAKey) return mainA;
                                                    if (factorBKey && sourceKey === factorBKey) return mainB;
                                                    if (sourceKey === 'interaction' || sourceKey.includes(':')) return interaction;
                                                    return effects.find((effect) => normalizeKey(effect?.effect) === sourceKey) || null;
                                                };

                                                const tableRows = rows.map((row, idx) => {
                                                    const sourceRaw = String(row?.source || `Source ${idx + 1}`);
                                                    const sourceLabel = sourceRaw.includes(':')
                                                        ? sourceRaw.split(':').map((part) => part.trim()).join(' × ')
                                                        : sourceRaw.trim();
                                                    const isResidual = Boolean(row?.is_residual) || normalizeKey(sourceRaw).startsWith('residual');
                                                    const effect = isResidual ? null : resolveEffectForSource(sourceRaw);
                                                    const etaNum = asNumber(effect?.etaSquared ?? effect?.eta_squared);
                                                    const etaLabel = String(effect?.etaLabel || effect?.effect_size_label || '').trim()
                                                        || (etaNum != null ? effectSizeLabel(etaNum) : '');
                                                    const pNum = asNumber(row?.p_value);
                                                    return {
                                                        key: `summary_two_way_complete_row_${idx}`,
                                                        source: hasStratum && row?.stratum
                                                            ? `${sourceLabel} [${row.stratum}]`
                                                            : sourceLabel,
                                                        ss: asNumber(row?.sum_sq),
                                                        df: asNumber(row?.df),
                                                        ms: asNumber(row?.mean_sq),
                                                        stat: isResidual ? null : asNumber(row?.statistic),
                                                        pText: isResidual ? '' : (pNum != null
                                                            ? (row?.formatted_p || fmtP(pNum))
                                                            : ''),
                                                        eta: etaNum,
                                                        etaLabel,
                                                        isResidual
                                                    };
                                                });

                                                return (
                                                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-black/20 p-2 overflow-x-auto">
                                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1 py-1">Complete Two-Way ANOVA Table With Residual</div>
                                                        <table className="min-w-full text-[11px] text-left">
                                                            <thead className="bg-slate-100 dark:bg-slate-800 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-300">
                                                                <tr>
                                                                    <th className="px-2 py-1 font-black">Effect / Source</th>
                                                                    <th className="px-2 py-1 font-black text-right">SS</th>
                                                                    <th className="px-2 py-1 font-black text-right">df</th>
                                                                    <th className="px-2 py-1 font-black text-right">MS</th>
                                                                    <th className="px-2 py-1 font-black text-right">{statLabel}</th>
                                                                    <th className="px-2 py-1 font-black text-right">p</th>
                                                                    <th className="px-2 py-1 font-black text-right">Eta²</th>
                                                                    <th className="px-2 py-1 font-black text-right">Effect size</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                                                {tableRows.map((row) => (
                                                                    <tr
                                                                        key={row.key}
                                                                        className={row.isTotal ? 'bg-slate-50 dark:bg-slate-900/20' : row.isResidual ? 'bg-indigo-50/40 dark:bg-indigo-900/10' : 'bg-white/90 dark:bg-black/20'}
                                                                    >
                                                                        <td className={`px-2 py-1 ${row.isTotal ? 'font-black text-slate-700 dark:text-slate-200' : 'font-semibold text-slate-700 dark:text-slate-200'}`}>{row.source}</td>
                                                                        <td className="px-2 py-1 font-mono text-right text-slate-700 dark:text-slate-200">{formatValue(row.ss, 4)}</td>
                                                                        <td className="px-2 py-1 font-mono text-right text-slate-700 dark:text-slate-200">{formatValue(row.df, 3)}</td>
                                                                        <td className="px-2 py-1 font-mono text-right text-slate-700 dark:text-slate-200">{formatValue(row.ms, 4)}</td>
                                                                        <td className="px-2 py-1 font-mono text-right text-slate-700 dark:text-slate-200">{formatValue(row.stat, 4)}</td>
                                                                        <td className="px-2 py-1 font-mono text-right text-slate-700 dark:text-slate-200">{row.pText}</td>
                                                                        <td className="px-2 py-1 font-mono text-right text-slate-700 dark:text-slate-200">{formatValue(row.eta, 3)}</td>
                                                                        <td className="px-2 py-1 font-semibold text-right text-slate-700 dark:text-slate-200">{row.etaLabel || ''}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                );
                                            })()}
                                            {modelSummaryReport.twoWay.interactionPlotImage && (
                                                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-black/20 p-3 space-y-2">
                                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Interaction Plot</div>
                                                    <img
                                                        src={modelSummaryReport.twoWay.interactionPlotImage}
                                                        alt="ANOVA factorial interaction plot"
                                                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700"
                                                    />
                                                </div>
                                            )}
                                            {modelSummaryReport.twoWay.message && (
                                                <div className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                                                    {modelSummaryReport.twoWay.message}
                                                </div>
                                            )}
                                        </>
                                    ) : modelSummaryReport.anova ? (
                                        <>
                                            {(() => {
                                                const isWelch = String(modelSummaryReport.anova?.variant || '').trim().toLowerCase() === 'welch'
                                                    || String(modelSummaryReport.anova?.testName || '').toLowerCase().includes('welch');
                                                const rows = Array.isArray(modelSummaryReport.anovaTableRows) ? modelSummaryReport.anovaTableRows : [];
                                                const asNumber = (value) => {
                                                    const n = Number(value);
                                                    return Number.isFinite(n) ? n : null;
                                                };
                                                const formatValue = (value, digits = 3) => (
                                                    value != null && Number.isFinite(Number(value))
                                                        ? fmt(value, digits)
                                                        : ''
                                                );
                                                const mainRow = rows.find((row) => row && row.is_residual !== true) || rows[0];
                                                const residualRow = rows.find((row) => row && row.is_residual === true) || null;
                                                const etaNum = asNumber(modelSummaryReport.anova?.etaSquared);
                                                const etaText = etaNum != null ? modelSummaryReport.anova.etaSquared : '';
                                                const etaLabel = String(modelSummaryReport.anova?.etaLabel || '').trim() !== 'N/A'
                                                    ? String(modelSummaryReport.anova?.etaLabel || '').trim()
                                                    : '';
                                                const welchSource = mainRow?.source || 'Groups';
                                                const welchPText = modelSummaryReport.anova?.p
                                                    || (mainRow?.formatted_p || (Number.isFinite(Number(mainRow?.p_value)) ? fmtP(mainRow?.p_value) : ''));

                                                return (
                                                    <>
                                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                                            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-black/10 p-3 space-y-1 text-sm">
                                                                <div><span className="font-black text-slate-500">Test:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{modelSummaryReport.anova.testName}</span></div>
                                                                <div><span className="font-black text-slate-500">Sample Type:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{modelSummaryReport.sampleType}</span></div>
                                                                <div><span className="font-black text-slate-500">ANOVA type:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{modelSummaryReport.anova.variant}</span></div>
                                                                <div><span className="font-black text-slate-500">F-statistic:</span> <span className="font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.anova.statistic}</span></div>
                                                                <div><span className="font-black text-slate-500">{isWelch ? 'Numerator df:' : 'df1:'}</span> <span className="font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.anova.df1}</span></div>
                                                                <div><span className="font-black text-slate-500">{isWelch ? 'Denominator df:' : 'df2:'}</span> <span className="font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.anova.df2}</span></div>
                                                                <div><span className="font-black text-slate-500">p-value:</span> <span className="font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.anova.p}</span></div>
                                                            </div>
                                                            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-black/10 p-3 space-y-1 text-sm">
                                                                <div><span className="font-black text-slate-500">Significant:</span> <span className={`font-semibold ${modelSummaryReport.anova.significant === 'Yes' ? 'text-green-700 dark:text-green-300' : 'text-slate-700 dark:text-slate-200'}`}>{modelSummaryReport.anova.significant}</span></div>
                                                                {!isWelch && (
                                                                    <>
                                                                        <div><span className="font-black text-slate-500">Eta-squared:</span> <span className="font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.anova.etaSquared}</span></div>
                                                                        <div><span className="font-black text-slate-500">Effect size label:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{modelSummaryReport.anova.etaLabel}</span></div>
                                                                    </>
                                                                )}
                                                                {isWelch && (
                                                                    <div className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                                                                        R Welch ANOVA ('oneway.test') reports F, numerator df, denominator df, and p-value; SS/MS and eta-squared are not returned in this branch.
                                                                    </div>
                                                                )}
                                                                <div className={`pt-1 leading-relaxed font-medium ${modelSummaryReport.anova.significant === 'Yes' ? 'text-green-700 dark:text-green-300' : 'text-slate-700 dark:text-slate-200'}`}>
                                                                    <span className="font-black text-slate-500">Interpretation:</span> {modelSummaryReport.anova.significanceEffect}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                                                            {modelSummaryReport.anova.message || modelSummaryReport.finalMessage}
                                                        </div>
                                                        {rows.length > 0 && !isWelch && (
                                                            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-black/20 p-2 overflow-x-auto">
                                                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1 py-1">Complete One-Way ANOVA Table With Residual</div>
                                                                <table className="min-w-full text-[11px] text-left">
                                                                    <thead className="bg-slate-100 dark:bg-slate-800 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-300">
                                                                        <tr>
                                                                            <th className="px-2 py-1 font-black">Effect / Source</th>
                                                                            <th className="px-2 py-1 font-black text-right">SS</th>
                                                                            <th className="px-2 py-1 font-black text-right">df</th>
                                                                            <th className="px-2 py-1 font-black text-right">MS</th>
                                                                            <th className="px-2 py-1 font-black text-right">F</th>
                                                                            <th className="px-2 py-1 font-black text-right">p</th>
                                                                            <th className="px-2 py-1 font-black text-right">Eta²</th>
                                                                            <th className="px-2 py-1 font-black text-right">Effect size</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                                                        {mainRow && (
                                                                            <tr className="bg-white/90 dark:bg-black/20">
                                                                                <td className="px-2 py-1 font-semibold text-slate-700 dark:text-slate-200">{mainRow?.source || 'Groups'}</td>
                                                                                <td className="px-2 py-1 font-mono text-right text-slate-700 dark:text-slate-200">{formatValue(mainRow?.sum_sq, 4)}</td>
                                                                                <td className="px-2 py-1 font-mono text-right text-slate-700 dark:text-slate-200">{formatValue(mainRow?.df, 3)}</td>
                                                                                <td className="px-2 py-1 font-mono text-right text-slate-700 dark:text-slate-200">{formatValue(mainRow?.mean_sq, 4)}</td>
                                                                                <td className="px-2 py-1 font-mono text-right text-slate-700 dark:text-slate-200">{formatValue(mainRow?.statistic, 4)}</td>
                                                                                <td className="px-2 py-1 font-mono text-right text-slate-700 dark:text-slate-200">{mainRow?.formatted_p || (Number.isFinite(Number(mainRow?.p_value)) ? fmtP(mainRow?.p_value) : '')}</td>
                                                                                <td className="px-2 py-1 font-mono text-right text-slate-700 dark:text-slate-200">{etaText}</td>
                                                                                <td className="px-2 py-1 font-semibold text-right text-slate-700 dark:text-slate-200">{etaLabel}</td>
                                                                            </tr>
                                                                        )}
                                                                        {residualRow && (
                                                                            <tr className="bg-indigo-50/40 dark:bg-indigo-900/10">
                                                                                <td className="px-2 py-1 font-semibold text-slate-700 dark:text-slate-200">{residualRow?.source || 'Residuals'}</td>
                                                                                <td className="px-2 py-1 font-mono text-right text-slate-700 dark:text-slate-200">{formatValue(residualRow?.sum_sq, 4)}</td>
                                                                                <td className="px-2 py-1 font-mono text-right text-slate-700 dark:text-slate-200">{formatValue(residualRow?.df, 3)}</td>
                                                                                <td className="px-2 py-1 font-mono text-right text-slate-700 dark:text-slate-200">{formatValue(residualRow?.mean_sq, 4)}</td>
                                                                                <td className="px-2 py-1 font-mono text-right text-slate-700 dark:text-slate-200"></td>
                                                                                <td className="px-2 py-1 font-mono text-right text-slate-700 dark:text-slate-200"></td>
                                                                                <td className="px-2 py-1 font-mono text-right text-slate-700 dark:text-slate-200"></td>
                                                                                <td className="px-2 py-1 font-semibold text-right text-slate-700 dark:text-slate-200"></td>
                                                                            </tr>
                                                                        )}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        )}
                                                        {isWelch && (
                                                            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-black/20 p-2 overflow-x-auto">
                                                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1 py-1">Welch One-Way ANOVA (R Output Style)</div>
                                                                <table className="min-w-full text-[11px] text-left">
                                                                    <thead className="bg-slate-100 dark:bg-slate-800 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-300">
                                                                        <tr>
                                                                            <th className="px-2 py-1 font-black">Effect / Source</th>
                                                                            <th className="px-2 py-1 font-black text-right">F value</th>
                                                                            <th className="px-2 py-1 font-black text-right">Num Df</th>
                                                                            <th className="px-2 py-1 font-black text-right">Den Df</th>
                                                                            <th className="px-2 py-1 font-black text-right">p</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                                                        <tr className="bg-white/90 dark:bg-black/20">
                                                                            <td className="px-2 py-1 font-semibold text-slate-700 dark:text-slate-200">{welchSource}</td>
                                                                            <td className="px-2 py-1 font-mono text-right text-slate-700 dark:text-slate-200">{modelSummaryReport.anova?.statistic || formatValue(mainRow?.statistic, 4)}</td>
                                                                            <td className="px-2 py-1 font-mono text-right text-slate-700 dark:text-slate-200">{modelSummaryReport.anova?.df1 || formatValue(mainRow?.df, 3)}</td>
                                                                            <td className="px-2 py-1 font-mono text-right text-slate-700 dark:text-slate-200">{modelSummaryReport.anova?.df2 || formatValue(residualRow?.df, 3)}</td>
                                                                            <td className="px-2 py-1 font-mono text-right text-slate-700 dark:text-slate-200">{welchPText}</td>
                                                                        </tr>
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        )}
                                                        {Array.isArray(modelSummaryReport.anovaDescriptiveRows) && modelSummaryReport.anovaDescriptiveRows.length > 0 && (
                                                            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-black/20 p-2 overflow-x-auto">
                                                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1 py-1">Descriptive Table (Publication Style)</div>
                                                                <table className="min-w-full text-[11px] text-left">
                                                                    <thead className="bg-slate-100 dark:bg-slate-800 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-300">
                                                                        <tr>
                                                                            <th className="px-2 py-1 font-black">{modelSummaryReport.anovaDescriptiveGroupLabel || 'Group'}</th>
                                                                            <th className="px-2 py-1 font-black text-right">n</th>
                                                                            <th className="px-2 py-1 font-black text-right">Mean +/- SD</th>
                                                                            <th className="px-2 py-1 font-black text-right">Mean +/- {ciPercentForAlpha}% CI</th>
                                                                            <th className="px-2 py-1 font-black text-right">Median [Q1, Q3]</th>
                                                                            <th className="px-2 py-1 font-black text-right">Min</th>
                                                                            <th className="px-2 py-1 font-black text-right">Max</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                                                        {modelSummaryReport.anovaDescriptiveRows.map((row) => (
                                                                            <tr key={row._id} className="bg-white/90 dark:bg-black/20">
                                                                                <td className="px-2 py-1 font-semibold text-slate-700 dark:text-slate-200">{row.group}</td>
                                                                                <td className="px-2 py-1 text-right font-mono text-slate-700 dark:text-slate-200">{row.n}</td>
                                                                                <td className="px-2 py-1 text-right font-mono text-slate-700 dark:text-slate-200">{row.meanSd}</td>
                                                                                <td className="px-2 py-1 text-right font-mono text-slate-700 dark:text-slate-200">{row.meanCi95}</td>
                                                                                <td className="px-2 py-1 text-right font-mono text-slate-700 dark:text-slate-200">{row.medianIqr}</td>
                                                                                <td className="px-2 py-1 text-right font-mono text-slate-700 dark:text-slate-200">{row.min}</td>
                                                                                <td className="px-2 py-1 text-right font-mono text-slate-700 dark:text-slate-200">{row.max}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </>
                                    ) : modelSummaryReport.chisq ? (
                                        <>
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-black/10 p-3 space-y-1 text-sm">
                                                    <div><span className="font-black text-slate-500">Test:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{modelSummaryReport.chisq.testName}</span></div>
                                                    <div><span className="font-black text-slate-500">Sample Type:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{modelSummaryReport.sampleType}</span></div>
                                                    <div><span className="font-black text-slate-500">Chi-squared:</span> <span className="font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.chisq.statistic}</span></div>
                                                    <div><span className="font-black text-slate-500">df:</span> <span className="font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.chisq.df}</span></div>
                                                    <div><span className="font-black text-slate-500">p-value:</span> <span className="font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.chisq.p}</span></div>
                                                </div>
                                                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-black/10 p-3 space-y-1 text-sm">
                                                    <div><span className="font-black text-slate-500">Significant:</span> <span className={`font-semibold ${modelSummaryReport.chisq.significant === 'Yes' ? 'text-green-700 dark:text-green-300' : 'text-slate-700 dark:text-slate-200'}`}>{modelSummaryReport.chisq.significant}</span></div>
                                                    <div><span className="font-black text-slate-500">Cramer's V:</span> <span className="font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.chisq.cramersV}</span></div>
                                                    <div><span className="font-black text-slate-500">Effect size label:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{modelSummaryReport.chisq.effectSizeLabel}</span></div>
                                                    <div><span className="font-black text-slate-500">Correction option:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{modelSummaryReport.chisq.correctionOption}</span></div>
                                                    <div><span className="font-black text-slate-500">Correction applied:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{modelSummaryReport.chisq.correctionApplied}</span></div>
                                                    <div><span className="font-black text-slate-500">Correction note:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{modelSummaryReport.chisq.correctionLabel}</span></div>
                                                    <div className={`pt-1 leading-relaxed font-medium ${modelSummaryReport.chisq.significant === 'Yes' ? 'text-green-700 dark:text-green-300' : 'text-slate-700 dark:text-slate-200'}`}>
                                                        <span className="font-black text-slate-500">Interpretation:</span> {modelSummaryReport.chisq.significanceEffect}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                                                {modelSummaryReport.chisq.message || modelSummaryReport.finalMessage}
                                            </div>
                                        </>
                                    ) : modelSummaryReport.kruskal ? (
                                        <>
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-black/10 p-3 space-y-1 text-sm">
                                                    <div><span className="font-black text-slate-500">Test:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{modelSummaryReport.kruskal.testName}</span></div>
                                                    <div><span className="font-black text-slate-500">Sample Type:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{modelSummaryReport.sampleType}</span></div>
                                                    <div><span className="font-black text-slate-500">Chi-squared:</span> <span className="font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.kruskal.statistic}</span></div>
                                                    <div><span className="font-black text-slate-500">df:</span> <span className="font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.kruskal.df}</span></div>
                                                    <div><span className="font-black text-slate-500">p-value:</span> <span className="font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.kruskal.p}</span></div>
                                                </div>
                                                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-black/10 p-3 space-y-1 text-sm">
                                                    <div><span className="font-black text-slate-500">Significant:</span> <span className={`font-semibold ${modelSummaryReport.kruskal.significant === 'Yes' ? 'text-green-700 dark:text-green-300' : 'text-slate-700 dark:text-slate-200'}`}>{modelSummaryReport.kruskal.significant}</span></div>
                                                    <div><span className="font-black text-slate-500">Epsilon-squared:</span> <span className="font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.kruskal.epsilonSquared}</span></div>
                                                    <div><span className="font-black text-slate-500">Effect size label:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{modelSummaryReport.kruskal.effectSizeLabel}</span></div>
                                                    <div className={`pt-1 leading-relaxed font-medium ${modelSummaryReport.kruskal.significant === 'Yes' ? 'text-green-700 dark:text-green-300' : 'text-slate-700 dark:text-slate-200'}`}>
                                                        <span className="font-black text-slate-500">Interpretation:</span> {modelSummaryReport.kruskal.significanceEffect}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                                                {modelSummaryReport.kruskal.message}
                                            </div>
                                            {Array.isArray(modelSummaryReport.kruskalDescriptiveRows) && modelSummaryReport.kruskalDescriptiveRows.length > 0 && (
                                                <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-black/20 p-3 space-y-2">
                                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Kruskal Descriptive Table (Publication Style)</div>
                                                    <table className="min-w-full text-xs text-left">
                                                        <thead className="bg-slate-100 dark:bg-slate-800 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-300">
                                                            <tr>
                                                                <th className="px-3 py-2 font-black">{modelSummaryReport.kruskalDescriptiveGroupLabel || 'Group'}</th>
                                                                <th className="px-3 py-2 font-black text-right">n</th>
                                                                <th className="px-3 py-2 font-black text-right">Mean +/- SD</th>
                                                                <th className="px-3 py-2 font-black text-right">Mean +/- {ciPercentForAlpha}% CI</th>
                                                                <th className="px-3 py-2 font-black text-right">Median [Q1, Q3]</th>
                                                                <th className="px-3 py-2 font-black text-right">Min</th>
                                                                <th className="px-3 py-2 font-black text-right">Max</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                                            {modelSummaryReport.kruskalDescriptiveRows.map((row) => (
                                                                <tr key={`summary_kr_desc_${row._id}`} className="bg-white dark:bg-black/20">
                                                                    <td className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-200">{row.group}</td>
                                                                    <td className="px-3 py-2 text-right font-mono text-slate-700 dark:text-slate-200">{row.n}</td>
                                                                    <td className="px-3 py-2 text-right font-mono text-slate-700 dark:text-slate-200">{row.meanSd}</td>
                                                                    <td className="px-3 py-2 text-right font-mono text-slate-700 dark:text-slate-200">{row.meanCi95}</td>
                                                                    <td className="px-3 py-2 text-right font-mono text-slate-700 dark:text-slate-200">{row.medianIqr}</td>
                                                                    <td className="px-3 py-2 text-right font-mono text-slate-700 dark:text-slate-200">{row.min}</td>
                                                                    <td className="px-3 py-2 text-right font-mono text-slate-700 dark:text-slate-200">{row.max}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </>
                                    ) : modelSummaryReport.friedman ? (
                                        <>
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-black/10 p-3 space-y-1 text-sm">
                                                    <div><span className="font-black text-slate-500">Test:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{modelSummaryReport.friedman.testName}</span></div>
                                                    <div><span className="font-black text-slate-500">Sample Type:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{modelSummaryReport.sampleType}</span></div>
                                                    <div><span className="font-black text-slate-500">Chi-squared:</span> <span className="font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.friedman.statistic}</span></div>
                                                    <div><span className="font-black text-slate-500">df:</span> <span className="font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.friedman.df}</span></div>
                                                    <div><span className="font-black text-slate-500">p-value:</span> <span className="font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.friedman.p}</span></div>
                                                </div>
                                                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-black/10 p-3 space-y-1 text-sm">
                                                    <div><span className="font-black text-slate-500">Significant:</span> <span className={`font-semibold ${modelSummaryReport.friedman.significant === 'Yes' ? 'text-green-700 dark:text-green-300' : 'text-slate-700 dark:text-slate-200'}`}>{modelSummaryReport.friedman.significant}</span></div>
                                                    <div className={`pt-1 leading-relaxed font-medium ${modelSummaryReport.friedman.significant === 'Yes' ? 'text-green-700 dark:text-green-300' : 'text-slate-700 dark:text-slate-200'}`}>
                                                        <span className="font-black text-slate-500">Interpretation:</span> {modelSummaryReport.friedman.significanceEffect}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                                                {modelSummaryReport.friedman.message}
                                            </div>
                                            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-black/20 p-3">
                                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Console Output (friedman.test)</div>
                                                <pre className="mt-2 whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-slate-700 dark:text-slate-200">
                                                    {modelSummaryReport.friedman.rOutput || 'Friedman output not available.'}
                                                </pre>
                                            </div>
                                        </>
                                    ) : modelSummaryReport.twoGroupNonParam ? (
                                        <>
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-black/10 p-3 space-y-1 text-sm">
                                                    <div><span className="font-black text-slate-500">Test:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{modelSummaryReport.twoGroupNonParam.testName}</span></div>
                                                    <div><span className="font-black text-slate-500">Sample Type:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{modelSummaryReport.sampleType}</span></div>
                                                    <div><span className="font-black text-slate-500">Statistic:</span> <span className="font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.twoGroupNonParam.statistic}</span></div>
                                                    <div><span className="font-black text-slate-500">p-value:</span> <span className="font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.twoGroupNonParam.p}</span></div>
                                                    <div><span className="font-black text-slate-500">Significant:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{modelSummaryReport.twoGroupNonParam.significant}</span></div>
                                                    <div><span className="font-black text-slate-500">Rank-biserial correlation:</span> <span className="font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.twoGroupNonParam.rankBiserial}</span></div>
                                                    <div><span className="font-black text-slate-500">Effect size:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{modelSummaryReport.twoGroupNonParam.rankBiserialEffect}</span></div>
                                                </div>
                                                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-black/10 p-3 space-y-1 text-sm">
                                                    <div><span className="font-black text-slate-500">Group 1:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{modelSummaryReport.twoGroupNonParam.group1}</span></div>
                                                    <div><span className="font-black text-slate-500">Median 1:</span> <span className="font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.twoGroupNonParam.median1}</span></div>
                                                    <div><span className="font-black text-slate-500">Group 2:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{modelSummaryReport.twoGroupNonParam.group2}</span></div>
                                                    <div><span className="font-black text-slate-500">Median 2:</span> <span className="font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.twoGroupNonParam.median2}</span></div>
                                                </div>
                                            </div>
                                            <div className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                                                {modelSummaryReport.twoGroupNonParam.message}
                                            </div>
                                            {modelSummaryReport.twoGroupNonParam.comparisonRow && (
                                                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-black/20 p-2">
                                                    <table className="min-w-full text-[11px] text-left">
                                                        <thead className="bg-slate-100 dark:bg-slate-800 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-300">
                                                            <tr>
                                                                <th className="px-2 py-1 font-black">Comparison</th>
                                                                <th className="px-2 py-1 font-black">{modelSummaryReport.twoGroupNonParam.comparisonRow.statLabel || 'Statistic'}</th>
                                                                <th className="px-2 py-1 font-black">RBC</th>
                                                                <th className="px-2 py-1 font-black">p</th>
                                                                <th className="px-2 py-1 font-black">Sig</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            <tr className="bg-white/90 dark:bg-black/20">
                                                                <td className="px-2 py-1 font-semibold text-slate-700 dark:text-slate-200">{modelSummaryReport.twoGroupNonParam.comparisonRow.comparison}</td>
                                                                <td className="px-2 py-1 font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.twoGroupNonParam.comparisonRow.stat}</td>
                                                                <td className="px-2 py-1 font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.twoGroupNonParam.comparisonRow.rbc || 'N/A'}</td>
                                                                <td className="px-2 py-1 font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.twoGroupNonParam.comparisonRow.p}</td>
                                                                <td className="px-2 py-1 font-mono font-bold text-slate-700 dark:text-slate-200">{modelSummaryReport.twoGroupNonParam.comparisonRow.sig}</td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                            {modelSummaryReport.twoGroupNonParam.comparisonRow && (
                                                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-black/20 p-2 max-w-[320px]">
                                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Significance Guide</div>
                                                    <table className="min-w-full text-[11px] text-left">
                                                        <thead className="bg-slate-100 dark:bg-slate-800 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-300">
                                                            <tr>
                                                                <th className="px-2 py-1 font-black">p-value</th>
                                                                <th className="px-2 py-1 font-black">Stars</th>
                                                                <th className="px-2 py-1 font-black">Meaning</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                                            <tr className="bg-white/90 dark:bg-black/20">
                                                                <td className="px-2 py-1 font-mono text-slate-700 dark:text-slate-200">p &lt; α ({alphaForStars})</td>
                                                                <td className="px-2 py-1 font-mono font-bold text-slate-700 dark:text-slate-200">*</td>
                                                                <td className="px-2 py-1 text-slate-700 dark:text-slate-200">Significant</td>
                                                            </tr>
                                                            <tr className="bg-white/90 dark:bg-black/20">
                                                                <td className="px-2 py-1 font-mono text-slate-700 dark:text-slate-200">p &lt; 0.01</td>
                                                                <td className="px-2 py-1 font-mono font-bold text-slate-700 dark:text-slate-200">**</td>
                                                                <td className="px-2 py-1 text-slate-700 dark:text-slate-200">Very significant</td>
                                                            </tr>
                                                            <tr className="bg-white/90 dark:bg-black/20">
                                                                <td className="px-2 py-1 font-mono text-slate-700 dark:text-slate-200">p &lt; 0.001</td>
                                                                <td className="px-2 py-1 font-mono font-bold text-slate-700 dark:text-slate-200">***</td>
                                                                <td className="px-2 py-1 text-slate-700 dark:text-slate-200">Highly significant</td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                            <div className={`rounded-lg border p-3 text-xs leading-relaxed ${
                                                modelSummaryReport.twoGroupNonParam.significant === 'Yes'
                                                    ? 'border-green-100 dark:border-green-800 bg-green-50/70 dark:bg-green-900/10 text-green-700 dark:text-green-200'
                                                    : 'border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300'
                                            }`}>
                                                <span className={`font-black uppercase tracking-wider ${
                                                    modelSummaryReport.twoGroupNonParam.significant === 'Yes'
                                                        ? 'text-green-500'
                                                        : 'text-gray-500'
                                                }`}>Interpretation ({modelSummaryReport.twoGroupNonParam.testName || 'Two-Group Non-Parametric Test'}):</span>{' '}
                                                {modelSummaryReport.twoGroupNonParam.interpretation}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-sm text-slate-600 dark:text-slate-300">
                                            RM ANOVA not used in this analysis. Primary test: {modelSummaryReport.primary.testName}.
                                        </div>
                                    )}
                                </div>

                                {!modelSummaryReport.tTest && !modelSummaryReport.oneValue && !modelSummaryReport.twoGroupNonParam && !modelSummaryReport.chisq && !modelSummaryReport.correlationMatrix && (
                                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-black/20 p-4 space-y-3">
                                        <div className="text-xs font-black uppercase tracking-widest text-slate-500">{modelSummaryReport.posthocDisplayTitle || 'Post-hoc Results'}</div>
                                        <div className="text-sm text-slate-700 dark:text-slate-200">
                                            <span className="font-black text-slate-500">Method:</span> {modelSummaryReport.posthocMethod || modelSummaryReport.posthocLabel} | <span className="font-black text-slate-500">Comparisons:</span> {modelSummaryReport.posthocComparisons} | <span className="font-black text-slate-500">Significant:</span> {modelSummaryReport.posthocSignificant}
                                        </div>
                                        {Array.isArray(modelSummaryReport.tukeyPairwiseRows) && modelSummaryReport.tukeyPairwiseRows.length > 0 ? (
                                            <div className="space-y-2">
                                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">PAIRWISE COMPARISONS (TUKEY HSD)</div>
                                                <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                                                    <table className="min-w-full text-xs text-left">
                                                        <thead className="bg-slate-100 dark:bg-slate-800 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-300">
                                                            <tr>
                                                                <th className="px-3 py-2 font-black">Comparison</th>
                                                                <th className="px-3 py-2 font-black">Mean Diff</th>
                                                                <th className="px-3 py-2 font-black">{ciPercentForAlpha}% CI (+/-)</th>
                                                                <th className="px-3 py-2 font-black">P-Value (Adj)</th>
                                                                <th className="px-3 py-2 font-black">Result</th>
                                                            </tr>
                                                        </thead>
