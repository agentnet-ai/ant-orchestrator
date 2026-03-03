const THRESHOLDS = {
  resolver: {
    coverageMin: 0.8,
    confidenceMin: 0.7,
  },
};

/**
 * Evaluate resolver results against thresholds.
 */
function evaluateThresholds(resolverResult, overrides = {}) {
  const { coverage, confidence } = resolverResult;
  const coverageMin = overrides.coverageMin ?? THRESHOLDS.resolver.coverageMin;
  const confidenceMin = overrides.confidenceMin ?? THRESHOLDS.resolver.confidenceMin;
  const passed = coverage >= coverageMin && confidence >= confidenceMin;

  return {
    passed,
    coverageMin,
    confidenceMin,
    notes: passed
      ? "Resolver met thresholds"
      : `Resolver below thresholds (coverage=${coverage} < ${coverageMin} or confidence=${confidence} < ${confidenceMin})`,
  };
}

module.exports = { THRESHOLDS, evaluateThresholds };
