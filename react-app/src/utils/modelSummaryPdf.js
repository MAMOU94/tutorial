const slugify = (value, fallback = 'analysis') => {
  const base = String(value || '').trim().toLowerCase();
  const slug = base.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug || fallback;
};

const pad2 = (n) => String(n).padStart(2, '0');

const buildBaseName = (report) => {
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    pad2(now.getMonth() + 1),
    pad2(now.getDate())
  ].join('') + '_' + [pad2(now.getHours()), pad2(now.getMinutes()), pad2(now.getSeconds())].join('');
  const testType = slugify(report?.testType, 'model-summary');
  return `step05_${testType}_${stamp}`;
};

const buildFileName = (report, extension = 'pdf') => `${buildBaseName(report)}.${extension}`;

const toText = (value) => {
  if (value == null || value === '') return 'N/A';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch (err) {
    return String(value);
  }
};

const PDF_CHAR_REPLACEMENTS = {
  '≤': '<=',
  '≥': '>=',
  '≠': '!=',
  '≈': '~',
  '±': '+/-',
  '×': 'x',
  '÷': '/',
  '−': '-',
  '–': '-',
  '—': '-',
  '‑': '-',
  'η': 'eta',
  'ρ': 'rho',
  'μ': 'mu',
  'σ': 'sigma',
  'α': 'alpha',
  'β': 'beta',
  'γ': 'gamma',
  'Δ': 'Delta',
  'δ': 'delta',
  'θ': 'theta',
  'λ': 'lambda',
  'ω': 'omega',
  '²': '^2',
  '³': '^3'
};

const sanitizePdfText = (value) => {
  const text = toText(value);
  return Array.from(text).map((char) => {
    if (Object.prototype.hasOwnProperty.call(PDF_CHAR_REPLACEMENTS, char)) {
      return PDF_CHAR_REPLACEMENTS[char];
    }
    return char.charCodeAt(0) <= 255 ? char : '?';
  }).join('');
};

const normalizeImageDataUrl = (value) => {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return '';
  return text.startsWith('data:image') ? text : `data:image/png;base64,${text}`;
};

const hasUsableImageData = (value) => {
  const dataUrl = normalizeImageDataUrl(value);
  if (!dataUrl || !dataUrl.startsWith('data:image')) return false;
  const commaIndex = dataUrl.indexOf(',');
  if (commaIndex === -1) return false;
  const payload = dataUrl.slice(commaIndex + 1).replace(/\s+/g, '');
  if (!payload || payload.length < 80) return false;
  return /^[A-Za-z0-9+/=]+$/.test(payload);
};

const arrayBufferToBase64 = (arrayBuffer) => {
  if (!arrayBuffer) return '';
  const bytes = new Uint8Array(arrayBuffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
};

const createImageSection = (title, imageData, caption = '') => {
  const normalizedImage = normalizeImageDataUrl(imageData);
  if (!hasUsableImageData(normalizedImage)) return null;
  const titleText = toText(title);
  const captionText = toText(caption);
  return {
    title: titleText === 'N/A' ? 'Generated Plot' : titleText,
    type: 'image',
    imageData: normalizedImage,
    caption: captionText === 'N/A' ? '' : captionText
  };
};

const dedupeImageSections = (sections) => {
  const seenImages = new Set();
  const out = [];
  (Array.isArray(sections) ? sections : []).forEach((section) => {
    if (!section || section.type !== 'image') return;
    const normalizedImage = normalizeImageDataUrl(section.imageData);
    if (!hasUsableImageData(normalizedImage)) return;
    if (seenImages.has(normalizedImage)) return;
    seenImages.add(normalizedImage);
    const titleText = toText(section.title);
    const captionText = toText(section.caption);
    out.push({
      ...section,
      type: 'image',
      title: titleText === 'N/A' ? 'Generated Plot' : titleText,
      imageData: normalizedImage,
      caption: captionText === 'N/A' ? '' : captionText
    });
  });
  return out;
};

const collectGeneratedPlotSections = (report, baseImageSections = []) => {
  const collected = [...(Array.isArray(baseImageSections) ? baseImageSections : [])];
  const explicitGeneratedPlots = Array.isArray(report?.generatedPlots) ? report.generatedPlots : [];

  explicitGeneratedPlots.forEach((plot, idx) => {
    const section = createImageSection(
      plot?.title || plot?.label || `Generated Plot ${idx + 1}`,
      plot?.imageData || plot?.image || plot?.dataUrl || plot?.url,
      plot?.caption || plot?.description || ''
    );
    if (section) collected.push(section);
  });

  const fallbackCandidates = [
    ['Primary Analysis Plot', report?.plotImage, 'Main analysis plot returned by R.'],
    ['Mean ± 95% CI Plot', report?.meanCiPlotImage || report?.anova?.meanCiPlotImage, 'Group means with 95% confidence intervals.'],
    ['Residuals vs Fitted', report?.anovaResidualPlotImage || report?.anova?.anovaResidualPlotImage, 'ANOVA residual diagnostics.'],
    ['Residual Q-Q Plot', report?.residualQqPlotImage || report?.anova?.residualQqPlotImage || report?.rmAnova?.residualQqPlotImage, 'Residual normality diagnostic plot.'],
    ['T-Test Mean ± 95% CI Plot', report?.ttestMeanCiPlotImage || report?.tTest?.meanCiPlotImage, 'Two-group mean comparison with confidence intervals.'],
    ['Simple Linear Regression Scatterplot', report?.regressionScatterPlotImage, 'Observed values with fitted OLS line and confidence band.'],
    ['Regression Coefficient Plot (95% CI)', report?.regressionPublicationPlotImage, 'Publication-style coefficient plot with 95% confidence intervals.'],
    ['RM ANOVA Spaghetti + Mean ± 95% CI', report?.rmSpaghettiCiPlotImage || report?.rmAnova?.rmSpaghettiCiPlotImage, 'Repeated-measures trajectories with mean and CI.'],
    ['Friedman Spaghetti + Median ± IQR', report?.friedmanSpaghettiIqrPlotImage || report?.friedman?.spaghettiIqrPlotImage, 'Repeated-measures trajectories with median and IQR.'],
    ['Mann-Whitney Boxplot + Raw Points', report?.mannWhitneyBoxplotImage || report?.twoGroupNonParam?.boxplotImage, 'Two-group non-parametric visualization.'],
    ['Interaction Plot', report?.interactionPlotImage || report?.twoWay?.interactionPlotImage, 'Factorial interaction plot.'],
    ['Sphericity Plot', report?.sphericityPlotImage || report?.rmAnova?.sphericityPlotImage, 'Mauchly/correction summary plot.'],
    ['Pearson Heatmap', report?.pearsonHeatmapImage || report?.correlationMatrix?.pearsonHeatmapImage, 'Pearson correlation heatmap.'],
    ['Spearman Heatmap', report?.spearmanHeatmapImage || report?.correlationMatrix?.spearmanHeatmapImage, 'Spearman correlation heatmap.'],
    ['Pearson Linearity Check', report?.pearsonLinearityImage || report?.correlationMatrix?.pearsonLinearityImage, 'Pearson scatter matrix.'],
    ['Spearman Linearity Check', report?.spearmanLinearityImage || report?.correlationMatrix?.spearmanLinearityImage, 'Spearman scatter matrix.'],
    ['Scree Plot', report?.screePlotImage, 'Scree plot.'],
    ['Elbow Plot', report?.elbowPlotImage, 'Elbow optimization plot.'],
    ['Silhouette Trend Plot', report?.silhouetteTrendPlotImage, 'Silhouette optimization trend.'],
    ['Silhouette Plot', report?.silhouettePlotImage, 'Silhouette plot.'],
    ['MCA Hierarchical Dendrogram', report?.mcaDendrogramImage, 'Hierarchical dendrogram derived from MCA coordinates.']
  ];

  fallbackCandidates.forEach(([title, imageData, caption]) => {
    const section = createImageSection(title, imageData, caption);
    if (section) collected.push(section);
  });

  return dedupeImageSections(collected);
};

const formatHeader = (value) => {
  const text = toText(value).trim();
  if (!text) return 'N/A';
  if (text === 'z_value' || text === 'z_statistic') return 'Z-Statistic';
  if (text === 'is_significant' || text === 'significant') return 'Sig';
  const spaced = text.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
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

const formatSignificanceCell = (row, column, value) => {
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


const BASE_STYLE = {
  margin: 10,
  colGap: 6,
  titleSize: 13,
  subtitleSize: 9,
  metaSize: 7.4,
  sectionSize: 8.2,
  bodySize: 7.2,
  tableSize: 6.8,
  headerPadX: 1.1,
  headerPadY: 0.8,
  cellPadX: 0.8,
  cellPadY: 0.7,
  labelWidth: 24,
  blockGap: 1.1,
  sectionGap: 0.6,
  minHeaderH: 5.4
};

const scaleStyle = (scale) => ({
  margin: Math.max(3.5, BASE_STYLE.margin * scale),
  colGap: Math.max(1.6, BASE_STYLE.colGap * scale),
  titleSize: Math.max(5.4, BASE_STYLE.titleSize * scale),
  subtitleSize: Math.max(4.1, BASE_STYLE.subtitleSize * scale),
  metaSize: Math.max(3.5, BASE_STYLE.metaSize * scale),
  sectionSize: Math.max(3.8, BASE_STYLE.sectionSize * scale),
  bodySize: Math.max(3.4, BASE_STYLE.bodySize * scale),
  tableSize: Math.max(3.2, BASE_STYLE.tableSize * scale),
  headerPadX: Math.max(0.4, BASE_STYLE.headerPadX * scale),
  headerPadY: Math.max(0.35, BASE_STYLE.headerPadY * scale),
  cellPadX: Math.max(0.35, BASE_STYLE.cellPadX * scale),
  cellPadY: Math.max(0.28, BASE_STYLE.cellPadY * scale),
  labelWidth: Math.max(9, BASE_STYLE.labelWidth * scale),
  blockGap: Math.max(0.3, BASE_STYLE.blockGap * scale),
  sectionGap: Math.max(0.24, BASE_STYLE.sectionGap * scale),
  minHeaderH: Math.max(2.8, BASE_STYLE.minHeaderH * scale)
});

const lineHeight = (fontSize) => Math.max(1.35, fontSize * 0.42);

const wrapLines = (doc, text, maxWidth, fontStyle, fontSize) => {
  doc.setFont('helvetica', fontStyle);
  doc.setFontSize(fontSize);
  return doc.splitTextToSize(sanitizePdfText(text), Math.max(1, maxWidth));
};

const buildSections = (report) => {
  const shapiroRows = Array.isArray(report?.shapiroRowsFull)
    ? report.shapiroRowsFull
    : (Array.isArray(report?.shapiroRows) ? report.shapiroRows : []);
  const homogeneitySummary = report?.homogeneitySummary || null;

  const posthocRows = Array.isArray(report?.posthocRawRows)
    ? report.posthocRawRows
    : (Array.isArray(report?.posthocRows)
      ? report.posthocRows
      : (Array.isArray(report?.posthocRawRowsFull)
        ? report.posthocRawRowsFull
        : (Array.isArray(report?.posthocRowsFull) ? report.posthocRowsFull : [])));
  const posthocColumns = (() => {
    if (Array.isArray(report?.posthocRawColumns) && report.posthocRawColumns.length > 0) {
      return report.posthocRawColumns;
    }
    const columns = [];
    const excluded = new Set(['id', '_id', 'hasStatistic', 'hasEffect']);
    posthocRows.forEach((row) => {
      if (!row || typeof row !== 'object' || Array.isArray(row)) return;
      Object.keys(row).forEach((key) => {
        if (excluded.has(key)) return;
        if (!columns.includes(key)) columns.push(key);
      });
    });
    return columns.length > 0 ? columns : ['value'];
  })();
  const kruskalDescriptiveRows = Array.isArray(report?.kruskalDescriptiveRows)
    ? report.kruskalDescriptiveRows
    : [];
  const anovaDescriptiveRows = Array.isArray(report?.anovaDescriptiveRows)
    ? report.anovaDescriptiveRows
    : [];
  const anovaDescriptiveGroupLabel = (() => {
    const text = toText(report?.anovaDescriptiveGroupLabel);
    return text !== 'N/A' ? text : 'Group';
  })();
  const kruskalDescriptiveGroupLabel = (() => {
    const text = toText(report?.kruskalDescriptiveGroupLabel);
    return text !== 'N/A' ? text : 'Group';
  })();
  const dunnPosthocDescriptiveRows = Array.isArray(report?.dunnPosthocDescriptiveRows)
    ? report.dunnPosthocDescriptiveRows
    : [];
  const tukeyPairwiseRows = Array.isArray(report?.tukeyPairwiseRows)
    ? report.tukeyPairwiseRows
    : [];
  const hasTukeyPairwise = tukeyPairwiseRows.length > 0;
  const posthocMethodText = (() => {
    const text = toText(report?.posthocMethod || report?.posthocLabel);
    return text !== 'N/A' && text !== 'None' ? text : 'Post-hoc';
  })();
  const posthocDescriptiveTitle = (() => {
    const explicit = toText(report?.posthocDescriptiveTitle);
    if (explicit !== 'N/A') return explicit;
    return `Post-hoc Descriptive Table (${posthocMethodText})`;
  })();

  const hasShapiroN = shapiroRows.some((row) => toText(row?.n) !== 'N/A');
  const isTTest = Boolean(report?.tTest);
  const isOneValue = Boolean(report?.oneValue);
  const isTwoWay = Boolean(report?.twoWay);
  const isAnova = Boolean(report?.anova);
  const isChiSq = Boolean(report?.chisq);
  const isKruskal = Boolean(report?.kruskal);
  const isFriedman = Boolean(report?.friedman);
  const isRmAnova = Boolean(report?.rmAnova);
  const isTwoGroupNonParam = Boolean(report?.twoGroupNonParam);
  const isCorrelation = Boolean(report?.correlationMatrix);
  const isMultivariate = Boolean(report?.multivariate);
  const includePosthoc = !isTTest && !isOneValue && !isTwoGroupNonParam && !isChiSq && !isCorrelation && !isMultivariate;
  const bartlettLabel = toText(report?.bartlettLabel) || 'Homogeneity (Bartlett)';

  const overviewRows = [
    ['Mode', report?.mode],
    ['Path', report?.pathTaken],
    ['Test Type', report?.testType],
    ['Sample Type', report?.sampleType],
    ['Groups', report?.nGroups]
  ];
  const reportTitle = toText(report?.reportTitle);
  const reportAuthor = toText(report?.reportAuthor);
  if (reportTitle !== 'N/A') {
    overviewRows.unshift(['Report Title', reportTitle]);
  }
  if (reportAuthor !== 'N/A') {
    overviewRows.splice(reportTitle !== 'N/A' ? 1 : 0, 0, ['Author', reportAuthor]);
  }
  const leftSections = [
    {
      title: 'Overview',
      type: 'fields',
      rows: overviewRows
    }
  ];

  const suppressAssumptions = report?.twoWay?.isNonParametric === true;

  if (!suppressAssumptions && shapiroRows.length > 0) {
    leftSections.push({
      title: 'Shapiro (Compact)',
      type: 'table',
      headers: hasShapiroN ? ['Group', 'N', 'Shapiro p', 'Normal'] : ['Group', 'Shapiro p', 'Normal'],
      weights: hasShapiroN ? [2.4, 0.7, 1.2, 1] : [2.8, 1.4, 1.1],
      rows: hasShapiroN
        ? shapiroRows.map((row) => [row?.group, row?.n, row?.p, row?.normal])
        : shapiroRows.map((row) => [row?.group, row?.p, row?.normal])
    });
  }

  if (!suppressAssumptions && homogeneitySummary) {
    leftSections.push({
      title: 'Homogeneity Test',
      type: 'table',
      headers: ['Test', 'Statistic', 'df', 'p-value'],
      weights: [2.2, 1.6, 1.4, 1.2],
      rows: [[
        homogeneitySummary.testName,
        `${toText(homogeneitySummary.statLabel)} = ${toText(homogeneitySummary.statistic)}`,
        toText(homogeneitySummary.df),
        toText(homogeneitySummary.p)
      ]]
    });
    if (homogeneitySummary.message && toText(homogeneitySummary.message) !== 'N/A') {
      leftSections.push({
        title: 'Homogeneity Notes',
        type: 'fields',
        rows: [['Message', homogeneitySummary.message]]
      });
    }
  }

  const rightSections = [];

  if (isRmAnova) {
    const residualQqPlotImage = normalizeImageDataUrl(report?.rmAnova?.residualQqPlotImage || report?.residualQqPlotImage);
    const sphericityPlotImage = normalizeImageDataUrl(report?.rmAnova?.sphericityPlotImage || report?.sphericityPlotImage);
    rightSections.push(
      {
        title: 'Mauchly And Sphericity',
        type: 'fields',
        rows: [
          ['Mauchly W', report?.mauchlyW],
          ['Mauchly p', report?.mauchly],
          ['Greenhouse-Geisser', report?.ggSummary],
          ['Huynh-Feldt', report?.hfSummary],
          ['Selected Correction', report?.correction]
        ]
      },
      {
        title: 'RM ANOVA',
        type: 'fields',
        rows: [
          ['F', report.rmAnova.statistic],
          ['df', report.rmAnova.df],
          ['Final p', report.rmAnova.p],
          ['Uncorrected p', report.rmAnova.pUncorrected],
          ['Correction', report.rmAnova.correction],
          ['Result', report.rmAnova.message || report?.finalMessage],
          ['Significance + Effect', report.rmAnova.significanceEffect]
        ]
      }
    );
    if (hasUsableImageData(residualQqPlotImage)) {
      rightSections.push({
        title: 'Residual Q-Q Plot',
        type: 'image',
        imageData: residualQqPlotImage,
        caption: 'RM ANOVA residual normality check (Q-Q plot)'
      });
    }
    if (hasUsableImageData(sphericityPlotImage)) {
      rightSections.push({
        title: 'Sphericity Plot',
        type: 'image',
        imageData: sphericityPlotImage,
        caption: 'Mauchly sphericity diagnostic plot'
      });
    }
  } else if (isTTest) {
    rightSections.push(
      {
        title: 'Assumption Snapshot',
        type: 'fields',
        rows: [
          ['Normality', report?.allNormal],
          [bartlettLabel, report?.bartlett]
        ]
      },
      {
        title: report?.tTest?.testName || 'Student t-test',
        type: 'fields',
        rows: [
          ['Test', report?.tTest?.testName],
          ['Sample Type', report?.sampleType],
          ['t-statistic', report?.tTest?.statistic],
          ['df', report?.tTest?.df],
          ['p-value', report?.tTest?.p],
          [`Mean (${toText(report?.tTest?.group1)})`, report?.tTest?.mean1],
          [`Mean (${toText(report?.tTest?.group2)})`, report?.tTest?.mean2],
          ['Mean difference', report?.tTest?.meanDiff],
          ['95% CI', `[${toText(report?.tTest?.ci)}]`],
          ["Cohen's d", report?.tTest?.cohensD]
        ]
      },
      {
        title: 'Comparison',
        type: 'table',
        headers: ['Comparison', 't', 'df', 'p', 'Sig'],
        weights: [2.4, 1, 1, 1, 0.8],
        rows: report?.tTest?.comparisonRow
          ? [[
              report.tTest.comparisonRow.comparison,
              report.tTest.comparisonRow.t,
              report.tTest.comparisonRow.df,
              report.tTest.comparisonRow.p,
              report.tTest.comparisonRow.sig
            ]]
          : [['N/A', 'N/A', 'N/A', 'N/A', 'N/A']]
      },
      {
        title: 'Significance Guide',
        type: 'table',
        headers: ['p-value', 'Stars', 'Meaning'],
        weights: [1.2, 0.8, 2.2],
        rows: [
          ['p < 0.05', '*', 'Significant'],
          ['p < 0.01', '**', 'Very significant'],
          ['p < 0.001', '***', 'Highly significant']
        ]
      },
      {
        title: 'Interpretation',
        type: 'fields',
        rows: [
          ['Interpretation', report?.tTest?.significanceEffect]
        ]
      }
    );
  } else if (isOneValue) {
    rightSections.push(
      {
        title: 'One Value Comparison',
        type: 'fields',
        rows: [
          ['Test', report?.oneValue?.testName],
          ['Sample Type', report?.sampleType],
          ['Variable', report?.oneValue?.variable],
          ['Data type', report?.oneValue?.dataType],
          ['Selected test', report?.oneValue?.selectedTest],
          [report?.oneValue?.statisticLabel || 'Statistic', report?.oneValue?.statistic],
          ['p-value', report?.oneValue?.p],
          ['Significant', report?.oneValue?.significant],
          ['Success category', report?.oneValue?.successLevel],
          ['Observed proportion', report?.oneValue?.observedProportion],
          ['Reference proportion', report?.oneValue?.referenceProportion],
          ['Observed / N', `${toText(report?.oneValue?.observedSuccess)} / ${toText(report?.oneValue?.nTotal)}`],
          ['GOF observed', report?.oneValue?.gofObserved],
          ['GOF expected', report?.oneValue?.gofExpected],
          ['Message', report?.oneValue?.message || report?.finalMessage]
        ]
      }
    );
  } else if (isTwoWay) {
    const statLabel = toText(report?.twoWay?.statLabel) || 'F';
    const effects = Array.isArray(report?.twoWay?.effects) ? report.twoWay.effects : [];
    const anovaTableRows = Array.isArray(report?.anovaTableRows) ? report.anovaTableRows : [];
    const interactionPlotImage = normalizeImageDataUrl(report?.twoWay?.interactionPlotImage);
    rightSections.push({
      title: report?.twoWay?.testName || 'Two-Way ANOVA',
      type: 'fields',
      rows: [
        ['Test', report?.twoWay?.testName],
        ['Sample Type', report?.sampleType],
        ['Type', report?.twoWay?.variant],
        ...(report?.twoWay?.robustMethod ? [['Robust method', report.twoWay.robustMethod]] : []),
        ...(report?.twoWay?.posthocLabel && report?.twoWay?.posthocLabel !== 'N/A'
          ? [['Post-hoc', report.twoWay.posthocLabel]]
          : []),
        ['Statistic', statLabel],
        ['Interaction p', report?.twoWay?.interaction?.p || 'N/A'],
        ['Interaction Sig', report?.twoWay?.interaction?.sig || 'N/A'],
        ['Interpretation', report?.twoWay?.interaction?.message || report?.twoWay?.message || report?.finalMessage]
      ]
    });
    if (anovaTableRows.length > 0) {
      const mainA = effects.find((effect) => effect?.role === 'main_a') || null;
      const mainB = effects.find((effect) => effect?.role === 'main_b') || null;
      const interaction = effects.find((effect) => effect?.role === 'interaction') || null;
      const hasStratum = anovaTableRows.some((row) => toText(row?.stratum) !== 'N/A');
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
      const etaSizeLabel = (eta) => {
        const n = Number(eta);
        if (!Number.isFinite(n)) return '';
        const abs = Math.abs(n);
        if (abs < 0.2) return 'small';
        if (abs < 0.5) return 'medium';
        return 'large';
      };
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

      const completeRows = anovaTableRows.map((row) => {
        const sourceRaw = String(row?.source ?? '').trim();
        const sourceLabel = sourceRaw.includes(':')
          ? sourceRaw.split(':').map((part) => part.trim()).join(' × ')
          : sourceRaw;
        const sourceText = hasStratum && toText(row?.stratum) !== 'N/A'
          ? `${sourceLabel} [${toText(row?.stratum)}]`
          : sourceLabel;
        const pNum = asNumber(row?.p_value);
        const isResidual = row?.is_residual === true || normalizeKey(sourceRaw).startsWith('residual');
        const effect = isResidual ? null : resolveEffectForSource(sourceRaw);
        const etaNum = asNumber(effect?.etaSquared ?? effect?.eta_squared);
        const etaLabel = toText(effect?.etaLabel || effect?.effect_size_label) !== 'N/A'
          ? toText(effect?.etaLabel || effect?.effect_size_label)
          : (etaNum != null ? etaSizeLabel(etaNum) : '');
        return [
          sourceText,
          row?.sum_sq,
          row?.df,
          row?.mean_sq,
          isResidual ? '' : row?.statistic,
          isResidual ? '' : (pNum != null ? (row?.formatted_p || row?.p_value) : ''),
          etaNum,
          etaLabel
        ];
      });

      rightSections.push({
        title: 'Complete Two-Way ANOVA Table With Residual',
        type: 'table',
        headers: ['Effect / Source', 'SS', 'df', 'MS', statLabel, 'p', 'Eta²', 'Effect size'],
        weights: [2.4, 1.1, 0.8, 1.1, 0.95, 1.05, 0.8, 1.1],
        rows: completeRows
      });
    }
    if (hasUsableImageData(interactionPlotImage)) {
      rightSections.push({
        title: 'Interaction Plot',
        type: 'image',
        imageData: interactionPlotImage,
        caption: 'ANOVA factorial interaction plot'
      });
    }
  } else if (isAnova) {
    const anovaTableRows = Array.isArray(report?.anovaTableRows) ? report.anovaTableRows : [];
    const isWelch = String(report?.anova?.variant || '').trim().toLowerCase() === 'welch'
      || String(report?.anova?.testName || '').toLowerCase().includes('welch');
    rightSections.push(
      {
        title: 'Assumption Snapshot',
        type: 'fields',
        rows: [
          ['Normality', report?.allNormal],
          [bartlettLabel, report?.bartlett]
        ]
      },
      {
        title: report?.anova?.testName || 'One-Way ANOVA',
        type: 'fields',
        rows: [
          ['Test', report?.anova?.testName],
          ['Sample Type', report?.sampleType],
          ['ANOVA type', report?.anova?.variant],
          ['F-statistic', report?.anova?.statistic],
          [isWelch ? 'Numerator df' : 'df1', report?.anova?.df1],
          [isWelch ? 'Denominator df' : 'df2', report?.anova?.df2],
          ['p-value', report?.anova?.p],
          ['Significant', report?.anova?.significant],
          ['Eta-squared', report?.anova?.etaSquared],
          ['Effect size label', report?.anova?.etaLabel],
          ['Interpretation', report?.anova?.significanceEffect],
          ['Message', report?.anova?.message || report?.finalMessage]
        ]
      }
    );
    const asNumber = (value) => {
      const n = Number(value);
      return Number.isFinite(n) ? n : null;
    };
    const mainRow = anovaTableRows.find((row) => row && row.is_residual !== true) || anovaTableRows[0];
    const residualRow = anovaTableRows.find((row) => row && row.is_residual === true) || null;

    if (isWelch) {
      const sourceLabel = toText(mainRow?.source) !== 'N/A' ? toText(mainRow?.source) : 'Groups';
      const numeratorDf = toText(report?.anova?.df1) !== 'N/A'
        ? report?.anova?.df1
        : (mainRow?.df ?? '');
      const denominatorDf = toText(report?.anova?.df2) !== 'N/A'
        ? report?.anova?.df2
        : (residualRow?.df ?? '');
      const pText = toText(report?.anova?.p) !== 'N/A'
        ? report?.anova?.p
        : (mainRow?.formatted_p || mainRow?.p_value || '');
      const fValue = toText(report?.anova?.statistic) !== 'N/A'
        ? report?.anova?.statistic
        : (mainRow?.statistic ?? '');

      rightSections.push({
        title: 'Welch One-Way ANOVA (R Output Style)',
        type: 'table',
        headers: ['Effect / Source', 'F value', 'Num Df', 'Den Df', 'p'],
        weights: [2.4, 1.1, 1, 1, 1.1],
        rows: [[sourceLabel, fValue, numeratorDf, denominatorDf, pText]]
      });
      rightSections.push({
        title: 'Welch Notes',
        type: 'fields',
        rows: [['Details', 'R Welch ANOVA (oneway.test) does not report SS/MS residual table entries.']]
      });
    } else if (anovaTableRows.length > 0) {
        const etaNum = asNumber(report?.anova?.etaSquared);
        const etaText = etaNum != null ? report?.anova?.etaSquared : '';
        const etaLabel = toText(report?.anova?.etaLabel) !== 'N/A' ? report?.anova?.etaLabel : '';
        const tableRows = [];

        if (mainRow) {
          tableRows.push([
            mainRow?.source,
            mainRow?.sum_sq,
            mainRow?.df,
            mainRow?.mean_sq,
            mainRow?.statistic,
            mainRow?.formatted_p || mainRow?.p_value,
            etaText,
            etaLabel
          ]);
        }

        if (residualRow) {
          tableRows.push([
            residualRow?.source || 'Residuals',
            residualRow?.sum_sq,
            residualRow?.df,
            residualRow?.mean_sq,
            '',
            '',
            '',
            ''
          ]);
        }

        rightSections.push({
          title: 'Complete One-Way ANOVA Table With Residual',
          type: 'table',
          headers: ['Effect / Source', 'SS', 'df', 'MS', 'F', 'p', 'Eta²', 'Effect size'],
          weights: [2.3, 1.1, 0.8, 1.1, 0.9, 1, 0.8, 1.1],
          rows: tableRows
        });
    }
    if (anovaDescriptiveRows.length > 0) {
      rightSections.push({
        title: 'Descriptive Table (Publication Style)',
        type: 'table',
        headers: [anovaDescriptiveGroupLabel, 'n', 'Mean +/- SD', 'Mean +/- 95% CI', 'Median [Q1, Q3]', 'Min', 'Max'],
        weights: [1.6, 0.7, 1.2, 1.4, 1.5, 0.8, 0.8],
        rows: anovaDescriptiveRows.map((row) => [
          row?.group,
          row?.n,
          row?.meanSd,
          row?.meanCi95,
          row?.medianIqr,
          row?.min,
          row?.max
        ])
      });
    }
  } else if (isChiSq) {
    rightSections.push({
      title: report?.chisq?.testName || 'Chi-Square Test of Independence',
      type: 'fields',
      rows: [
        ['Test', report?.chisq?.testName],
        ['Sample Type', report?.sampleType],
        ['Chi-squared', report?.chisq?.statistic],
        ['df', report?.chisq?.df],
        ['p-value', report?.chisq?.p],
        ['Significant', report?.chisq?.significant],
        ["Cramer's V", report?.chisq?.cramersV],
        ['Effect size label', report?.chisq?.effectSizeLabel],
        ['Correction option', report?.chisq?.correctionOption],
        ['Correction applied', report?.chisq?.correctionApplied],
        ['Correction note', report?.chisq?.correctionLabel],
        ['Interpretation', report?.chisq?.significanceEffect],
        ['Message', report?.chisq?.message || report?.finalMessage]
      ]
    });
  } else if (isKruskal) {
    rightSections.push({
      title: report?.kruskal?.testName || 'Kruskal-Wallis Rank Sum Test',
      type: 'fields',
      rows: [
        ['Test', report?.kruskal?.testName],
        ['Sample Type', report?.sampleType],
        ['Chi-squared', report?.kruskal?.statistic],
        ['df', report?.kruskal?.df],
        ['p-value', report?.kruskal?.p],
        ['Significant', report?.kruskal?.significant],
        ['Epsilon-squared', report?.kruskal?.epsilonSquared],
        ['Effect size label', report?.kruskal?.effectSizeLabel],
        ['Interpretation', report?.kruskal?.significanceEffect],
        ['Message', report?.kruskal?.message || report?.finalMessage]
      ]
    });
    if (kruskalDescriptiveRows.length > 0) {
      rightSections.push({
        title: 'Kruskal Descriptive Table (Publication Style)',
        type: 'table',
        headers: [
          kruskalDescriptiveGroupLabel,
          'n',
          'Mean +/- SD',
          'Mean +/- 95% CI',
          'Median [Q1, Q3]',
          'Min',
          'Max'
        ],
        weights: [1.2, 0.7, 1.3, 1.45, 1.45, 0.8, 0.8],
        rows: kruskalDescriptiveRows.map((row) => ([
          row?.group,
          row?.n,
          row?.meanSd,
          row?.meanCi95,
          row?.medianIqr,
          row?.min,
          row?.max
        ]))
      });
    }
  } else if (isFriedman) {
    rightSections.push({
      title: report?.friedman?.testName || 'Friedman Rank Sum Test',
      type: 'fields',
      rows: [
        ['Test', report?.friedman?.testName],
        ['Sample Type', report?.sampleType],
        ['Chi-squared', report?.friedman?.statistic],
        ['df', report?.friedman?.df],
        ['p-value', report?.friedman?.p],
        ['Significant', report?.friedman?.significant],
        ['Interpretation', report?.friedman?.significanceEffect],
        ['Message', report?.friedman?.message || report?.finalMessage]
      ]
    });
  } else if (isTwoGroupNonParam) {
    rightSections.push({
      title: report?.twoGroupNonParam?.testName || 'Two-Group Non-Parametric Test',
      type: 'fields',
      rows: [
        ['Test', report?.twoGroupNonParam?.testName],
        ['Sample Type', report?.sampleType],
        ['Statistic', report?.twoGroupNonParam?.statistic],
        ['p-value', report?.twoGroupNonParam?.p],
        ['Significant', report?.twoGroupNonParam?.significant],
        ['Rank-biserial correlation', report?.twoGroupNonParam?.rankBiserial],
        ['Effect size', report?.twoGroupNonParam?.rankBiserialEffect],
        [`Group 1 (${toText(report?.twoGroupNonParam?.group1)}) median`, report?.twoGroupNonParam?.median1],
        [`Group 2 (${toText(report?.twoGroupNonParam?.group2)}) median`, report?.twoGroupNonParam?.median2],
        ['Message', report?.twoGroupNonParam?.message],
        ['Interpretation', report?.twoGroupNonParam?.rankBiserialInterpretation || report?.twoGroupNonParam?.interpretation]
      ]
    });
    if (report?.twoGroupNonParam?.comparisonRow) {
      rightSections.push({
        title: 'Comparison',
        type: 'table',
        headers: ['Comparison', report.twoGroupNonParam.comparisonRow.statLabel || 'Statistic', 'RBC', 'p', 'Sig'],
        weights: [2.0, 1, 1, 1, 0.8],
        rows: [[
          report.twoGroupNonParam.comparisonRow.comparison,
          report.twoGroupNonParam.comparisonRow.stat,
          report.twoGroupNonParam.comparisonRow.rbc || 'N/A',
          report.twoGroupNonParam.comparisonRow.p,
          report.twoGroupNonParam.comparisonRow.sig
        ]]
      });
      rightSections.push({
        title: 'Significance Guide',
        type: 'table',
        headers: ['p-value', 'Stars', 'Meaning'],
        weights: [1.2, 0.8, 2.2],
        rows: [
          ['p < 0.05', '*', 'Significant'],
          ['p < 0.01', '**', 'Very significant'],
          ['p < 0.001', '***', 'Highly significant']
        ]
      });
    }
  } else if (isCorrelation) {
    const corr = report?.correlationMatrix || {};
    const pearsonHeaders = Array.isArray(corr?.pearson?.matrixHeaders) ? corr.pearson.matrixHeaders : [];
    const pearsonRows = Array.isArray(corr?.pearson?.matrixRows) ? corr.pearson.matrixRows : [];
    const spearmanHeaders = Array.isArray(corr?.spearman?.matrixHeaders) ? corr.spearman.matrixHeaders : [];
    const spearmanRows = Array.isArray(corr?.spearman?.matrixRows) ? corr.spearman.matrixRows : [];

    rightSections.push({
      title: corr?.testName || 'Correlation Matrix',
      type: 'fields',
      rows: [
        ['Test', corr?.testName],
        ['Sample Type', report?.sampleType],
        ['Variable count', corr?.variableCount],
        ['Variables', Array.isArray(corr?.variables) ? corr.variables.join(', ') : corr?.variables],
        ['Returned methods', Array.isArray(corr?.availableMethods) ? corr.availableMethods.join(', ') : corr?.availableMethods],
        ['Selected method', corr?.selectedMethod],
        ['Use both override', corr?.useBoth],
        ['All normal', corr?.allNormal],
        ['Pearson heatmap', corr?.pearsonHeatmap],
        ['Pearson linearity', corr?.pearsonLinearity],
        ['Spearman heatmap', corr?.spearmanHeatmap],
        ['Spearman linearity', corr?.spearmanLinearity]
      ]
    });

    if (pearsonRows.length > 0) {
      rightSections.push({
        title: 'Pearson Correlation Table',
        type: 'table',
        headers: ['Variable', ...pearsonHeaders.map((header) => toText(header))],
        weights: [1.8, ...pearsonHeaders.map(() => 1)],
        rows: pearsonRows.map((row) => {
          const values = Array.isArray(row?.values) ? row.values : [];
          return [row?.variable, ...values];
        })
      });
    }

    if (spearmanRows.length > 0) {
      rightSections.push({
        title: 'Spearman Correlation Table',
        type: 'table',
        headers: ['Variable', ...spearmanHeaders.map((header) => toText(header))],
        weights: [1.8, ...spearmanHeaders.map(() => 1)],
        rows: spearmanRows.map((row) => {
          const values = Array.isArray(row?.values) ? row.values : [];
          return [row?.variable, ...values];
        })
      });
    }

    const pearsonHeatmapImage = normalizeImageDataUrl(corr?.pearsonHeatmapImage);
    const pearsonLinearityImage = normalizeImageDataUrl(corr?.pearsonLinearityImage);
    const spearmanHeatmapImage = normalizeImageDataUrl(corr?.spearmanHeatmapImage);
    const spearmanLinearityImage = normalizeImageDataUrl(corr?.spearmanLinearityImage);

    if (hasUsableImageData(pearsonHeatmapImage)) {
      rightSections.push({
        title: 'Pearson Heatmap',
        type: 'image',
        imageData: pearsonHeatmapImage,
        caption: 'Pearson correlation heatmap'
      });
    }
    if (hasUsableImageData(pearsonLinearityImage)) {
      rightSections.push({
        title: 'Pearson Linearity Check',
        type: 'image',
        imageData: pearsonLinearityImage,
        caption: 'Pearson linearity check plot'
      });
    }
    if (hasUsableImageData(spearmanHeatmapImage)) {
      rightSections.push({
        title: 'Spearman Heatmap',
        type: 'image',
        imageData: spearmanHeatmapImage,
        caption: 'Spearman correlation heatmap'
      });
    }
    if (hasUsableImageData(spearmanLinearityImage)) {
      rightSections.push({
        title: 'Spearman Linearity Check',
        type: 'image',
        imageData: spearmanLinearityImage,
        caption: 'Spearman linearity check plot'
      });
    }

    if (corr?.pearson) {
      rightSections.push({
        title: 'Pearson Summary',
        type: 'fields',
        rows: [
          ['Strongest pair', corr?.pearson?.strongestPair],
          ['Strongest r', corr?.pearson?.strongestValue],
          ['Strong pairs (|r| > 0.7)', corr?.pearson?.strongPairs],
          ['Pair count', corr?.pearson?.pairCount]
        ]
      });
    }

    if (corr?.spearman) {
      rightSections.push({
        title: 'Spearman Summary',
        type: 'fields',
        rows: [
          ['Strongest pair', corr?.spearman?.strongestPair],
          ['Strongest rho', corr?.spearman?.strongestValue],
          ['Strong pairs (|rho| > 0.7)', corr?.spearman?.strongPairs],
          ['Pair count', corr?.spearman?.pairCount]
        ]
      });
    }

    rightSections.push({
      title: 'Correlation Message',
      type: 'fields',
      rows: [
        ['Decision', corr?.decision],
        ['Strongest correlation message', corr?.strongestMessage]
      ]
    });
  } else if (isMultivariate) {
    const multivariate = report?.multivariate || {};
    rightSections.push({
      title: multivariate?.modeLabel || 'Multivariate Analysis',
      type: 'fields',
      rows: [
        ['Technique', multivariate?.modeLabel],
        ['Goal', multivariate?.goal],
        ['Interpretation', multivariate?.interpretation],
        ['Message', multivariate?.message || report?.finalMessage]
      ]
    });

    const multivariateSummaryRows = Array.isArray(multivariate?.summaryRows)
      ? multivariate.summaryRows.filter((row) => Array.isArray(row) && row.length >= 2 && !['Technique', 'Goal'].includes(toText(row?.[0])))
      : [];
    if (multivariateSummaryRows.length > 0) {
      rightSections.push({
        title: 'Multivariate Summary',
        type: 'fields',
        rows: multivariateSummaryRows
      });
    }

    const multivariateTables = Array.isArray(multivariate?.tables)
      ? multivariate.tables.filter((table) => table && Array.isArray(table.headers) && table.headers.length > 0)
      : [];
    multivariateTables.forEach((table) => {
      rightSections.push({
        title: table.title || 'Multivariate Table',
        type: 'table',
        headers: table.headers,
        rows: Array.isArray(table.rows) ? table.rows : []
      });
      if (toText(table?.note) !== 'N/A') {
        rightSections.push({
          title: `${table.title || 'Multivariate Table'} Note`,
          type: 'fields',
          rows: [['Note', table.note]]
        });
      }
    });
  } else {
    rightSections.push({
      title: 'Primary Result',
      type: 'fields',
      rows: [
        ['Test', report?.primary?.testName],
        ['Statistic', report?.primary?.statistic],
        ['p-value', report?.primary?.p],
        ['Significant', report?.primary?.significant],
        ['Message', report?.primary?.message || report?.finalMessage]
      ]
    });
  }

  if (includePosthoc) {
    rightSections.push(
      {
        title: hasTukeyPairwise ? 'TUKEY HSD POST-HOC TEST' : 'Post-hoc',
        type: 'fields',
        rows: [
          ['Source', report?.posthocLabel],
          ['Method', report?.posthocMethod || report?.posthocLabel],
          ['Comparisons', report?.posthocComparisons],
          ['Significant', report?.posthocSignificant]
        ]
      },
      hasTukeyPairwise
        ? {
            title: 'PAIRWISE COMPARISONS (TUKEY HSD)',
            type: 'table',
            headers: ['Comparison', 'Mean Diff', '95% CI (+/-)', 'P-Value (Adj)', 'Result'],
            weights: [1.8, 0.95, 1.15, 0.95, 0.65],
            rows: tukeyPairwiseRows.map((row) => ([
              row?.comparison,
              row?.meanDiff,
              row?.ciPm,
              row?.pAdj,
              resolveSignificanceStars(
                row?.pAdj,
                String(row?.result || '').trim().toLowerCase() !== 'ns'
              )
            ]))
          }
        : {
            title: 'Post-hoc Results',
            type: 'table',
            headers: posthocColumns.map((column) => formatHeader(column)),
            weights: (() => {
              if (posthocColumns.length <= 1) return [1];
              const weights = [2.4];
              for (let i = 1; i < posthocColumns.length; i += 1) {
                weights.push(1);
              }
              return weights;
            })(),
            rows: posthocRows.map((row) => posthocColumns.map((column) => formatSignificanceCell(row, column, row?.[column])))
          }
    );
    if (dunnPosthocDescriptiveRows.length > 0) {
      rightSections.push({
        title: posthocDescriptiveTitle,
        type: 'table',
        headers: [
          'Comparison',
          'Group A',
          'n(A)',
          'Median [Q1, Q3] (A)',
          'Group B',
          'n(B)',
          'Median [Q1, Q3] (B)',
          'Delta Median',
          'Statistic',
          'Adj p',
          'Sig'
        ],
        weights: [1.2, 0.9, 0.5, 1.0, 0.9, 0.5, 1.0, 0.75, 0.6, 0.65, 0.45],
        rows: dunnPosthocDescriptiveRows.map((row) => ([
          row?.comparison,
          row?.groupA,
          row?.nA,
          row?.medianIqrA,
          row?.groupB,
          row?.nB,
          row?.medianIqrB,
          row?.medianDelta,
          row?.stat,
          row?.pAdj,
          resolveSignificanceStars(
            row?.pAdj,
            String(row?.sig || '').trim().toLowerCase() !== 'ns'
          )
        ]))
      });
      rightSections.push({
        title: 'Post-hoc Significance Scale',
        type: 'fields',
        rows: [
          ['***', 'p < 0.001'],
          ['**', 'p < 0.01'],
          ['*', 'p < 0.05'],
          ['ns', 'p >= 0.05']
        ]
      });
      rightSections.push({
        title: 'Post-hoc Reporting Note',
        type: 'fields',
        rows: [[
          'Note',
          'Only significant comparisons are shown in the main descriptive table. All pairwise tests were performed; full results are available in supplementary outputs.'
        ]]
      });
    }
  }

  if (toText(report?.reportEndNote) !== 'N/A') {
    const fontSizeRaw = Number(report?.reportEndFontSize);
    rightSections.push({
      title: 'End Of Report Notes',
      type: 'fields',
      rows: [
        ['Text', report?.reportEndNote],
        ['Font Family', report?.reportEndFontFamily],
        ['Font Size', Number.isFinite(fontSizeRaw) ? `${fontSizeRaw}px` : report?.reportEndFontSize],
        ['Text Color', report?.reportEndTextColor]
      ]
    });
  }

  return { leftSections, rightSections };
};

const renderTextBlock = (doc, lines, x, topY, width, fontStyle, fontSize, color, style, draw) => {
  const lh = lineHeight(fontSize);
  const textStartY = topY + style.cellPadY + lh * 0.78;
  if (draw) {
    doc.setFont('helvetica', fontStyle);
    doc.setFontSize(fontSize);
    doc.setTextColor(color[0], color[1], color[2]);
    lines.forEach((line, i) => {
      doc.text(line, x + style.cellPadX, textStartY + i * lh, { maxWidth: width - style.cellPadX * 2 });
    });
  }
  return lines.length * lh + style.cellPadY * 2;
};

const getImageLayout = (doc, imageValue, width, style, options = {}) => {
  const dataUrl = normalizeImageDataUrl(imageValue);
  const requestedMaxWidth = Number(options?.maxWidth);
  const requestedMaxHeight = Number(options?.maxHeight);
  const usableWidth = Number.isFinite(requestedMaxWidth)
    ? Math.max(8, requestedMaxWidth)
    : Math.max(8, width - style.cellPadX * 2);
  const maxImageHeight = Number.isFinite(requestedMaxHeight)
    ? Math.max(8, requestedMaxHeight)
    : Math.max(14, 46 * (style.bodySize / BASE_STYLE.bodySize));

  if (!dataUrl) {
    return {
      valid: false,
      dataUrl: '',
      imageType: 'PNG',
      imageWidth: usableWidth,
      imageHeight: 0
    };
  }

  try {
    const props = doc.getImageProperties(dataUrl);
    const w = Number(props?.width);
    const h = Number(props?.height);
    const ratio = Number.isFinite(w) && Number.isFinite(h) && w > 0 ? h / w : 1;
    let imageWidth = usableWidth;
    let imageHeight = imageWidth * ratio;

    if (!Number.isFinite(imageHeight) || imageHeight <= 0) {
      imageHeight = maxImageHeight;
    }

    if (imageHeight > maxImageHeight) {
      imageHeight = maxImageHeight;
      imageWidth = Math.max(8, imageHeight / (ratio || 1));
    }

    const detectedType = String(props?.fileType || 'PNG').toUpperCase();
    const imageType = detectedType === 'JPG'
      ? 'JPEG'
      : (['PNG', 'JPEG', 'WEBP'].includes(detectedType) ? detectedType : 'PNG');

    return {
      valid: true,
      dataUrl,
      imageType,
      imageWidth,
      imageHeight
    };
  } catch (err) {
    return {
      valid: false,
      dataUrl: '',
      imageType: 'PNG',
      imageWidth: usableWidth,
      imageHeight: 0
    };
  }
};

const renderColumn = (doc, x, startY, width, sections, style, draw) => {
  let y = startY;

  sections.forEach((section) => {
    const sectionTitleLines = wrapLines(doc, section.title, width - style.headerPadX * 2, 'bold', style.sectionSize);
    const sectionHeaderHeight = Math.max(
      style.minHeaderH,
      sectionTitleLines.length * lineHeight(style.sectionSize) + style.headerPadY * 2
    );

    if (draw) {
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(x, y, width, sectionHeaderHeight, 0.8, 0.8, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(style.sectionSize);
      doc.setTextColor(51, 65, 85);
      const headerStartY = y + style.headerPadY + lineHeight(style.sectionSize) * 0.78;
      sectionTitleLines.forEach((line, i) => {
        doc.text(line, x + style.headerPadX, headerStartY + i * lineHeight(style.sectionSize));
      });
    }

    y += sectionHeaderHeight + style.sectionGap;

    if (section.type === 'fields') {
      section.rows.forEach(([label, value]) => {
        const labelWidth = Math.min(style.labelWidth, width * 0.48);
        const valueWidth = width - labelWidth - style.cellPadX * 2;
        const labelLines = wrapLines(doc, `${toText(label)}:`, labelWidth - style.cellPadX * 2, 'bold', style.bodySize);
        const valueLines = wrapLines(doc, value, valueWidth, 'normal', style.bodySize);
        const rowLines = Math.max(labelLines.length, valueLines.length);
        const rowHeight = rowLines * lineHeight(style.bodySize) + style.cellPadY * 2;

        if (draw) {
          renderTextBlock(doc, labelLines, x, y, labelWidth, 'bold', style.bodySize, [71, 85, 105], style, true);
          renderTextBlock(
            doc,
            valueLines,
            x + labelWidth,
            y,
            width - labelWidth,
            'normal',
            style.bodySize,
            [15, 23, 42],
            style,
            true
          );
        }

        y += rowHeight;
      });
    }

    if (section.type === 'table') {
      const weights = Array.isArray(section.weights) && section.weights.length === section.headers.length
        ? section.weights
        : section.headers.map(() => 1);
      const totalWeight = weights.reduce((acc, w) => acc + w, 0) || 1;
      const colWidths = weights.map((w) => (width * w) / totalWeight);

      const drawTableRow = (cells, isHeader = false) => {
        const linesPerCell = cells.map((cell, idx) =>
          wrapLines(
            doc,
            cell,
            colWidths[idx] - style.cellPadX * 2,
            isHeader ? 'bold' : 'normal',
            style.tableSize
          )
        );

        const rowLineCount = Math.max(1, ...linesPerCell.map((lines) => lines.length));
        const rowHeight = rowLineCount * lineHeight(style.tableSize) + style.cellPadY * 2;

        if (draw) {
          let cx = x;
          linesPerCell.forEach((cellLines, idx) => {
            const cw = colWidths[idx];
            doc.setDrawColor(226, 232, 240);
            if (isHeader) {
              doc.setFillColor(248, 250, 252);
              doc.rect(cx, y, cw, rowHeight, 'FD');
            } else {
              doc.rect(cx, y, cw, rowHeight, 'D');
            }

            renderTextBlock(
              doc,
              cellLines,
              cx,
              y,
              cw,
              isHeader ? 'bold' : 'normal',
              style.tableSize,
              isHeader ? [71, 85, 105] : [15, 23, 42],
              style,
              true
            );

            cx += cw;
          });
        }

        y += rowHeight;
      };

      drawTableRow(section.headers, true);

      if (section.rows.length === 0) {
        drawTableRow(['No rows available.', ...Array(Math.max(0, section.headers.length - 1)).fill('')], false);
      } else {
        section.rows.forEach((row) => drawTableRow(row, false));
      }
    }

    if (section.type === 'image') {
      const imageLayout = getImageLayout(doc, section.imageData, width, style);
      const captionText = toText(section.caption);
      const captionLines = captionText !== 'N/A'
        ? wrapLines(doc, captionText, width - style.cellPadX * 2, 'normal', style.tableSize)
        : [];
      const captionHeight = captionLines.length > 0
        ? captionLines.length * lineHeight(style.tableSize) + style.cellPadY * 2
        : 0;

      if (imageLayout.valid) {
        const imageBlockHeight = imageLayout.imageHeight + style.cellPadY * 2;

        if (draw) {
          const imageX = x + (width - imageLayout.imageWidth) / 2;
          const imageY = y + style.cellPadY;
          doc.setDrawColor(226, 232, 240);
          doc.rect(imageX, imageY, imageLayout.imageWidth, imageLayout.imageHeight, 'D');
          doc.addImage(
            imageLayout.dataUrl,
            imageLayout.imageType,
            imageX,
            imageY,
            imageLayout.imageWidth,
            imageLayout.imageHeight,
            undefined,
            'FAST'
          );
          if (captionLines.length > 0) {
            renderTextBlock(doc, captionLines, x, y + imageBlockHeight, width, 'normal', style.tableSize, [71, 85, 105], style, true);
          }
        }

        y += imageBlockHeight + captionHeight;
      } else {
        const fallbackLines = wrapLines(
          doc,
          'Image not available in this report.',
          width - style.cellPadX * 2,
          'normal',
          style.bodySize
        );
        const fallbackHeight = fallbackLines.length * lineHeight(style.bodySize) + style.cellPadY * 2;

        if (draw) {
          renderTextBlock(doc, fallbackLines, x, y, width, 'normal', style.bodySize, [71, 85, 105], style, true);
          if (captionLines.length > 0) {
            renderTextBlock(doc, captionLines, x, y + fallbackHeight, width, 'normal', style.tableSize, [71, 85, 105], style, true);
          }
        }

        y += fallbackHeight + captionHeight;
      }
    }

    y += style.blockGap;
  });

  return y;
};

const renderDocument = (doc, report, style, draw = false, orderedSectionsOverride = null, headingOverride = null) => {
  const orderedSections = Array.isArray(orderedSectionsOverride)
    ? orderedSectionsOverride
    : (() => {
        const { leftSections, rightSections } = buildSections(report);
        return [...leftSections, ...rightSections];
      })();

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageBottom = pageHeight - style.margin;
  const contentWidth = pageWidth - style.margin * 2;

  let y = style.margin;

  const reportTitleText = toText(report?.reportTitle);
  const reportAuthorText = toText(report?.reportAuthor);
  const customTitle = typeof headingOverride?.titleText === 'string' ? headingOverride.titleText.trim() : '';
  const customSubtitle = typeof headingOverride?.subtitleText === 'string' ? headingOverride.subtitleText.trim() : '';
  const defaultTitleText = reportTitleText !== 'N/A' ? reportTitleText : 'STEP 05: MODEL SUMMARY FIELDS';
  const defaultSubtitleText = reportAuthorText !== 'N/A'
    ? `Author: ${reportAuthorText}`
    : 'Final Academic Report (R Output) - Complete One-Page Export';
  const titleText = customTitle || defaultTitleText;
  const subtitleText = customSubtitle || defaultSubtitleText;
  const titleLines = wrapLines(doc, titleText, contentWidth, 'bold', style.titleSize);
  const subtitleLines = wrapLines(doc, subtitleText, contentWidth, 'bold', style.subtitleSize);
  const metaLines = wrapLines(doc, `Generated ${new Date().toLocaleString()}`, contentWidth, 'normal', style.metaSize);

  const drawHeadingBlock = (lines, fontStyle, fontSize, color) => {
    const lh = lineHeight(fontSize);
    if (draw) {
      doc.setFont('helvetica', fontStyle);
      doc.setFontSize(fontSize);
      doc.setTextColor(color[0], color[1], color[2]);
      const startBaseline = y + lh * 0.78;
      lines.forEach((line, i) => {
        doc.text(line, style.margin, startBaseline + i * lh);
      });
    }
    y += lines.length * lh + style.sectionGap;
  };

  drawHeadingBlock(titleLines, 'bold', style.titleSize, [15, 23, 42]);
  drawHeadingBlock(subtitleLines, 'bold', style.subtitleSize, [30, 41, 59]);
  drawHeadingBlock(metaLines, 'normal', style.metaSize, [100, 116, 139]);

  const startY = y + style.blockGap;
  const endY = renderColumn(doc, style.margin, startY, contentWidth, orderedSections, style, draw);

  return {
    maxY: endY,
    pageBottom
  };
};

const renderVisualizationPage = (doc, report, sections, draw = false, headingOverride = null) => {
  const style = {
    ...scaleStyle(1),
    margin: 7,
    colGap: 4.5,
    blockGap: 1.2
  };
  const imageSections = Array.isArray(sections)
    ? sections.filter((section) => section?.type === 'image' && hasUsableImageData(section?.imageData))
    : [];

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageBottom = pageHeight - style.margin;
  const contentWidth = pageWidth - style.margin * 2;

  let y = style.margin;

  const reportTitleText = toText(report?.reportTitle);
  const reportAuthorText = toText(report?.reportAuthor);
  const customTitle = typeof headingOverride?.titleText === 'string' ? headingOverride.titleText.trim() : '';
  const customSubtitle = typeof headingOverride?.subtitleText === 'string' ? headingOverride.subtitleText.trim() : '';
  const defaultTitleText = reportTitleText !== 'N/A' ? reportTitleText : 'STEP 05: VISUALIZATION APPENDIX';
  const defaultSubtitleText = reportAuthorText !== 'N/A'
    ? `Author: ${reportAuthorText}`
    : 'Plots generated from analysis output';
  const titleText = customTitle || defaultTitleText;
  const subtitleText = customSubtitle || defaultSubtitleText;
  const titleLines = wrapLines(doc, titleText, contentWidth, 'bold', style.titleSize);
  const subtitleLines = wrapLines(doc, subtitleText, contentWidth, 'bold', style.subtitleSize);
  const metaLines = wrapLines(doc, `Generated ${new Date().toLocaleString()}`, contentWidth, 'normal', style.metaSize);

  const drawHeadingBlock = (lines, fontStyle, fontSize, color) => {
    const lh = lineHeight(fontSize);
    if (draw) {
      doc.setFont('helvetica', fontStyle);
      doc.setFontSize(fontSize);
      doc.setTextColor(color[0], color[1], color[2]);
      const startBaseline = y + lh * 0.78;
      lines.forEach((line, i) => {
        doc.text(line, style.margin, startBaseline + i * lh);
      });
    }
    y += lines.length * lh + style.sectionGap;
  };

  drawHeadingBlock(titleLines, 'bold', style.titleSize, [15, 23, 42]);
  drawHeadingBlock(subtitleLines, 'bold', style.subtitleSize, [30, 41, 59]);
  drawHeadingBlock(metaLines, 'normal', style.metaSize, [100, 116, 139]);

  if (imageSections.length === 0) {
    const lines = wrapLines(doc, 'No visualization plots available.', contentWidth, 'normal', style.bodySize);
    const msgHeight = lines.length * lineHeight(style.bodySize) + style.cellPadY * 2;
    if (draw) {
      renderTextBlock(doc, lines, style.margin, y + style.blockGap, contentWidth, 'normal', style.bodySize, [71, 85, 105], style, true);
    }
    return {
      maxY: y + style.blockGap + msgHeight,
      pageBottom
    };
  }

  const startY = y + style.blockGap;
  const columns = imageSections.length <= 1 ? 1 : 2;
  const colGap = Math.max(4, style.colGap);
  const colWidth = (contentWidth - colGap) / columns;
  const rowCount = Math.max(1, Math.ceil(imageSections.length / columns));
  const rowGap = Math.max(4, style.blockGap * 4);
  const availableHeight = Math.max(40, pageBottom - startY);
  const rowHeight = (availableHeight - rowGap * (rowCount - 1)) / rowCount;
  let maxY = startY;

  imageSections.forEach((section, idx) => {
    const col = idx % columns;
    const row = Math.floor(idx / columns);
    const cardX = style.margin + col * (colWidth + colGap);
    const cardY = startY + row * (rowHeight + rowGap);
    const cardW = colWidth;
    const cardH = rowHeight;

    const titleLinesLocal = wrapLines(doc, section.title, cardW - style.headerPadX * 2, 'bold', style.sectionSize);
    const headerH = Math.max(
      style.minHeaderH,
      titleLinesLocal.length * lineHeight(style.sectionSize) + style.headerPadY * 2
    );
    const captionText = toText(section.caption);
    const captionLines = captionText !== 'N/A'
      ? wrapLines(doc, captionText, cardW - style.cellPadX * 2, 'normal', style.tableSize)
      : [];
    const captionH = captionLines.length > 0
      ? captionLines.length * lineHeight(style.tableSize) + style.cellPadY * 2
      : 0;
    const imageMaxWidth = Math.max(8, cardW - style.cellPadX * 2);
    const imageMaxHeight = Math.max(12, cardH - headerH - style.sectionGap - captionH - style.cellPadY * 2);
    const imageLayout = getImageLayout(doc, section.imageData, cardW, style, {
      maxWidth: imageMaxWidth,
      maxHeight: imageMaxHeight
    });

    if (draw) {
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(cardX, cardY, cardW, cardH, 0.9, 0.9, 'D');

      doc.setFillColor(241, 245, 249);
      doc.roundedRect(cardX, cardY, cardW, headerH, 0.9, 0.9, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(style.sectionSize);
      doc.setTextColor(51, 65, 85);
      const titleStartY = cardY + style.headerPadY + lineHeight(style.sectionSize) * 0.78;
      titleLinesLocal.forEach((line, lineIdx) => {
        doc.text(line, cardX + style.headerPadX, titleStartY + lineIdx * lineHeight(style.sectionSize));
      });
    }

    const imageY = cardY + headerH + style.sectionGap;
    if (imageLayout.valid) {
      const drawX = cardX + (cardW - imageLayout.imageWidth) / 2;
      const drawY = imageY + (imageMaxHeight - imageLayout.imageHeight) / 2;
      if (draw) {
        doc.setDrawColor(226, 232, 240);
        doc.rect(drawX, drawY, imageLayout.imageWidth, imageLayout.imageHeight, 'D');
        doc.addImage(
          imageLayout.dataUrl,
          imageLayout.imageType,
          drawX,
          drawY,
          imageLayout.imageWidth,
          imageLayout.imageHeight,
          undefined,
          'FAST'
        );
      }
    } else {
      const fallbackLines = wrapLines(
        doc,
        'Image not available in this report.',
        cardW - style.cellPadX * 2,
        'normal',
        style.bodySize
      );
      if (draw) {
        renderTextBlock(
          doc,
          fallbackLines,
          cardX,
          imageY + Math.max(0, (imageMaxHeight - (fallbackLines.length * lineHeight(style.bodySize) + style.cellPadY * 2)) / 2),
          cardW,
          'normal',
          style.bodySize,
          [71, 85, 105],
          style,
          true
        );
      }
    }

    if (captionLines.length > 0 && draw) {
      const captionY = cardY + cardH - captionH;
      renderTextBlock(doc, captionLines, cardX, captionY, cardW, 'normal', style.tableSize, [71, 85, 105], style, true);
    }

    maxY = Math.max(maxY, cardY + cardH);
  });

  return {
    maxY,
    pageBottom
  };
};

const fitStyleToSinglePage = (doc, report, orderedSectionsOverride = null, headingOverride = null) => {
  let scale = 1;
  let style = scaleStyle(scale);

  for (let i = 0; i < 20; i += 1) {
    const metrics = renderDocument(doc, report, style, false, orderedSectionsOverride, headingOverride);
    if (metrics.maxY <= metrics.pageBottom) {
      return style;
    }

    const usedHeight = metrics.maxY - style.margin;
    const availableHeight = metrics.pageBottom - style.margin;

    if (usedHeight <= 0 || availableHeight <= 0) {
      scale *= 0.9;
    } else {
      const ratio = Math.max(0.7, Math.min(0.98, (availableHeight / usedHeight) * 0.98));
      scale *= ratio;
    }

    if (scale < 0.08) {
      scale = 0.08;
      style = scaleStyle(scale);
      break;
    }

    style = scaleStyle(scale);
  }

  return style;
};

const sectionToSheet = (section, index) => {
  const name = toText(section?.title) || `Section ${index + 1}`;
  if (section?.type === 'fields') {
    const rows = Array.isArray(section?.rows)
      ? section.rows.map(([label, value]) => [toText(label), toText(value)])
      : [];
    return {
      name,
      headers: ['Field', 'Value'],
      rows
    };
  }

  if (section?.type === 'image') {
    const imageIncluded = hasUsableImageData(section?.imageData) ? 'Yes' : 'No';
    return {
      name,
      headers: ['Field', 'Value'],
      rows: [
        ['Caption', toText(section?.caption)],
        ['Image included in PDF', imageIncluded]
      ]
    };
  }

  const headers = Array.isArray(section?.headers) && section.headers.length > 0
    ? section.headers.map((header) => toText(header))
    : ['Value'];
  const rows = Array.isArray(section?.rows)
    ? section.rows.map((row) => {
        const cells = Array.isArray(row) ? row : [row];
        const normalized = headers.map((_, idx) => toText(cells[idx]));
        return normalized;
      })
    : [];
  return {
    name,
    headers,
    rows
  };
};

export const buildModelSummaryExportPayload = (report) => {
  if (!report) return null;
  const { leftSections, rightSections } = buildSections(report);
  const orderedSections = [...leftSections, ...rightSections];
  const imageSections = collectGeneratedPlotSections(
    report,
    orderedSections.filter((section) => section?.type === 'image')
  );
  const exportSections = [
    ...orderedSections.filter((section) => section?.type !== 'image'),
    ...imageSections
  ];
  return {
    baseName: buildBaseName(report),
    generatedAt: new Date().toISOString(),
    sheets: exportSections.map((section, idx) => sectionToSheet(section, idx))
  };
};

const exportModelSummaryFile = async (report, format) => {
  if (!report) return { success: false, error: 'No model summary data to export.' };
  const payload = buildModelSummaryExportPayload(report);
  if (!payload) return { success: false, error: 'No export payload was generated.' };
  if (!window?.electronAPI?.exportModelSummaryFile) {
    return { success: false, error: 'Desktop export API is not available.' };
  }
  return window.electronAPI.exportModelSummaryFile({
    format,
    ...payload
  });
};

export const exportModelSummaryToCsv = async (report) => exportModelSummaryFile(report, 'csv');
export const exportModelSummaryToXlsx = async (report) => exportModelSummaryFile(report, 'xlsx');

export const exportModelSummaryToPdf = async (report) => {
  if (!report) {
    return { success: false, error: 'No model summary data to export.' };
  }

  const savePdfDoc = async (doc, payloadReport) => {
    const fileName = buildFileName(payloadReport, 'pdf');
    const baseName = fileName.replace(/\.pdf$/i, '');
    if (window?.electronAPI?.exportModelSummaryFile) {
      const pdfArrayBuffer = doc.output('arraybuffer');
      const pdfBase64 = arrayBufferToBase64(pdfArrayBuffer);
      const exportResponse = await window.electronAPI.exportModelSummaryFile({
        format: 'pdf',
        baseName,
        generatedAt: new Date().toISOString(),
        pdfBase64
      });
      if (exportResponse?.success) {
        return { success: true, fileName: exportResponse.filePath || fileName };
      }
      if (exportResponse?.canceled) {
        return { success: false, canceled: true };
      }
    }
    doc.save(fileName);
    return { success: true, fileName };
  };

  const buildSummaryOnlyPdf = async (causeMessage = '') => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
    const { leftSections, rightSections } = buildSections(report);
    const orderedSections = [...leftSections, ...rightSections];
    const summarySections = orderedSections.filter((section) => section?.type !== 'image');
    const firstPageSections = summarySections.length > 0 ? summarySections : orderedSections;
    const summaryStyle = fitStyleToSinglePage(doc, report, firstPageSections);
    renderDocument(doc, report, summaryStyle, true, firstPageSections);
    const saveResult = await savePdfDoc(doc, report);
    if (!saveResult?.success) return saveResult;
    return {
      success: true,
      fileName: saveResult.fileName,
      warning: causeMessage
        ? `Visualization pages were skipped due to rendering issue: ${causeMessage}`
        : 'Visualization pages were skipped due to rendering issue.'
    };
  };

  try {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
    const { leftSections, rightSections } = buildSections(report);
    const orderedSections = [...leftSections, ...rightSections];
    const visualizationSections = collectGeneratedPlotSections(
      report,
      orderedSections.filter((section) => section?.type === 'image')
    );
    const summarySections = orderedSections.filter((section) => section?.type !== 'image');
    const firstPageSections = summarySections.length > 0 ? summarySections : orderedSections;

    const summaryStyle = fitStyleToSinglePage(doc, report, firstPageSections);
    renderDocument(doc, report, summaryStyle, true, firstPageSections);

    if (visualizationSections.length > 0) {
      const hasCorrelationPlots = visualizationSections.some((section) => {
        const title = String(section?.title || '').toLowerCase();
        return title.includes('pearson') || title.includes('spearman') || title.includes('heatmap') || title.includes('linearity');
      });
      const hasInteractionPlots = visualizationSections.some((section) => {
        const title = String(section?.title || '').toLowerCase();
        return title.includes('interaction');
      });
      const visualizationSubtitle = hasCorrelationPlots && hasInteractionPlots
        ? 'Correlation plots and ANOVA interaction plots'
        : hasInteractionPlots
          ? 'ANOVA interaction plot'
          : hasCorrelationPlots
            ? 'Correlation heatmaps and linearity checks'
            : 'All generated plots from analysis output';

      const chunkSize = 2;
      const totalChunks = Math.max(1, Math.ceil(visualizationSections.length / chunkSize));
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
        const start = chunkIndex * chunkSize;
        const end = start + chunkSize;
        const chunk = visualizationSections.slice(start, end);
        doc.addPage('a4', 'landscape');
        const visualizationHeading = {
          titleText: totalChunks > 1
            ? `STEP 05: VISUALIZATION APPENDIX (${chunkIndex + 1}/${totalChunks})`
            : 'STEP 05: VISUALIZATION APPENDIX',
          subtitleText: visualizationSubtitle
        };
        renderVisualizationPage(
          doc,
          report,
          chunk,
          true,
          visualizationHeading
        );
      }
    }

    return await savePdfDoc(doc, report);
  } catch (err) {
    try {
      return await buildSummaryOnlyPdf(err?.message || 'Unknown visualization rendering error');
    } catch (fallbackErr) {
      return { success: false, error: fallbackErr?.message || err?.message || 'Failed to generate PDF.' };
    }
  }
};
