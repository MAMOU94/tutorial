import React, { useEffect, useMemo, useState } from 'react';
import {
    Maximize2, Sparkles, UploadCloud, Table as TableIcon, Layout,
    BarChart as ChartBarIcon, Activity, CheckCircle2, FlaskConical,
    Download
} from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/Button';
import '../results-design.css';
import { 
    fmt, fmtP, corrStrength, corrDirection, effectSizeLabel, 
    buildLinearRegressionEquation, computeElbowK, generateReport, toArray, rmAnovaEffectSummary, buildRmAnovaROutput, buildFriedmanROutput 
} from '../utils/reportGenerator';
import { exportModelSummaryToCsv, exportModelSummaryToPdf, exportModelSummaryToXlsx } from '../utils/modelSummaryPdf';
import RichTextEditor from './ui/RichTextEditor';

const richTextHtmlToPlainText = (html) =>
    String(html || '')
        .replace(/<\/(div|p|li|h[1-6])>/gi, '\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<li>/gi, '- ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/<[^>]*>/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

const AnalysisResult = ({ 
    result, 
    handlePredictionUpload, 
    setSelectedImage, 
    openInterpretation,
    theme,
    plotTitle,
    setPlotTitle,
    plotXLabel,
    setPlotXLabel,
    plotYLabel,
    setPlotYLabel,
    plotCaption,
    setPlotCaption,
    runAnalysis,
    loading
}) => {
    
    const [corrView, setCorrView] = useState('pearson');
    const [linearityView, setLinearityView] = useState('pearson');
    const [showScatter, setShowScatter] = useState(true);
    const [selectedCorrVars, setSelectedCorrVars] = useState(null); // null = all selected
    
    const [activeTab, setActiveTab] = useState('summary');
    const [reportTitle, setReportTitle] = useState('');
    const [reportAuthor, setReportAuthor] = useState('');
    const [reportEndNote, setReportEndNote] = useState('');
    const [reportEndFontFamily, setReportEndFontFamily] = useState('Courier New');
    const [reportEndFontSize, setReportEndFontSize] = useState('14');
    const [reportEndTextColor, setReportEndTextColor] = useState('#111111');
    const [plotMetadataByKey, setPlotMetadataByKey] = useState({});
    const reportEditorFonts = ['Courier New', 'Arial', 'Georgia', 'Times New Roman', 'Verdana'];
    const reportEditorFontSizes = ['12', '14', '16', '18', '20', '24'];
    const isAyuDarkTheme = theme === 'ayu-dark' || !theme;
    const isRTheme = isAyuDarkTheme;
    const isEditorRTheme = false;
    const isLinearRegression = result?.mode === 'regression_linear';
    const isBinaryLogisticRegression = result?.mode === 'regression_logistic';
    const isOrdinalLogisticRegression = result?.mode === 'regression_ordinal_logistic';
    const isLogisticLikeRegression = isBinaryLogisticRegression || isOrdinalLogisticRegression;
    const regressionDisplayLabel = result?.regression_display_label || (
        isLinearRegression
        ? (
            String(result?.regression_linear_variant || '').trim().toLowerCase() === 'multiple'
            || (!result?.regression_linear_variant && Array.isArray(result?.predictors) && result.predictors.length > 1)
                ? 'Multiple Linear Regression'
                : 'Simple Linear Regression'
        )
        : (isOrdinalLogisticRegression ? 'Ordinal Logistic Regression' : 'Logistic Regression')
    );
    const linearRegressionEquation = isLinearRegression
        ? buildLinearRegressionEquation(result)
        : '';
    const linearRegressionResponseName = String(result?.response_variable || '').trim();
    const hasSinglePredictorLinearModel = isLinearRegression && (
        (Array.isArray(result?.predictors) && result.predictors.length === 1)
        || (!Array.isArray(result?.predictors) && regressionDisplayLabel === 'Simple Linear Regression')
    );
    const orderedResponseLevels = Array.isArray(result?.response_levels) ? result.response_levels : [];
    const orderedResponseLevelSource = String(result?.response_level_order_source || '').trim();

    const renderCustomPlotLabels = () => (
        <div className="mt-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/20">
            <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest">Global Plot Labels</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                    <label className="text-[9px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-1 block">Plot Title</label>
                    <input 
                        type="text" 
                        value={plotTitle || ''}
                        onChange={(e) => setPlotTitle(e.target.value)}
                        placeholder="e.g. My Custom Title"
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                </div>
                <div>
                    <label className="text-[9px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-1 block">Caption / Footnote</label>
                    <input 
                        type="text" 
                        value={plotCaption || ''}
                        onChange={(e) => setPlotCaption(e.target.value)}
                        placeholder="e.g. Data collected Q3 2024"
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                </div>
                <div>
                    <label className="text-[9px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-1 block">X-Axis Title</label>
                    <input 
                        type="text" 
                        value={plotXLabel || ''}
                        onChange={(e) => setPlotXLabel(e.target.value)}
                        placeholder="X-Axis"
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                </div>
                <div>
                    <label className="text-[9px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-1 block">Y-Axis Title</label>
                    <input 
                        type="text" 
                        value={plotYLabel || ''}
                        onChange={(e) => setPlotYLabel(e.target.value)}
                        placeholder="Y-Axis"
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                </div>
            </div>
            
            <div className="mt-3 flex items-center justify-between">
                <Button
                    onClick={() => runAnalysis({ colorOnly: true })}
                    disabled={loading}
                    variant="outline"
                    className="text-xs py-1"
                >
                    {loading ? 'Updating...' : 'Apply Labels & Redraw Plot'}
                </Button>
            </div>
        </div>
    );

    const exploratoryChartLabel = (key) => {
        const map = {
            bar: 'Bar Chart',
            pie: 'Pie Chart',
            histogram: 'Histogram',
            box: 'Box Plot',
            violin: 'Violin Plot',
            density: 'Density Plot',
            dot: 'Dot Plot',
            stem: 'Stem-and-Leaf',
            scatter: 'Scatter Plot',
            line: 'Line Chart',
            area: 'Area Chart',
            frequency_polygon: 'Frequency Polygon',
            pareto: 'Pareto Chart',
            stacked_bar: 'Stacked Bar',
            grouped_bar: 'Grouped Bar',
            mosaic: 'Mosaic Plot',
            cat_heatmap: 'Category Heatmap'
        };
        const id = typeof key === 'string' ? key : '';
        return map[id] || (typeof key === 'string' ? key : 'Unknown');
    };
    const safeText = (v) => {
        if (v == null) return '';
        if (typeof v === 'string' || typeof v === 'number') return String(v);
        if (Array.isArray(v)) return v.map(String).join(', ');
        try { return JSON.stringify(v); } catch (e) { return String(v); }
    };
    const asImageDataUrl = (value) => {
        const text = typeof value === 'string' ? value.trim() : '';
        if (!text) return '';
        return text.startsWith('data:image') ? text : `data:image/png;base64,${text}`;
    };
    const renderFullscreenButton = (imageValue, title, iconSize = 18, extraClassName = '') => {
        const imageUrl = asImageDataUrl(imageValue);
        if (!imageUrl) return null;
        return (
            <button
                type="button"
                onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    const editorPayload = getPlotEditorPayloadByImageUrl(imageUrl);
                    setSelectedImage(editorPayload
                        ? { url: imageUrl, title, editor: editorPayload }
                        : { url: imageUrl, title });
                }}
                className={`absolute top-2 right-2 z-20 rounded-full border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/90 p-2 text-gray-700 dark:text-gray-200 shadow-md transition md:opacity-0 md:group-hover:opacity-100 ${extraClassName}`}
                title="View Full Screen"
            >
                <Maximize2 size={iconSize} />
            </button>
        );
    };
    const buildPlotEditorKey = (title, index) => {
        const normalizedTitle = String(title || 'plot')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .slice(0, 40) || 'plot';
        return `${normalizedTitle}_${index}`;
    };
    const updatePlotMetadataField = (plotKey, field, value) => {
        setPlotMetadataByKey((prev) => ({
            ...prev,
            [plotKey]: {
                ...(prev?.[plotKey] || {}),
                [field]: value
            }
        }));
    };
    const resetPlotMetadata = (plotKey) => {
        setPlotMetadataByKey((prev) => {
            if (!prev || !Object.prototype.hasOwnProperty.call(prev, plotKey)) return prev;
            const next = { ...prev };
            delete next[plotKey];
            return next;
        });
    };

    // Derived state/variables logic from App.jsx
    const elbowKFallback = result?.optimization_data ? computeElbowK(result.optimization_data) : null;
    const elbowK = Number.isFinite(Number(result?.elbow_k)) ? Number(result.elbow_k) : elbowKFallback;
    const optimalK = Number.isFinite(Number(result?.optimal_k)) ? Number(result.optimal_k) : null;
    const silhouetteK = Number.isFinite(Number(result?.silhouette_k)) ? Number(result.silhouette_k) : optimalK;
    const requestedK = Number.isFinite(Number(result?.requested_k)) ? Number(result.requested_k) : null;
    const kUsed = Number.isFinite(Number(result?.k)) ? Number(result.k) : optimalK;
    const avgSilhouette = Number.isFinite(Number(result?.avg_silhouette_width)) ? Number(result.avg_silhouette_width) : null;
    
    const isKmeansFamilyResult = ['multivariate_kmeans', 'multivariate_clustering'].includes(result?.mode);
    const showKmeansOptimization = isKmeansFamilyResult && (
        !!result?.elbow_plot_image ||
        !!result?.silhouette_trend_plot_image ||
        !!result?.optimization_data ||
        Number.isFinite(silhouetteK) ||
        Number.isFinite(elbowK) ||
        Number.isFinite(kUsed) ||
        !!result?.elbow_plot_error ||
        !!result?.silhouette_trend_plot_error
    );

    const showKmeansSilhouette = isKmeansFamilyResult && (
        !!result?.silhouette_plot_image ||
        avgSilhouette != null ||
        !!result?.silhouette_error
    );

    const correlationStrengthLevel = (value) => {
        const numericValue = Number(value);
        if (!Number.isFinite(numericValue)) return 'neutral';
        const absValue = Math.abs(numericValue);
        if (absValue >= 0.7) return 'strong';
        if (absValue >= 0.4) return 'medium';
        return 'light';
    };
    const getCorrelationChipClass = (value, mode = 'pearson') => {
        const level = correlationStrengthLevel(value);
        if (level === 'neutral') return 'corr-value-chip-neutral';
        return `corr-value-chip-${mode}-${level}`;
    };
    const formatCorrelationCell = (value) => {
        const numericValue = Number(value);
        return Number.isFinite(numericValue) ? numericValue.toFixed(3) : 'NA';
    };
    const correlationModes = useMemo(() => {
        const matrix = result?.correlation_matrix;
        if (!matrix || typeof matrix !== 'object') return [];
        const modes = [];
        if (Array.isArray(matrix.pearson) && matrix.pearson.length > 0) modes.push('pearson');
        if (Array.isArray(matrix.spearman) && matrix.spearman.length > 0) modes.push('spearman');
        return modes;
    }, [result?.correlation_matrix]);

    useEffect(() => {
        if (correlationModes.length === 0) return;
        const preferred = (result?.correlation_matrix?.selected_method && correlationModes.includes(result.correlation_matrix.selected_method))
            ? result.correlation_matrix.selected_method
            : correlationModes[0];
        setCorrView((prev) => (correlationModes.includes(prev) ? prev : preferred));
        setLinearityView((prev) => (correlationModes.includes(prev) ? prev : preferred));
    }, [correlationModes, result?.correlation_matrix?.selected_method]);
    
    const twoGroupNonParamResult = result?.mann_whitney || result?.wilcoxon || null;
    const twoGroupNonParamReportType = result?.mann_whitney ? 'mann_whitney' : (result?.wilcoxon ? 'wilcoxon' : null);

    if (!result) return null;

    const sanitizeROutputValue = (value, key = '') => {
        if (value == null) return value;
        if (typeof value === 'number' || typeof value === 'boolean') return value;
        if (typeof value === 'string') {
            const keyLower = String(key || '').toLowerCase();
            const isImageField = keyLower.includes('image') || keyLower.includes('plot_image');
            const looksBase64 = value.length > 240 && /^[A-Za-z0-9+/=\r\n]+$/.test(value.slice(0, 240));
            if (isImageField || looksBase64) {
                return `[binary/base64 omitted, length=${value.length}]`;
            }
            return value;
        }
        if (Array.isArray(value)) {
            return value.map((item, index) => sanitizeROutputValue(item, `${key}[${index}]`));
        }
        if (typeof value === 'object') {
            const out = {};
            Object.entries(value).forEach(([k, v]) => {
                out[k] = sanitizeROutputValue(v, k);
            });
            return out;
        }
        return String(value);
    };

    const supportsStep05Report = result?.mode === 'inferential'
        || (typeof result?.mode === 'string' && result.mode.startsWith('multivariate'));
    const sanitizedROutput = supportsStep05Report ? sanitizeROutputValue(result) : null;
    const multivariateModeLabelMap = {
        multivariate_pca: 'Principal Component Analysis (PCA)',
        multivariate_pca_biplot: 'PCA Biplot',
        multivariate_ca: 'Correspondence Analysis (CA)',
        multivariate_mca: 'Multiple Correspondence Analysis (MCA)',
        multivariate_coinertia: 'Co-Inertia Analysis',
        multivariate_bca: 'Between-Class Analysis (BCA)',
        multivariate_clustering: 'Clustering',
        multivariate_kmeans: 'K-Means Clustering',
        multivariate_hclust: 'Hierarchical Clustering'
    };
    const multivariateGoalMap = {
        multivariate_pca: 'Reduce dimensionality while retaining as much variance as possible.',
        multivariate_pca_biplot: 'Visualize observation scores and variable directions on shared principal axes.',
        multivariate_ca: 'Map association structure between two categorical variables.',
        multivariate_mca: 'Reduce dimensionality across multiple categorical variables.',
        multivariate_coinertia: 'Summarize shared structure between two variable blocks.',
        multivariate_bca: 'Project data to maximize separation between predefined classes.',
        multivariate_clustering: 'Group similar observations into internally coherent clusters.',
        multivariate_kmeans: 'Partition observations into compact, well-separated clusters.',
        multivariate_hclust: 'Build a hierarchy of clusters to inspect nested grouping structure.'
    };
    const formatCompactHeader = (key = '') => {
        const text = String(key || '').trim();
        if (!text) return 'Value';
        return text
            .replace(/_/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/\b\w/g, (char) => char.toUpperCase());
    };
    const formatCompactValue = (value) => {
        if (value == null || value === '') return 'N/A';
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        if (typeof value === 'number') {
            if (!Number.isFinite(value)) return 'N/A';
            return Number.isInteger(value) ? String(value) : value.toFixed(Math.abs(value) >= 100 ? 2 : 4);
        }
        if (typeof value === 'string') return value;
        if (Array.isArray(value)) return value.map((item) => formatCompactValue(item)).join(', ');
        try {
            return JSON.stringify(value);
        } catch (err) {
            return String(value);
        }
    };
    const formatCorrectionName = (value, includeAbbreviation = false) => {
        const normalized = String(value || '').trim().toUpperCase();
        if (normalized === 'GG') {
            return includeAbbreviation ? 'Greenhouse-Geisser (GG)' : 'Greenhouse-Geisser';
        }
        if (normalized === 'HF') {
            return includeAbbreviation ? 'Huynh-Feldt (HF)' : 'Huynh-Feldt';
        }
        if (normalized === 'NONE') return 'None';
        return value || 'N/A';
    };
    
    const formatTestName = (name) => {
        if (!name) return 'Inferential Test';
        return name.split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    const isRPrimitive = (v) => v == null || ['string', 'number', 'boolean'].includes(typeof v);
    const formatRKey = (key = '') => {
        const normalized = String(key).trim();
        if (normalized === 'z_value' || normalized === 'z_statistic') return 'Z-Statistic';
        if (normalized === 'is_significant' || normalized === 'significant') return 'Sig';
        const spaced = normalized.replace(/_/g, ' ').trim();
        return spaced.charAt(0).toUpperCase() + spaced.slice(1);
    };
    const parsePValueForStars = (value) => {
        if (value == null) return Number.NaN;
        if (typeof value === 'number') return Number.isFinite(value) ? value : Number.NaN;
        const text = String(value).trim().replace(',', '.');
        if (!text) return Number.NaN;
        const direct = Number(text);
        if (Number.isFinite(direct)) return direct;
        const lessThanMatch = text.match(/^<\s*=?\s*([0-9]*\.?[0-9]+(?:e-?\d+)?)$/i);
        if (!lessThanMatch) return Number.NaN;
        const upperBound = Number(lessThanMatch[1]);
        return Number.isFinite(upperBound) ? upperBound / 2 : Number.NaN;
    };
    const resolveSignificanceStars = (pValueRaw, isSignificant = false) => {
        const pValue = parsePValueForStars(pValueRaw);
        if (Number.isFinite(pValue)) {
            if (pValue < 0.001) return '***';
            if (pValue < 0.01) return '**';
            if (pValue < 0.05) return '*';
        }
        return isSignificant ? '*' : 'ns';
    };
    const getSignificanceStars = (row) => {
        if (!row || typeof row !== 'object') return '';
        const pRaw = row.p_adj ?? row.p_value ?? row.p;
        const pNum = parsePValueForStars(pRaw);
        if (!Number.isFinite(pNum)) return '';
        if (pNum < 0.001) return '***';
        if (pNum < 0.01) return '**';
        if (pNum < 0.05) return '*';
        return '';
    };
    const getPublicationDescriptivePayload = (src, key = 'descriptive_table_publication') => {
        const payload = src?.[key];
        if (!payload) return null;
        if (Array.isArray(payload)) {
            return {
                rows: payload,
                group_var: 'Group',
                response_var: 'Value'
            };
        }
        if (payload && typeof payload === 'object') {
            return {
                ...payload,
                rows: Array.isArray(payload.rows) ? payload.rows : []
            };
        }
        return null;
    };
    const getPublicationDescriptiveRows = (src, key = 'descriptive_table_publication') => {
        const payload = getPublicationDescriptivePayload(src, key);
        return Array.isArray(payload?.rows) ? payload.rows : [];
    };
    const splitComparisonGroups = (comparison) => {
        const text = String(comparison || '').trim();
        if (!text) return [null, null];
        const parts = text.split(/\s*-\s*/);
        if (parts.length < 2) return [null, null];
        const left = String(parts[0] || '').trim();
        const right = String(parts.slice(1).join(' - ') || '').trim();
        return [left || null, right || null];
    };
    const inferPosthocMethodLabel = (src, fallback = 'Post-hoc') => {
        const explicit = String(src?.posthocMethod || src?.posthocLabel || '').trim();
        if (explicit && explicit.toLowerCase() !== 'none') return explicit;
        if (Array.isArray(src?.tukey) && src.tukey.length > 0) return 'Tukey HSD';
        if (Array.isArray(src?.dunn) && src.dunn.length > 0) return 'Dunn (Bonferroni)';
        if (Array.isArray(src?.games_howell) && src.games_howell.length > 0) return 'Games-Howell';
        if (Array.isArray(src?.rm_anova_posthoc) && src.rm_anova_posthoc.length > 0) return 'Pairwise paired t-test (Bonferroni)';
        if (Array.isArray(src?.friedman_posthoc) && src.friedman_posthoc.length > 0) return 'Nemenyi';
        return fallback;
    };
    const toPosthocDescriptiveRows = (src) => {
        const posthocCandidates = [
            toArray(src?.dunn),
            toArray(src?.tukey),
            toArray(src?.games_howell),
            toArray(src?.rm_anova_posthoc),
            toArray(src?.friedman_posthoc)
        ];
        const allPosthocRows = posthocCandidates.find((rows) => rows.length > 0) || [];
        if (allPosthocRows.length === 0) return [];
        const significantRows = allPosthocRows.filter((item) => item?.is_significant === true);
        if (significantRows.length === 0) return [];

        const descriptiveRows = getPublicationDescriptiveRows(src);
        if (descriptiveRows.length === 0) return [];

        const byGroup = new Map();
        descriptiveRows.forEach((row) => {
            const key = String(row?.group ?? '').trim();
            if (key) byGroup.set(key, row);
        });

        const formatNumeric = (value, digits = 3) => {
            const n = Number(value);
            return Number.isFinite(n) ? n.toFixed(digits) : 'N/A';
        };
        const formatCount = (value) => {
            const n = Number(value);
            return Number.isFinite(n) ? String(Math.round(n)) : 'N/A';
        };
        const formatMedianIqr = (row) => {
            if (!row || typeof row !== 'object') return 'N/A';
            if (row?.median_iqr) return String(row.median_iqr);
            if (Number.isFinite(Number(row?.median)) && Number.isFinite(Number(row?.q1)) && Number.isFinite(Number(row?.q3))) {
                return `${formatNumeric(row.median)} [${formatNumeric(row.q1)}, ${formatNumeric(row.q3)}]`;
            }
            return 'N/A';
        };

        return significantRows.map((item, idx) => {
            const comparison = String(item?.comparison || `Comparison ${idx + 1}`).trim();
            const [groupA, groupB] = splitComparisonGroups(comparison);
            const rowA = groupA ? byGroup.get(groupA) : null;
            const rowB = groupB ? byGroup.get(groupB) : null;
            const medianA = Number(rowA?.median);
            const medianB = Number(rowB?.median);
            const medianDelta = Number.isFinite(medianA) && Number.isFinite(medianB)
                ? (medianA - medianB).toFixed(3)
                : 'N/A';
            const statRaw = item?.z_value ?? item?.statistic ?? item?.t_stat ?? item?.diff;
            const pAdjRaw = item?.formatted_p ?? item?.p_adj ?? item?.p_value ?? item?.p;

            return {
                comparison,
                groupA: groupA || 'N/A',
                nA: formatCount(rowA?.n),
                medianIqrA: formatMedianIqr(rowA),
                groupB: groupB || 'N/A',
                nB: formatCount(rowB?.n),
                medianIqrB: formatMedianIqr(rowB),
                medianDelta,
                stat: Number.isFinite(Number(statRaw)) ? Number(statRaw).toFixed(4) : 'N/A',
                pAdj: typeof pAdjRaw === 'string'
                    ? pAdjRaw
                    : (Number.isFinite(Number(pAdjRaw)) ? Number(pAdjRaw).toFixed(4) : 'N/A'),
                sig: resolveSignificanceStars(pAdjRaw, item?.is_significant === true)
            };
        });
    };
    const renderPublicationDescriptiveTable = (src, title = 'Descriptive Table (Publication Style)') => {
        const rows = getPublicationDescriptiveRows(src);
        if (rows.length === 0) return null;

        const payload = getPublicationDescriptivePayload(src);
        const groupLabel = payload?.group_var || 'Group';
        const valueLabel = payload?.response_var || 'Value';
        const formatNumeric = (value, digits = 3) => {
            const n = Number(value);
            return Number.isFinite(n) ? n.toFixed(digits) : 'N/A';
        };
        const formatCount = (value) => {
            const n = Number(value);
            return Number.isFinite(n) ? String(Math.round(n)) : 'N/A';
        };

        return (
            <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#131313] shadow-[0_4px_20px_rgba(0,0,0,0.4)] overflow-visible">
                {/* Title Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(255,255,255,0.06)]">
                    <div className="flex items-center gap-3">
                        <TableIcon size={18} className="text-[#00F5FF]" style={{ filter: 'drop-shadow(0 0 4px rgba(0, 245, 255, 0.5))' }} />
                        <h3 className="text-sm font-bold text-[#00F5FF] tracking-wider uppercase" style={{ textShadow: '0 0 8px rgba(0, 245, 255, 0.3)' }}>{title}</h3>
                    </div>
                </div>
                
                <div className="relative">
                    {/* Compact Black Table */}
                    <div className="min-w-full overflow-x-auto">
                        {/* Table Header */}
                        <div className="flex border-b border-[rgba(255,255,255,0.06)] px-4 py-3 bg-[#131313]" style={{ minWidth: '900px' }}>
                            <div className="flex-[1.5] text-[9px] font-bold uppercase tracking-wider text-[rgba(229,226,225,0.4)]">{groupLabel}</div>
                            <div className="flex-[0.75] text-[9px] font-bold uppercase tracking-wider text-[rgba(229,226,225,0.4)] text-center">n</div>
                            <div className="flex-[1.5] text-[9px] font-bold uppercase tracking-wider text-[rgba(229,226,225,0.4)] text-center">Mean ± SD</div>
                            <div className="flex-[2.2] text-[9px] font-bold uppercase tracking-wider text-[rgba(229,226,225,0.4)] text-center">Mean ± 95% CI</div>
                            <div className="flex-[2] text-[9px] font-bold uppercase tracking-wider text-[rgba(229,226,225,0.4)] text-center">Median [Q1, Q3]</div>
                            <div className="flex-[1] text-[9px] font-bold uppercase tracking-wider text-[rgba(229,226,225,0.4)] text-center">Min</div>
                            <div className="flex-[1] text-[9px] font-bold uppercase tracking-wider text-[rgba(229,226,225,0.4)] text-center">Max</div>
                        </div>
                        
                        {/* Table Rows */}
                        {rows.map((row, idx) => {
                            const meanSdText = row?.mean_sd || (
                                Number.isFinite(Number(row?.mean)) && Number.isFinite(Number(row?.sd))
                                    ? `${formatNumeric(row.mean)} ± ${formatNumeric(row.sd)}`
                                    : 'N/A'
                            );
                            const meanCiText = row?.mean_ci95 || (
                                Number.isFinite(Number(row?.mean)) && Number.isFinite(Number(row?.ci_lower)) && Number.isFinite(Number(row?.ci_upper))
                                    ? `${formatNumeric(row.mean)} [${formatNumeric(row.ci_lower)}, ${formatNumeric(row.ci_upper)}]`
                                    : 'N/A'
                            );
                            const medianIqrText = row?.median_iqr || (
                                Number.isFinite(Number(row?.median)) && Number.isFinite(Number(row?.q1)) && Number.isFinite(Number(row?.q3))
                                    ? `${formatNumeric(row.median)} [${formatNumeric(row.q1)}, ${formatNumeric(row.q3)}]`
                                    : 'N/A'
                            );

                            return (
                                <div 
                                    key={`publication_desc_${idx}`}
                                    className="relative flex border-b border-[rgba(255,255,255,0.04)] px-4 py-2.5 hover:bg-[rgba(255,255,255,0.02)] cursor-pointer transition-colors group/row overflow-visible"
                                    style={{ minWidth: '900px' }}
                                >
                                    <div className="flex-[1.5] text-xs font-semibold text-[#E5E2E1] truncate pr-2">{row?.group ?? 'N/A'}</div>
                                    <div className="flex-[0.75] text-xs font-mono text-[rgba(229,226,225,0.6)] text-center">{formatCount(row?.n)}</div>
                                    <div className="flex-[1.5] text-xs font-mono text-[rgba(229,226,225,0.6)] text-center">{meanSdText}</div>
                                    <div className="flex-[2.2] text-xs font-mono text-[rgba(229,226,225,0.6)] text-center">{meanCiText}</div>
                                    <div className="flex-[2] text-xs font-mono text-[rgba(229,226,225,0.6)] text-center">{medianIqrText}</div>
                                    <div className="flex-[1] text-xs font-mono text-[rgba(229,226,225,0.6)] text-center">{formatNumeric(row?.min)}</div>
                                    <div className="flex-[1] text-xs font-mono text-[rgba(229,226,225,0.6)] text-center">{formatNumeric(row?.max)}</div>
                                    
                                    {/* Floating Card on Hover */}
                                    <div className="absolute right-0 top-full z-[100] invisible group-hover/row:visible opacity-0 group-hover/row:opacity-100 transition-all duration-200 pointer-events-none group-hover/row:pointer-events-auto" style={{ marginTop: '8px' }}>
                                        <div className="w-80 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#131313] shadow-[0_8px_32px_rgba(0,0,0,0.8)] overflow-hidden">
                                            {/* Floating Card Header */}
                                            <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.06)] bg-[#0d0d12]">
                                                <h4 className="text-sm font-bold text-[#E9FEFF] truncate">{row?.group ?? 'Group'}</h4>
                                            </div>
                                            
                                            {/* Floating Card Body */}
                                            <div className="p-4 space-y-3">
                                                {/* Stats Grid */}
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="p-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
                                                        <p className="text-[9px] font-bold uppercase tracking-wider text-[rgba(229,226,225,0.4)] mb-1">Sample Size</p>
                                                        <p className="text-lg font-bold font-mono text-[#E9FEFF]">{formatCount(row?.n)}</p>
                                                    </div>
                                                    <div className="p-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
                                                        <p className="text-[9px] font-bold uppercase tracking-wider text-[rgba(229,226,225,0.4)] mb-1">Mean</p>
                                                        <p className="text-lg font-bold font-mono text-[#E9FEFF]">{Number.isFinite(Number(row?.mean)) ? formatNumeric(row.mean) : 'N/A'}</p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="p-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
                                                        <p className="text-[9px] font-bold uppercase tracking-wider text-[rgba(229,226,225,0.4)] mb-1">SD</p>
                                                        <p className="text-lg font-bold font-mono text-[#E9FEFF]">{Number.isFinite(Number(row?.sd)) ? formatNumeric(row.sd) : 'N/A'}</p>
                                                    </div>
                                                    <div className="p-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
                                                        <p className="text-[9px] font-bold uppercase tracking-wider text-[rgba(229,226,225,0.4)] mb-1">Median</p>
                                                        <p className="text-lg font-bold font-mono text-[#E9FEFF]">{Number.isFinite(Number(row?.median)) ? formatNumeric(row.median) : 'N/A'}</p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="p-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
                                                        <p className="text-[9px] font-bold uppercase tracking-wider text-[rgba(229,226,225,0.4)] mb-1">Min</p>
                                                        <p className="text-lg font-bold font-mono text-[#E9FEFF]">{Number.isFinite(Number(row?.min)) ? formatNumeric(row.min) : 'N/A'}</p>
                                                    </div>
                                                    <div className="p-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
                                                        <p className="text-[9px] font-bold uppercase tracking-wider text-[rgba(229,226,225,0.4)] mb-1">Max</p>
                                                        <p className="text-lg font-bold font-mono text-[#E9FEFF]">{Number.isFinite(Number(row?.max)) ? formatNumeric(row.max) : 'N/A'}</p>
                                                    </div>
                                                </div>
                                                
                                                {/* Additional Info */}
                                                <div className="p-3 rounded-lg bg-[rgba(0,245,255,0.05)] border border-[rgba(0,245,255,0.15)]">
                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#00F5FF] mb-1">95% Confidence Interval</p>
                                                    <p className="text-xs text-[rgba(229,226,225,0.6)]">
                                                        [{Number.isFinite(Number(row?.ci_lower)) ? formatNumeric(row.ci_lower) : 'N/A'}, {Number.isFinite(Number(row?.ci_upper)) ? formatNumeric(row.ci_upper) : 'N/A'}]
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="px-6 py-3 border-t border-[rgba(255,255,255,0.06)] text-[11px] text-[rgba(229,226,225,0.4)]">
                    {valueLabel} summary by {groupLabel}, rounded to 3 decimals.
                </div>
            </div>
        );
    };
    const renderPosthocDescriptiveTable = (src, title) => {
        const methodLabel = inferPosthocMethodLabel(src);
        const resolvedTitle = title || `Post-hoc Descriptive Table (${methodLabel})`;
        const rows = toPosthocDescriptiveRows(src);
        if (rows.length === 0) {
            return (
                <Card title={resolvedTitle} icon={TableIcon}>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                        No statistically significant pairwise comparison to display in the main table.
                    </div>
                    <div className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
                        All pairwise tests were performed; full results are available in supplementary tables/exports.
                    </div>
                </Card>
            );
        }

        return (
            <Card title={resolvedTitle} icon={TableIcon}>
                <div className="max-h-[430px] overflow-auto">
                    <table className="w-full text-left text-[12px] leading-tight">
                        <thead className="bg-gray-50 dark:bg-black/20 text-[10px] font-black uppercase tracking-widest text-gray-400">
                            <tr>
                                <th className="px-2 py-1.5">Comparison</th>
                                <th className="px-2 py-1.5">Group A</th>
                                <th className="px-2 py-1.5 text-right">n(A)</th>
                                <th className="px-2 py-1.5 text-right">Median [Q1, Q3] (A)</th>
                                <th className="px-2 py-1.5">Group B</th>
                                <th className="px-2 py-1.5 text-right">n(B)</th>
                                <th className="px-2 py-1.5 text-right">Median [Q1, Q3] (B)</th>
                                <th className="px-2 py-1.5 text-right">Delta Median</th>
                                <th className="px-2 py-1.5 text-right">Statistic</th>
                                <th className="px-2 py-1.5 text-right">Adj p</th>
                                <th className="px-2 py-1.5 text-right">Sig</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {rows.map((row, idx) => (
                                <tr key={`posthoc_desc_${idx}`}>
                                    <td className="px-2 py-1.5 font-semibold text-gray-700 dark:text-gray-200">{row.comparison}</td>
                                    <td className="px-2 py-1.5 font-semibold text-gray-700 dark:text-gray-200">{row.groupA}</td>
                                    <td className="px-2 py-1.5 text-right font-mono">{row.nA}</td>
                                    <td className="px-2 py-1.5 text-right font-mono">{row.medianIqrA}</td>
                                    <td className="px-2 py-1.5 font-semibold text-gray-700 dark:text-gray-200">{row.groupB}</td>
                                    <td className="px-2 py-1.5 text-right font-mono">{row.nB}</td>
                                    <td className="px-2 py-1.5 text-right font-mono">{row.medianIqrB}</td>
                                    <td className="px-2 py-1.5 text-right font-mono">{row.medianDelta}</td>
                                    <td className="px-2 py-1.5 text-right font-mono">{row.stat}</td>
                                    <td className="px-2 py-1.5 text-right font-mono">{row.pAdj}</td>
                                    <td className="px-2 py-1.5 text-right font-mono font-bold">{row.sig}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="mt-2 text-[10px] text-gray-500 dark:text-gray-400">
                    Significance scale: *** (p &lt; 0.001), ** (p &lt; 0.01), * (p &lt; 0.05), ns (p &gt;= 0.05).
                </div>
                <div className="mt-3 text-[11px] text-gray-500 dark:text-gray-400">
                    Only statistically significant pairwise comparisons are shown. All pairwise tests were performed; full results are available in supplementary tables/exports.
                </div>
            </Card>
        );
    };
    const formatSignificanceCell = (row, value, column) => {
        const col = String(column || '').trim().toLowerCase();
        if (!['is_significant', 'significant'].includes(col)) return value;
        const stars = getSignificanceStars(row);
        const text = value == null ? '' : String(value);
        const normalized = text.trim().toLowerCase();
        const isSig = row?.is_significant === true
            || row?.significant === true
            || String(row?.significant || '').trim().toLowerCase() === 'yes'
            || ['true', 'yes', 'significant'].includes(normalized);
        if (!isSig) return 'ns';
        return stars || '*';
    };
    const formatRValueText = (v) => {
        if (v == null) return 'N/A';
        if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
        if (typeof v === 'number') return Number.isInteger(v) ? String(v) : fmt(v, 4);
        return String(v);
    };
    const summarizeNestedValue = (v) => {
        if (Array.isArray(v)) return `Array(${v.length})`;
        if (v && typeof v === 'object') return `Object(${Object.keys(v).length})`;
        return formatRValueText(v);
    };
    const renderROutputNode = (node, nodeKey = 'root', depth = 0) => {
        if (Array.isArray(node)) {
            if (node.length === 0) {
                return <div className="text-xs text-slate-500 dark:text-slate-400">No values</div>;
            }

            const allPrimitive = node.every((item) => isRPrimitive(item));
            if (allPrimitive) {
                return (
                    <div className="flex flex-wrap gap-2">
                        {node.map((item, idx) => (
                            <span
                                key={`${nodeKey}_p_${idx}`}
                                className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-200"
                            >
                                {formatRValueText(item)}
                            </span>
                        ))}
                    </div>
                );
            }

            const allObjects = node.every((item) => item && typeof item === 'object' && !Array.isArray(item));
            if (allObjects && depth <= 1) {
                const columns = Array.from(new Set(node.flatMap((row) => Object.keys(row || {}))));
                const shownColumns = columns.slice(0, 12);
                return (
                    <div className="space-y-2">
                        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                            <table className="min-w-full text-xs text-left">
                                <thead className="bg-slate-100 dark:bg-slate-800 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-300">
                                    <tr>
                                        {shownColumns.map((col) => (
                                            <th key={`${nodeKey}_h_${col}`} className="px-3 py-2 font-black">{formatRKey(col)}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                    {node.map((row, rowIdx) => (
                                        <tr key={`${nodeKey}_r_${rowIdx}`} className="bg-white dark:bg-black/20">
                                            {shownColumns.map((col) => (
                                                <td key={`${nodeKey}_c_${rowIdx}_${col}`} className="px-3 py-2 font-mono text-[11px] text-slate-700 dark:text-slate-200">
                                                    {isRPrimitive(row?.[col]) ? formatRValueText(row?.[col]) : summarizeNestedValue(row?.[col])}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {columns.length > shownColumns.length && (
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                Showing first {shownColumns.length} columns of {columns.length}.
                            </div>
                        )}
                    </div>
                );
            }

            return (
                <div className="space-y-2">
                    {node.map((item, idx) => (
                        <details key={`${nodeKey}_d_${idx}`} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-black/20 p-2">
                            <summary className="cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-200">
                                Item {idx + 1}
                            </summary>
                            <div className="mt-2">{renderROutputNode(item, `${nodeKey}_${idx}`, depth + 1)}</div>
                        </details>
                    ))}
                </div>
            );
        }

        if (node && typeof node === 'object') {
            const entries = Object.entries(node);
            if (entries.length === 0) {
                return <div className="text-xs text-slate-500 dark:text-slate-400">No fields</div>;
            }
            return (
                <div className="grid grid-cols-1 gap-2">
                    {entries.map(([key, value]) => (
                        <div key={`${nodeKey}_${key}`} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-black/20 p-3">
                            <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">{formatRKey(key)}</div>
                            {isRPrimitive(value) ? (
                                <div className="mt-1 text-xs font-mono text-slate-700 dark:text-slate-200 break-all">
                                    {formatRValueText(value)}
                                </div>
                            ) : (
                                <div className="mt-2">{renderROutputNode(value, `${nodeKey}_${key}`, depth + 1)}</div>
                            )}
                        </div>
                    ))}
                </div>
            );
        }

        return (
            <div className="text-xs font-mono text-slate-700 dark:text-slate-200 break-all">
                {formatRValueText(node)}
            </div>
        );
    };
    const modelSummaryReport = (() => {
        if (!sanitizedROutput) return null;
        const src = sanitizedROutput;
        const rawSrc = (result && typeof result === 'object') ? result : src;
        const reportTitleValue = reportTitle.trim();
        const reportAuthorValue = reportAuthor.trim();
        const reportEndNoteValue = richTextHtmlToPlainText(reportEndNote);
        const looksLikeBase64Payload = (payload) => {
            const text = typeof payload === 'string' ? payload.replace(/\s+/g, '') : '';
            if (!text || text.length < 80) return false;
            return /^[A-Za-z0-9+/=]+$/.test(text);
        };
        const toSafeImageDataUrl = (imageValue) => {
            const text = typeof imageValue === 'string' ? imageValue.trim() : '';
            if (!text) return '';
            if (text.startsWith('data:image')) {
                const commaIndex = text.indexOf(',');
                if (commaIndex === -1) return '';
                const payload = text.slice(commaIndex + 1);
                return looksLikeBase64Payload(payload) ? text : '';
            }
            if (!looksLikeBase64Payload(text)) return '';
            return `data:image/png;base64,${text}`;
        };
        const isSanitizedBinaryPlaceholder = (value) => (
            typeof value === 'string' && value.startsWith('[binary/base64 omitted')
        );
        const pickImageSource = (...candidates) => {
            for (const candidate of candidates) {
                if (typeof candidate !== 'string') continue;
                const text = candidate.trim();
                if (!text || isSanitizedBinaryPlaceholder(text)) continue;
                return text;
            }
            return '';
        };
        const mainPlotImage = toSafeImageDataUrl(
            pickImageSource(rawSrc?.image, rawSrc?.biplot_image, src?.image, src?.biplot_image)
        );
        const pickPlotImage = (key) => toSafeImageDataUrl(
            pickImageSource(rawSrc?.[key], src?.[key])
        );
        const residualQqPlotImage = toSafeImageDataUrl(
            pickImageSource(rawSrc?.residual_qq_plot_image, src?.residual_qq_plot_image)
        );
        const sphericityPlotImage = toSafeImageDataUrl(
            pickImageSource(rawSrc?.sphericity_plot_image, src?.sphericity_plot_image)
        );
        const meanCiPlotImage = pickPlotImage('mean_ci_plot_image');
        const anovaPlotImage = pickPlotImage('anova_plot_image');
        const anovaResidualPlotImage = pickPlotImage('anova_residual_plot_image');
        const ttestMeanCiPlotImage = pickPlotImage('ttest_mean_ci_plot_image');
        const regressionScatterPlotImage = pickPlotImage('regression_scatter_plot_image');
        const regressionPublicationPlotImage = pickPlotImage('regression_publication_plot_image');
        const rmSpaghettiCiPlotImage = pickPlotImage('rm_spaghetti_ci_plot_image');
        const friedmanSpaghettiIqrPlotImage = pickPlotImage('friedman_spaghetti_iqr_plot_image');
        const mannWhitneyBoxplotImage = pickPlotImage('mann_whitney_boxplot_image');
        const interactionPlotImageRaw = pickPlotImage('interaction_plot_image');
        const pearsonHeatmapImage = pickPlotImage('heatmap_image');
        const spearmanHeatmapImage = pickPlotImage('spearman_heatmap_image');
        const pearsonLinearityImage = pickPlotImage('linearity_plot_image');
        const spearmanLinearityImage = pickPlotImage('spearman_linearity_plot_image');
        const screePlotImage = pickPlotImage('scree_plot_image');
        const elbowPlotImage = pickPlotImage('elbow_plot_image');
        const silhouetteTrendPlotImage = pickPlotImage('silhouette_trend_plot_image');
        const silhouettePlotImage = pickPlotImage('silhouette_plot_image');
        const mcaDendrogramImage = pickPlotImage('mca_dendrogram_image');
        const primaryPlotTitle = src.tukey
            ? 'Tukey HSD Visualization'
            : src.games_howell
                ? 'Games-Howell Visualization'
                : src.dunn
                    ? "Dunn's Visualization"
                    : src.interaction_plot_generated
                        ? 'Interaction Plot'
                        : (src.exploratory_chart ? 'Exploratory Chart' : 'Primary Analysis Plot');
        const generatedPlots = (() => {
            const candidates = [
                { title: primaryPlotTitle, imageData: mainPlotImage, caption: 'Main analysis plot returned by R.' },
                { title: 'Mean ± 95% CI Plot', imageData: meanCiPlotImage, caption: 'Group mean with 95% confidence intervals.' },
                { title: 'ANOVA Test Plot', imageData: anovaPlotImage, caption: 'One-way ANOVA plot.' },
                { title: 'Residuals vs Fitted', imageData: anovaResidualPlotImage, caption: 'ANOVA residual diagnostics.' },
                { title: 'Residual Q-Q Plot', imageData: residualQqPlotImage, caption: 'Residual normality diagnostic plot.' },
                { title: 'T-Test Mean ± 95% CI Plot', imageData: ttestMeanCiPlotImage, caption: 'Two-group mean comparison with confidence intervals.' },
                { title: 'Simple Linear Regression Scatterplot', imageData: regressionScatterPlotImage, caption: 'Observed values with fitted OLS line and confidence band.' },
                { title: `${regressionDisplayLabel} Coefficient Plot`, imageData: regressionPublicationPlotImage, caption: 'Publication-style coefficient plot with 95% confidence intervals.' },
                { title: 'RM ANOVA Spaghetti + Mean ± 95% CI', imageData: rmSpaghettiCiPlotImage, caption: 'Repeated-measures individual trajectories with mean and CI.' },
                { title: 'Friedman Spaghetti + Median ± IQR', imageData: friedmanSpaghettiIqrPlotImage, caption: 'Repeated-measures trajectories with median and IQR.' },
                { title: 'Mann-Whitney Boxplot + Raw Points', imageData: mannWhitneyBoxplotImage, caption: 'Two-group non-parametric visualization.' },
                { title: 'Interaction Plot', imageData: interactionPlotImageRaw, caption: 'Factorial interaction plot.' },
                { title: 'Sphericity Plot', imageData: sphericityPlotImage, caption: 'Mauchly/correction summary plot.' },
                { title: 'Pearson Heatmap', imageData: pearsonHeatmapImage, caption: 'Pearson correlation heatmap.' },
                { title: 'Spearman Heatmap', imageData: spearmanHeatmapImage, caption: 'Spearman correlation heatmap.' },
                { title: 'Pearson Linearity Check', imageData: pearsonLinearityImage, caption: 'Pearson scatter matrix.' },
                { title: 'Spearman Linearity Check', imageData: spearmanLinearityImage, caption: 'Spearman scatter matrix.' },
                { title: 'Scree Plot', imageData: screePlotImage, caption: 'Scree plot.' },
                { title: 'Elbow Plot', imageData: elbowPlotImage, caption: 'Elbow optimization plot.' },
                { title: 'Silhouette Trend Plot', imageData: silhouetteTrendPlotImage, caption: 'Silhouette optimization trend.' },
                { title: 'Silhouette Plot', imageData: silhouettePlotImage, caption: 'Cluster silhouette plot.' },
                { title: 'MCA Hierarchical Dendrogram', imageData: mcaDendrogramImage, caption: 'Hierarchical dendrogram derived from MCA coordinates.' }
            ];
            const seen = new Set();
            const out = [];
            candidates.forEach((candidate) => {
                const imageData = toSafeImageDataUrl(candidate?.imageData);
                if (!imageData || seen.has(imageData)) return;
                seen.add(imageData);
                const key = buildPlotEditorKey(candidate?.title, out.length);
                out.push({
                    key,
                    baseTitle: candidate.title,
                    imageData,
                    baseCaption: candidate.caption
                });
            });
            return out.map((plot) => {
                const metadata = plotMetadataByKey?.[plot.key] || {};
                const titleInput = typeof metadata.title === 'string' ? metadata.title : '';
                const xLabelInput = typeof metadata.xLabel === 'string' ? metadata.xLabel : '';
                const yLabelInput = typeof metadata.yLabel === 'string' ? metadata.yLabel : '';
                const infoInput = typeof metadata.info === 'string' ? metadata.info : '';
                const title = titleInput.trim() || plot.baseTitle;
                const xLabel = xLabelInput.trim();
                const yLabel = yLabelInput.trim();
                const info = infoInput.trim();
                const captionParts = [];
                if (String(plot.baseCaption || '').trim()) captionParts.push(String(plot.baseCaption).trim());
                if (xLabel) captionParts.push(`X-axis: ${xLabel}`);
                if (yLabel) captionParts.push(`Y-axis: ${yLabel}`);
                if (info) captionParts.push(`Info: ${info}`);
                return {
                    ...plot,
                    title,
                    xLabel,
                    yLabel,
                    info,
                    caption: captionParts.join(' ')
                };
            });
        })();
        const parseShapiroN = (stats) => {
            if (Number.isFinite(Number(stats?.n))) return Number(stats.n);
            if (Number.isFinite(Number(stats?.sample_size))) return Number(stats.sample_size);
            if (Number.isFinite(Number(stats?.count))) return Number(stats.count);
            const msg = String(stats?.message || '');
            const match = msg.match(/\bn\s*=\s*(\d+)/i);
            return match ? Number(match[1]) : 'N/A';
        };
        const toFiniteNumber = (value) => {
            const numericValue = Number(value);
            return Number.isFinite(numericValue) ? numericValue : null;
        };
        const appendSummaryRow = (rows, label, value) => {
            const text = formatCompactValue(value);
            if (text === 'N/A') return;
            rows.push([label, text]);
        };
        const buildObjectTable = (title, rawRows, preferredColumns = [], maxRows = 8, excludedColumns = []) => {
            const safeRows = Array.isArray(rawRows)
                ? rawRows.filter((row) => row && typeof row === 'object' && !Array.isArray(row))
                : [];
            if (safeRows.length === 0) return null;

            const columns = [];
            preferredColumns.forEach((column) => {
                if (safeRows.some((row) => Object.prototype.hasOwnProperty.call(row, column)) && !columns.includes(column)) {
                    columns.push(column);
                }
            });
            safeRows.forEach((row) => {
                Object.keys(row).forEach((column) => {
                    if (excludedColumns.includes(column) || columns.includes(column)) return;
                    columns.push(column);
                });
            });

            const selectedColumns = columns.slice(0, 5);
            if (selectedColumns.length === 0) return null;

            return {
                title,
                headers: selectedColumns.map((column) => formatCompactHeader(column)),
                rows: safeRows.slice(0, maxRows).map((row) => (
                    selectedColumns.map((column) => formatCompactValue(row?.[column]))
                )),
                note: safeRows.length > maxRows
                    ? `Showing first ${maxRows} rows of ${safeRows.length}.`
                    : ''
            };
        };
        const buildClusterSizeTable = (title, rawClusterSizes) => {
            if (!rawClusterSizes) return null;
            const clusterRows = [];
            if (Array.isArray(rawClusterSizes)) {
                rawClusterSizes.forEach((size, idx) => {
                    clusterRows.push({
                        Cluster: idx + 1,
                        Size: size
                    });
                });
            } else if (typeof rawClusterSizes === 'object') {
                Object.entries(rawClusterSizes).forEach(([clusterName, size]) => {
                    clusterRows.push({
                        Cluster: clusterName,
                        Size: size
                    });
                });
            }
            return buildObjectTable(title, clusterRows, ['Cluster', 'Size'], 12);
        };
        const isMultivariateMode = typeof src.mode === 'string' && src.mode.startsWith('multivariate');
        const multivariateSummary = isMultivariateMode
            ? (() => {
                const modeKey = String(src.mode || '').trim();
                const modeLabel = multivariateModeLabelMap[modeKey] || 'Multivariate Analysis';
                const goal = multivariateGoalMap[modeKey] || 'Explore the multivariate structure of the selected variables.';
                const summaryRows = [];
                const tables = [];
                const firstEigen = Array.isArray(src.eigenvalues) && src.eigenvalues.length > 0 ? src.eigenvalues[0] : null;
                const secondEigen = Array.isArray(src.eigenvalues) && src.eigenvalues.length > 1 ? src.eigenvalues[1] : null;
                const autoClusterActive = Boolean(src.auto_cluster_before_pca || src.auto_cluster_before_pca_biplot);
                const noteList = [];

                appendSummaryRow(summaryRows, 'Technique', modeLabel);
                appendSummaryRow(summaryRows, 'Goal', goal);

                if (modeKey === 'multivariate_pca' || modeKey === 'multivariate_pca_biplot') {
                    appendSummaryRow(summaryRows, 'Grouping variable', src.grouping_variable || (autoClusterActive ? 'Auto clusters' : 'None'));
                    appendSummaryRow(summaryRows, 'PC1 variance', firstEigen?.Variance_Percent != null ? `${fmt(firstEigen.Variance_Percent, 2)}%` : null);
                    appendSummaryRow(summaryRows, 'PC2 variance', secondEigen?.Variance_Percent != null ? `${fmt(secondEigen.Variance_Percent, 2)}%` : null);
                    appendSummaryRow(summaryRows, 'PC1 + PC2 cumulative', secondEigen?.Cumulative_Percent != null ? `${fmt(secondEigen.Cumulative_Percent, 2)}%` : null);
                    if (autoClusterActive) {
                        appendSummaryRow(summaryRows, 'Auto-cluster method', src.auto_cluster_optimization_method || src.auto_cluster_method);
                        appendSummaryRow(summaryRows, 'Auto-cluster K', src.auto_cluster_k);
                        appendSummaryRow(summaryRows, 'Elbow K', src.auto_cluster_elbow_k);
                        appendSummaryRow(summaryRows, 'Silhouette K', src.auto_cluster_silhouette_k);
                        appendSummaryRow(summaryRows, 'Auto-cluster silhouette', toFiniteNumber(src.auto_cluster_avg_silhouette) != null ? fmt(src.auto_cluster_avg_silhouette, 4) : null);
                        if (src.auto_cluster_warning) noteList.push(String(src.auto_cluster_warning));
                    }
                    tables.push(buildObjectTable('Eigenvalues & Variance', src.eigenvalues, ['PC', 'Eigenvalue', 'Variance_Percent', 'Cumulative_Percent'], 8));
                    tables.push(buildObjectTable('Variable Loadings', src.loadings, ['Variable', 'PC1', 'PC2'], 10));
                    tables.push(buildClusterSizeTable('Auto-Cluster Sizes', src.auto_cluster_sizes));
                } else if (modeKey === 'multivariate_ca') {
                    appendSummaryRow(summaryRows, 'Row variable', src.ca_summary?.row_variable);
                    appendSummaryRow(summaryRows, 'Column variable', src.ca_summary?.column_variable);
                    appendSummaryRow(summaryRows, 'Table size', src.ca_summary ? `${formatCompactValue(src.ca_summary.row_levels)} x ${formatCompactValue(src.ca_summary.col_levels)}` : null);
                    appendSummaryRow(summaryRows, 'Rows used', src.ca_summary?.total_n);
                    appendSummaryRow(summaryRows, 'Retained dimensions', src.ca_summary?.retained_dimensions);
                    appendSummaryRow(summaryRows, 'Chi-square p-value', src.ca_chi_square?.formatted_p || src.ca_chi_square?.p_value);
                    appendSummaryRow(summaryRows, "Cramer's V", src.ca_chi_square?.cramers_v);
                    if (src.ca_chi_square?.error) noteList.push(String(src.ca_chi_square.error));
                    tables.push(buildObjectTable('Eigenvalues & Inertia', src.eigenvalues, ['Dimension', 'Eigenvalue', 'Variance_Percent', 'Cumulative_Percent'], 8));
                    tables.push(buildObjectTable('Row Coordinates', src.ca_row_coordinates, ['Level', 'Dim1', 'Dim2'], 6));
                    tables.push(buildObjectTable('Column Coordinates', src.ca_col_coordinates, ['Level', 'Dim1', 'Dim2'], 6));
                } else if (modeKey === 'multivariate_mca') {
                    appendSummaryRow(summaryRows, 'Variables', Array.isArray(src.mca_summary?.variables) ? src.mca_summary.variables.join(', ') : null);
                    appendSummaryRow(summaryRows, 'Rows used', src.mca_summary?.total_n);
                    appendSummaryRow(summaryRows, 'Modalities', src.mca_summary?.total_modalities);
                    appendSummaryRow(summaryRows, 'Grouping source', src.mca_grouping_source);
                    appendSummaryRow(summaryRows, 'Final cluster count', src.mca_auto_cluster_k);
                    appendSummaryRow(summaryRows, 'Average silhouette', toFiniteNumber(src.mca_auto_cluster_avg_silhouette) != null ? fmt(src.mca_auto_cluster_avg_silhouette, 4) : null);
                    if (Array.isArray(src.mca_notes)) noteList.push(...src.mca_notes.slice(0, 2).map((note) => String(note)));
                    if (src.mca_note) noteList.push(String(src.mca_note));
                    tables.push(buildObjectTable('Eigenvalues & Inertia', src.eigenvalues, ['Dimension', 'Eigenvalue', 'Variance_Percent', 'Cumulative_Percent'], 8));
                    tables.push(buildObjectTable('Category Coordinates', src.mca_category_coordinates, ['Category', 'Variable', 'Level', 'Dim1', 'Dim2'], 6));
                    tables.push(buildClusterSizeTable('MCA Auto-Cluster Sizes', src.mca_auto_cluster_sizes));
                } else if (modeKey === 'multivariate_coinertia') {
                    appendSummaryRow(summaryRows, 'Block X', Array.isArray(src.coinertia_summary?.x_variables) ? src.coinertia_summary.x_variables.join(', ') : null);
                    appendSummaryRow(summaryRows, 'Block Y', Array.isArray(src.coinertia_summary?.y_variables) ? src.coinertia_summary.y_variables.join(', ') : null);
                    appendSummaryRow(summaryRows, 'Rows used', src.coinertia_summary?.total_n);
                    appendSummaryRow(summaryRows, 'Retained axes', src.coinertia_summary?.retained_dimensions);
                    appendSummaryRow(summaryRows, 'Total shared covariance', src.coinertia_total_covariance);
                    if (Array.isArray(src.coinertia_notes)) noteList.push(...src.coinertia_notes.slice(0, 2).map((note) => String(note)));
                    if (src.coinertia_note) noteList.push(String(src.coinertia_note));
                    tables.push(buildObjectTable('Eigenvalues & Shared Structure', src.eigenvalues, ['Dimension', 'Eigenvalue', 'Variance_Percent', 'Cumulative_Percent'], 8));
                    tables.push(buildObjectTable('Co-Inertia Loadings', src.loadings, ['Variable', 'Dim1', 'Dim2'], 10));
                } else if (modeKey === 'multivariate_bca') {
                    appendSummaryRow(summaryRows, 'Grouping variable', src.grouping_variable);
                    appendSummaryRow(summaryRows, 'Between-class inertia ratio', src.between_inertia_ratio);
                    appendSummaryRow(summaryRows, 'Retained axes', Array.isArray(src.eigenvalues) ? src.eigenvalues.length : null);
                    tables.push(buildObjectTable('Eigenvalues & Inertia', src.eigenvalues, ['Dimension', 'Eigenvalue', 'Variance_Percent', 'Cumulative_Percent'], 8));
                    tables.push(buildObjectTable(
                        'Group Summary',
                        toArray(src.bca_group_summary).map((row) => ({
                            ...row,
                            Proportion: toFiniteNumber(row?.Proportion) != null
                                ? `${(Number(row.Proportion) * 100).toFixed(1)}%`
                                : row?.Proportion
                        })),
                        ['Group', 'N', 'Proportion'],
                        12
                    ));
                } else if (modeKey === 'multivariate_kmeans' || modeKey === 'multivariate_clustering') {
                    appendSummaryRow(summaryRows, 'Final K', src.k || src.optimal_k);
                    appendSummaryRow(summaryRows, 'K optimization method', src.cluster_optimization_method);
                    appendSummaryRow(summaryRows, 'Elbow K', src.elbow_k);
                    appendSummaryRow(summaryRows, 'Silhouette K', src.silhouette_k ?? src.optimal_k);
                    appendSummaryRow(summaryRows, 'Decision method', src.k_decision_method);
                    appendSummaryRow(summaryRows, 'Average silhouette', toFiniteNumber(src.avg_silhouette_width) != null ? fmt(src.avg_silhouette_width, 4) : null);
                    appendSummaryRow(summaryRows, 'Total within SS', src.tot_withinss);
                    appendSummaryRow(summaryRows, 'Between SS', src.betweenss);
                    if (src.elbow_plot_error) noteList.push(String(src.elbow_plot_error));
                    if (src.silhouette_trend_plot_error) noteList.push(String(src.silhouette_trend_plot_error));
                    if (src.silhouette_error) noteList.push(String(src.silhouette_error));
                    tables.push(buildObjectTable(
                        'Cluster Optimization',
                        Array.isArray(src.optimization_data?.k_values)
                            ? src.optimization_data.k_values.map((kValue, idx) => ({
                                K: kValue,
                                Total_WSS: src.optimization_data?.wss?.[idx],
                                Avg_Silhouette: kValue > 1 ? src.optimization_data?.silhouette?.[idx] : null
                            }))
                            : [],
                        ['K', 'Total_WSS', 'Avg_Silhouette'],
                        12
                    ));
                    tables.push(buildClusterSizeTable('Cluster Sizes', src.cluster_sizes));
                    tables.push(buildObjectTable(
                        'Cluster Centers',
                        toArray(src.cluster_centers || src.centers).map((row, idx) => ({
                            Cluster: idx + 1,
                            Size: Array.isArray(src.cluster_sizes) ? src.cluster_sizes[idx] : (src.cluster_sizes?.[idx + 1] ?? src.cluster_sizes?.[String(idx + 1)] ?? ''),
                            ...row
                        })),
                        ['Cluster', 'Size'],
                        6
                    ));
                } else if (modeKey === 'multivariate_hclust') {
                    appendSummaryRow(summaryRows, 'Linkage method', src.method || 'Complete');
                    appendSummaryRow(summaryRows, 'Distance metric', src.distance || 'Euclidean');
                    appendSummaryRow(summaryRows, 'Feature scaling', src.hclust_scale || 'Robust median/MAD');
                    appendSummaryRow(summaryRows, 'Visual scale', src.hclust_visual_scale);
                    if (Array.isArray(src.hclust_encoded_categorical_predictors) && src.hclust_encoded_categorical_predictors.length > 0) {
                        appendSummaryRow(summaryRows, 'Encoded categorical', src.hclust_encoded_categorical_predictors.join(', '));
                    }
                    if (Array.isArray(src.hclust_added_features) && src.hclust_added_features.length > 0) {
                        appendSummaryRow(summaryRows, 'Derived bio features', src.hclust_added_features.join(', '));
                    }
                    if (Array.isArray(src.hclust_dropped_predictors) && src.hclust_dropped_predictors.length > 0) {
                        appendSummaryRow(summaryRows, 'Dropped predictors', src.hclust_dropped_predictors.join(', '));
                    }
                    const biologicalNotes = Array.isArray(src.biological_process_notes)
                        ? src.biological_process_notes
                        : (src.biological_process_notes ? [String(src.biological_process_notes)] : []);
                    if (biologicalNotes.length > 0) {
                        noteList.push(...biologicalNotes.slice(0, 2).map((note) => String(note)));
                    }
                    appendSummaryRow(summaryRows, 'Interpretation', 'Inspect the dendrogram to choose a cut level and derive cluster membership.');
                }

                const cleanedTables = tables.filter(Boolean);
                const derivedMessage = noteList.find((note) => note && note.trim())
                    || goal;
                const interpretation = (() => {
                    if (modeKey === 'multivariate_pca' || modeKey === 'multivariate_pca_biplot') {
                        const cumulative = secondEigen?.Cumulative_Percent;
                        if (toFiniteNumber(cumulative) != null) {
                            return `The first two axes summarize ${fmt(cumulative, 2)}% of total variance.`;
                        }
                    }
                    if (modeKey === 'multivariate_kmeans' || modeKey === 'multivariate_clustering') {
                        const finalK = src.k || src.optimal_k;
                        const silhouette = toFiniteNumber(src.avg_silhouette_width);
                        if (finalK != null) {
                            return silhouette != null
                                ? `The selected partition uses k = ${finalK} with average silhouette ${fmt(silhouette, 4)}.`
                                : `The selected partition uses k = ${finalK}.`;
                        }
                    }
                    if (modeKey === 'multivariate_ca' && src.ca_summary) {
                        return `${src.ca_summary.row_variable || 'Row levels'} and ${src.ca_summary.column_variable || 'column levels'} are projected onto shared CA dimensions.`;
                    }
                    if (modeKey === 'multivariate_bca' && toFiniteNumber(src.between_inertia_ratio) != null) {
                        return `Between-class structure accounts for ${fmt(Number(src.between_inertia_ratio) * 100, 2)}% of total inertia.`;
                    }
                    return goal;
                })();

                return {
                    modeKey,
                    modeLabel,
                    goal,
                    summaryRows,
                    tables: cleanedTables,
                    message: derivedMessage,
                    interpretation,
                    groupCount: (() => {
                        if (src.auto_cluster_sizes && typeof src.auto_cluster_sizes === 'object') return Object.keys(src.auto_cluster_sizes).length;
                        if (Array.isArray(src.cluster_sizes)) return src.cluster_sizes.length;
                        if (src.cluster_sizes && typeof src.cluster_sizes === 'object') return Object.keys(src.cluster_sizes).length;
                        if (src.mca_auto_cluster_sizes && typeof src.mca_auto_cluster_sizes === 'object') return Object.keys(src.mca_auto_cluster_sizes).length;
                        if (Array.isArray(src.bca_group_summary)) return src.bca_group_summary.length;
                        return null;
                    })()
                };
            })()
            : null;
        const nGroupsNum = Number(src.n_groups);
        const isFactorial = Boolean(src.is_factorial || src.main_effect_A || src.main_effect_B || src.interaction);
        const isSrh = src.test_type === 'scheirer_ray_hare' || src.srh;
        const isTwoGroups = Number.isFinite(nGroupsNum) && nGroupsNum === 2 && !isFactorial;
        const shapiroRowsAll = src.shapiro && typeof src.shapiro === 'object'
            ? Object.entries(src.shapiro).map(([group, stats]) => ({
                group,
                n: parseShapiroN(stats),
                p: stats?.formatted_p || fmtP(stats?.p_value),
                normal: stats?.is_normal === true ? 'Yes' : stats?.is_normal === false ? 'No' : 'N/A'
            }))
            : [];
        const shapiroRows = shapiroRowsAll;
        const shapiroHiddenCount = 0;
        const bartlettRowsAll = src.bartlett
            ? (() => {
                const pText = src.bartlett.formatted_p || fmtP(src.bartlett.p_value);
                const homogeneous = src.bartlett.is_homogeneous === true
                    ? 'Yes'
                    : src.bartlett.is_homogeneous === false
                        ? 'No'
                        : 'N/A';
                const baseGroups = shapiroRowsAll.length > 0
                    ? shapiroRowsAll.map((row) => ({ group: row.group, n: row.n }))
                    : [{ group: 'Detected groups', n: 'N/A' }];
                return baseGroups.map((row, idx) => ({
                    _id: `bartlett_${idx}_${row.group}`,
                    group: row.group,
                    n: row.n,
                    statistic: fmt(src.bartlett.statistic, 4),
                    p: pText,
                    homogeneous
                }));
            })()
            : [];
        const bartlettRows = bartlettRowsAll;
        const bartlettHiddenCount = 0;
        const leveneRowsAll = src.levene
            ? (() => {
                const pText = src.levene.formatted_p || fmtP(src.levene.p_value);
                const homogeneous = src.levene.is_homogeneous === true
                    ? 'Yes'
                    : src.levene.is_homogeneous === false
                        ? 'No'
                        : 'N/A';
                const baseGroups = shapiroRowsAll.length > 0
                    ? shapiroRowsAll.map((row) => ({ group: row.group, n: row.n }))
                    : [{ group: 'Detected groups', n: 'N/A' }];
                return baseGroups.map((row, idx) => ({
                    _id: `levene_${idx}_${row.group}`,
                    group: row.group,
                    n: row.n,
                    statistic: fmt(src.levene.statistic, 4),
                    p: pText,
                    homogeneous
                }));
            })()
            : [];
        const leveneRows = leveneRowsAll;
        const leveneHiddenCount = 0;
        const prefersGamesHowell = Boolean(src.anova?.test_type === 'welch' || src.anova_robust || src.robust_method);
        const posthocCandidates = [
            { key: 'rm_anova_posthoc', label: 'Pairwise Paired t-test (Bonferroni)' },
            ...(prefersGamesHowell
                ? [{ key: 'games_howell', label: 'Games-Howell' }, { key: 'tukey', label: 'Tukey HSD' }]
                : [{ key: 'tukey', label: 'Tukey HSD' }, { key: 'games_howell', label: 'Games-Howell' }]),
            { key: 'friedman_posthoc', label: 'Nemenyi Test' },
            { key: 'dunn', label: "Dunn's Test" },
            { key: 'posthoc', label: 'Post-hoc' }
        ];
        const posthocSource = posthocCandidates.find((c) => {
            const v = src[c.key];
            if (Array.isArray(v)) return v.length > 0;
            return v && typeof v === 'object' && Object.keys(v).length > 0;
        });
        const posthocValue = posthocSource ? src[posthocSource.key] : null;
        const toRawRText = (value) => {
            if (value == null) return 'NA';
            if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
            if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NA';
            if (typeof value === 'string') return value;
            try {
                return JSON.stringify(value);
            } catch (err) {
                return String(value);
            }
        };
        const toRawFieldRows = (obj) => {
            if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return [];
            return Object.entries(obj).map(([key, value]) => ({
                key,
                value: toRawRText(value)
            }));
        };
        const posthocIsNamedList = !Array.isArray(posthocValue) && !!posthocValue && typeof posthocValue === 'object';
        const posthocRowsPrepared = Array.isArray(posthocValue)
            ? posthocValue.map((item, idx) => ({ rowName: String(idx + 1), row: item }))
            : (posthocIsNamedList
                ? Object.entries(posthocValue).map(([rowName, item]) => ({ rowName, row: item }))
                : []);
        const posthocNormalizedRows = posthocRowsPrepared.map(({ rowName, row }) => {
            if (row && typeof row === 'object' && !Array.isArray(row)) {
                return { rowName, row };
            }
            return { rowName, row: { value: row } };
        });
        const posthocComparisons = posthocNormalizedRows.length;
        const posthocSignificant = posthocNormalizedRows.filter(({ row }) => row?.is_significant === true).length;
        const tukeyPairwiseRows = posthocSource?.key === 'tukey'
            ? posthocNormalizedRows.map(({ rowName, row }, idx) => {
                const comparison = String(row?.comparison || rowName || `Comparison ${idx + 1}`).trim();
                const diffRaw = Number(row?.diff ?? row?.mean_diff);
                const lwr = Number(row?.lwr);
                const upr = Number(row?.upr);
                const pAdjRaw = row?.formatted_p ?? row?.p_adj ?? row?.p_value ?? row?.p;
                const ciPm = (() => {
                    if (typeof row?.ci_pm === 'string' && row.ci_pm.trim()) return row.ci_pm.trim();
                    if (!Number.isFinite(lwr) || !Number.isFinite(upr)) return 'N/A';
                    const center = Number.isFinite(diffRaw) ? diffRaw : ((lwr + upr) / 2);
                    const halfWidth = (upr - lwr) / 2;
                    return `${center.toFixed(4)} ± ${halfWidth.toFixed(4)}`;
                })();
                return {
                    _id: `tukey_report_${idx}`,
                    comparison,
                    meanDiff: Number.isFinite(diffRaw) ? diffRaw.toFixed(4) : 'N/A',
                    ciPm,
                    pAdj: typeof pAdjRaw === 'string'
                        ? pAdjRaw
                        : (Number.isFinite(Number(pAdjRaw)) ? Number(pAdjRaw).toFixed(4) : 'N/A'),
                    result: resolveSignificanceStars(pAdjRaw, row?.is_significant === true),
                    isSignificant: row?.is_significant === true
                };
            })
            : [];
        const posthocDisplayTitle = tukeyPairwiseRows.length > 0
            ? 'TUKEY HSD POST-HOC TEST'
            : 'Post-hoc Results';
        const posthocRawColumns = (() => {
            const columns = [];
            if (posthocIsNamedList) columns.push('list_key');
            posthocNormalizedRows.forEach(({ row }) => {
                Object.keys(row || {}).forEach((key) => {
                    if (!columns.includes(key)) columns.push(key);
                });
            });
            if (columns.length === 0) columns.push('value');
            if (posthocSource?.key === 'dunn' && columns.includes('z_value') && columns.includes('statistic')) {
                return columns.filter((column) => column !== 'statistic');
            }
            return columns;
        })();
        const posthocRawRowsAll = posthocNormalizedRows.map(({ rowName, row }, idx) => {
            const out = { _id: `${idx}_${rowName}` };
            posthocRawColumns.forEach((column) => {
                if (column === 'list_key') {
                    out[column] = rowName;
                    return;
                }
                if (row && Object.prototype.hasOwnProperty.call(row, column)) {
                    out[column] = toRawRText(row[column]);
                } else {
                    out[column] = 'NA';
                }
            });
            return out;
        });
        const posthocRawRows = posthocRawRowsAll;
        const posthocRawHiddenCount = 0;
        const shapiroRawRowsAll = src.shapiro && typeof src.shapiro === 'object'
            ? Object.entries(src.shapiro).map(([group, stats], idx) => ({
                _id: `shapiro_${idx}_${group}`,
                group,
                raw_output: toRawRText(stats)
            }))
            : [];
        const shapiroRawRows = shapiroRawRowsAll;
        const shapiroRawHiddenCount = 0;
        const bartlettRawRows = toRawFieldRows(isTwoGroups ? src.levene : src.bartlett);
        const tTestRawRows = toRawFieldRows(src.ttest);
        const posthocMethod = posthocSource?.key === 'rm_anova_posthoc'
            ? 'Pairwise paired t-test with Bonferroni correction'
            : posthocSource?.key === 'friedman_posthoc'
                ? 'Nemenyi test'
                : posthocSource?.key === 'games_howell'
                    ? (src.anova?.test_type === 'welch' ? 'Games-Howell (Welch ANOVA)' : 'Games-Howell')
                    : (posthocSource ? posthocSource.label : 'None');
        const posthocDescriptiveTitle = posthocMethod && posthocMethod !== 'None'
            ? `Post-hoc Descriptive Table (${posthocMethod})`
            : 'Post-hoc Descriptive Table (Significant Comparisons)';
        const publicationDescriptivePayload = getPublicationDescriptivePayload(src);
        const publicationDescriptiveRows = Array.isArray(publicationDescriptivePayload?.rows)
            ? publicationDescriptivePayload.rows
            : [];
        const kruskalDescriptiveGroupLabel = publicationDescriptivePayload?.group_var || 'Group';
        const kruskalDescriptiveValueLabel = publicationDescriptivePayload?.response_var || 'Value';
        const formatDescNumeric = (value, digits = 3) => {
            const n = Number(value);
            return Number.isFinite(n) ? n.toFixed(digits) : 'N/A';
        };
        const formatDescCount = (value) => {
            const n = Number(value);
            return Number.isFinite(n) ? String(Math.round(n)) : 'N/A';
        };
        const formatDescMedianIqr = (row) => {
            if (!row || typeof row !== 'object') return 'N/A';
            if (row?.median_iqr) return String(row.median_iqr);
            if (Number.isFinite(Number(row?.median)) && Number.isFinite(Number(row?.q1)) && Number.isFinite(Number(row?.q3))) {
                return `${formatDescNumeric(row.median)} [${formatDescNumeric(row.q1)}, ${formatDescNumeric(row.q3)}]`;
            }
            return 'N/A';
        };
        const kruskalDescriptiveRows = publicationDescriptiveRows.map((row, idx) => {
            const meanSd = row?.mean_sd || (
                Number.isFinite(Number(row?.mean)) && Number.isFinite(Number(row?.sd))
                    ? `${formatDescNumeric(row.mean)} ± ${formatDescNumeric(row.sd)}`
                    : 'N/A'
            );
            const meanCi95 = row?.mean_ci95 || (
                Number.isFinite(Number(row?.mean)) && Number.isFinite(Number(row?.ci_lower)) && Number.isFinite(Number(row?.ci_upper))
                    ? `${formatDescNumeric(row.mean)} [${formatDescNumeric(row.ci_lower)}, ${formatDescNumeric(row.ci_upper)}]`
                    : 'N/A'
            );
            const medianValue = Number(row?.median);

            return {
                _id: `kr_desc_${idx}`,
                group: String(row?.group ?? 'N/A'),
                n: formatDescCount(row?.n),
                meanSd,
                meanCi95,
                medianIqr: formatDescMedianIqr(row),
                min: formatDescNumeric(row?.min),
                max: formatDescNumeric(row?.max),
                medianValue: Number.isFinite(medianValue) ? medianValue : null
            };
        });
        const dunnPosthocDescriptiveRows = (() => {
            const significantPosthocRows = posthocNormalizedRows
                .filter(({ row }) => row?.is_significant === true);
            if (significantPosthocRows.length === 0 || kruskalDescriptiveRows.length === 0) return [];
            const byGroup = new Map();
            kruskalDescriptiveRows.forEach((row) => {
                const key = String(row?.group || '').trim();
                if (key) byGroup.set(key, row);
            });
            return significantPosthocRows.map(({ row, rowName }, idx) => {
                const comparison = String(row?.comparison || rowName || `Comparison ${idx + 1}`).trim();
                const [groupA, groupB] = splitComparisonGroups(comparison);
                const rowA = groupA ? byGroup.get(groupA) : null;
                const rowB = groupB ? byGroup.get(groupB) : null;
                const medianDelta = (rowA && rowB && rowA.medianValue != null && rowB.medianValue != null)
                    ? formatDescNumeric(rowA.medianValue - rowB.medianValue, 3)
                    : 'N/A';
                const statRaw = row?.z_value ?? row?.statistic ?? row?.t_stat ?? row?.diff;
                const pAdjRaw = row?.formatted_p ?? row?.p_adj ?? row?.p_value ?? row?.p;
                return {
                    _id: `dunn_desc_${idx}`,
                    comparison,
                    groupA: groupA || 'N/A',
                    nA: rowA?.n || 'N/A',
                    medianIqrA: rowA?.medianIqr || 'N/A',
                    groupB: groupB || 'N/A',
                    nB: rowB?.n || 'N/A',
                    medianIqrB: rowB?.medianIqr || 'N/A',
                    medianDelta,
                    stat: Number.isFinite(Number(statRaw)) ? Number(statRaw).toFixed(4) : 'N/A',
                    pAdj: typeof pAdjRaw === 'string'
                        ? pAdjRaw
                        : (Number.isFinite(Number(pAdjRaw)) ? Number(pAdjRaw).toFixed(4) : 'N/A'),
                    sig: resolveSignificanceStars(pAdjRaw, row?.is_significant === true)
                };
            });
        })();
        const normalizeSampleType = (value) => {
            const text = String(value || '').trim();
            if (!text) return '';
            const lowered = text.toLowerCase();
            if (lowered.includes('paired') || lowered.includes('repeated') || lowered.includes('within')) {
                return 'Paired / Repeated';
            }
            if (lowered.includes('independent') || lowered.includes('between')) {
                return 'Independent';
            }
            return text;
        };
        const sampleType = (() => {
            const explicit = normalizeSampleType(src.sample_type ?? src.sampleType);
            if (explicit) return explicit;

            const tName = String(src.ttest?.test_name || '').toLowerCase();
            if (tName.includes('paired')) return 'Paired / Repeated';
            if (src.rm_anova || src.friedman || src.wilcoxon || src.rm_anova_posthoc || src.friedman_posthoc) {
                return 'Paired / Repeated';
            }
            if (src.ttest || src.anova || src.chisq || src.kruskal || src.mann_whitney || src.tukey || src.games_howell || src.dunn) {
                return 'Independent';
            }
            return 'N/A';
        })();
        const isParametricPath = src.path_taken === 'parametric'
            || Boolean(src.ttest || src.anova || src.rm_anova || (!isSrh && (src.is_factorial || src.main_effect_A || src.main_effect_B || src.interaction)));
        const varianceTest = isParametricPath && isTwoGroups && src.levene
            ? (() => {
                const pText = src.levene.formatted_p || fmtP(src.levene.p_value);
                const homogeneous = src.levene.is_homogeneous === true
                    ? 'Yes'
                    : src.levene.is_homogeneous === false
                        ? 'No'
                        : 'N/A';
                return {
                    testName: src.levene.test_name || "Levene's Test",
                    statistic: fmt(src.levene.statistic, 4),
                    df1: fmt(src.levene.df1, 3),
                    df2: fmt(src.levene.df2, 3),
                    p: pText,
                    homogeneous,
                    message: src.levene.message || ''
                };
            })()
            : null;
        const homogeneitySummary = (() => {
            if (!isParametricPath) return null;
            if (isTwoGroups && src.levene) {
                const pText = src.levene.formatted_p || fmtP(src.levene.p_value);
                const homogeneous = src.levene.is_homogeneous === true
                    ? 'Yes'
                    : src.levene.is_homogeneous === false
                        ? 'No'
                        : 'N/A';
                return {
                    testName: src.levene.test_name || "Levene's Test",
                    statLabel: 'F',
                    statistic: fmt(src.levene.statistic, 3),
                    df: `df1 = ${fmt(src.levene.df1, 3)}, df2 = ${fmt(src.levene.df2, 3)}`,
                    p: pText,
                    homogeneous,
                    message: src.levene.message || ''
                };
            }
            if (!isTwoGroups && src.bartlett) {
                const pText = src.bartlett.formatted_p || fmtP(src.bartlett.p_value);
                const homogeneous = src.bartlett.is_homogeneous === true
                    ? 'Yes'
                    : src.bartlett.is_homogeneous === false
                        ? 'No'
                        : 'N/A';
                const dfText = Number.isFinite(Number(src.bartlett.df))
                    ? fmt(src.bartlett.df, 3)
                    : toRawRText(src.bartlett.df);
                return {
                    testName: "Bartlett's Test",
                    statLabel: 'K-squared',
                    statistic: fmt(src.bartlett.statistic, 3),
                    df: `df = ${dfText}`,
                    p: pText,
                    homogeneous,
                    message: src.bartlett.message || ''
                };
            }
            return null;
        })();

        const resolvePrimary = () => {
            // Priority: Two-Way / Factorial (Complex designs first)
            if (src.is_factorial || src.main_effect_A || src.main_effect_B || src.interaction) {
                const isSrh = src.test_type === 'scheirer_ray_hare' || src.srh;
                const isRobust = src.anova_robust || src.robust_method;
                const baseName = isSrh ? 'Scheirer-Ray-Hare Test' : (isRobust ? 'Robust ANOVA Factorial' : 'ANOVA Factorial');
                
                return {
                    testName: baseName,
                    statistic: `Main A p = ${src.main_effect_A?.formatted_p || 'N/A'} | Main B p = ${src.main_effect_B?.formatted_p || 'N/A'}`,
                    p: src.interaction?.formatted_p || 'N/A',
                    significant: src.interaction?.is_significant ? 'Yes' : 'No',
                    note: isSrh ? 'Non-parametric on ranks' : (isRobust ? `Using ${src.robust_method || 'HC3'} estimator` : 'Standard Parametric'),
                    message: src.interaction?.message || src.main_effect_A?.message || ''
                };
            }

            if (src.rm_anova) {
                return {
                    testName: 'Repeated Measures ANOVA',
                    statistic: `F(${fmt(src.rm_anova.df1, 3)}, ${fmt(src.rm_anova.df2, 3)}) = ${fmt(src.rm_anova.statistic, 3)}`,
                    p: src.rm_anova.formatted_p || fmtP(src.rm_anova.p_value),
                    significant: src.rm_anova.is_significant ? 'Yes' : 'No',
                    note: src.rm_anova.correction_used === 'none'
                        ? 'Uncorrected'
                        : formatCorrectionName(src.rm_anova.correction_used, true),
                    message: src.rm_anova.message || ''
                };
            }
            if (src.ttest) {
                return {
                    testName: src.ttest.test_name || 'T-Test',
                    statistic: `t = ${fmt(src.ttest.statistic, 3)} | df = ${fmt(src.ttest.df, 3)}`,
                    p: src.ttest.formatted_p || fmtP(src.ttest.p_value),
                    significant: src.ttest.is_significant ? 'Yes' : 'No',
                    note: src.ttest.effect_size ? `Effect: ${src.ttest.effect_size}` : 'N/A',
                    message: src.ttest.message || ''
                };
            }
            if (src.anova) {
                const anovaDf1 = src.anova.df_between ?? src.anova.df1;
                const anovaDf2 = src.anova.df_within ?? src.anova.df2;
                const etaNum = Number(src.anova.eta_squared ?? src.anova.effect_size);
                const hasEta = Number.isFinite(etaNum);
                const etaLabel = String(src.anova.effect_size_label || '').trim();
                return {
                    testName: src.anova.test_type === 'welch' ? "Welch's ANOVA" : 'One-Way ANOVA',
                    statistic: `F = ${fmt(src.anova.statistic, 3)} | df = ${fmt(anovaDf1, 3)}, ${fmt(anovaDf2, 3)}`,
                    p: src.anova.formatted_p || fmtP(src.anova.p_value),
                    significant: src.anova.is_significant ? 'Yes' : 'No',
                    note: hasEta
                        ? `Eta² = ${fmt(etaNum, 3)}${etaLabel ? ` (${etaLabel})` : ''}`
                        : 'N/A',
                    message: src.anova.message || ''
                };
            }
            if (src.mann_whitney) {
                return {
                    testName: src.mann_whitney.test_name || 'Mann-Whitney U Test',
                    statistic: `U/W = ${fmt(src.mann_whitney.statistic, 3)}`,
                    p: src.mann_whitney.formatted_p || fmtP(src.mann_whitney.p_value),
                    significant: src.mann_whitney.is_significant ? 'Yes' : 'No',
                    note: 'Non-parametric independent',
                    message: src.mann_whitney.message || ''
                };
            }
            if (src.wilcoxon) {
                return {
                    testName: src.wilcoxon.test_name || 'Wilcoxon Signed-Rank Test',
                    statistic: `V/W = ${fmt(src.wilcoxon.statistic, 3)}`,
                    p: src.wilcoxon.formatted_p || fmtP(src.wilcoxon.p_value),
                    significant: src.wilcoxon.is_significant ? 'Yes' : 'No',
                    note: 'Non-parametric paired',
                    message: src.wilcoxon.message || ''
                };
            }
            if (src.kruskal) {
                return {
                    testName: 'Kruskal-Wallis Rank Sum Test',
                    statistic: `Chi-squared = ${fmt(src.kruskal.statistic, 3)} | df = ${fmt(src.kruskal.df, 3)}`,
                    p: src.kruskal.formatted_p || fmtP(src.kruskal.p_value),
                    significant: src.kruskal.is_significant ? 'Yes' : 'No',
                    note: 'Non-parametric (One-Way)',
                    message: src.kruskal.message || ''
                };
            }
            if (src.chisq) {
                return {
                    testName: 'Chi-Square Test of Independence',
                    statistic: `Chi-squared = ${fmt(src.chisq.statistic, 3)} | df = ${fmt(src.chisq.df, 3)}`,
                    p: src.chisq.formatted_p || fmtP(src.chisq.p_value),
                    significant: src.chisq.is_significant ? 'Yes' : 'No',
                    note: `Cramer's V = ${fmt(src.chisq.cramers_v, 3)} (${src.chisq.effect_size_label})`,
                    message: src.chisq.message || ''
                };
            }

            if (src.friedman) {
                return {
                    testName: 'Friedman Rank Sum Test',
                    statistic: `Chi-squared = ${fmt(src.friedman.statistic, 3)} | df = ${fmt(src.friedman.df, 3)}`,
                    p: src.friedman.formatted_p || fmtP(src.friedman.p_value),
                    significant: src.friedman.is_significant ? 'Yes' : 'No',
                    note: 'Non-parametric repeated',
                    message: src.friedman.message || ''
                };
            }
            if (multivariateSummary) {
                return {
                    testName: multivariateSummary.modeLabel,
                    statistic: multivariateSummary.summaryRows
                        .filter(([label]) => label !== 'Technique' && label !== 'Goal')
                        .slice(0, 2)
                        .map(([label, value]) => `${label}: ${value}`)
                        .join(' | ') || 'See multivariate summary',
                    p: 'N/A',
                    significant: 'N/A',
                    note: multivariateSummary.goal,
                    message: multivariateSummary.message || multivariateSummary.interpretation || ''
                };
            }
            
            return {
                testName: src.test_type ? formatTestName(src.test_type) : 'Inferential Test',
                statistic: 'N/A',
                p: 'N/A',
                significant: 'N/A',
                note: 'N/A',
                message: src.message || ''
            };
        };
        const primary = resolvePrimary();
        const finalMessage = src.message || multivariateSummary?.message || primary.message || 'No model message returned by R.';
    const tTestSummary = src.ttest
        ? (() => {
            const dNum = Number(src.ttest.cohens_d);
            const hasD = Number.isFinite(dNum);
            const effectLabel = src.ttest.effect_size || (hasD ? effectSizeLabel(dNum) : 'unknown');
            const g1 = src.ttest.group1 || 'Group 1';
            const g2 = src.ttest.group2 || 'Group 2';
            const pText = src.ttest.formatted_p || fmtP(src.ttest.p_value);
            const pNum = Number(src.ttest.p_value);
            const sigStars = Number.isFinite(pNum)
                ? (pNum < 0.001 ? '***' : pNum < 0.01 ? '**' : pNum < 0.05 ? '*' : '')
                : '';
            const sigCell = src.ttest.is_significant ? (sigStars || '*') : 'ns';
            const comparisonRow = {
                comparison: `${g1} - ${g2}`,
                t: fmt(src.ttest.statistic, 3),
                df: fmt(src.ttest.df, 3),
                p: pText,
                sig: sigCell
            };
            const significanceEffect = src.ttest.is_significant
                ? `Statistically significant difference between ${g1} and ${g2}; effect size is ${effectLabel}${hasD ? ` (Cohen's d = ${fmt(dNum, 3)})` : ''}.`
                : `No statistically significant difference between ${g1} and ${g2}; effect size is ${effectLabel}${hasD ? ` (Cohen's d = ${fmt(dNum, 3)})` : ''}.`;
                return {
                    testName: src.ttest.test_name || 'Student\'s t-test',
                    statistic: fmt(src.ttest.statistic, 3),
                    df: fmt(src.ttest.df, 3),
                p: pText,
                group1: g1,
                group2: g2,
                mean1: fmt(src.ttest.mean1, 3),
                mean2: fmt(src.ttest.mean2, 3),
                meanDiff: fmt(src.ttest.mean_diff, 3),
                ci: `${fmt(src.ttest.ci_lower, 3)}, ${fmt(src.ttest.ci_upper, 3)}`,
                cohensD: hasD ? fmt(dNum, 3) : 'N/A',
                effectSize: effectLabel,
                    isSignificant: src.ttest.is_significant === true,
                    comparisonRow,
                    significanceEffect,
                    meanCiPlotImage: ttestMeanCiPlotImage,
                    message: src.ttest.message || ''
                };
            })()
        : null;
        const anovaSummary = src.anova
            ? (() => {
                const isWelch = src.anova.test_type === 'welch';
                const df1Raw = src.anova.df_between ?? src.anova.df1;
                const df2Raw = src.anova.df_within ?? src.anova.df2;
                const etaRaw = Number(src.anova.eta_squared ?? src.anova.effect_size);
                const hasEta = Number.isFinite(etaRaw);
                const sigText = String(src.anova.significance_effect_interpretation || '').trim();
                const fallbackSig = src.anova.is_significant
                    ? 'At least one group mean is different.'
                    : 'No statistically significant group-mean difference was detected.';
                return {
                    testName: isWelch ? "Welch's ANOVA" : 'One-Way ANOVA',
                    variant: isWelch ? 'Welch' : 'Standard',
                    statistic: fmt(src.anova.statistic, 3),
                    df1: fmt(df1Raw, 3),
                    df2: fmt(df2Raw, 3),
                    p: src.anova.formatted_p || fmtP(src.anova.p_value),
                    significant: src.anova.is_significant === true
                        ? 'Yes'
                        : src.anova.is_significant === false
                            ? 'No'
                            : 'N/A',
                    etaSquared: hasEta ? fmt(etaRaw, 3) : 'N/A',
                    etaLabel: String(src.anova.effect_size_label || '').trim() || 'N/A',
                    plotImage: anovaPlotImage || mainPlotImage,
                    meanCiPlotImage,
                    anovaPlotImage,
                    anovaResidualPlotImage,
                    residualQqPlotImage,
                    message: src.anova.message || '',
                    significanceEffect: sigText || fallbackSig
                };
                })()
            : null;
        const chisqSummary = src.chisq
            ? (() => {
                const stats = src.chisq;
                const gof = stats.goodness_of_fit || null;
                const pText = stats.formatted_p || fmtP(stats.p_value);
                const isSignificant = stats.is_significant === true;
                const vRaw = Number(stats.cramers_v);
                const hasV = Number.isFinite(vRaw);
                const effectLabel = String(stats.effect_size_label || '').trim() || 'N/A';
                const gofCategories = Array.isArray(gof?.categories) ? gof.categories : [];
                const formatGofCounts = (values) => {
                    if (!Array.isArray(values) || gofCategories.length === 0) return 'N/A';
                    return gofCategories.map((cat, idx) => `${cat}: ${fmt(values[idx], 3)}`).join(' | ');
                };
                const significanceEffect = isSignificant
                    ? 'There is a statistically significant association between the categorical variables.'
                    : 'No statistically significant association was detected between the categorical variables.';
                return {
                    testName: 'Chi-Square Test of Independence',
                    statistic: fmt(stats.statistic, 3),
                    df: fmt(stats.df, 3),
                    p: pText,
                    significant: isSignificant ? 'Yes' : 'No',
                    cramersV: hasV ? fmt(vRaw, 3) : 'N/A',
                    effectSizeLabel: effectLabel,
                    correctionOption: String(stats.correction_option || 'auto'),
                    correctionApplied: stats.correction_applied === true ? 'Yes' : 'No',
                    correctionLabel: String(stats.correction_label || '').trim() || 'N/A',
                    gofVariable: String(gof?.variable || '').trim() || 'N/A',
                    gofStatistic: Number.isFinite(Number(gof?.statistic)) ? fmt(gof.statistic, 3) : 'N/A',
                    gofDf: Number.isFinite(Number(gof?.df)) ? fmt(gof.df, 3) : 'N/A',
                    gofP: String(gof?.formatted_p || '').trim() || (Number.isFinite(Number(gof?.p_value)) ? fmtP(gof.p_value) : 'N/A'),
                    gofSignificant: gof?.is_significant === true ? 'Yes' : gof?.is_significant === false ? 'No' : 'N/A',
                    gofObserved: formatGofCounts(gof?.observed),
                    gofExpected: formatGofCounts(gof?.expected),
                    gofMessage: String(gof?.message || '').trim() || 'N/A',
                    message: stats.message || '',
                    significanceEffect
                };
                })()
            : null;
        const twoWaySummary = isFactorial
            ? (() => {
                const statLabel = isSrh ? 'H' : 'F';
                const variant = isSrh
                    ? 'Non-parametric'
                    : (src.anova_robust || src.robust_method
                        ? `Robust${src.robust_method ? ` (${src.robust_method})` : ''}`
                        : (src.is_paired_factorial ? 'Repeated Measures' : 'Standard'));
                const interactionLabel = (src.factor1 && src.factor2)
                    ? `${src.factor1} × ${src.factor2}`
                    : 'Interaction';
                const buildEffect = (effect, fallbackName, role) => {
                    if (!effect) return null;
                    const statNum = Number(effect.f_statistic);
                    const df1Num = Number(effect.df_num);
                    const df2Num = Number(effect.df_den);
                    const etaNum = Number(effect.eta_squared);
                    const etaLabel = String(effect.effect_size_label || '').trim()
                        || (Number.isFinite(etaNum) ? effectSizeLabel(etaNum) : 'N/A');
                    return {
                        role,
                        effect: effect.factor_name || fallbackName,
                        stat: Number.isFinite(statNum) ? fmt(statNum, 3) : 'N/A',
                        df1: Number.isFinite(df1Num) ? fmt(df1Num, 3) : 'N/A',
                        df2: Number.isFinite(df2Num) ? fmt(df2Num, 3) : 'N/A',
                        p: effect.formatted_p || fmtP(effect.p_value),
                        sig: effect.is_significant === true ? 'Yes' : effect.is_significant === false ? 'No' : 'N/A',
                        etaSquared: Number.isFinite(etaNum) ? fmt(etaNum, 3) : 'N/A',
                        etaLabel,
                        message: effect.message || ''
                    };
                };
                const interactionPlotImage = interactionPlotImageRaw || mainPlotImage;
                const effects = [
                    buildEffect(src.main_effect_A, src.main_effect_A?.factor_name || src.factor1 || 'Factor A', 'main_a'),
                    buildEffect(src.main_effect_B, src.main_effect_B?.factor_name || src.factor2 || 'Factor B', 'main_b'),
                    buildEffect(src.interaction, interactionLabel, 'interaction')
                ].filter(Boolean);
                const interaction = effects.find((e) => e.role === 'interaction') || null;
                const message = interaction?.message || effects.find((e) => e.message)?.message || '';
                const hasPosthoc = (Array.isArray(src.tukey) && src.tukey.length > 0)
                    || (Array.isArray(src.games_howell) && src.games_howell.length > 0);
                const posthocLabel = (!isSrh && hasPosthoc)
                    ? (src.anova_robust || src.robust_method ? 'Games-Howell' : 'Tukey HSD')
                    : 'N/A';
                return {
                    testName: isSrh ? 'Scheirer-Ray-Hare' : 'ANOVA Factorial',
                    variant,
                    statLabel,
                    robustMethod: src.robust_method || (src.anova_robust ? 'Robust' : ''),
                    isNonParametric: isSrh,
                    showAssumptions: !isSrh,
                    posthocLabel,
                    effects,
                    interaction,
                    interactionPlotImage,
                    message
                };
            })()
            : null;
        const twoGroupNonParamSource = src.mann_whitney || src.wilcoxon || null;
        const twoGroupNonParamSummary = twoGroupNonParamSource
            ? (() => {
                const testName = twoGroupNonParamSource.test_name || (src.mann_whitney ? 'Mann-Whitney U Test' : 'Wilcoxon Signed-Rank Test');
                const pText = twoGroupNonParamSource.formatted_p || fmtP(twoGroupNonParamSource.p_value);
                const isSignificant = twoGroupNonParamSource.is_significant === true;
                const g1 = toRawRText(twoGroupNonParamSource.group1);
                const g2 = toRawRText(twoGroupNonParamSource.group2);
                const pNum = Number(twoGroupNonParamSource.p_value);
                const sigStars = Number.isFinite(pNum)
                    ? (pNum < 0.001 ? '***' : pNum < 0.01 ? '**' : pNum < 0.05 ? '*' : '')
                    : '';
                const sigCell = twoGroupNonParamSource.is_significant ? (sigStars || '*') : 'ns';
                const statLabel = src.mann_whitney ? 'U' : 'V';
                const statVal = toRawRText(twoGroupNonParamSource.statistic);
                const m1Raw = Number(twoGroupNonParamSource.median1);
                const m2Raw = Number(twoGroupNonParamSource.median2);
                const hasMedians = Number.isFinite(m1Raw) && Number.isFinite(m2Raw);
                const m1 = hasMedians ? fmt(m1Raw, 3) : toRawRText(twoGroupNonParamSource.median1);
                const m2 = hasMedians ? fmt(m2Raw, 3) : toRawRText(twoGroupNonParamSource.median2);
                const rbcRaw = Number(twoGroupNonParamSource.rank_biserial);
                const hasRbc = Number.isFinite(rbcRaw);
                const rbcText = hasRbc
                    ? fmt(rbcRaw, 3)
                    : (String(twoGroupNonParamSource.rank_biserial_formatted || '').trim() || 'N/A');
                const rbcEffect = String(twoGroupNonParamSource.rank_biserial_effect || '').trim() || 'N/A';
                const comparisonRow = {
                    comparison: `${g1} - ${g2}`,
                    stat: statVal,
                    p: pText,
                    sig: sigCell,
                    statLabel,
                    rbc: rbcText
                };
                const rbcInterpText = String(twoGroupNonParamSource.rank_biserial_interpretation || '').trim();
                const direction = hasMedians && m1Raw !== m2Raw
                    ? (m1Raw > m2Raw ? `${g1} has the higher median.` : `${g2} has the higher median.`)
                    : '';
                const fallbackInterpretation = isSignificant
                    ? `Statistically significant difference between ${g1} and ${g2} (p = ${pText}).${hasMedians ? ` Medians: ${g1} = ${m1}, ${g2} = ${m2}.` : ''}${direction ? ` ${direction}` : ''}`
                    : `No statistically significant difference between ${g1} and ${g2} (p = ${pText}).${hasMedians ? ` Medians: ${g1} = ${m1}, ${g2} = ${m2}.` : ''}`;
                const interpretation = rbcInterpText || fallbackInterpretation;

                return {
                    testName,
                    statistic: toRawRText(twoGroupNonParamSource.statistic),
                    p: pText,
                    significant: twoGroupNonParamSource.is_significant === true
                        ? 'Yes'
                        : twoGroupNonParamSource.is_significant === false
                            ? 'No'
                            : 'N/A',
                    group1: g1,
                    group2: g2,
                    median1: toRawRText(twoGroupNonParamSource.median1),
                    median2: toRawRText(twoGroupNonParamSource.median2),
                    message: toRawRText(twoGroupNonParamSource.message),
                    rankBiserial: rbcText,
                    rankBiserialEffect: rbcEffect,
                    rankBiserialInterpretation: interpretation,
                    interpretation,
                    boxplotImage: mannWhitneyBoxplotImage,
                    comparisonRow
                };
            })()
            : null;

        const kruskalSummary = src.kruskal
            ? (() => {
                const stats = src.kruskal;
                const sig = stats.is_significant;
                const pText = stats.formatted_p || fmtP(stats.p_value);
                const esRaw = Number(stats.epsilon_squared);
                const hasEs = Number.isFinite(esRaw);
                const esLabel = String(stats.effect_size_label || '').trim();
                const fallbackSig = sig
                    ? 'At least one group median is different.'
                    : 'No statistically significant difference between group medians was detected.';

                return {
                    testName: 'Kruskal-Wallis Rank Sum Test',
                    statistic: fmt(stats.statistic, 3),
                    df: fmt(stats.df, 3),
                    p: pText,
                    significant: sig === true ? 'Yes' : (sig === false ? 'No' : 'N/A'),
                    epsilonSquared: hasEs ? fmt(esRaw, 3) : 'N/A',
                    effectSizeLabel: esLabel || 'N/A',
                    message: stats.message || '',
                    significanceEffect: fallbackSig
                };
            })()
            : null;
        const friedmanSummary = src.friedman
            ? (() => {
                const stats = src.friedman;
                const sig = stats.is_significant;
                const pText = stats.formatted_p || fmtP(stats.p_value);
                const fallbackSig = sig
                    ? 'At least one condition differs across repeated measures.'
                    : 'No statistically significant differences across conditions were detected.';
                return {
                    testName: 'Friedman Rank Sum Test',
                    statistic: fmt(stats.statistic, 3),
                    df: fmt(stats.df, 3),
                    p: pText,
                    significant: sig === true ? 'Yes' : (sig === false ? 'No' : 'N/A'),
                    rOutput: buildFriedmanROutput(stats, src.friedman_posthoc),
                    spaghettiIqrPlotImage: friedmanSpaghettiIqrPlotImage,
                    message: stats.message || '',
                    significanceEffect: fallbackSig
                };
            })()
            : null;
        const factorialSphericityRows = (
            src.is_factorial
            && src.path_taken === 'parametric'
            && !src.rm_anova
            && src.sphericity_checks
            && typeof src.sphericity_checks === 'object'
        )
            ? Object.entries(src.sphericity_checks).map(([effectName, sph]) => {
                const row = (sph && typeof sph === 'object') ? sph : {};
                const applicable = row.applicable === true;
                return {
                    effect: effectName || 'Effect',
                    applicable,
                    message: row.message || '',
                    mauchlyW: applicable && Number.isFinite(Number(row.mauchly_w)) ? fmt(row.mauchly_w, 4) : 'N/A',
                    mauchlyP: applicable ? (row.mauchly_formatted_p || fmtP(row.mauchly_p)) : 'N/A',
                    violated: applicable
                        ? (row.sphericity_violated === true ? 'Yes' : row.sphericity_violated === false ? 'No' : 'N/A')
                        : 'N/A',
                    correction: applicable
                        ? (String(row.correction_used || '').toLowerCase() === 'none'
                            ? 'None'
                            : formatCorrectionName(row.correction_used, true))
                        : 'N/A',
                    finalP: applicable ? (row.formatted_p_final || fmtP(row.p_final)) : 'N/A',
                    ggEpsilon: applicable && Number.isFinite(Number(row.gg_epsilon)) ? fmt(row.gg_epsilon, 3) : 'N/A',
                    hfEpsilon: applicable && Number.isFinite(Number(row.hf_epsilon)) ? fmt(row.hf_epsilon, 3) : 'N/A'
                };
            })
            : [];
        const isRegressionMode = Boolean(src.mode && String(src.mode).startsWith('regression'));
        const regressionSummaryLabel = regressionDisplayLabel || src.regression_display_label || 'Regression';
        const regressionLevelCount = Array.isArray(src.response_levels)
            ? src.response_levels.length
            : (Number.isFinite(Number(src?.model_stats?.n_levels)) ? Number(src.model_stats.n_levels) : 'N/A');

        return {
            reportTitle: reportTitleValue,
            reportAuthor: reportAuthorValue,
            reportEndNote: reportEndNoteValue,
            reportEndNoteHtml: reportEndNote,
            reportEndFontFamily,
            reportEndFontSize: Number(reportEndFontSize),
            reportEndTextColor,
            mode: src.mode || 'inferential',
            pathTaken: isMultivariateMode ? 'multivariate' : (isRegressionMode ? 'regression' : (src.path_taken || 'N/A')),
            testType: isMultivariateMode
                ? (multivariateSummary?.modeLabel || src.mode || 'Multivariate Analysis')
                : isRegressionMode
                    ? regressionSummaryLabel
                : (src.ttest?.test_name || primary.testName || src.test_type || 'N/A'),
            sampleType: isMultivariateMode ? 'Multivariate / Exploratory' : (isRegressionMode ? 'Regression / Modeling' : sampleType),
            nGroups: isMultivariateMode
                ? (multivariateSummary?.groupCount ?? 'N/A')
                : isRegressionMode
                    ? regressionLevelCount
                : (src.n_groups ?? 'N/A'),
            allNormal: src.all_normal === true ? 'Yes' : src.all_normal === false ? 'No' : 'N/A',
            bartlettLabel: isTwoGroups ? 'Homogeneity (Levene)' : 'Homogeneity (Bartlett)',
            bartlett: isParametricPath
                ? (isTwoGroups
                    ? (varianceTest
                        ? `Levene F = ${varianceTest.statistic} (df1 = ${varianceTest.df1}, df2 = ${varianceTest.df2}), p = ${varianceTest.p} (${varianceTest.homogeneous === 'Yes' ? 'Equal variances' : 'Unequal variances'})`
                        : 'N/A')
                    : (src.bartlett
                        ? `p = ${src.bartlett.formatted_p || fmtP(src.bartlett.p_value)} (${src.bartlett.is_homogeneous ? 'Homogeneous' : 'Not homogeneous'})`
                        : 'N/A'))
                : 'N/A',
            homogeneitySummary,
            varianceTest,
            mauchly: src.rm_anova
                ? `p = ${src.rm_anova.mauchly_formatted_p || fmtP(src.rm_anova.mauchly_p_value)} (${src.rm_anova.sphericity_violated ? 'Violated' : 'Satisfied'})`
                : 'N/A',
            mauchlyW: src.rm_anova ? fmt(src.rm_anova.mauchly_w, 4) : 'N/A',
            ggSummary: src.rm_anova
                ? `eps = ${fmt(src.rm_anova.gg_epsilon, 3)} | p = ${src.rm_anova.gg_formatted_p || fmtP(src.rm_anova.gg_p_value)}`
                : 'N/A',
            hfSummary: src.rm_anova
                ? `eps = ${fmt(src.rm_anova.hf_epsilon, 3)} | p = ${src.rm_anova.hf_formatted_p || fmtP(src.rm_anova.hf_p_value)}`
                : 'N/A',
            correction: src.rm_anova
                ? (src.rm_anova.correction_used === 'none' ? 'None' : formatCorrectionName(src.rm_anova.correction_used, true))
                : 'N/A',
            rmAnova: src.rm_anova
                ? {
                    statistic: fmt(src.rm_anova.statistic, 3),
                    df: `${fmt(src.rm_anova.df1, 3)}, ${fmt(src.rm_anova.df2, 3)}`,
                    p: src.rm_anova.formatted_p || fmtP(src.rm_anova.p_value),
                    pUncorrected: src.rm_anova.formatted_p_uncorrected || fmtP(src.rm_anova.p_uncorrected),
                    correction: src.rm_anova.correction_used === 'none' ? 'None' : formatCorrectionName(src.rm_anova.correction_used, true),
                    significanceEffect: rmAnovaEffectSummary(src.rm_anova).text,
                    rOutput: buildRmAnovaROutput(src.rm_anova, src.rm_anova_posthoc, src.rm_anova_table_rows),
                    residualQqPlotImage,
                    sphericityPlotImage,
                    rmSpaghettiCiPlotImage,
                    message: src.rm_anova.message || ''
                }
                : null,
            multivariate: multivariateSummary,
            tTest: tTestSummary,
            twoWay: twoWaySummary,
            anova: anovaSummary,
            chisq: chisqSummary,
            kruskal: kruskalSummary,
            kruskalDescriptiveGroupLabel,
            kruskalDescriptiveValueLabel,
            kruskalDescriptiveRows,
            friedman: friedmanSummary,
            anovaTableRows: Array.isArray(src.anova_table_rows) ? src.anova_table_rows : [],
            anovaSignifCodesLegend: src.anova_signif_codes_legend || "0 '***' 0.001 '**' 0.01 '*' 0.05 '.' 0.1 ' ' 1",
            factorialSphericityRows,
            twoGroupNonParam: twoGroupNonParamSummary,
            hasPosthoc: posthocComparisons > 0,
            primary,
            posthocLabel: posthocSource ? posthocSource.label : 'None',
            posthocMethod,
            posthocDisplayTitle,
            tukeyPairwiseRows,
            posthocDescriptiveTitle,
            posthocComparisons,
            posthocSignificant,
            posthocRowsFull: posthocRawRowsAll,
            posthocRows: posthocRawRows,
            posthocHiddenCount: posthocRawHiddenCount,
            posthocRawColumns,
            posthocRawRowsFull: posthocRawRowsAll,
            posthocRawRows,
            posthocRawHiddenCount,
            dunnPosthocDescriptiveRows,
            shapiroRowsFull: shapiroRowsAll,
            shapiroRows,
            shapiroHiddenCount,
            shapiroRawRowsFull: shapiroRawRowsAll,
            shapiroRawRows,
            shapiroRawHiddenCount,
            bartlettRawRows: isParametricPath ? bartlettRawRows : [],
            tTestRawRows,
            plotImage: mainPlotImage,
            meanCiPlotImage,
            anovaPlotImage,
            anovaResidualPlotImage,
            ttestMeanCiPlotImage,
            regressionScatterPlotImage,
            regressionPublicationPlotImage,
            rmSpaghettiCiPlotImage,
            friedmanSpaghettiIqrPlotImage,
            mannWhitneyBoxplotImage,
            interactionPlotImage: interactionPlotImageRaw,
            pearsonHeatmapImage,
            spearmanHeatmapImage,
            pearsonLinearityImage,
            spearmanLinearityImage,
            residualQqPlotImage,
            sphericityPlotImage,
            mcaDendrogramImage,
            generatedPlots,
            finalMessage
        };
    })();
    const getPlotEditorPayloadByImageUrl = (imageUrl) => {
        if (!imageUrl || !Array.isArray(modelSummaryReport?.generatedPlots)) return null;
        const matchedPlot = modelSummaryReport.generatedPlots.find((plot) => plot?.imageData === imageUrl);
        if (!matchedPlot?.key) return null;

        const rawMeta = plotMetadataByKey?.[matchedPlot.key];
        const titleValue = rawMeta && Object.prototype.hasOwnProperty.call(rawMeta, 'title')
            ? rawMeta.title
            : (matchedPlot.title || matchedPlot.baseTitle || '');
        const xLabelValue = rawMeta && Object.prototype.hasOwnProperty.call(rawMeta, 'xLabel')
            ? rawMeta.xLabel
            : (matchedPlot.xLabel || '');
        const yLabelValue = rawMeta && Object.prototype.hasOwnProperty.call(rawMeta, 'yLabel')
            ? rawMeta.yLabel
            : (matchedPlot.yLabel || '');
        const infoValue = rawMeta && Object.prototype.hasOwnProperty.call(rawMeta, 'info')
            ? rawMeta.info
            : (matchedPlot.info || '');
        const titlePositionValue = rawMeta && Object.prototype.hasOwnProperty.call(rawMeta, 'titlePosition')
            ? rawMeta.titlePosition
            : 'center';
        const titleStepsValue = rawMeta && Object.prototype.hasOwnProperty.call(rawMeta, 'titleSteps')
            ? rawMeta.titleSteps
            : 0;
        const xPositionValue = rawMeta && Object.prototype.hasOwnProperty.call(rawMeta, 'xPosition')
            ? rawMeta.xPosition
            : 'center';
        const xStepsValue = rawMeta && Object.prototype.hasOwnProperty.call(rawMeta, 'xSteps')
            ? rawMeta.xSteps
            : 0;
        const yPositionValue = rawMeta && Object.prototype.hasOwnProperty.call(rawMeta, 'yPosition')
            ? rawMeta.yPosition
            : 'center';
        const yStepsValue = rawMeta && Object.prototype.hasOwnProperty.call(rawMeta, 'ySteps')
            ? rawMeta.ySteps
            : 0;

        return {
            plotKey: matchedPlot.key,
            heading: matchedPlot.baseTitle || matchedPlot.title || 'Plot',
            title: String(titleValue || ''),
            xLabel: String(xLabelValue || ''),
            yLabel: String(yLabelValue || ''),
            info: String(infoValue || ''),
            titlePosition: String(titlePositionValue || 'center'),
            titleSteps: Number.isFinite(Number(titleStepsValue)) ? Math.max(0, Math.round(Number(titleStepsValue))) : 0,
            xPosition: String(xPositionValue || 'center'),
            xSteps: Number.isFinite(Number(xStepsValue)) ? Math.max(0, Math.round(Number(xStepsValue))) : 0,
            yPosition: String(yPositionValue || 'center'),
            ySteps: Number.isFinite(Number(yStepsValue)) ? Math.max(0, Math.round(Number(yStepsValue))) : 0,
            defaultTitle: String(matchedPlot.baseTitle || matchedPlot.title || ''),
            defaultXLabel: '',
            defaultYLabel: '',
            defaultInfo: '',
            defaultTitlePosition: 'center',
            defaultTitleSteps: 0,
            defaultXPosition: 'center',
            defaultXSteps: 0,
            defaultYPosition: 'center',
            defaultYSteps: 0,
            onFieldChange: (field, value) => updatePlotMetadataField(matchedPlot.key, field, value),
            onReset: () => resetPlotMetadata(matchedPlot.key)
        };
    };
    const handleDownloadModelSummaryPdf = async () => {
        if (!modelSummaryReport) return;
        const response = await exportModelSummaryToPdf(modelSummaryReport);
        if (!response?.success) {
            alert(`Failed to generate PDF: ${response?.error || 'Unknown error'}`);
            return;
        }
        if (response?.warning) {
            alert(response.warning);
        }
    };
    const handleDownloadModelSummaryCsv = async () => {
        if (!modelSummaryReport) return;
        const response = await exportModelSummaryToCsv(modelSummaryReport);
        if (!response?.success && !response?.canceled) {
            alert(`Failed to generate CSV: ${response?.error || 'Unknown error'}`);
        }
    };
    const handleDownloadModelSummaryXlsx = async () => {
        if (!modelSummaryReport) return;
        const response = await exportModelSummaryToXlsx(modelSummaryReport);
        if (!response?.success && !response?.canceled) {
            alert(`Failed to generate XLSX: ${response?.error || 'Unknown error'}`);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">
            {/* Descriptive Statistics Results */}
            {result.mode === 'descriptive' && (
                <>
                    {/* Univariate Analysis */}
                    {result.univariate_analysis && (
                        <Card title="Univariate Analysis & Distributions" icon={ChartBarIcon}>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {Object.entries(result.univariate_analysis).map(([varName, stats], idx) => (
                                    <div key={idx} className="kpi-card">
                                        {/* Header with Icon Badge */}
                                        <div className="flex justify-between items-start mb-6">
                                            <div>
                                                <p className="section-label mb-2">{stats.type.toUpperCase()}</p>
                                                <h3 className="text-lg font-bold text-[#E9FEFF]">{varName}</h3>
                                            </div>
                                            <div className={`icon-badge ${stats.type === 'numeric' ? '' : 'icon-badge-green'}`}>
                                                <span className={`text-lg font-bold ${stats.type === 'numeric' ? 'text-[#00F5FF]' : 'text-[#22c55e]'}`}>
                                                    {stats.type === 'numeric' ? 'ƒ' : '∑'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Stats */}
                                        {stats.type === 'numeric' ? (
                                            <div className="space-y-4">
                                                {/* Mean - Main KPI */}
                                                <div>
                                                    <p className="section-label mb-1">MEAN</p>
                                                    <p className="value-display">{stats.mean?.toFixed(2)}</p>
                                                    <p className="value-description mt-1">Central tendency</p>
                                                </div>
                                                
                                                {/* Median & SD */}
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="info-panel rounded-lg p-3">
                                                        <p className="section-label mb-1">MEDIAN</p>
                                                        <p className="text-xl font-bold text-[#E9FEFF]">{stats.median?.toFixed(2)}</p>
                                                    </div>
                                                    <div className="info-panel rounded-lg p-3">
                                                        <p className="section-label mb-1">SD</p>
                                                        <p className="text-xl font-bold text-[#E9FEFF]">{stats.sd?.toFixed(2)}</p>
                                                    </div>
                                                </div>
                                                
                                                {/* Min/Max */}
                                                <div className="info-panel rounded-lg p-3 flex justify-between">
                                                    <div>
                                                        <p className="section-label mb-1">MIN</p>
                                                        <p className="text-base font-bold text-[#E9FEFF]">{stats.min?.toFixed(2)}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="section-label mb-1">MAX</p>
                                                        <p className="text-base font-bold text-[#E9FEFF]">{stats.max?.toFixed(2)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <p className="section-label mb-3">DISTRIBUTION</p>
                                                {Object.entries(stats.counts || {}).slice(0, 3).map(([cat, count], i) => (
                                                    <div key={i} className="flex justify-between items-center p-2 rounded" style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
                                                        <span className="text-xs text-[#E5E2E1]/70">{cat}</span>
                                                        <span className="text-xs font-bold text-[#00F5FF]">{count} ({stats.percentages?.[cat]}%)</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        
                                        {/* Sample Size */}
                                        <div className="info-panel rounded-lg p-3 mt-4">
                                            <p className="section-label mb-1">N (Sample Size)</p>
                                            <p className="text-lg font-bold text-[#E9FEFF]">{stats.n}</p>
                                        </div>

                                        {/* Plot */}
                                        {stats.plot_image && (
                                            <div className="mt-4 plot-container">
                                                <img 
                                                    src={`data:image/png;base64,${stats.plot_image}`} 
                                                    alt={`Distribution of ${varName}`} 
                                                    className="w-full h-40 object-contain opacity-80 hover:opacity-100 transition-opacity" 
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="mt-6 flex justify-end">
                                <button
                                    onClick={() => handleAskAI('Univariate Analysis Report', generateReport(result, 'univariate'))}
                                    className="ai-button px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold"
                                >
                                    <Bot size={14} /> Ask AI about Distributions
                                </button>
                            </div>
                        </Card>
                    )}

                    {result.exploratory_chart && (
                        <Card title="Exploratory Charts" icon={Activity}>
                            <div className="space-y-6">
                                <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                    <div>
                                        <span className="text-[9px] font-bold text-[#E5E2E1]/40 tracking-widest uppercase">CHART TYPE</span>
                                        <p className="text-sm font-bold text-[#E9FEFF] mt-1">
                                            {exploratoryChartLabel(result.exploratory_chart.chart_type)}
                                        </p>
                                    </div>
                                </div>
                                <div className="p-4 rounded-xl" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                    <p className="text-[9px] font-bold text-[#E5E2E1]/40 tracking-widest uppercase mb-2">VARIABLES</p>
                                    <p className="text-sm font-bold text-[#E9FEFF]">
                                        X: <span className="font-mono text-[#00F5FF]">{safeText(result.exploratory_chart.x_var)}</span>
                                        {result.exploratory_chart.y_var ? (
                                            <> • Y: <span className="font-mono text-[#00F5FF]">{safeText(result.exploratory_chart.y_var)}</span></>
                                        ) : null}
                                    </p>
                                </div>
                                {result.exploratory_chart.plot_error && (
                                    <div className="p-4 rounded-xl border border-red-500/20" style={{ background: 'rgba(239, 68, 68, 0.05)' }}>
                                        <p className="text-xs text-red-400">
                                            {safeText(result.exploratory_chart.plot_error)}
                                        </p>
                                    </div>
                                )}
                                {result.image ? (
                                    <div className="relative group rounded-xl overflow-hidden" style={{
                                        background: '#050507',
                                        border: '1px solid rgba(255, 255, 255, 0.05)'
                                    }}>
                                        <img
                                            src={`data:image/png;base64,${result.image}`}
                                            alt={`Exploratory chart: ${result.exploratory_chart.chart_type}`}
                                            className="w-full h-auto object-contain opacity-80 group-hover:opacity-100 transition-opacity"
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-[#00F5FF]/5 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                            <button
                                                onClick={() => setSelectedImage({ url: `data:image/png;base64,${result.image}`, title: 'Exploratory Chart' })}
                                                className="bg-[#131313]/90 text-white p-3 rounded-full shadow-xl hover:scale-110 transition-transform border border-[#00F5FF]/20"
                                            >
                                                <Maximize2 size={24} />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-40 rounded-xl flex items-center justify-center text-xs text-[#E5E2E1]/30" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                        No plot available
                                    </div>
                                )}
                            </div>
                            {result.image && renderCustomPlotLabels()}
                        </Card>
                    )}

                    {(result.bivariate || result.correlation_matrix) && (
                    <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full w-fit">
                            Bivariate Descriptive Analysis
                        </h3>
                        
                        {/* Correlation */}
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
                                <div className="mt-4 flex justify-end">
                                        <button
                                            onClick={() => openInterpretation('Correlation Report', generateReport(result, 'correlation'))}
                                            className="p-2 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-400 transition-colors"
                                            title="Ask AI to Interpret"
                                        >
                                            <Sparkles size={16} />
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
                                        <div className="relative group rounded-xl overflow-hidden border dark:border-gray-700 shadow-lg">
                                            <img src={`data:image/png;base64,${result.image}`} alt="Scatter Plot" className="w-full rounded-xl border dark:border-gray-700 shadow-lg" />
                                            {renderFullscreenButton(result.image, 'Scatter Plot')}
                                        </div>
                                    </div>
                                )}
                                {(result.image) && renderCustomPlotLabels()}
                            </Card>
                        )}
                        
                        {/* Contingency Table */}
                        {result.bivariate?.type === 'qualitative_qualitative' && (
                            <Card title="Contingency Table Analysis" icon={TableIcon}>
                                <div className="overflow-x-auto">
                                   {/* Render table... simplified for brevity, assume result.contingency_table exists or use logic */}
                                   {result.contingency_table ? (
                                       <table className="w-full text-xs text-left">
                                           <thead className="bg-gray-50 dark:bg-gray-900 font-bold text-gray-500 uppercase">
                                               <tr>
                                                   {result.contingency_table.columns && toArray(result.contingency_table.columns).map((col, i) => (
                                                       <th key={i} className="px-6 py-3">{col}</th>
                                                   ))}
                                               </tr>
                                           </thead>
                                           <tbody className="divide-y dark:divide-gray-800">
                                               {result.contingency_table.data && toArray(result.contingency_table.data).map((row, i) => (
                                                   <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                       {row.map((cell, j) => (
                                                           <td key={j} className="px-6 py-4">{cell}</td>
                                                       ))}
                                                   </tr>
                                               ))}
                                           </tbody>
                                       </table>
                                   ) : (
                                       <div className="p-4 text-center text-gray-500">No contingency table data available.</div>
                                   )}
                                </div>
                                <div className="mt-4 flex justify-end">
                                    <button
                                        onClick={() => openInterpretation('Contingency Table Report', generateReport(result, 'contingency_table'))}
                                        className="p-2 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-400 transition-colors"
                                        title="Ask AI to Interpret"
                                    >
                                        <Sparkles size={16} />
                                    </button>
                                </div>
                                {result.image && (
                                    <div className="mt-6">
                                        <div className="relative group rounded-xl overflow-hidden border dark:border-gray-700 shadow-lg">
                                            <img src={`data:image/png;base64,${result.image}`} alt="Mosaic Plot" className="w-full rounded-xl border dark:border-gray-700 shadow-lg" />
                                            {renderFullscreenButton(result.image, 'Mosaic Plot')}
                                        </div>
                                    </div>
                                )}
                                {(result.image) && renderCustomPlotLabels()}
                            </Card>
                        )}
                        
                        {/* Mixed Types */}
                         {result.bivariate?.type === 'mixed' && (
                            <Card title="Group Comparison (Mixed Types)" icon={ChartBarIcon}>
                                <div className="p-4 text-sm text-gray-600 dark:text-gray-300">
                                    Analysis of a categorical variable vs a numerical variable.
                                </div>
                                <div className="mt-4 flex justify-end">
                                    <button
                                        onClick={() => openInterpretation('Group Comparison Report', generateReport(result, 'mixed'))}
                                        className="p-2 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-400 transition-colors"
                                        title="Ask AI to Interpret"
                                    >
                                        <Sparkles size={16} />
                                    </button>
                                </div>
                                {result.image && (
                                    <div className="mt-6">
                                        <div className="relative group rounded-xl overflow-hidden border dark:border-gray-700 shadow-lg">
                                            <img src={`data:image/png;base64,${result.image}`} alt="Box Plot" className="w-full rounded-xl border dark:border-gray-700 shadow-lg" />
                                            {renderFullscreenButton(result.image, 'Box Plot')}
                                        </div>
                                    </div>
                                )}
                                {(result.image) && renderCustomPlotLabels()}
                            </Card>
                        )}
                        
                        {!result.bivariate?.type && !result.univariate_analysis && (
                            <div className="p-6 text-center text-gray-500 italic bg-gray-50 dark:bg-gray-900 rounded-xl">
                                Select variables to see specific bivariate analysis results.
                            </div>
                        )}

                        {/* Correlation Matrix (all variables) */}
                        {result?.correlation_matrix && (() => {
                            const allVars = result.correlation_matrix.variables || [];
                            const activeCorrVars = selectedCorrVars && selectedCorrVars.length >= 2
                                ? selectedCorrVars
                                : allVars;
                            const activeIndices = allVars
                                .map((v, i) => ({ v, i }))
                                .filter(({ v }) => activeCorrVars.includes(v))
                                .map(({ i }) => i);

                            const filterMatrix = (matrix) =>
                                activeIndices.map(ri => activeIndices.map(ci => matrix[ri][ci]));
                            const filteredVars = activeIndices.map(i => allVars[i]);

                            const toggleCorrVar = (varName) => {
                                const current = selectedCorrVars ?? allVars;
                                if (current.includes(varName)) {
                                    if (current.length <= 2) return; // minimum 2
                                    setSelectedCorrVars(current.filter(v => v !== varName));
                                } else {
                                    setSelectedCorrVars([...current, varName]);
                                }
                            };

                            const hasPearson = correlationModes.includes('pearson') && Array.isArray(result.correlation_matrix.pearson);
                            const hasSpearman = correlationModes.includes('spearman') && Array.isArray(result.correlation_matrix.spearman);
                            const showBoth = hasPearson && hasSpearman;

                            const renderMatrix = (matrix, type) => {
                                const filtered = filterMatrix(matrix);
                                const chipBase = type === 'pearson'
                                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800'
                                    : 'bg-violet-50 dark:bg-violet-900/20 border-violet-100 dark:border-violet-800';
                                const label = type === 'pearson' ? 'Pearson' : 'Spearman';
                                const labelColor = type === 'pearson'
                                    ? 'text-blue-600 dark:text-blue-300'
                                    : 'text-violet-600 dark:text-violet-300';
                                return (
                                    <div key={type} className={`rounded-xl border p-4 space-y-3 ${chipBase}`}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-[11px] font-black uppercase tracking-widest ${labelColor}`}>{label} Correlation</span>
                                            {type === 'pearson' && result.correlation_matrix?.selected_method === 'pearson' && (
                                                <span className="text-[9px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 rounded font-bold uppercase">Recommended</span>
                                            )}
                                            {type === 'spearman' && result.correlation_matrix?.selected_method === 'spearman' && (
                                                <span className="text-[9px] px-1.5 py-0.5 bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300 rounded font-bold uppercase">Recommended</span>
                                            )}
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-white/60 dark:bg-black/20 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                    <tr>
                                                        <th className="px-3 py-2 min-w-[90px]"></th>
                                                        {filteredVars.map((varName, idx) => (
                                                            <th key={idx} className="px-3 py-2 text-[11px] font-black text-gray-600 dark:text-gray-200 whitespace-nowrap">{varName}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y dark:divide-gray-800">
                                                    {filtered.map((row, rowIdx) => (
                                                        <tr key={rowIdx} className="hover:bg-white/50 dark:hover:bg-white/5 transition-colors">
                                                            <td className="px-3 py-2 text-[11px] font-black text-gray-700 dark:text-gray-200 whitespace-nowrap">
                                                                {filteredVars[rowIdx]}
                                                            </td>
                                                            {row.map((cell, cellIdx) => (
                                                                <td key={cellIdx} className="px-2 py-2 text-center">
                                                                    <span className={`corr-value-chip ${getCorrelationChipClass(cell, type)}`}>
                                                                        {formatCorrelationCell(cell)}
                                                                    </span>
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                );
                            };

                            return (
                            <Card title="Correlation Matrix Analysis" icon={TableIcon}>
                                <div className="space-y-6">

                                    {/* Variable selector */}
                                    <div className="p-4 bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 rounded-xl border border-teal-200 dark:border-teal-700 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="text-xs font-black uppercase tracking-widest text-teal-600 dark:text-teal-400 flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-teal-500 inline-block" />
                                                Variable Selection
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-teal-500 dark:text-teal-400 font-bold bg-teal-100 dark:bg-teal-900/30 px-2 py-0.5 rounded-full">{activeCorrVars.length} / {allVars.length} active</span>
                                                {selectedCorrVars && (
                                                    <button
                                                        onClick={() => setSelectedCorrVars(null)}
                                                        className="text-[10px] px-2 py-0.5 rounded-full bg-teal-200 dark:bg-teal-800 text-teal-700 dark:text-teal-200 font-bold hover:bg-teal-300 dark:hover:bg-teal-700 transition-colors border border-teal-300 dark:border-teal-600"
                                                    >
                                                        ↺ Reset
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {allVars.map((varName, idx) => {
                                                const isActive = activeCorrVars.includes(varName);
                                                return (
                                                    <button
                                                        key={idx}
                                                        onClick={() => toggleCorrVar(varName)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all hover:scale-105 ${
                                                            isActive
                                                                ? 'bg-teal-600 text-white border-teal-600 shadow-sm shadow-teal-300 dark:shadow-teal-900'
                                                                : 'bg-white dark:bg-gray-900 text-gray-400 border-gray-200 dark:border-gray-700 opacity-40 line-through'
                                                        }`}
                                                    >
                                                        {varName}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <div className="text-[10px] text-teal-500 dark:text-teal-400 font-medium">
                                            Click variables to include/exclude them from both matrices below. Minimum 2 required.
                                        </div>
                                    </div>

                                    {/* Both matrices shown simultaneously */}
                                    <div className={showBoth ? 'grid grid-cols-1 xl:grid-cols-2 gap-5' : ''}>
                                        {hasPearson && renderMatrix(result.correlation_matrix.pearson, 'pearson')}
                                        {hasSpearman && renderMatrix(result.correlation_matrix.spearman, 'spearman')}
                                    </div>

                                    {/* Heatmaps */}
                                    {(result.heatmap_image || result.spearman_heatmap_image) && (
                                        <div className={`grid gap-5 ${result.heatmap_image && result.spearman_heatmap_image ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1'}`}>
                                            {result.heatmap_image && (
                                                <div className="space-y-1">
                                                    <div className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-1">Pearson Heatmap</div>
                                                    <div className="relative group rounded-xl overflow-hidden border dark:border-gray-700 shadow-lg bg-white dark:bg-gray-900">
                                                        <img
                                                            src={`data:image/png;base64,${result.heatmap_image}`}
                                                            alt="Pearson Correlation Heatmap"
                                                            className="w-full h-auto object-contain"
                                                        />
                                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 dark:group-hover:bg-white/5 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                            <button
                                                                onClick={() => setSelectedImage({ url: `data:image/png;base64,${result.heatmap_image}`, title: 'Pearson Correlation Heatmap' })}
                                                                className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 p-3 rounded-full shadow-xl hover:scale-110 transition-transform transform border border-gray-200 dark:border-gray-700"
                                                            >
                                                                <Maximize2 size={24} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            {result.spearman_heatmap_image && (
                                                <div className="space-y-1">
                                                    <div className="text-[10px] font-black uppercase tracking-widest text-violet-500 mb-1">Spearman Heatmap</div>
                                                    <div className="relative group rounded-xl overflow-hidden border dark:border-gray-700 shadow-lg bg-white dark:bg-gray-900">
                                                        <img
                                                            src={`data:image/png;base64,${result.spearman_heatmap_image}`}
                                                            alt="Spearman Correlation Heatmap"
                                                            className="w-full h-auto object-contain"
                                                        />
                                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 dark:group-hover:bg-white/5 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                            <button
                                                                onClick={() => setSelectedImage({ url: `data:image/png;base64,${result.spearman_heatmap_image}`, title: 'Spearman Correlation Heatmap' })}
                                                                className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 p-3 rounded-full shadow-xl hover:scale-110 transition-transform transform border border-gray-200 dark:border-gray-700"
                                                            >
                                                                <Maximize2 size={24} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Scatterplot Matrix */}
                                    {showScatter && (result.linearity_plot_image || result.spearman_linearity_plot_image) && (
                                        <div className="space-y-3">
                                            <div className="flex gap-2 items-center">
                                                <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Scatterplot Matrix</h3>
                                                <div className="flex gap-2">
                                                    {correlationModes.map(type => (
                                                        <button
                                                          key={type}
                                                          onClick={() => setLinearityView(type)}
                                                          className={`px-3 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                                                            linearityView === type
                                                              ? 'bg-indigo-600 text-white border-indigo-600'
                                                              : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                                                          }`}
                                                        >
                                                          {type === 'pearson' ? 'Pearson (raw)' : 'Spearman (ranks)'}
                                                        </button>
                                                    ))}
                                                </div>
                                                <label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 dark:text-gray-400 ml-auto cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={showScatter}
                                                        onChange={(e) => setShowScatter(e.target.checked)}
                                                        className="rounded border-gray-300 cursor-pointer"
                                                    />
                                                    Show
                                                </label>
                                            </div>
                                            <div className="relative group rounded-xl overflow-hidden border dark:border-gray-700 shadow-lg inline-block bg-white dark:bg-gray-900">
                                                {(linearityView === 'pearson' ? result.linearity_plot_image : result.spearman_linearity_plot_image) ? (
                                                    <img
                                                        src={`data:image/png;base64,${linearityView === 'pearson' ? result.linearity_plot_image : result.spearman_linearity_plot_image}`}
                                                        alt="Linearity Scatterplot Matrix"
                                                        className="w-full max-w-3xl"
                                                    />
                                                ) : (
                                                    <div className="w-full max-w-3xl h-64 flex items-center justify-center text-sm text-gray-400">
                                                        No scatterplot matrix returned.
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 dark:group-hover:bg-white/5 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                    <button
                                                        onClick={() => {
                                                            const img = linearityView === 'pearson' ? result.linearity_plot_image : result.spearman_linearity_plot_image;
                                                            if (!img) return;
                                                            setSelectedImage({ url: `data:image/png;base64,${img}`, title: 'Linearity Scatterplot Matrix' });
                                                        }}
                                                        className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 p-3 rounded-full shadow-xl hover:scale-110 transition-transform transform border border-gray-200 dark:border-gray-700"
                                                        title="View Full Size"
                                                    >
                                                        <Maximize2 size={24} />
                                                    </button>
                                                </div>
                                            </div>
                                            {(linearityView === 'pearson' ? result.linearity_plot_image : result.spearman_linearity_plot_image) && renderCustomPlotLabels()}
                                        </div>
                                    )}
                                    {!showScatter && (
                                        <div className="flex items-center gap-2">
                                            <label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 dark:text-gray-400 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={false}
                                                    onChange={(e) => setShowScatter(e.target.checked)}
                                                    className="rounded border-gray-300 cursor-pointer"
                                                />
                                                Show Scatterplot Matrix
                                            </label>
                                        </div>
                                    )}

                                    <div className="mt-4 flex justify-end gap-2">
                                        <button
                                            onClick={() => openInterpretation('Correlation Matrix Report', generateReport(result, 'correlation_matrix'))}
                                            className="text-[10px] px-3 py-1 rounded-full border border-indigo-200 text-indigo-700 dark:text-indigo-300 dark:border-indigo-700 bg-white/60 dark:bg-indigo-900/10 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors font-bold uppercase tracking-wider flex items-center gap-2"
                                            title="Ask AI"
                                        >
                                            <Sparkles size={12} /> Ask AI
                                        </button>
                                        <button
                                            onClick={() => openInterpretation('Correlation Matrix Report', generateReport(result, 'correlation_matrix'))}
                                            className="text-[10px] px-3 py-1 rounded-full border border-indigo-200 text-indigo-700 dark:text-indigo-300 dark:border-indigo-700 bg-white/60 dark:bg-indigo-900/10 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors font-bold uppercase tracking-wider"
                                            title="View Detailed Report"
                                        >
                                            View Detailed Report
                                        </button>
                                    </div>
                                </div>
                            </Card>
                            );
                        })()}
                    </div>
                    )}
                </>
            )}




            {/* Regression Results */}
             {result.mode && result.mode.startsWith('regression') && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">
                     <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700">
                        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 shadow-inner">
                            <Activity size={24}/>
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest">Model Summary</p>
                            <p className="text-xl font-black text-gray-800 dark:text-gray-100">
                                {regressionDisplayLabel}
                            </p>
                        </div>
                    </div>
                    
                    {/* Linear Regression Stats */}
                    {isLinearRegression && result.model_stats && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                             <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 shadow-sm">
                                <div className="text-[10px] uppercase tracking-wide text-gray-500 font-bold mb-1">R-Squared</div>
                                <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{fmt(result.model_stats.r_squared, 3)}</div>
                            </div>
                            <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 shadow-sm">
                                <div className="text-[10px] uppercase tracking-wide text-gray-500 font-bold mb-1">Adj. R-Squared</div>
                                <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{fmt(result.model_stats.adj_r_squared, 3)}</div>
                            </div>
                            <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 shadow-sm">
                                <div className="text-[10px] uppercase tracking-wide text-gray-500 font-bold mb-1">F-Statistic</div>
                                <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{fmt(result.model_stats.f_statistic, 2)}</div>
                            </div>
                            <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 shadow-sm">
                                <div className="text-[10px] uppercase tracking-wide text-gray-500 font-bold mb-1">Model p-value</div>
                                <div className={`text-2xl font-black ${result.model_stats.p_value_model < 0.05 ? 'text-green-500' : 'text-red-500'}`}>
                                    {fmtP(result.model_stats.p_value_model)}
                                </div>
                            </div>
                        </div>
                    )}

                    {isLinearRegression && linearRegressionEquation && (
                        <Card title="Model Equation" icon={Activity}>
                            <div className="space-y-3">
                                <div className="rounded-xl border border-indigo-100 dark:border-indigo-800/40 bg-indigo-50/60 dark:bg-indigo-900/10 px-4 py-3">
                                    <code className="block text-sm md:text-base font-mono font-bold text-indigo-700 dark:text-indigo-300 break-words">
                                        {linearRegressionEquation}
                                    </code>
                                </div>
                                {linearRegressionResponseName && (
                                    <p className="text-xs text-gray-600 dark:text-gray-300">
                                        <span className="font-black uppercase tracking-widest text-gray-400 mr-2">Y</span>
                                        represents <span className="font-semibold text-gray-800 dark:text-gray-100">{linearRegressionResponseName}</span>.
                                    </p>
                                )}
                            </div>
                        </Card>
                    )}
                    
                    {/* Binary Logistic Regression Stats */}
                    {isBinaryLogisticRegression && result.model_stats && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                             <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 shadow-sm">
                                <div className="text-[10px] uppercase tracking-wide text-gray-500 font-bold mb-1">AIC</div>
                                <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{fmt(result.model_stats.aic, 1)}</div>
                            </div>
                            <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 shadow-sm">
                                <div className="text-[10px] uppercase tracking-wide text-gray-500 font-bold mb-1">Null Deviance</div>
                                <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{fmt(result.model_stats.null_deviance, 1)}</div>
                            </div>
                            <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 shadow-sm">
                                <div className="text-[10px] uppercase tracking-wide text-gray-500 font-bold mb-1">Residual Deviance</div>
                                <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{fmt(result.model_stats.residual_deviance ?? result.model_stats.resid_deviance, 1)}</div>
                            </div>
                        </div>
                    )}

                    {/* Ordinal Logistic Regression Stats */}
                    {isOrdinalLogisticRegression && result.model_stats && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                             <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 shadow-sm">
                                <div className="text-[10px] uppercase tracking-wide text-gray-500 font-bold mb-1">AIC</div>
                                <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{fmt(result.model_stats.aic, 1)}</div>
                            </div>
                            <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 shadow-sm">
                                <div className="text-[10px] uppercase tracking-wide text-gray-500 font-bold mb-1">BIC</div>
                                <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{fmt(result.model_stats.bic, 1)}</div>
                            </div>
                            <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 shadow-sm">
                                <div className="text-[10px] uppercase tracking-wide text-gray-500 font-bold mb-1">Pseudo R² (McFadden)</div>
                                <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{fmt(result.model_stats.pseudo_r2_mcfadden, 3)}</div>
                            </div>
                            <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 shadow-sm">
                                <div className="text-[10px] uppercase tracking-wide text-gray-500 font-bold mb-1">LR Test p-value</div>
                                <div className={`text-2xl font-black ${Number(result.model_stats.lr_p_value) < 0.05 ? 'text-green-500' : 'text-red-500'}`}>
                                    {fmtP(result.model_stats.lr_p_value)}
                                </div>
                            </div>
                        </div>
                    )}

                    {!isLinearRegression && result.formula && (
                        <Card title="Model Formula" icon={Activity}>
                            <div className="space-y-3">
                                <div className="rounded-xl border border-indigo-100 dark:border-indigo-800/40 bg-indigo-50/60 dark:bg-indigo-900/10 px-4 py-3">
                                    <code className="block text-sm md:text-base font-mono font-bold text-indigo-700 dark:text-indigo-300 break-words">
                                        {result.formula}
                                    </code>
                                </div>
                                {isOrdinalLogisticRegression && orderedResponseLevels.length > 0 && (
                                    <p className="text-xs text-gray-600 dark:text-gray-300">
                                        Outcome levels are modeled from lowest to highest as <span className="font-semibold text-gray-800 dark:text-gray-100">{orderedResponseLevels.join(' < ')}</span>.
                                    </p>
                                )}
                            </div>
                        </Card>
                    )}

                    {isOrdinalLogisticRegression && orderedResponseLevels.length > 0 && (
                        <Card title="Ordered Outcome Levels" icon={Activity}>
                            <div className="space-y-3">
                                <div className="flex flex-wrap gap-2">
                                    {orderedResponseLevels.map((level) => (
                                        <span key={level} className="px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800 text-xs font-bold">
                                            {level}
                                        </span>
                                    ))}
                                </div>
                                {orderedResponseLevelSource && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Order source: {orderedResponseLevelSource.replace(/_/g, ' ')}.
                                    </p>
                                )}
                            </div>
                        </Card>
                    )}

                    {/* Coefficients Table */}
                    <Card title="Coefficients & Significance" icon={TableIcon} className="overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                                    <tr className="text-xs font-black text-gray-400 uppercase tracking-wider">
                                        <th className="px-6 py-4">Term</th>
                                        <th className="px-6 py-4">Estimate</th>
                                        <th className="px-6 py-4">Std. Error</th>
                                        <th className="px-6 py-4">{isLinearRegression ? 't value' : 'z value'}</th>
                                        <th className="px-6 py-4">{isLinearRegression ? 'Pr(&gt;|t|)' : 'Pr(&gt;|z|)'}</th>
                                        {isLogisticLikeRegression && (
                                            <>
                                                <th className="px-6 py-4 text-indigo-600">Odds Ratio</th>
                                                <th className="px-6 py-4">95% CI (OR)</th>
                                            </>
                                        )}
                                        <th className="px-6 py-4">Sig.</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y dark:divide-gray-800">
                                    {toArray(result.coefficients).length > 0 ? toArray(result.coefficients).map((row, idx) => {
                                        const coefficientType = String(row?.CoefficientType || row?.coefficient_type || '').trim().toLowerCase();
                                        const isThresholdRow = coefficientType === 'threshold';
                                        return (
                                        <tr key={idx} className={`hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors ${row.significance ? 'bg-green-50/10 dark:bg-green-900/5' : ''}`}>
                                            <td className="px-6 py-4 font-bold text-gray-700 dark:text-gray-300">
                                                {row.Term}
                                                {isThresholdRow && (
                                                    <div className="mt-1 text-[10px] uppercase tracking-wider text-gray-400">Threshold</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 font-mono text-xs text-gray-600 dark:text-gray-400 font-semibold">
                                                {row.Estimate != null ? row.Estimate.toFixed(4) : "N/A"}
                                            </td>
                                            <td className="px-6 py-4 font-mono text-xs text-gray-500">
                                                {row.StdError != null && !isNaN(row.StdError) ? row.StdError.toFixed(4) : "N/A"}
                                            </td>
                                            <td className="px-6 py-4 font-mono text-xs text-gray-500">
                                                {isLinearRegression
                                                    ? (row.tValue != null ? row.tValue.toFixed(3) : "N/A")
                                                    : (row.zValue != null ? row.zValue.toFixed(3) : "N/A")
                                                }
                                            </td>
                                            <td className={`px-6 py-4 font-mono text-xs font-bold ${row.significance ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                                                {row.formatted_p || "N/A"}
                                            </td>
                                            {isLogisticLikeRegression && (
                                                <>
                                                    <td className="px-6 py-4 font-mono text-xs text-indigo-600 dark:text-indigo-400 font-bold">
                                                        {!isThresholdRow && row.OddsRatio != null && isFinite(row.OddsRatio) ? row.OddsRatio.toExponential(2) : 'NA'}
                                                    </td>
                                                    <td className="px-6 py-4 font-mono text-xs text-gray-500">
                                                        {!isThresholdRow && row.CI_2_5 != null && isFinite(row.CI_2_5) && row.CI_97_5 != null && isFinite(row.CI_97_5)
                                                          ? `[${row.CI_2_5.toExponential(2)} - ${row.CI_97_5.toExponential(2)}]`
                                                          : 'NA'}
                                                    </td>
                                                </>
                                            )}
                                            <td className="px-6 py-4 text-xs font-bold text-gray-600 dark:text-gray-400">
                                                {row.significance || ""}
                                            </td>
                                        </tr>
                                    );
                                    }) : (
                                        <tr>
                                            <td colSpan={isLogisticLikeRegression ? 8 : 6} className="px-6 py-4 text-center text-gray-500">
                                                No coefficients available.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-2 px-6 pb-2">
                             <p className="text-[10px] text-gray-500 dark:text-gray-400 italic">
                                Significance levels: *** p &lt; 0.001; ** p &lt; 0.01; * p &lt; 0.05; . p &lt; 0.1
                            </p>
                            {isOrdinalLogisticRegression && (
                                <p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400 italic">
                                    Threshold rows are category cut-points for the ordered response and should not be interpreted like predictor odds ratios.
                                </p>
                            )}
                        </div>
                        <div className="mt-4 flex justify-end p-4">
                             <button
                                 onClick={() => openInterpretation('Coefficient Analysis Report', generateReport(result, 'coefficient_summary'))}
                                 className="p-2 rounded-full bg-gray-50 hover:bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:hover:bg-gray-800 dark:text-gray-400 transition-colors"
                                 title="Ask AI to Interpret"
                             >
                                 <Sparkles size={16} />
                             </button>
                         </div>
                    </Card>

                    {isLinearRegression && hasSinglePredictorLinearModel && result.regression_scatter_plot_image && (
                         <Card title="Simple Linear Regression Scatterplot" icon={ChartBarIcon}>
                             <div className="relative group rounded-xl overflow-hidden border dark:border-gray-700 shadow-lg">
                                <img
                                  src={`data:image/png;base64,${result.regression_scatter_plot_image}`}
                                  alt="Simple linear regression scatterplot"
                                  className="w-full object-contain bg-white"
                                />
                                {renderFullscreenButton(
                                    result.regression_scatter_plot_image,
                                    'Simple Linear Regression Scatterplot'
                                )}
                            </div>
                            <p className="mt-3 text-xs text-gray-600 dark:text-gray-300">
                                Observed values with the fitted OLS line and confidence band. This plot is shown when the linear model uses exactly one predictor.
                            </p>
                        </Card>
                    )}

                    {result.regression_publication_plot_image && (
                         <Card title={isLinearRegression ? 'Academic Paper Coefficient Plot' : `${regressionDisplayLabel} Coefficient Plot`} icon={ChartBarIcon}>
                             <div className="relative group rounded-xl overflow-hidden border dark:border-gray-700 shadow-lg">
                                <img
                                  src={`data:image/png;base64,${result.regression_publication_plot_image}`}
                                  alt="Regression coefficient plot with confidence intervals"
                                  className="w-full object-contain bg-white"
                                />
                                {renderFullscreenButton(
                                    result.regression_publication_plot_image,
                                    `${regressionDisplayLabel} Coefficient Plot`
                                )}
                            </div>
                            <p className="mt-3 text-xs text-gray-600 dark:text-gray-300">
                                {isLinearRegression
                                  ? 'Publication-style coefficient plot with 95% confidence intervals. Intercept is omitted to keep the summary focused on predictor effects.'
                                  : 'Publication-style coefficient plot with 95% confidence intervals. Threshold terms are omitted to keep the summary focused on predictor effects.'}
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
                                        onClick={() => setSelectedImage({ url: `data:image/png;base64,${result.image}`, title: "Diagnostic Plots" })}
                                        className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 p-3 rounded-full shadow-xl hover:scale-110 transition-transform transform border border-gray-200 dark:border-gray-700"
                                        title="View Full Size"
                                    >
                                        <Maximize2 size={24} />
                                    </button>
                                </div>
                            </div>
                            {renderCustomPlotLabels()}
                        </Card>
                    ) : null}
                    
                    {/* Prediction Section for Logistic Regression */}
                    {isBinaryLogisticRegression && (
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
             
             {/* Multivariate Analysis Results */}
            {result.mode && result.mode.startsWith('multivariate') && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">
                    <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700">
                        <div className="p-3 bg-pink-100 dark:bg-pink-900/30 rounded-lg text-pink-600 shadow-inner">
                            <Layout size={24}/>
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest">Multivariate Analysis</p>
                            <p className="text-xl font-black text-gray-800 dark:text-gray-100">
                                {result.mode === 'multivariate_pca' ? 'Principal Component Analysis (PCA)' : 
                                 result.mode === 'multivariate_kmeans' ? 'K-Means Clustering' : 'Hierarchical Clustering'}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                         {/* Main Visualization */}
                         <div className="xl:col-span-2 space-y-8">
                            {/* Biplot / Cluster Plot / Dendrogram */}
                            <Card title={result.mode === 'multivariate_hclust' ? 'Dendrogram' : 'Projection Plot'} icon={Maximize2}>
                                 {result.plot_path || result.biplot_path || result.image ? (
                                    <div className="relative group rounded-xl overflow-hidden border dark:border-gray-700 shadow-lg">
                                        <img 
                                            src={`data:image/png;base64,${result.image}`} 
                                            alt="Multivariate Plot" 
                                            className="w-full object-contain bg-white max-h-[600px]" 
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 dark:group-hover:bg-white/5 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                            <button 
                                                onClick={() => setSelectedImage({ url: `data:image/png;base64,${result.image}`, title: "Analysis Plot" })}
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

                            {/* Secondary Plot (Scree or K-Means Optimization) */}
                            {((result.mode === 'multivariate_pca' && result.scree_plot_image) ||
                              (result.mode === 'multivariate_kmeans' && showKmeansOptimization)) && (
                                <Card title={result.mode === 'multivariate_pca' ? 'Scree Plot (Variance)' : 'Cluster Optimization (Elbow & Silhouette)'} icon={ChartBarIcon}>
                                    {result.mode === 'multivariate_pca' ? (
                                        <div className="relative group rounded-xl overflow-hidden border dark:border-gray-700 shadow-lg">
                                            <img 
                                                src={`data:image/png;base64,${result.scree_plot_image}`} 
                                                alt="Secondary Plot" 
                                                className="w-full object-contain bg-white max-h-[400px]" 
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 dark:group-hover:bg-white/5 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                <button 
                                                    onClick={() => setSelectedImage({ url: `data:image/png;base64,${result.scree_plot_image}`, title: 'Scree Plot' })}
                                                    className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 p-3 rounded-full shadow-xl hover:scale-110 transition-transform transform border border-gray-200 dark:border-gray-700"
                                                >
                                                    <Maximize2 size={24} />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                {result.elbow_plot_image ? (
                                                    <div className="relative group rounded-xl overflow-hidden border dark:border-gray-700 shadow-lg">
                                                        <img 
                                                            src={`data:image/png;base64,${result.elbow_plot_image}`} 
                                                            alt="Elbow Method Plot" 
                                                            className="w-full object-contain bg-white max-h-[400px]" 
                                                        />
                                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 dark:group-hover:bg-white/5 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                            <button 
                                                                onClick={() => setSelectedImage({ url: `data:image/png;base64,${result.elbow_plot_image}`, title: 'Elbow Method' })}
                                                                className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 p-3 rounded-full shadow-xl hover:scale-110 transition-transform transform border border-gray-200 dark:border-gray-700"
                                                            >
                                                                <Maximize2 size={24} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="p-6 text-center text-xs text-gray-400 italic">No elbow plot was generated.</div>
                                                )}

                                                {result.silhouette_trend_plot_image ? (
                                                    <div className="relative group rounded-xl overflow-hidden border dark:border-gray-700 shadow-lg">
                                                        <img 
                                                            src={`data:image/png;base64,${result.silhouette_trend_plot_image}`} 
                                                            alt="Silhouette Method Plot" 
                                                            className="w-full object-contain bg-white max-h-[400px]" 
                                                        />
                                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 dark:group-hover:bg-white/5 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                            <button 
                                                                onClick={() => setSelectedImage({ url: `data:image/png;base64,${result.silhouette_trend_plot_image}`, title: 'Silhouette Method' })}
                                                                className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 p-3 rounded-full shadow-xl hover:scale-110 transition-transform transform border border-gray-200 dark:border-gray-700"
                                                            >
                                                                <Maximize2 size={24} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="p-6 text-center text-xs text-gray-400 italic">No silhouette method plot was generated.</div>
                                                )}
                                            </div>

                                            {(result.elbow_plot_error || result.silhouette_trend_plot_error) && (
                                                <div className="mt-3 p-3 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-800/30">
                                                    {result.elbow_plot_error || result.silhouette_trend_plot_error}
                                                </div>
                                            )}

                                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-700 text-center">
                                                    <div className="text-[10px] uppercase tracking-wide text-gray-500 font-bold">K Used</div>
                                                    <div className="text-lg font-black text-indigo-600 dark:text-indigo-400">{Number.isFinite(kUsed) ? kUsed : 'N/A'}</div>
                                                </div>
                                                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-700 text-center">
                                                    <div className="text-[10px] uppercase tracking-wide text-gray-500 font-bold">Elbow Suggested K</div>
                                                    <div className="text-lg font-black text-indigo-600 dark:text-indigo-400">{Number.isFinite(elbowK) ? elbowK : 'N/A'}</div>
                                                </div>
                                                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-700 text-center">
                                                    <div className="text-[10px] uppercase tracking-wide text-gray-500 font-bold">Silhouette Best K</div>
                                                    <div className="text-lg font-black text-indigo-600 dark:text-indigo-400">{Number.isFinite(silhouetteK) ? silhouetteK : 'N/A'}</div>
                                                </div>
                                                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-700 text-center">
                                                    <div className="text-[10px] uppercase tracking-wide text-gray-500 font-bold">Avg Silhouette</div>
                                                    <div className="text-lg font-black text-indigo-600 dark:text-indigo-400">{avgSilhouette != null ? avgSilhouette.toFixed(4) : 'N/A'}</div>
                                                </div>
                                            </div>
                                            {result.cluster_optimization_method && (
                                                <div className="mt-2 text-[11px] text-gray-600 dark:text-gray-300">
                                                    <span className="font-black">Optimization method:</span> {String(result.cluster_optimization_method).toLowerCase()}
                                                </div>
                                            )}
                                            
                                            {result.optimization_data && (
                                                <div className="mt-4 overflow-x-auto">
                                                    <table className="min-w-full text-xs text-left text-gray-500 dark:text-gray-400">
                                                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                                            <tr>
                                                                <th scope="col" className="px-2 py-1">K</th>
                                                                <th scope="col" className="px-2 py-1">Total WSS</th>
                                                                <th scope="col" className="px-2 py-1">Avg Silhouette</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {result.optimization_data.k_values.map((k, i) => (
                                                                <tr key={k} className={k === kUsed ? "bg-indigo-100 dark:bg-indigo-900 font-bold" : "bg-white dark:bg-gray-800 border-b dark:border-gray-700"}>
                                                                    <td className="px-2 py-1">{k}</td>
                                                                    <td className="px-2 py-1">{Number(result.optimization_data.wss[i]).toFixed(2)}</td>
                                                                    <td className="px-2 py-1">{k > 1 ? Number(result.optimization_data.silhouette[i]).toFixed(4) : "-"}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </Card>
                            )}
                        </div>
                    </div>
                </div>
            )}
             
            {/* Inferential Statistics Results (ANOVA, T-Test, Normality, Bartlett) */}
            {result.mode === 'inferential' && (
                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">
                    {/* Chi-Square Test Result */}
                    {result.chisq && (
                        <Card title="Chi-Square Test of Independence" icon={FlaskConical}>
                            <div className="space-y-6">
                                <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800/30">
                                    <h4 className="font-bold text-indigo-900 dark:text-indigo-100 mb-2">{result.chisq.message}</h4>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                        <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Chi-Square (<span className="font-serif italic">χ²</span>)</div>
                                        <div className="text-2xl font-black text-gray-800 dark:text-gray-100">{result.chisq.statistic}</div>
                                    </div>
                                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                        <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">p-value</div>
                                        <div className={`text-2xl font-black ${result.chisq.is_significant ? 'text-green-600 dark:text-green-400' : 'text-gray-800 dark:text-gray-100'}`}>
                                            {result.chisq.formatted_p}
                                        </div>
                                    </div>
                                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                        <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Cramer's V</div>
                                        <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{result.chisq.cramers_v}</div>
                                        <div className="text-[10px] text-blue-500 uppercase font-bold mt-1">{result.chisq.effect_size_label}</div>
                                    </div>
                                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                        <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">df</div>
                                        <div className="text-2xl font-black text-gray-800 dark:text-gray-100">{result.chisq.df}</div>
                                    </div>
                                </div>
                                <div className="rounded-lg border border-indigo-100 dark:border-indigo-800 bg-white/70 dark:bg-black/20 p-3 text-xs text-indigo-700 dark:text-indigo-300">
                                    <span className="font-black uppercase tracking-wider text-indigo-500">Correction:</span>{' '}
                                    {result.chisq.correction_label || 'N/A'} (option: {result.chisq.correction_option || 'auto'})
                                </div>
                                {result.chisq?.goodness_of_fit && (
                                    <div className={`rounded-lg border p-3 text-xs ${
                                        result.chisq.goodness_of_fit?.is_significant
                                            ? 'border-green-200 bg-green-50/70 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200'
                                            : 'border-slate-200 bg-slate-50/80 text-slate-700 dark:border-slate-700 dark:bg-slate-900/20 dark:text-slate-200'
                                    }`}>
                                        <div className="font-black uppercase tracking-wider mb-2">
                                            Chi-square Goodness-of-Fit ({result.chisq.goodness_of_fit?.variable || 'Response'})
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                            <div><span className="font-black">Chi-squared:</span> {Number.isFinite(Number(result.chisq.goodness_of_fit?.statistic)) ? Number(result.chisq.goodness_of_fit.statistic).toFixed(3) : 'N/A'}</div>
                                            <div><span className="font-black">df:</span> {Number.isFinite(Number(result.chisq.goodness_of_fit?.df)) ? Number(result.chisq.goodness_of_fit.df).toFixed(3) : 'N/A'}</div>
                                            <div><span className="font-black">p-value:</span> {result.chisq.goodness_of_fit?.formatted_p || 'N/A'}</div>
                                        </div>
                                        <div className="mt-2 leading-relaxed">{result.chisq.goodness_of_fit?.message || 'N/A'}</div>
                                    </div>
                                )}

                                <div className="mt-4 flex justify-end">
                                        <button
                                            onClick={() => openInterpretation('Chi-Square Test', generateReport(result, 'chisq'))}
                                            className="p-2 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 dark:text-indigo-400 transition-colors"
                                            title="Ask AI to Interpret"
                                        >
                                            <Sparkles size={16} />
                                        </button>
                                </div>
                            </div>
                        </Card>
                    )}

                     {/* Normality Results */}
                    {/* Normality Results (Hidden for Chi-Square) */}
                    {result.shapiro && result.test_type !== 'chi_squared' && (() => {
                        const shapiroEntries = Object.entries(result.shapiro);
                        const allNormal = shapiroEntries.every(([, r]) => r.is_normal);
                        const normalCount = shapiroEntries.filter(([, r]) => r.is_normal).length;
                        const isResidualNormality = ['anova_residuals', 'rm_anova_residuals'].includes(result.normality_scope);
                        const residualNormalityNote = result.normality_scope === 'rm_anova_residuals'
                            ? 'Two-way repeated/mixed ANOVA uses residual normality: model residuals are tested with Shapiro-Wilk, with Q-Q diagnostics shown below.'
                            : 'Two-way between × between uses residual normality: ANOVA was fit, Shapiro-Wilk was applied to model residuals, and Q-Q diagnostics are shown below.';
                        return (
                        <section className="space-y-5">
                            {/* Section header matching style of Step 02, Step 03 */}
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1 rounded-full w-fit">
                                Step 01: Normality Assessment (Shapiro-Wilk)
                            </h3>

                            {/* Summary overview strip */}
                            <div className="flex flex-wrap gap-3 items-center p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Variables tested:</span>
                                    <span className="font-black text-slate-700 dark:text-slate-200 text-sm">{shapiroEntries.length}</span>
                                </div>
                                <div className="h-4 w-px bg-slate-300 dark:bg-slate-600" />
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Normal:</span>
                                    <span className="font-black text-green-600 dark:text-green-400 text-sm">{normalCount}</span>
                                </div>
                                <div className="h-4 w-px bg-slate-300 dark:bg-slate-600" />
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Non-normal:</span>
                                    <span className="font-black text-amber-600 dark:text-amber-400 text-sm">{shapiroEntries.length - normalCount}</span>
                                </div>
                                <div className="ml-auto">
                                    <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-wider ${allNormal ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                                        {allNormal ? '✓ All Normal' : '⚠ Non-Normality Detected'}
                                    </span>
                                </div>
                            </div>
                            {isResidualNormality && (
                                <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-900/20 px-4 py-3 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                                    {residualNormalityNote}
                                </div>
                            )}

                            {/* Compact summary table */}
                            <Card title="Shapiro-Wilk Normality Test — Results by Variable" icon={CheckCircle2}>
                                <div className="space-y-5">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50 dark:bg-slate-900/60 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200 dark:border-slate-700">
                                                    <th className="px-4 py-3">Variable / Group</th>
                                                    <th className="px-4 py-3 text-center">W Statistic</th>
                                                    <th className="px-4 py-3 text-center">p-value</th>
                                                    <th className="px-4 py-3 text-center">Normality</th>
                                                    <th className="px-4 py-3">p-value Scale</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                {shapiroEntries.map(([spec, res], idx) => {
                                                    const pNum = typeof res.p_value === 'number' ? res.p_value : null;
                                                    const barWidth = pNum !== null ? Math.min(100, Math.round(pNum * 100)) : 0;
                                                    const isNorm = res.is_normal;
                                                    return (
                                                        <tr key={spec} className={`transition-colors hover:bg-slate-50/60 dark:hover:bg-white/5 ${idx % 2 === 0 ? '' : 'bg-slate-50/30 dark:bg-white/[0.02]'}`}>
                                                            <td className="px-4 py-3">
                                                                <span className="font-black text-slate-700 dark:text-slate-200 text-xs">{spec}</span>
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                                                    {res.statistic != null ? Number(res.statistic).toFixed(4) : 'N/A'}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <span className={`font-mono text-sm font-black ${isNorm ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                                                    p = {res.formatted_p || 'N/A'}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <span className={`inline-block text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider ${isNorm ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'}`}>
                                                                    {isNorm ? '✓ Normal' : '✗ Non-Normal'}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden min-w-[60px]">
                                                                        <div
                                                                            className={`h-2 rounded-full transition-all ${isNorm ? 'bg-green-500' : 'bg-amber-500'}`}
                                                                            style={{ width: `${barWidth}%` }}
                                                                        />
                                                                    </div>
                                                                    <span className="text-[10px] text-slate-400 font-bold w-8 text-right">
                                                                        {barWidth}%
                                                                    </span>
                                                                </div>
                                                                <div className="text-[9px] text-slate-400 mt-0.5">α threshold: 5%</div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Shapiro-Wilk guidance box */}
                                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-800/30">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2">Shapiro-Wilk Test Guide</div>
                                        <div className="text-xs text-indigo-700 dark:text-indigo-300 space-y-2">
                                            <div><strong>Null Hypothesis (H₀):</strong> The data follows a normal distribution.</div>
                                            <div><strong>Decision:</strong> p ≥ 0.05 → <span className="text-green-600 dark:text-green-400 font-bold">Fail to reject H₀</span> (Normal). p &lt; 0.05 → <span className="text-amber-600 dark:text-amber-400 font-bold">Reject H₀</span> (Non-Normal).</div>
                                            <div><strong>W statistic:</strong> Ranges from 0 to 1. Values close to 1 indicate normality.</div>
                                            <div><strong>Note:</strong> Sensitive to sample size. For n &gt; 50, consider Q-Q plots as additional evidence.</div>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                            {isResidualNormality && result.residual_qq_plot_generated && result.residual_qq_plot_image && (
                                <Card title="Residual Q-Q Plot" icon={Activity}>
                                    <div className="flex flex-col items-center justify-center space-y-3 p-3">
                                        <div className="relative group w-full">
                                            <img
                                                src={`data:image/png;base64,${result.residual_qq_plot_image}`}
                                                alt="Residual Q-Q Plot"
                                                className="w-full h-auto rounded-xl border border-gray-200 dark:border-gray-800"
                                            />
                                            {renderFullscreenButton(result.residual_qq_plot_image, 'Residual Q-Q Plot')}
                                        </div>
                                        <p className="text-[11px] text-gray-600 dark:text-gray-300">
                                            {result.normality_scope === 'rm_anova_residuals'
                                                ? 'Normality is evaluated on model residuals for two-way repeated/mixed ANOVA.'
                                                : 'Normality is evaluated on ANOVA residuals for two-way between × between designs.'}
                                        </p>
                                    </div>
                                </Card>
                            )}

                            {/* Conclusion & Direction card */}
                            <Card title="Conclusion & Direction" icon={FlaskConical}>
                                <div className="h-full flex flex-col justify-center gap-4">
                                    {allNormal ? (
                                        <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-100 dark:border-green-800 text-center space-y-3">
                                            <div className="inline-block p-3 bg-green-500 text-white rounded-full shadow-lg shadow-green-500/30">
                                                <CheckCircle2 size={32} />
                                            </div>
                                            <h4 className="text-xl font-black text-green-700 dark:text-green-400">Parametric Ready</h4>
                                            <p className="text-sm text-green-600 dark:text-green-500 font-medium">
                                                All {shapiroEntries.length} variable{shapiroEntries.length > 1 ? 's' : ''} follow a normal distribution (p ≥ 0.05).
                                                You may proceed with parametric tests such as ANOVA or T-Tests.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="p-6 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-800 text-center space-y-3">
                                            <div className="inline-block p-3 bg-amber-500 text-white rounded-full shadow-lg shadow-amber-500/30">
                                                <Activity size={32} />
                                            </div>
                                            <h4 className="text-xl font-black text-amber-700 dark:text-amber-400">Non-Parametric Suggested</h4>
                                            <p className="text-sm text-amber-600 dark:text-amber-500 font-medium">
                                                {shapiroEntries.length - normalCount} of {shapiroEntries.length} variable{shapiroEntries.length > 1 ? 's are' : ' is'} NOT normally distributed (p &lt; 0.05).
                                                Non-parametric alternatives such as Kruskal-Wallis or Mann-Whitney are recommended.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </Card>

                            <div className="flex justify-end">
                                <button
                                    onClick={() => openInterpretation('Normality Test Report', generateReport(result, 'normality'))}
                                    className="p-2 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 dark:text-indigo-400 transition-colors"
                                    title="Ask AI to Interpret"
                                >
                                    <Sparkles size={16} />
                                </button>
                            </div>
                        </section>
                        );
                    })()}

                    {/* Bartlett's Test Results (Parametric only) */}
                    {(() => {
                        const isSrh = result.test_type === 'scheirer_ray_hare' || result.srh;
                        const showBartlett = !isSrh && (result.bartlett || result.levene) && (result.path_taken === 'parametric' || result.anova || result.ttest || result.rm_anova || result.is_factorial || result.main_effect_A || result.main_effect_B || result.interaction);
                        if (!showBartlett) return null;
                        const mixedBetweenScope = result?.levene?.scope === 'mixed_between_factor_subject_means'
                            || result?.bartlett?.scope === 'mixed_between_factor_subject_means';
                        const homogeneityStepLabel = mixedBetweenScope
                            ? 'Step 02A: Homogeneity (Between Factor Only)'
                            : 'Step 02: Homogeneity of Variance';
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
                                    {homogeneityStepLabel}
                                </h3>
                                {mixedBetweenScope && (
                                    <div className="rounded-xl border border-indigo-300/70 dark:border-indigo-700/60 bg-indigo-50/60 dark:bg-indigo-900/20 px-4 py-3 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                                        This is the between-subject homogeneity check. Mauchly sphericity appears in a separate section.
                                    </div>
                                )}
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
                                    <div className="mt-4 flex justify-end">
                                        <button
                                            onClick={() => openInterpretation("Levene's Test Report", generateReport(result, 'levene'))}
                                            className="p-2 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 dark:text-indigo-400 transition-colors"
                                            title="Ask AI to Interpret"
                                        >
                                            <Sparkles size={16} />
                                        </button>
                                    </div>
                                </section>
                            );
                        }
                        return (
                        <section className="space-y-4">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1 rounded-full w-fit">
                                {homogeneityStepLabel}
                            </h3>
                            {mixedBetweenScope && (
                                <div className="rounded-xl border border-indigo-300/70 dark:border-indigo-700/60 bg-indigo-50/60 dark:bg-indigo-900/20 px-4 py-3 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                                    This is the between-subject homogeneity check. Mauchly sphericity appears in a separate section.
                                </div>
                            )}
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
                                        <div><strong>Decision:</strong> p &ge; 0.05 means "Yes, equal spread" (Good). p &lt; 0.05 means "No, different spread" (Caution).</div>
                                        <div><strong>Note:</strong> If this fails (p &lt; 0.05), we might need special tests (like Welch's ANOVA) to be accurate.</div>
                                        <div><strong>Example:</strong> p = 0.03 means Variances are unequal. Standard ANOVA might be wrong.</div>
                                    </div>
                                </div>
                                <div className="mt-4 flex justify-end">
                                    <button
                                        onClick={() => openInterpretation('Bartlett\'s Test Report', generateReport(result, 'bartlett'))}
                                        className="p-2 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 dark:text-indigo-400 transition-colors"
                                        title="Ask AI to Interpret"
                                    >
                                        <Sparkles size={16} />
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
                                    <div className="p-4 rounded-xl border bg-purple-50/40 border-purple-100 dark:bg-purple-900/10 dark:border-purple-800 space-y-3">
                                        <div className="flex justify-between items-center bg-gray-50 dark:bg-black/20 p-2 rounded-lg border dark:border-gray-800">
                                            <span className="text-[10px] font-black uppercase text-gray-400">W statistic:</span>
                                            <span className="text-xs font-mono font-bold text-purple-400">
                                                {fmt(result.rm_anova.mauchly_w, 4)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center bg-gray-50 dark:bg-black/20 p-2 rounded-lg border dark:border-gray-800">
                                            <span className="text-[10px] font-black uppercase text-gray-400">p-value:</span>
                                            <span className={`text-sm font-mono font-black ${result.rm_anova.sphericity_violated ? 'text-amber-600' : 'text-green-600'}`}>
                                                p = {result.rm_anova.mauchly_formatted_p || 'N/A'}
                                            </span>
                                        </div>
                                        <div className={`text-xs font-bold ${result.rm_anova.sphericity_violated ? 'text-amber-600' : 'text-green-600'}`}>
                                            {result.rm_anova.sphericity_violated ? 'Sphericity violated: correction required.' : 'Sphericity satisfied: no correction required.'}
                                        </div>
                                    </div>
                                </Card>

                                <Card title="Correction Decision (GG/HF)" icon={Activity}>
                                    <div className="p-4 rounded-xl border bg-purple-50/40 border-purple-100 dark:bg-purple-900/10 dark:border-purple-800 space-y-3">
                                        <div className="flex justify-between items-center bg-gray-50 dark:bg-black/20 p-2 rounded-lg border dark:border-gray-800">
                                            <span className="text-[10px] font-black uppercase text-gray-400">applied:</span>
                                            <span className="text-xs font-mono font-bold text-purple-400">
                                                {result.rm_anova.correction_used === 'none' ? 'None' : result.rm_anova.correction_used}
                                            </span>
                                        </div>
                                        <div className="text-xs font-mono text-gray-700 dark:text-gray-300">
                                            GG: eps = {fmt(result.rm_anova.gg_epsilon, 3)} | p = {result.rm_anova.gg_formatted_p || 'N/A'}
                                        </div>
                                        <div className="text-xs font-mono text-gray-700 dark:text-gray-300">
                                            HF: eps = {fmt(result.rm_anova.hf_epsilon, 3)} | p = {result.rm_anova.hf_formatted_p || 'N/A'}
                                        </div>
                                        <div className="text-xs font-mono text-gray-700 dark:text-gray-300 border-t dark:border-gray-800 pt-2">
                                            Uncorrected p = {result.rm_anova.formatted_p_uncorrected || 'N/A'} | Final p = {result.rm_anova.formatted_p || 'N/A'}
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        </section>
                    )}

                    {/* Mauchly + Sphericity (Factorial within/mixed path) */}
                    {result.path_taken === 'parametric'
                        && result.is_factorial
                        && !result.rm_anova
                        && result.sphericity_checks
                        && typeof result.sphericity_checks === 'object'
                        && Object.keys(result.sphericity_checks).length > 0 && (
                        <section className="space-y-4">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-purple-500 bg-purple-50 dark:bg-purple-900/20 px-3 py-1 rounded-full w-fit">
                                Step 02B: Mauchly Test of Sphericity
                            </h3>
                            <div className="rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50/60 dark:bg-purple-900/20 px-4 py-3 text-xs font-semibold text-purple-700 dark:text-purple-300">
                                This block shows Mauchly-based sphericity checks. Levene/Bartlett are separate homogeneity tests.
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {Object.entries(result.sphericity_checks).map(([effectName, sph]) => {
                                    const effectKey = effectName || 'Effect';
                                    const row = (sph && typeof sph === 'object') ? sph : {};
                                    const applicable = row.applicable === true;
                                    const violated = applicable
                                        ? (row.sphericity_violated === true ? 'Yes' : row.sphericity_violated === false ? 'No' : 'N/A')
                                        : 'N/A';
                                    const correction = applicable
                                        ? (String(row.correction_used || '').toLowerCase() === 'none'
                                            ? 'None'
                                            : formatCorrectionName(row.correction_used, true))
                                        : 'N/A';
                                    return (
                                        <Card key={`factorial_sphericity_${effectKey}`} title={`Sphericity: ${effectKey}`} icon={Activity}>
                                            <div className="p-4 rounded-xl border bg-purple-50/40 border-purple-100 dark:bg-purple-900/10 dark:border-purple-800 space-y-3">
                                                {!applicable ? (
                                                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                                                        {row.message || 'Sphericity is not required for this effect.'}
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="flex justify-between items-center bg-gray-50 dark:bg-black/20 p-2 rounded-lg border dark:border-gray-800">
                                                            <span className="text-[10px] font-black uppercase text-gray-400">Mauchly W:</span>
                                                            <span className="text-sm font-mono font-bold text-purple-400">{Number.isFinite(Number(row.mauchly_w)) ? fmt(row.mauchly_w, 4) : 'N/A'}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center bg-gray-50 dark:bg-black/20 p-2 rounded-lg border dark:border-gray-800">
                                                            <span className="text-[10px] font-black uppercase text-gray-400">Mauchly p:</span>
                                                            <span className={`text-sm font-mono font-black ${row.sphericity_violated ? 'text-amber-600' : 'text-green-600'}`}>
                                                                p = {row.mauchly_formatted_p || fmtP(row.mauchly_p)}
                                                            </span>
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono text-gray-700 dark:text-gray-200">
                                                            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-black/20 p-2">
                                                                GG: eps = {Number.isFinite(Number(row.gg_epsilon)) ? fmt(row.gg_epsilon, 3) : 'N/A'} | p = {row.p_gg != null ? fmtP(row.p_gg) : 'N/A'}
                                                            </div>
                                                            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-black/20 p-2">
                                                                HF: eps = {Number.isFinite(Number(row.hf_epsilon)) ? fmt(row.hf_epsilon, 3) : 'N/A'} | p = {row.p_hf != null ? fmtP(row.p_hf) : 'N/A'}
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                                            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-black/20 p-2 text-gray-700 dark:text-gray-200">
                                                                <span className="font-black uppercase text-gray-500">Violated:</span> {violated}
                                                            </div>
                                                            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-black/20 p-2 text-gray-700 dark:text-gray-200">
                                                                <span className="font-black uppercase text-gray-500">Correction:</span> {correction}
                                                            </div>
                                                        </div>
                                                        <div className="text-xs font-mono text-gray-700 dark:text-gray-200 border-t dark:border-gray-800 pt-2">
                                                            Final corrected p = {row.formatted_p_final || fmtP(row.p_final)}
                                                        </div>
                                                        {row.message && (
                                                            <div className="text-xs leading-relaxed text-gray-700 dark:text-gray-200">{row.message}</div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>
                            {result.sphericity_plot_generated && result.sphericity_plot_image && (
                                <Card title="Sphericity Plot (Mauchly/Corrected p-values)" icon={Activity}>
                                    <div className="flex flex-col items-center justify-center space-y-3 p-3">
                                        <div className="relative group w-full">
                                            <img
                                                src={`data:image/png;base64,${result.sphericity_plot_image}`}
                                                alt="Sphericity Plot"
                                                className="w-full h-auto rounded-xl border border-gray-200 dark:border-gray-800"
                                            />
                                            {renderFullscreenButton(result.sphericity_plot_image, 'Sphericity Plot')}
                                        </div>
                                        <p className="text-[11px] text-gray-600 dark:text-gray-300">
                                            Visual summary of Mauchly p-values and final corrected p-values across factorial effects.
                                        </p>
                                    </div>
                                </Card>
                            )}
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
                                                {renderFullscreenButton(result.interaction_plot_image || result.image, 'Interaction Plot')}
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
                                                            <th className="px-6 py-4">95% CI</th>
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
                                                                    [{Number.isFinite(Number(item.lwr)) ? Number(item.lwr).toFixed(2) : 'N/A'}, {Number.isFinite(Number(item.upr)) ? Number(item.upr).toFixed(2) : 'N/A'}]
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
                                                            <th className="px-6 py-4">95% CI</th>
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
                                    {(() => {
                                        const extraRows = [
                                            ...(Array.isArray(result.holm_posthoc) ? result.holm_posthoc : []),
                                            ...(Array.isArray(result.art_posthoc) ? result.art_posthoc : []),
                                            ...(Array.isArray(result.dunn) ? result.dunn : [])
                                        ];
                                        if (extraRows.length === 0) return null;
                                        return (
                                            <Card title="Additional Pairwise Results" icon={Activity}>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left text-sm">
                                                        <thead className="bg-gray-50 dark:bg-black/20 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                            <tr>
                                                                <th className="px-6 py-4">Term</th>
                                                                <th className="px-6 py-4">Comparison</th>
                                                                <th className="px-6 py-4">Statistic</th>
                                                                <th className="px-6 py-4">P-Value (Adj)</th>
                                                                <th className="px-6 py-4">Result</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y dark:divide-gray-800">
                                                            {extraRows.map((item, idx) => (
                                                                <tr key={`two_way_extra_${idx}`} className={`hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors ${item.is_significant ? 'bg-green-50/20 dark:bg-green-900/5' : ''}`}>
                                                                    <td className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300">{item.term || 'N/A'}</td>
                                                                    <td className="px-6 py-4 font-bold text-gray-700 dark:text-gray-300">{item.comparison || 'N/A'}</td>
                                                                    <td className="px-6 py-4 font-mono text-xs text-gray-600 dark:text-gray-400">
                                                                        {Number.isFinite(Number(item.t_stat ?? item.z_value ?? item.statistic))
                                                                            ? Number(item.t_stat ?? item.z_value ?? item.statistic).toFixed(3)
                                                                            : 'N/A'}
                                                                    </td>
                                                                    <td className={`px-6 py-4 font-mono text-xs font-black ${item.is_significant ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                                                                        p = {item.formatted_p || 'N/A'}
                                                                    </td>
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
                                        );
                                    })()}
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
                                                <div><strong>Main effects:</strong> "Does Factor A/B change the ranked outcome?" (p &lt; 0.05 means Yes).</div>
                                                <div><strong>Interaction:</strong> "Does Factor A work differently depending on Factor B?" (p &lt; 0.05 means Yes).</div>
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
                                                <div><strong>Main effects:</strong> "Does Factor A change the result?" (p &lt; 0.05 means Yes).</div>
                                                <div><strong>Interaction:</strong> "Does Factor A work differently depending on Factor B?" (p &lt; 0.05 means Yes).</div>
                                                <div><strong>Effect size (eta-squared):</strong> Conventional benchmarks are 0.01 (small), 0.06 (medium), and 0.14 (large).</div>
                                                <div><strong>Interaction interpretation:</strong> If interaction p &lt; 0.05, report simple effects rather than isolated main effects.</div>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-4 flex justify-end">
                                    <button
                                        onClick={() => openInterpretation(
                                            result.test_type === 'scheirer_ray_hare' || result.srh
                                                ? 'Scheirer-Ray-Hare Report'
                                                : (result.test_type === 'art_factorial' || result.art)
                                                    ? 'ART Factorial Report'
                                                    : 'ANOVA Factorial Report',
                                            generateReport(result, 'two_way_anova')
                                        )}
                                        className="p-2 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 dark:text-purple-400 transition-colors"
                                        title="Ask AI to Interpret"
                                    >
                                        <Sparkles size={16} />
                                    </button>
                                </div>
                            </section>
                        </>
                    )}

                    {/* Parametric Path: One-Way ANOVA or T-Test */}
                    {result.path_taken === 'parametric' && !result.is_factorial && (
                        <>
                            {result.rm_anova && (
                                <section className="space-y-4">
                                    <div className="mb-2 inline-flex items-center px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 text-[10px] font-black uppercase tracking-[0.2em] text-purple-600 dark:text-purple-300">
                                        More Than 2 Groups
                                    </div>
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-purple-500 bg-purple-50 dark:bg-purple-900/20 px-3 py-1 rounded-full w-fit">
                                        Step 03: Repeated Measures ANOVA
                                    </h3>
                                    <Card title="RM ANOVA Results" icon={Activity}>
                                        <div className="p-4 rounded-xl border bg-purple-50/40 border-purple-100 dark:bg-purple-900/10 dark:border-purple-800 space-y-3">
                                            <div className="flex justify-between items-center bg-gray-50 dark:bg-black/20 p-2 rounded-lg border dark:border-gray-800">
                                                <span className="text-[10px] font-black uppercase text-gray-400">p-value:</span>
                                                <span className={`text-sm font-mono font-black ${result.rm_anova.is_significant ? 'text-purple-600' : 'text-gray-600'}`}>
                                                    p = {result.rm_anova.formatted_p}
                                                </span>
                                            </div>
                                            <div className="text-xs font-mono text-gray-600 dark:text-gray-300">
                                                F = {fmt(result.rm_anova.statistic, 3)} | df = {result.rm_anova.df1}, {result.rm_anova.df2}
                                            </div>
                                            <div className="rounded-lg border border-purple-100 dark:border-purple-800 bg-white/70 dark:bg-black/20 p-3 text-xs leading-relaxed text-purple-700 dark:text-purple-200">
                                                <span className="font-black uppercase tracking-wider text-purple-500">Significance and Effect:</span>{' '}
                                                {rmAnovaEffectSummary(result.rm_anova).text}
                                            </div>
                                            <p className="text-sm font-semibold">{result.rm_anova.message}</p>
                                            <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-black/30 p-3">
                                                <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">Console Output (aov-style)</div>
                                                <pre className="mt-2 whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-gray-700 dark:text-gray-200">
                                                    {buildRmAnovaROutput(result.rm_anova, result.rm_anova_posthoc, result.rm_anova_table_rows)}
                                                </pre>
                                            </div>
                                        </div>
                                    </Card>
                                    {result.rm_anova_posthoc && (
                                        <>
                                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-purple-500 bg-purple-50 dark:bg-purple-900/20 px-3 py-1 rounded-full w-fit">
                                                Step 04: Post-hoc Pairwise Tests
                                            </h3>
                                            <Card title="Post-hoc (Pairwise Paired t-Tests, Bonferroni)" icon={Activity}>
                                                <div className="space-y-3">
                                                    <div className="text-xs text-slate-600 dark:text-slate-300">
                                                        Post-hoc method: pairwise paired t-test with Bonferroni correction.
                                                    </div>
                                                    <div className="overflow-x-auto">
                                                    <table className="w-full text-left text-sm">
                                                        <thead className="bg-gray-50 dark:bg-black/20 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                            <tr>
                                                                <th className="px-4 py-3">Comparison</th>
                                                                <th className="px-4 py-3">Adjusted p-value</th>
                                                                <th className="px-4 py-3">Result</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y dark:divide-gray-800">
                                                            {toArray(result.rm_anova_posthoc).map((item, idx) => (
                                                                <tr key={idx}>
                                                                    <td className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">{item.comparison}</td>
                                                                    <td className="px-4 py-3 font-mono text-xs">p = {item.formatted_p}</td>
                                                                    <td className="px-4 py-3 text-xs font-bold">
                                                                        {item.is_significant ? 'Significant' : 'NS'}
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
                                    {result.rm_spaghetti_ci_plot_image && (
                                        <Card title="Spaghetti Plot + Mean ± 95% CI" icon={Activity}>
                                            <div className="flex flex-col items-center justify-center space-y-4 p-4">
                                                <div className="relative group w-full max-w-5xl bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border-2 dark:border-gray-800 p-2 shadow-2xl">
                                                    <img
                                                        src={`data:image/png;base64,${result.rm_spaghetti_ci_plot_image}`}
                                                        alt="RM ANOVA Spaghetti Plot with Mean and 95% CI"
                                                        className="w-full h-auto rounded-xl"
                                                    />
                                                    {renderFullscreenButton(result.rm_spaghetti_ci_plot_image, 'RM ANOVA Spaghetti Plot + Mean ± 95% CI')}
                                                </div>
                                            </div>
                                            {renderCustomPlotLabels()}
                                        </Card>
                                    )}
                                    <div className="mt-4 flex justify-end">
                                        <button
                                            onClick={() => openInterpretation('RM ANOVA Report', generateReport(result, 'rm_anova'))}
                                            className="p-2 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 dark:text-purple-400 transition-colors"
                                            title="Ask AI to Interpret"
                                        >
                                            <Sparkles size={16} />
                                        </button>
                                    </div>
                                </section>
                            )}

                            {result.ttest && (
                                <div className="mb-2 inline-flex items-center px-3 py-1 rounded-full bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-100 dark:border-cyan-800 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-300">
                                    2 Groups
                                </div>
                            )}
                            {/* T-Test Results (Two-Group Comparison) */}
                            {result.ttest && (
                                <section className="space-y-4">
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-cyan-500 bg-cyan-50 dark:bg-cyan-900/20 px-3 py-1 rounded-full w-fit">
                                        Step 03: {result.ttest.test_name}
                                    </h3>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <Card title="T-Test Results" icon={FlaskConical}>
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
                                                    <p className="text-xs text-gray-500 mt-2">95% CI: [{result.ttest.ci_lower.toFixed(3)}, {result.ttest.ci_upper.toFixed(3)}]</p>
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
                                    {result.ttest_mean_ci_plot_image && (
                                        <Card title="Mean ± 95% CI Plot" icon={Activity}>
                                            <div className="flex flex-col items-center justify-center space-y-4 p-4">
                                                <div className="relative group w-full max-w-4xl bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border-2 dark:border-gray-800 p-2 shadow-2xl">
                                                    <img
                                                        src={`data:image/png;base64,${result.ttest_mean_ci_plot_image}`}
                                                        alt="T-Test Mean and 95% CI Plot"
                                                        className="w-full h-auto rounded-xl"
                                                    />
                                                    {renderFullscreenButton(result.ttest_mean_ci_plot_image, 'T-Test Mean ± 95% CI Plot')}
                                                </div>
                                            </div>
                                            {renderCustomPlotLabels()}
                                        </Card>
                                    )}
                                    <div className="mt-4 p-4 bg-cyan-50 dark:bg-cyan-900/10 rounded-xl border border-cyan-100 dark:border-cyan-800/30">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-cyan-500 mb-2">T‑Test Guide</div>
                                        <div className="text-xs text-cyan-700 dark:text-cyan-300 space-y-2">
                                            <div><strong>Null hypothesis (H0):</strong> mean_1 = mean_2.</div>
                                            <div><strong>Decision rule:</strong> Reject H0 when p &lt; 0.05.</div>
                                            <div><strong>Effect size:</strong> Cohen's d benchmarks are 0.2 (small), 0.5 (medium), and 0.8 (large).</div>
                                            <div><strong>Recommended reporting:</strong> t(df) = statistic, p = value, d = value, and 95% CI.</div>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex justify-end">
                                        <button
                                            onClick={() => openInterpretation('T-Test Report', generateReport(result, 't_test'))}
                                        className="p-2 rounded-full bg-cyan-50 hover:bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:hover:bg-cyan-900/50 dark:text-cyan-400 transition-colors"
                                        title="Ask AI to Interpret"
                                    >
                                        <Sparkles size={16} />
                                    </button>
                                    </div>
                                </section>
                            )}

                            {/* ANOVA Results */}
                            {result.anova && (
                                <div className="mt-6 mb-2 inline-flex items-center px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-300">
                                    More Than 2 Groups
                                </div>
                            )}
                            {result.anova && (
                                <section className="space-y-4">
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1 rounded-full w-fit">
                                        Step 03: {result.anova.test_type === 'welch' ? "Welch's ANOVA" : "One-Way ANOVA"}
                                    </h3>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <Card title="ANOVA Test Results" icon={FlaskConical}>
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
                                                            <FlaskConical size={32} />
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
                                                                        ? (Number(row.p_value) < 0.05 ? 'Yes' : 'No')
                                                                        : '')}
                                                                </td>
                                                                <td className="px-4 py-3 text-right font-mono">
                                                                    {row?.is_residual ? '' : (row?.p_value != null && Number.isFinite(Number(row.p_value))
                                                                        ? (Number(row.p_value) < 0.001 ? '***' : Number(row.p_value) < 0.01 ? '**' : Number(row.p_value) < 0.05 ? '*' : '')
                                                                        : '')}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div className="mt-3 text-[11px] font-mono text-gray-600 dark:text-gray-300">
                                                Stars: *** p &lt; 0.001, ** p &lt; 0.01, * p &lt; 0.05
                                            </div>
                                        </Card>
                                    )}
                                    {renderPublicationDescriptiveTable(result)}
                                    <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-800/30">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2">ANOVA Guide</div>
                                        <div className="text-xs text-indigo-700 dark:text-indigo-300 space-y-2">
                                            <div><strong>Null hypothesis (H0):</strong> all group means are equal.</div>
                                            <div><strong>Decision rule:</strong> Reject H0 when p &lt; 0.05.</div>
                                            <div><strong>Interpretation:</strong> A significant omnibus result requires multiplicity-adjusted post-hoc testing.</div>
                                            <div><strong>Recommended reporting:</strong> F(df1, df2) = statistic, p = value, followed by post-hoc results.</div>
                                            <div><strong>Post-hoc:</strong> {result.anova.test_type === 'welch' ? 'Games-Howell (used after Welch ANOVA when variances are unequal).' : 'Tukey HSD (used when variances are equal).'}</div>
                                        </div>
                                    </div>
                                    {(result.mean_ci_plot_image || result.anova_plot_image || result.anova_residual_plot_image || result.residual_qq_plot_image) && (
                                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                                            {result.mean_ci_plot_image && (
                                                <Card title="Mean ± 95% CI Plot" icon={Activity}>
                                                    <div className="relative group">
                                                        <img
                                                            src={`data:image/png;base64,${result.mean_ci_plot_image}`}
                                                            alt="Group mean with 95% confidence intervals"
                                                            className="w-full h-auto rounded-xl"
                                                        />
                                                        {renderFullscreenButton(result.mean_ci_plot_image, 'ANOVA Mean ± 95% CI Plot')}
                                                    </div>
                                                </Card>
                                            )}
                                            {result.anova_plot_image && (
                                                <Card title="ANOVA Test Plot" icon={Activity}>
                                                    <div className="relative group">
                                                        <img
                                                            src={`data:image/png;base64,${result.anova_plot_image}`}
                                                            alt="One-way ANOVA test plot"
                                                            className="w-full h-auto rounded-xl"
                                                        />
                                                        {renderFullscreenButton(result.anova_plot_image, 'ANOVA Test Plot')}
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
                                                        {renderFullscreenButton(result.anova_residual_plot_image, 'ANOVA Residuals vs Fitted')}
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
                                                        {renderFullscreenButton(result.residual_qq_plot_image, 'ANOVA Residual Q-Q Plot')}
                                                    </div>
                                                </Card>
                                            )}
                                        </div>
                                    )}
                                    {(result.mean_ci_plot_image || result.anova_plot_image || result.anova_residual_plot_image || result.residual_qq_plot_image) && (
                                        renderCustomPlotLabels()
                                    )}
                                    <div className="mt-4 flex justify-end">
                                        <button
                                            onClick={() => openInterpretation('ANOVA Report', generateReport(result, 'anova'))}
                                        className="p-2 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 dark:text-indigo-400 transition-colors"
                                        title="Ask AI to Interpret"
                                    >
                                        <Sparkles size={16} />
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
                                                            <th className="px-6 py-4">95% CI</th>
                                                            <th className="px-6 py-4">P-Value (Adj)</th>
                                                            <th className="px-6 py-4">Sig</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y dark:divide-gray-800">
                                                        {toArray(result.tukey).map((item, idx) => (
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
                                        {renderPublicationDescriptiveTable(result)}
                                        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-800/30">
                                            <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2">Tukey HSD Guide</div>
                                            <div className="text-xs text-indigo-700 dark:text-indigo-300 space-y-2">
                                                <div><strong>What is this?:</strong> It compares every group against every other group (like a round-robin tournament).</div>
                                                <div><strong>Adjusted p-values:</strong> We cheat a bit (adjust the math) so we don't find accidental "fake" differences.</div>
                                                <div><strong>Interpretation:</strong> p &lt; 0.05? Those two specific groups are different.</div>
                                                <div><strong>Example:</strong> "A vs B" has p=0.02. That means A and B are truly different.</div>
                                            </div>
                                        </div>
                                        <div className="mt-4 flex justify-end">
                                            <button
                                                onClick={() => openInterpretation('Post-hoc Test Report (Tukey)', generateReport(result, 'post_hoc'))}
                                                className="p-2 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 dark:text-indigo-400 transition-colors"
                                                title="Ask AI to Interpret"
                                            >
                                                <Sparkles size={16} />
                                            </button>
                                        </div>

                                        {result.image ? (
                                            <Card title="Tukey HSD Visualization" icon={Activity}>
                                                <div className="flex flex-col items-center justify-center space-y-4 p-4">
                                                    <div className="relative group w-full max-w-4xl bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border-2 dark:border-gray-800 p-2 shadow-2xl">
                                                        <img 
                                                            src={`data:image/png;base64,${result.image}`} 
                                                            alt="Tukey HSD Boxplot" 
                                                            className="w-full h-auto rounded-xl"
                                                        />
                                                        {renderFullscreenButton(result.image, 'Tukey HSD Visualization')}
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
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
                                                        Publication-Ready Boxplot with CLD & Mean Crossbars
                                                    </p>
                                                </div>
                                                {renderCustomPlotLabels()}
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
                                                            <th className="px-6 py-4">95% CI</th>
                                                            <th className="px-6 py-4">t-statistic</th>
                                                            <th className="px-6 py-4">df</th>
                                                            <th className="px-6 py-4">P-Value (Adj)</th>
                                                            <th className="px-6 py-4">Result</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y dark:divide-gray-800">
                                                        {toArray(result.games_howell).map((item, idx) => (
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
                                                <div><strong>Interpretation:</strong> p &lt; 0.05? Those two specific groups are different.</div>
                                                <div><strong>Why use it?:</strong> It's safer when your data is messy (unequal spread).</div>
                                                <div><strong>Example:</strong> "A vs C" has p=0.01. They are different.</div>
                                            </div>
                                        </div>
                                        <div className="mt-4 flex justify-end">
                                            <button
                                                onClick={() => openInterpretation('Post-hoc Test Report (Games-Howell)', generateReport(result, 'post_hoc'))}
                                                className="p-2 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 dark:text-amber-400 transition-colors"
                                                title="Ask AI to Interpret"
                                            >
                                                <Sparkles size={16} />
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
                                                        {renderFullscreenButton(result.image, 'Games-Howell Visualization')}
                                                    </div>
                                                </div>
                                                {renderCustomPlotLabels()}
                                            </Card>
                                        ) : null}
                                    </div>
                                </section>
                            )}
                        </>
                    )}

                    {/* Non-Parametric Path: Mann-Whitney/Wilcoxon, Friedman, or Kruskal-Wallis */}
                    {result.path_taken === 'non-parametric' && (twoGroupNonParamResult || result.friedman || result.kruskal) && (
                        <>
                            {result.friedman && (
                                <section className="space-y-4">
                                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 dark:text-amber-300">
                                        More Than 2 Groups
                                    </div>
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-3 py-1 rounded-full w-fit">
                                        Step 03: Friedman Test (Repeated Measures)
                                    </h3>
                                    <Card title="Friedman Results" icon={Activity}>
                                        <div className="p-4 rounded-xl border bg-amber-50/40 border-amber-100 dark:bg-amber-900/10 dark:border-amber-800 space-y-3">
                                            <div className="flex justify-between items-center bg-gray-50 dark:bg-black/20 p-2 rounded-lg border dark:border-gray-800">
                                                <span className="text-[10px] font-black uppercase text-gray-400">p-value:</span>
                                                <span className={`text-sm font-mono font-black ${result.friedman.is_significant ? 'text-amber-600' : 'text-gray-600'}`}>
                                                    p = {result.friedman.formatted_p}
                                                </span>
                                            </div>
                                            <div className="text-xs font-mono text-gray-600 dark:text-gray-300">
                                                Chi-squared = {fmt(result.friedman.statistic, 3)} | df = {result.friedman.df}
                                            </div>
                                            <p className="text-sm font-semibold">{result.friedman.message}</p>
                                            <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-black/30 p-3">
                                                <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">Console Output (friedman.test)</div>
                                                <pre className="mt-2 whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-gray-700 dark:text-gray-200">
                                                    {buildFriedmanROutput(result.friedman, result.friedman_posthoc)}
                                                </pre>
                                            </div>
                                        </div>
                                    </Card>
                                    {result.friedman_posthoc && (
                                        <Card title="Post-hoc (Nemenyi)" icon={Activity}>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-sm">
                                                    <thead className="bg-gray-50 dark:bg-black/20 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                        <tr>
                                                            <th className="px-4 py-3">Comparison</th>
                                                            <th className="px-4 py-3">Q</th>
                                                            <th className="px-4 py-3">Adjusted p-value</th>
                                                            <th className="px-4 py-3">Result</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y dark:divide-gray-800">
                                                        {toArray(result.friedman_posthoc).map((item, idx) => (
                                                            <tr key={idx}>
                                                                <td className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">{item.comparison}</td>
                                                                <td className="px-4 py-3 font-mono text-xs">{Number.isFinite(Number(item.statistic)) ? Number(item.statistic).toFixed(3) : 'N/A'}</td>
                                                                <td className="px-4 py-3 font-mono text-xs">p = {item.formatted_p}</td>
                                                                <td className="px-4 py-3 text-xs font-bold">
                                                                    {item.is_significant ? 'Significant' : 'NS'}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </Card>
                                    )}
                                    <div className="mt-4 flex justify-end">
                                        <button
                                            onClick={() => openInterpretation('Friedman Test Report', generateReport(result, 'friedman'))}
                                            className="p-2 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 dark:text-amber-400 transition-colors"
                                            title="Ask AI to Interpret"
                                        >
                                            <Sparkles size={16} />
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
                                                    {renderFullscreenButton(result.friedman_spaghetti_iqr_plot_image, 'Friedman Spaghetti Plot + Median ± IQR')}
                                                </div>
                                            </div>
                                            {renderCustomPlotLabels()}
                                        </Card>
                                    )}
                                </section>
                            )}

                            {twoGroupNonParamResult && (
                                <section className="space-y-4">
                                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 dark:text-amber-300">
                                        2 Groups
                                    </div>
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-3 py-1 rounded-full w-fit">
                                        Step 03: {twoGroupNonParamResult.test_name || 'Two-Group Non-Parametric Test'}
                                    </h3>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <Card title="Non-Parametric Test Results" icon={Activity}>
                                            <div className="space-y-4">
                                                <div className="p-4 rounded-xl border bg-amber-50/40 border-amber-100 dark:bg-amber-900/10 dark:border-amber-800">
                                                    <p className="text-sm font-semibold mb-3">{twoGroupNonParamResult.message}</p>
                                                    <div className="flex flex-col gap-2 border-t dark:border-gray-800 pt-4 mt-2">
                                                        <div className="flex justify-between items-center bg-gray-50 dark:bg-black/20 p-2 rounded-lg border dark:border-gray-800">
                                                            <span className="text-[10px] font-black uppercase text-gray-400">test p-value:</span>
                                                            <span className={`text-sm font-mono font-black ${twoGroupNonParamResult.is_significant ? 'text-green-600' : 'text-gray-600'}`}>p = {twoGroupNonParamResult.formatted_p}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center bg-gray-50 dark:bg-black/20 p-2 rounded-lg border dark:border-gray-800">
                                                            <span className="text-[10px] font-black uppercase text-gray-400">{result.mann_whitney ? 'U-statistic:' : 'V-statistic:'}</span>
                                                            <span className="text-sm font-mono font-black text-gray-700 dark:text-gray-300">
                                                                {Number.isFinite(Number(twoGroupNonParamResult.statistic))
                                                                    ? Number(twoGroupNonParamResult.statistic).toFixed(4)
                                                                    : 'N/A'}
                                                            </span>
                                                        </div>
                                                        {(Number.isFinite(Number(twoGroupNonParamResult.rank_biserial)) || twoGroupNonParamResult.rank_biserial_formatted) && (
                                                            <div className="flex justify-between items-center bg-gray-50 dark:bg-black/20 p-2 rounded-lg border dark:border-gray-800">
                                                                <span className="text-[10px] font-black uppercase text-gray-400">Rank-biserial:</span>
                                                                <span className="text-sm font-mono font-black text-gray-700 dark:text-gray-300">
                                                                    {Number.isFinite(Number(twoGroupNonParamResult.rank_biserial))
                                                                        ? Number(twoGroupNonParamResult.rank_biserial).toFixed(3)
                                                                        : (twoGroupNonParamResult.rank_biserial_formatted || 'N/A')}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>

                                        <Card title="Group Comparison" icon={Activity}>
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="p-4 rounded-xl border bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800">
                                                        <p className="text-[10px] font-black uppercase text-gray-400 mb-2">
                                                            {twoGroupNonParamResult.group1}
                                                        </p>
                                                        <p className="text-2xl font-black text-blue-600 dark:text-blue-400">
                                                            {Number.isFinite(Number(twoGroupNonParamResult.median1))
                                                                ? Number(twoGroupNonParamResult.median1).toFixed(3)
                                                                : 'N/A'}
                                                        </p>
                                                        <p className="text-xs text-gray-500 mt-2">Median</p>
                                                    </div>
                                                    <div className="p-4 rounded-xl border bg-purple-50 dark:bg-purple-900/10 border-purple-100 dark:border-purple-800">
                                                        <p className="text-[10px] font-black uppercase text-gray-400 mb-2">
                                                            {twoGroupNonParamResult.group2}
                                                        </p>
                                                        <p className="text-2xl font-black text-purple-600 dark:text-purple-400">
                                                            {Number.isFinite(Number(twoGroupNonParamResult.median2))
                                                                ? Number(twoGroupNonParamResult.median2).toFixed(3)
                                                                : 'N/A'}
                                                        </p>
                                                        <p className="text-xs text-gray-500 mt-2">Median</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>
                                    </div>

                                    <Card title="Interpretation" icon={Activity}>
                                        {twoGroupNonParamResult.is_significant ? (
                                            <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-100 dark:border-green-800 text-center space-y-3">
                                                <div className="inline-block p-3 bg-green-500 text-white rounded-full shadow-lg shadow-green-500/30">
                                                    <Activity size={32} />
                                                </div>
                                                <h4 className="text-xl font-black text-green-700 dark:text-green-400">Significant Difference</h4>
                                                <p className="text-sm text-green-600 dark:text-green-500 font-medium">
                                                    The two groups have significantly different distributions.
                                                </p>
                                                {twoGroupNonParamResult.rank_biserial_interpretation && (
                                                    <p className="text-xs text-green-700 dark:text-green-300 font-medium">
                                                        {twoGroupNonParamResult.rank_biserial_interpretation}
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="p-6 bg-gray-50 dark:bg-gray-900/20 rounded-2xl border border-gray-100 dark:border-gray-800 text-center space-y-3">
                                                <div className="inline-block p-3 bg-gray-400 text-white rounded-full shadow-lg shadow-gray-400/30">
                                                    <Activity size={32} />
                                                </div>
                                                <h4 className="text-xl font-black text-gray-700 dark:text-gray-400">No Significant Difference</h4>
                                                <p className="text-sm text-gray-600 dark:text-gray-500 font-medium">
                                                    The two groups do not show a statistically significant distribution difference.
                                                </p>
                                                {twoGroupNonParamResult.rank_biserial_interpretation && (
                                                    <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                                                        {twoGroupNonParamResult.rank_biserial_interpretation}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </Card>
                                    {result.mann_whitney && result.mann_whitney_boxplot_image && (
                                        <Card title="Boxplot + Raw Points" icon={Activity}>
                                            <div className="flex flex-col items-center justify-center space-y-4 p-4">
                                                <div className="relative group w-full max-w-4xl bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border-2 dark:border-gray-800 p-2 shadow-2xl">
                                                    <img
                                                        src={`data:image/png;base64,${result.mann_whitney_boxplot_image}`}
                                                        alt="Mann-Whitney boxplot with raw points"
                                                        className="w-full h-auto rounded-xl"
                                                    />
                                                    {renderFullscreenButton(result.mann_whitney_boxplot_image, 'Mann-Whitney Boxplot + Raw Points')}
                                                </div>
                                            </div>
                                            {renderCustomPlotLabels()}
                                        </Card>
                                    )}
                                    <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-800/30">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-2">
                                            {result.mann_whitney ? 'Mann‑Whitney Guide' : 'Wilcoxon Guide'}
                                        </div>
                                        <div className="text-xs text-amber-700 dark:text-amber-300 space-y-2">
                                            <div><strong>Use case:</strong> {result.mann_whitney ? 'Two independent groups with non-normal data.' : 'Two paired or matched groups with non-normal data.'}</div>
                                            <div><strong>Decision:</strong> p &lt; 0.05 means the two group distributions differ significantly.</div>
                                            <div><strong>Interpretation:</strong> Compare medians and context to understand the practical difference.</div>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex justify-end">
                                        <button
                                            onClick={() => openInterpretation(
                                                `${twoGroupNonParamResult.test_name || 'Two-Group Non-Parametric'} Report`,
                                                generateReport(result, twoGroupNonParamReportType || 'mann_whitney')
                                            )}
                                            className="p-2 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 dark:text-amber-400 transition-colors"
                                            title="Ask AI to Interpret"
                                        >
                                            <Sparkles size={16} />
                                        </button>
                                    </div>
                                </section>
                            )}

                            {result.kruskal && (
                                <>
                                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 dark:text-amber-300">
                                        More Than 2 Groups
                                    </div>
                                    <section className="space-y-4">
                                        <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#131313] shadow-[0_4px_20px_rgba(0,0,0,0.4)] overflow-visible">
                                            {/* Title Header */}
                                            <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(255,255,255,0.06)]">
                                                <div className="flex items-center gap-3">
                                                    <Activity size={18} className="text-[#f59e0b]" style={{ filter: 'drop-shadow(0 0 4px rgba(245, 158, 11, 0.5))' }} />
                                                    <h3 className="text-sm font-bold text-[#f59e0b] tracking-wider uppercase" style={{ textShadow: '0 0 8px rgba(245, 158, 11, 0.3)' }}>KRUSKAL-WALLIS RESULTS</h3>
                                                </div>
                                            </div>
                                            
                                            <div className="relative">
                                                {/* Compact Black Table */}
                                                <div className="min-w-full">
                                                    {/* Table Header */}
                                                    <div className="flex border-b border-[rgba(255,255,255,0.06)] px-4 py-3 bg-[#131313]">
                                                        <div className="w-1/4 text-[9px] font-bold uppercase tracking-wider text-[rgba(229,226,225,0.4)]">Statistic</div>
                                                        <div className="w-1/4 text-[9px] font-bold uppercase tracking-wider text-[rgba(229,226,225,0.4)] text-center">Chi-squared</div>
                                                        <div className="w-1/4 text-[9px] font-bold uppercase tracking-wider text-[rgba(229,226,225,0.4)] text-center">p-value</div>
                                                        <div className="w-1/4 text-[9px] font-bold uppercase tracking-wider text-[rgba(229,226,225,0.4)] text-center">Status</div>
                                                    </div>
                                                    
                                                    {/* Table Row */}
                                                    <div 
                                                        className="relative flex border-b border-[rgba(255,255,255,0.04)] px-4 py-2.5 hover:bg-[rgba(255,255,255,0.02)] cursor-pointer transition-colors group/row overflow-visible"
                                                    >
                                                        <div className="w-1/4 text-xs font-semibold text-[#E5E2E1]">Kruskal-Wallis</div>
                                                        <div className="w-1/4 text-xs font-mono text-[rgba(229,226,225,0.6)] text-center">{result.kruskal.statistic?.toFixed(3)}</div>
                                                        <div className="w-1/4 text-xs font-mono font-bold text-[#f59e0b] text-center">p = {result.kruskal.formatted_p}</div>
                                                        <div className="w-1/4 flex justify-center">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold ${
                                                                result.kruskal.is_significant
                                                                    ? 'bg-[rgba(34,197,94,0.1)] text-[#22c55e]'
                                                                    : 'bg-[rgba(156,163,175,0.1)] text-[#9ca3af]'
                                                            }`}>
                                                                {result.kruskal.is_significant ? '✓ Sig' : '— NS'}
                                                            </span>
                                                        </div>
                                                        
                                                        {/* Floating Card on Hover */}
                                                        <div className="absolute right-0 top-full z-[100] invisible group-hover/row:visible opacity-0 group-hover/row:opacity-100 transition-all duration-200 pointer-events-none group-hover/row:pointer-events-auto" style={{ marginTop: '8px' }}>
                                                            <div className="w-80 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#131313] shadow-[0_8px_32px_rgba(0,0,0,0.8)] overflow-hidden">
                                                                {/* Floating Card Header */}
                                                                <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.06)] bg-[#0d0d12]">
                                                                    <div className="flex items-center justify-between">
                                                                        <h4 className="text-sm font-bold text-[#E9FEFF]">Kruskal-Wallis Test</h4>
                                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                                                                            result.kruskal.is_significant
                                                                                ? 'bg-[rgba(34,197,94,0.15)] text-[#22c55e]'
                                                                                : 'bg-[rgba(156,163,175,0.15)] text-[#9ca3af]'
                                                                        }`}>
                                                                            {result.kruskal.is_significant ? '✓ Significant' : '— Not Significant'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                
                                                                {/* Floating Card Body */}
                                                                <div className="p-4 space-y-3">
                                                                    {/* Message */}
                                                                    <p className="text-xs text-[rgba(229,226,225,0.7)] leading-relaxed">{result.kruskal.message}</p>
                                                                    
                                                                    {/* Stats Grid */}
                                                                    <div className="grid grid-cols-2 gap-3">
                                                                        <div className="p-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
                                                                            <p className="text-[9px] font-bold uppercase tracking-wider text-[rgba(229,226,225,0.4)] mb-1">Chi-squared</p>
                                                                            <p className="text-lg font-bold font-mono text-[#f59e0b]">{result.kruskal.statistic?.toFixed(4)}</p>
                                                                        </div>
                                                                        <div className="p-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
                                                                            <p className="text-[9px] font-bold uppercase tracking-wider text-[rgba(229,226,225,0.4)] mb-1">p-value</p>
                                                                            <p className="text-lg font-bold font-mono text-[#f59e0b]">{result.kruskal.formatted_p}</p>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    {/* Interpretation */}
                                                                    <div className={`p-3 rounded-lg border ${
                                                                        result.kruskal.is_significant
                                                                            ? 'bg-[rgba(34,197,94,0.05)] border-[rgba(34,197,94,0.15)]'
                                                                            : 'bg-[rgba(156,163,175,0.05)] border-[rgba(156,163,175,0.15)]'
                                                                    }`}>
                                                                        <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: result.kruskal.is_significant ? '#22c55e' : '#9ca3af' }}>
                                                                            {result.kruskal.is_significant ? 'Significant Difference' : 'No Significant Difference'}
                                                                        </p>
                                                                        <p className="text-xs text-[rgba(229,226,225,0.6)]">
                                                                            {result.kruskal.is_significant
                                                                                ? 'Median values differ significantly. Proceed with Dunn post-hoc test.'
                                                                                : 'No significant difference observed in group distributions.'}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        {renderPublicationDescriptiveTable(result)}
                                        <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-800/30">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-2">Kruskal‑Wallis Guide</div>
                                        <div className="text-xs text-amber-700 dark:text-amber-300 space-y-2">
                                            <div><strong>Null hypothesis (H0):</strong> group distributions are equal in central tendency.</div>
                                            <div><strong>Decision rule:</strong> Reject H0 when p &lt; 0.05.</div>
                                            <div><strong>Interpretation:</strong> A significant omnibus result should be followed by Dunn pairwise tests.</div>
                                            <div><strong>Recommended reporting:</strong> chi-square(df) = statistic, p = value.</div>
                                        </div>
                                    </div>
                                        <div className="mt-4 flex justify-end">
                                            <button
                                                onClick={() => openInterpretation('Kruskal‑Wallis Report', generateReport(result, 'kruskal_wallis'))}
                                                className="p-2 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 dark:text-amber-400 transition-colors"
                                                title="Ask AI to Interpret"
                                            >
                                                <Sparkles size={16} />
                                            </button>
                                        </div>
                                    </section>

                                    {/* Dunn's Post-Hoc Test Results */}
                                    {result.dunn && (
                                        <section className="space-y-4">
                                            <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#131313] shadow-[0_4px_20px_rgba(0,0,0,0.4)] overflow-visible">
                                                {/* Title Header */}
                                                <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(255,255,255,0.06)]">
                                                    <div className="flex items-center gap-3">
                                                        <Activity size={18} className="text-[#f59e0b]" style={{ filter: 'drop-shadow(0 0 4px rgba(245, 158, 11, 0.5))' }} />
                                                        <h3 className="text-sm font-bold text-[#f59e0b] tracking-wider uppercase" style={{ textShadow: '0 0 8px rgba(245, 158, 11, 0.3)' }}>DUNN'S POST-HOC TEST (BONFERRONI)</h3>
                                                    </div>
                                                </div>
                                                
                                                <div className="relative">
                                                    {/* Compact Black Table */}
                                                    <div className="min-w-full overflow-x-auto">
                                                        {/* Table Header */}
                                                        <div className="flex border-b border-[rgba(255,255,255,0.06)] px-4 py-3 bg-[#131313]" style={{ minWidth: '700px' }}>
                                                            <div className="flex-[2] text-[9px] font-bold uppercase tracking-wider text-[rgba(229,226,225,0.4)]">Comparison</div>
                                                            <div className="flex-[1.2] text-[9px] font-bold uppercase tracking-wider text-[rgba(229,226,225,0.4)] text-center">Z-Statistic</div>
                                                            <div className="flex-[1.2] text-[9px] font-bold uppercase tracking-wider text-[rgba(229,226,225,0.4)] text-center">P-Value (Adj)</div>
                                                            <div className="flex-[1] text-[9px] font-bold uppercase tracking-wider text-[rgba(229,226,225,0.4)] text-center">Result</div>
                                                        </div>
                                                        
                                                        {/* Table Rows */}
                                                        {toArray(result.dunn).map((item, idx) => (
                                                            <div 
                                                                key={idx}
                                                                className={`relative flex border-b border-[rgba(255,255,255,0.04)] px-4 py-2.5 hover:bg-[rgba(255,255,255,0.02)] cursor-pointer transition-colors group/row overflow-visible ${item.is_significant ? 'bg-[rgba(34,197,94,0.03)]' : ''}`}
                                                                style={{ minWidth: '700px' }}
                                                            >
                                                                <div className="flex-[2] text-xs font-semibold text-[#E5E2E1] truncate pr-2">{item.comparison}</div>
                                                                <div className="flex-[1.2] text-xs font-mono text-[rgba(229,226,225,0.6)] text-center">
                                                                    {Number.isFinite(Number(item.z_value ?? item.statistic))
                                                                        ? Number(item.z_value ?? item.statistic).toFixed(4)
                                                                        : 'N/A'}
                                                                </div>
                                                                <div className={`flex-[1.2] text-xs font-mono font-bold text-center ${item.is_significant ? 'text-[#22c55e]' : 'text-[#9ca3af]'}`}>
                                                                    p = {item.formatted_p}
                                                                </div>
                                                                <div className="flex-[1] flex justify-center">
                                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold ${
                                                                        item.is_significant
                                                                            ? 'bg-[rgba(34,197,94,0.1)] text-[#22c55e]'
                                                                            : 'bg-[rgba(156,163,175,0.1)] text-[#9ca3af]'
                                                                    }`}>
                                                                        {item.is_significant ? '✓ Sig' : '— NS'}
                                                                    </span>
                                                                </div>
                                                                
                                                                {/* Floating Card on Hover */}
                                                                <div className="absolute right-0 top-full z-[200] invisible group-hover/row:visible opacity-0 group-hover/row:opacity-100 transition-all duration-200 pointer-events-none group-hover/row:pointer-events-auto" style={{ marginTop: '8px', zIndex: 9999 }}>
                                                                    <div className="w-[420px] rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#131313] shadow-[0_12px_40px_rgba(0,0,0,0.9)] overflow-visible" style={{ zIndex: 10000 }}>
                                                                        {/* Floating Card Header */}
                                                                        <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.06)] bg-[#0d0d12]">
                                                                            <div className="flex items-center justify-between">
                                                                                <h4 className="text-sm font-bold text-[#E9FEFF] truncate">{item.comparison}</h4>
                                                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                                                                                    item.is_significant
                                                                                        ? 'bg-[rgba(34,197,94,0.15)] text-[#22c55e]'
                                                                                        : 'bg-[rgba(156,163,175,0.15)] text-[#9ca3af]'
                                                                                }`}>
                                                                                    {item.is_significant ? '✓ Significant' : '— Not Significant'}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                        
                                                                        {/* Floating Card Body */}
                                                                        <div className="p-4 space-y-3">
                                                                            {/* Stats Grid */}
                                                                            <div className="grid grid-cols-2 gap-3">
                                                                                <div className="p-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
                                                                                    <p className="text-[9px] font-bold uppercase tracking-wider text-[rgba(229,226,225,0.4)] mb-1">Z-Statistic</p>
                                                                                    <p className="text-lg font-bold font-mono text-[#f59e0b]">
                                                                                        {Number.isFinite(Number(item.z_value ?? item.statistic))
                                                                                            ? Number(item.z_value ?? item.statistic).toFixed(4)
                                                                                            : 'N/A'}
                                                                                    </p>
                                                                                </div>
                                                                                <div className="p-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
                                                                                    <p className="text-[9px] font-bold uppercase tracking-wider text-[rgba(229,226,225,0.4)] mb-1">Adj. p-value</p>
                                                                                    <p className="text-lg font-bold font-mono text-[#f59e0b]">{item.formatted_p}</p>
                                                                                </div>
                                                                            </div>
                                                                            
                                                                            {/* Interpretation */}
                                                                            <div className={`p-3 rounded-lg border ${
                                                                                item.is_significant
                                                                                    ? 'bg-[rgba(34,197,94,0.05)] border-[rgba(34,197,94,0.15)]'
                                                                                    : 'bg-[rgba(156,163,175,0.05)] border-[rgba(156,163,175,0.15)]'
                                                                            }`}>
                                                                                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: item.is_significant ? '#22c55e' : '#9ca3af' }}>
                                                                                    {item.is_significant ? 'Significant Difference' : 'No Significant Difference'}
                                                                                </p>
                                                                                <p className="text-xs text-[rgba(229,226,225,0.6)]">
                                                                                    {item.is_significant
                                                                                        ? 'These two groups differ significantly after Bonferroni adjustment.'
                                                                                        : 'No significant difference observed between these groups.'}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                                {renderPosthocDescriptiveTable(result)}
                                                <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-800/30">
                                                    <div className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-2">Dunn’s Test Guide</div>
                                                    <div className="text-xs text-amber-700 dark:text-amber-300 space-y-2">
                                                        <div><strong>Purpose:</strong> Pairwise rank-based comparisons after a significant Kruskal-Wallis test.</div>
                                                        <div><strong>Adjusted p-values:</strong> Bonferroni correction controls family-wise Type I error.</div>
                                                        <div><strong>Decision rule:</strong> Adjusted p &lt; 0.05 indicates a significant pairwise difference.</div>
                                                        <div><strong>Recommended reporting:</strong> comparison, z statistic, adjusted p-value, and direction from medians.</div>
                                                    </div>
                                                </div>
                                                <div className="mt-4 flex justify-end">
                                                    <button
                                                        onClick={() => openInterpretation('Post-hoc Test Report (Dunn)', generateReport(result, 'post_hoc'))}
                                                        className="p-2 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 dark:text-amber-400 transition-colors"
                                                        title="Ask AI to Interpret"
                                                    >
                                                        <Sparkles size={16} />
                                                    </button>
                                                </div>

                                                {result.image ? (
                                                    <Card title="Dunn's Visualization" icon={Activity}>
                                                        <div className="flex flex-col items-center justify-center space-y-4 p-4">
                                                            <div className="relative group w-full max-w-4xl bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border-2 dark:border-gray-800 p-2 shadow-2xl">
                                                                <img 
                                                                    src={`data:image/png;base64,${result.image}`} 
                                                                    alt="Dunn's Post-hoc Boxplot" 
                                                                    className="w-full h-auto rounded-xl"
                                                                />
                                                                {renderFullscreenButton(result.image, "Dunn's Visualization")}
                                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
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
                                                                Publication-Ready Boxplot with CLD
                                                            </p>
                                                        </div>
                                                        {renderCustomPlotLabels()}
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
                                        </section>
                                    )}
                                </>
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
                                    {Array.isArray(modelSummaryReport.generatedPlots) && modelSummaryReport.generatedPlots.length > 0 && (
                                        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-black/20 p-4 space-y-3">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="text-xs font-black uppercase tracking-widest text-slate-500">Plot Titles, Axes, And Notes</div>
                                                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                                                    Applied to PDF/CSV/XLSX report captions
                                                </span>
                                            </div>
                                            <div className="space-y-3">
                                                {modelSummaryReport.generatedPlots.map((plot, idx) => {
                                                    const rawMeta = plotMetadataByKey?.[plot.key];
                                                    const titleValue = rawMeta && Object.prototype.hasOwnProperty.call(rawMeta, 'title')
                                                        ? rawMeta.title
                                                        : plot.title;
                                                    const xLabelValue = rawMeta && Object.prototype.hasOwnProperty.call(rawMeta, 'xLabel')
                                                        ? rawMeta.xLabel
                                                        : (plot.xLabel || '');
                                                    const yLabelValue = rawMeta && Object.prototype.hasOwnProperty.call(rawMeta, 'yLabel')
                                                        ? rawMeta.yLabel
                                                        : (plot.yLabel || '');
                                                    const infoValue = rawMeta && Object.prototype.hasOwnProperty.call(rawMeta, 'info')
                                                        ? rawMeta.info
                                                        : (plot.info || '');
                                                    return (
                                                        <div key={`plot_meta_${plot.key || idx}`} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-black/20 p-3 space-y-2">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <div className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                                                                    Plot {idx + 1}: {plot.baseTitle || plot.title}
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => resetPlotMetadata(plot.key)}
                                                                    className="text-[10px] px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                                                >
                                                                    Reset
                                                                </button>
                                                            </div>
                                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                                                <label className="space-y-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
                                                                    Title
                                                                    <input
                                                                        value={titleValue}
                                                                        onChange={(e) => updatePlotMetadataField(plot.key, 'title', e.target.value)}
                                                                        placeholder={plot.baseTitle || 'Plot title'}
                                                                        className="mt-1 w-full rounded-lg border border-slate-200/80 dark:border-slate-700 bg-white/80 dark:bg-slate-900/70 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-cyan-300/40"
                                                                    />
                                                                </label>
                                                                <label className="space-y-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
                                                                    X Axis
                                                                    <input
                                                                        value={xLabelValue}
                                                                        onChange={(e) => updatePlotMetadataField(plot.key, 'xLabel', e.target.value)}
                                                                        placeholder="e.g. Group / Time"
                                                                        className="mt-1 w-full rounded-lg border border-slate-200/80 dark:border-slate-700 bg-white/80 dark:bg-slate-900/70 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-cyan-300/40"
                                                                    />
                                                                </label>
                                                                <label className="space-y-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
                                                                    Y Axis
                                                                    <input
                                                                        value={yLabelValue}
                                                                        onChange={(e) => updatePlotMetadataField(plot.key, 'yLabel', e.target.value)}
                                                                        placeholder="e.g. Mean Score"
                                                                        className="mt-1 w-full rounded-lg border border-slate-200/80 dark:border-slate-700 bg-white/80 dark:bg-slate-900/70 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-cyan-300/40"
                                                                    />
                                                                </label>
                                                            </div>
                                                            <label className="space-y-1 text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                                                                Additional Info
                                                                <textarea
                                                                    value={infoValue}
                                                                    onChange={(e) => updatePlotMetadataField(plot.key, 'info', e.target.value)}
                                                                    placeholder="Short interpretation note or context to appear with this plot in the report."
                                                                    rows={2}
                                                                    className="mt-1 w-full rounded-lg border border-slate-200/80 dark:border-slate-700 bg-white/80 dark:bg-slate-900/70 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-cyan-300/40 resize-y"
                                                                />
                                                            </label>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
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

                                    {Array.isArray(modelSummaryReport.factorialSphericityRows) && modelSummaryReport.factorialSphericityRows.length > 0 && (
                                        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-black/20 p-4 space-y-3">
                                            <div className="text-xs font-black uppercase tracking-widest text-slate-500">Mauchly And Sphericity (Factorial)</div>
                                            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                                                <table className="min-w-full text-xs text-left">
                                                    <thead className="bg-slate-100 dark:bg-slate-800 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-300">
                                                        <tr>
                                                            <th className="px-3 py-2 font-black">Effect</th>
                                                            <th className="px-3 py-2 font-black">Required</th>
                                                            <th className="px-3 py-2 font-black">Mauchly</th>
                                                            <th className="px-3 py-2 font-black">Correction</th>
                                                            <th className="px-3 py-2 font-black">Final p</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                                        {modelSummaryReport.factorialSphericityRows.map((row, idx) => (
                                                            <tr key={`summary_sphericity_${idx}`} className="bg-white dark:bg-black/20">
                                                                <td className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-200">{row.effect}</td>
                                                                <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{row.applicable ? 'Yes' : 'No'}</td>
                                                                <td className="px-3 py-2 font-mono text-slate-700 dark:text-slate-200">
                                                                    {row.applicable ? `W = ${row.mauchlyW}, p = ${row.mauchlyP}` : 'N/A'}
                                                                </td>
                                                                <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{row.correction}</td>
                                                                <td className="px-3 py-2 font-mono text-slate-700 dark:text-slate-200">{row.finalP}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
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
                                                        : modelSummaryReport.multivariate
                                                            ? modelSummaryReport.multivariate.modeLabel
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
                                                        <div><span className="font-black text-slate-500">95% CI:</span> <span className="font-mono text-slate-700 dark:text-slate-200">[{modelSummaryReport.tTest.ci}]</span></div>
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
                                                                            <td className="px-2 py-1 font-mono text-slate-700 dark:text-slate-200">p &lt; 0.05</td>
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
                                                            {modelSummaryReport.anova?.plotImage && (
                                                                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-black/20 p-3 space-y-2">
                                                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">ANOVA Plot</div>
                                                                    <img
                                                                        src={modelSummaryReport.anova.plotImage}
                                                                        alt="One-way ANOVA plot"
                                                                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700"
                                                                    />
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
                                                        <div><span className="font-black text-slate-500">GOF variable:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{modelSummaryReport.chisq.gofVariable}</span></div>
                                                        <div><span className="font-black text-slate-500">GOF chi-squared:</span> <span className="font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.chisq.gofStatistic}</span></div>
                                                        <div><span className="font-black text-slate-500">GOF df:</span> <span className="font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.chisq.gofDf}</span></div>
                                                        <div><span className="font-black text-slate-500">GOF p-value:</span> <span className="font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.chisq.gofP}</span></div>
                                                        <div><span className="font-black text-slate-500">GOF significant:</span> <span className={`font-semibold ${modelSummaryReport.chisq.gofSignificant === 'Yes' ? 'text-green-700 dark:text-green-300' : 'text-slate-700 dark:text-slate-200'}`}>{modelSummaryReport.chisq.gofSignificant}</span></div>
                                                        <div><span className="font-black text-slate-500">GOF observed:</span> <span className="font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.chisq.gofObserved}</span></div>
                                                        <div><span className="font-black text-slate-500">GOF expected:</span> <span className="font-mono text-slate-700 dark:text-slate-200">{modelSummaryReport.chisq.gofExpected}</span></div>
                                                        <div className="pt-1 leading-relaxed">
                                                            <span className="font-black text-slate-500">GOF note:</span> <span className="font-medium text-slate-700 dark:text-slate-200">{modelSummaryReport.chisq.gofMessage}</span>
                                                        </div>
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
                                                                    <th className="px-3 py-2 font-black text-right">Mean +/- 95% CI</th>
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
                                                                <td className="px-2 py-1 font-mono text-slate-700 dark:text-slate-200">p &lt; 0.05</td>
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
                                        ) : modelSummaryReport.multivariate ? (
                                            <>
                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-black/10 p-3 space-y-2 text-sm">
                                                        {modelSummaryReport.multivariate.summaryRows.map(([label, value], idx) => (
                                                            <div key={`summary_multivariate_field_${idx}`}>
                                                                <span className="font-black text-slate-500">{label}:</span>{' '}
                                                                <span className="text-slate-700 dark:text-slate-200">{value}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-black/10 p-3 space-y-3 text-sm">
                                                        <div>
                                                            <span className="font-black text-slate-500">Interpretation:</span>{' '}
                                                            <span className="text-slate-700 dark:text-slate-200">{modelSummaryReport.multivariate.interpretation}</span>
                                                        </div>
                                                        <div className="leading-relaxed text-slate-600 dark:text-slate-300">
                                                            {modelSummaryReport.multivariate.message || modelSummaryReport.finalMessage}
                                                        </div>
                                                    </div>
                                                </div>
                                                {Array.isArray(modelSummaryReport.multivariate.tables) && modelSummaryReport.multivariate.tables.length > 0 && (
                                                    <div className="space-y-3">
                                                        {modelSummaryReport.multivariate.tables.map((table, tableIdx) => (
                                                            <div
                                                                key={`summary_multivariate_table_${tableIdx}`}
                                                                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-black/20 p-3 space-y-2"
                                                            >
                                                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">{table.title}</div>
                                                                <div className="overflow-x-auto">
                                                                    <table className="min-w-full text-[11px] text-left">
                                                                        <thead className="bg-slate-100 dark:bg-slate-800 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-300">
                                                                            <tr>
                                                                                {table.headers.map((header, headerIdx) => (
                                                                                    <th key={`summary_multivariate_header_${tableIdx}_${headerIdx}`} className="px-2 py-1 font-black">
                                                                                        {header}
                                                                                    </th>
                                                                                ))}
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                                                            {table.rows.map((row, rowIdx) => (
                                                                                <tr key={`summary_multivariate_row_${tableIdx}_${rowIdx}`} className="bg-white/90 dark:bg-black/20">
                                                                                    {row.map((cell, cellIdx) => (
                                                                                        <td key={`summary_multivariate_cell_${tableIdx}_${rowIdx}_${cellIdx}`} className="px-2 py-1 text-slate-700 dark:text-slate-200">
                                                                                            {cell}
                                                                                        </td>
                                                                                    ))}
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                                {table.note && (
                                                                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                                                        {table.note}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="text-sm text-slate-600 dark:text-slate-300">
                                                RM ANOVA not used in this analysis. Primary test: {modelSummaryReport.primary.testName}.
                                            </div>
                                        )}
                                    </div>

                                    {!modelSummaryReport.tTest && !modelSummaryReport.oneValue && !modelSummaryReport.twoGroupNonParam && !modelSummaryReport.chisq && !modelSummaryReport.correlationMatrix && !modelSummaryReport.multivariate && (
                                        <>
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
                                                                        <th className="px-3 py-2 font-black">95% CI (+/-)</th>
                                                                        <th className="px-3 py-2 font-black">P-Value (Adj)</th>
                                                                        <th className="px-3 py-2 font-black">Result</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                                                    {modelSummaryReport.tukeyPairwiseRows.map((row) => (
                                                                        <tr key={`summary_tukey_pairwise_${row._id}`} className={`bg-white dark:bg-black/20 ${row.isSignificant ? 'bg-green-50/20 dark:bg-green-900/5' : ''}`}>
                                                                            <td className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-200">{row.comparison}</td>
                                                                            <td className="px-3 py-2 font-mono text-slate-700 dark:text-slate-200">{row.meanDiff}</td>
                                                                            <td className="px-3 py-2 font-mono text-slate-700 dark:text-slate-200">{row.ciPm}</td>
                                                                            <td className="px-3 py-2 font-mono text-slate-700 dark:text-slate-200">{row.pAdj}</td>
                                                                            <td className="px-3 py-2 font-mono font-bold text-slate-700 dark:text-slate-200">{row.result}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                ) : modelSummaryReport.posthocRawRows.length > 0 ? (
                                                    <>
                                                        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                                                            <table className="min-w-full text-xs text-left">
                                                                <thead className="bg-slate-100 dark:bg-slate-800 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-300">
                                                                    <tr>
                                                                        {modelSummaryReport.posthocRawColumns.map((column) => (
                                                                            <th key={`summary_posthoc_h_${column}`} className="px-3 py-2 font-black">
                                                                                {formatRKey(column)}
                                                                            </th>
                                                                        ))}
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                                                    {modelSummaryReport.posthocRawRows.map((row) => (
                                                                        <tr key={`summary_posthoc_${row._id}`} className="bg-white dark:bg-black/20">
                                                                            {modelSummaryReport.posthocRawColumns.map((column) => (
                                                                                <td key={`summary_posthoc_${row._id}_${column}`} className="px-3 py-2 font-mono text-slate-700 dark:text-slate-200">
                                                                                    {formatSignificanceCell(row, row[column], column)}
                                                                                </td>
                                                                            ))}
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="text-sm text-slate-600 dark:text-slate-300">
                                                        No post-hoc rows returned by R for this analysis.
                                                    </div>
                                                )}
                                                {Array.isArray(modelSummaryReport.dunnPosthocDescriptiveRows) && (
                                                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-black/20 p-3 space-y-2">
                                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">{modelSummaryReport.posthocDescriptiveTitle || 'Post-hoc Descriptive Table (Significant Comparisons)'}</div>
                                                        {modelSummaryReport.dunnPosthocDescriptiveRows.length > 0 ? (
                                                            <>
                                                                <div className="max-h-[420px] overflow-auto rounded-md border border-slate-200 dark:border-slate-700">
                                                                    <table className="min-w-full text-[11px] text-left">
                                                                        <thead className="bg-slate-100 dark:bg-slate-800 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-300">
                                                                            <tr>
                                                                                <th className="px-2 py-1.5 font-black">Comparison</th>
                                                                                <th className="px-2 py-1.5 font-black">Group A</th>
                                                                                <th className="px-2 py-1.5 font-black text-right">n(A)</th>
                                                                                <th className="px-2 py-1.5 font-black text-right">Median [Q1, Q3] (A)</th>
                                                                                <th className="px-2 py-1.5 font-black">Group B</th>
                                                                                <th className="px-2 py-1.5 font-black text-right">n(B)</th>
                                                                                <th className="px-2 py-1.5 font-black text-right">Median [Q1, Q3] (B)</th>
                                                                                <th className="px-2 py-1.5 font-black text-right">Delta Median</th>
                                                                                <th className="px-2 py-1.5 font-black text-right">Statistic</th>
                                                                                <th className="px-2 py-1.5 font-black text-right">Adj p</th>
                                                                                <th className="px-2 py-1.5 font-black text-right">Sig</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                                                            {modelSummaryReport.dunnPosthocDescriptiveRows.map((row) => (
                                                                                <tr key={`summary_dunn_desc_${row._id}`} className="bg-white dark:bg-black/20">
                                                                                    <td className="px-2 py-1.5 font-semibold text-slate-700 dark:text-slate-200">{row.comparison}</td>
                                                                                    <td className="px-2 py-1.5 font-semibold text-slate-700 dark:text-slate-200">{row.groupA}</td>
                                                                                    <td className="px-2 py-1.5 text-right font-mono text-slate-700 dark:text-slate-200">{row.nA}</td>
                                                                                    <td className="px-2 py-1.5 text-right font-mono text-slate-700 dark:text-slate-200">{row.medianIqrA}</td>
                                                                                    <td className="px-2 py-1.5 font-semibold text-slate-700 dark:text-slate-200">{row.groupB}</td>
                                                                                    <td className="px-2 py-1.5 text-right font-mono text-slate-700 dark:text-slate-200">{row.nB}</td>
                                                                                    <td className="px-2 py-1.5 text-right font-mono text-slate-700 dark:text-slate-200">{row.medianIqrB}</td>
                                                                                    <td className="px-2 py-1.5 text-right font-mono text-slate-700 dark:text-slate-200">{row.medianDelta}</td>
                                                                                    <td className="px-2 py-1.5 text-right font-mono text-slate-700 dark:text-slate-200">{row.stat}</td>
                                                                                    <td className="px-2 py-1.5 text-right font-mono text-slate-700 dark:text-slate-200">{row.pAdj}</td>
                                                                                    <td className="px-2 py-1.5 text-right font-mono font-bold text-slate-700 dark:text-slate-200">{row.sig}</td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                                <div className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">
                                                                    Significance scale: *** (p &lt; 0.001), ** (p &lt; 0.01), * (p &lt; 0.05), ns (p &gt;= 0.05).
                                                                </div>
                                                                <div className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">
                                                                    Only significant comparisons are shown. All pairwise tests were performed; full pairwise results are available in supplementary tables/exports.
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div className="text-xs text-slate-600 dark:text-slate-300">
                                                                No statistically significant pairwise comparison to display in the main table. All pairwise tests were performed; full pairwise results are available in supplementary tables/exports.
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                    <div className={`rounded-xl border p-4 space-y-3 ${
                                        isRTheme
                                            ? 'border-cyan-900/35 bg-gradient-to-br from-[#0b1220]/95 via-[#0a1427]/90 to-[#020617]/92 shadow-[0_16px_28px_-22px_rgba(2,6,23,0.95)]'
                                            : 'border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-black/20'
                                    }`}>
                                        <div className={`text-xs font-black uppercase tracking-widest ${
                                            isRTheme ? 'text-cyan-200/90' : 'text-slate-500'
                                        }`}>End Of Report Editor</div>
                                        <RichTextEditor
                                            value={reportEndNote}
                                            onChange={setReportEndNote}
                                            isRTheme={isEditorRTheme}
                                            fontFamily={reportEndFontFamily}
                                            fontSize={reportEndFontSize}
                                            textColor={reportEndTextColor}
                                            onFontFamilyChange={setReportEndFontFamily}
                                            onFontSizeChange={setReportEndFontSize}
                                            onTextColorChange={setReportEndTextColor}
                                            fonts={reportEditorFonts}
                                            fontSizes={reportEditorFontSizes}
                                            placeholder="Write your final paragraph or conclusion here..."
                                        />
                                        <div className={`text-[10px] ${
                                            isRTheme ? 'text-slate-300/80' : 'text-slate-500 dark:text-slate-400'
                                        }`}>
                                            This text is appended to the end of Step 05 exports.
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </section>
                    )}
                </div>
            )}
        </div>
    );
};

export default AnalysisResult;
