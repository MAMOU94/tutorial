export const isMissingDataValue = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'number' && Number.isNaN(value)) return true;

  const normalized = String(value).trim().toLowerCase();
  return normalized === '' || normalized === 'na' || normalized === 'nan';
};

export const normalizeMissingDataValue = (value) => (
  isMissingDataValue(value) ? null : value
);
