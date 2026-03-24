import { createPageUrl } from '@/utils';
import { getSessions } from './useLocalStorage';
import {
  METRIC_INFO,
  formatMetricValue,
  formatSessionMeta,
  getMetricRatio,
} from '../results/results-utils';

const EXERCISE_FLOW_KEY = 'wrist_exercise_flow';
const EXERCISE_RESULTS_KEY = 'wrist_exercise_results';
const RESULT_METRIC_KEYS = ['flexion', 'extension', 'radial', 'ulnar', 'smoothness_pre', 'smoothness_post', 'endurance'];
const FALLBACK_PAGE_NAMES = ['MeasureFlexion', 'MeasureRadial', 'MeasureEndurance'];

const PAGE_LIBRARY = {
  MeasureCircle: {
    pageName: 'MeasureCircle',
    metricKey: 'smoothness_pre',
    title: 'Wrist rotation',
    color: '#32d296',
  },
  MeasureFlexion: {
    pageName: 'MeasureFlexion',
    metricKey: 'flexion',
    title: 'Flexion',
    color: METRIC_INFO.flexion.color,
  },
  MeasureExtension: {
    pageName: 'MeasureExtension',
    metricKey: 'extension',
    title: 'Extension',
    color: METRIC_INFO.extension.color,
  },
  MeasureRadial: {
    pageName: 'MeasureRadial',
    metricKey: 'radial',
    title: 'Radial deviation',
    color: METRIC_INFO.radial.color,
  },
  MeasureUlnar: {
    pageName: 'MeasureUlnar',
    metricKey: 'ulnar',
    title: 'Ulnar deviation',
    color: METRIC_INFO.ulnar.color,
  },
  MeasureEndurance: {
    pageName: 'MeasureEndurance',
    metricKey: 'endurance',
    title: 'Steadiness hold',
    color: METRIC_INFO.endurance.color,
  },
};

const METRIC_TO_PAGE = {
  flexion: 'MeasureFlexion',
  extension: 'MeasureExtension',
  radial: 'MeasureRadial',
  ulnar: 'MeasureUlnar',
  smoothness_pre: 'MeasureCircle',
  smoothness_post: 'MeasureCircle',
  endurance: 'MeasureEndurance',
};

function hasMeasurementData(results) {
  return Boolean(
    results &&
    RESULT_METRIC_KEYS.some((metricKey) => results[metricKey] !== undefined && results[metricKey] !== null),
  );
}

function getCurrentResults() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem('wrist_results') || 'null');
    return hasMeasurementData(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function createPlanEntry(pageName, metricKey, focusLabel) {
  const pageInfo = PAGE_LIBRARY[pageName];
  return {
    pageName,
    metricKey,
    title: pageInfo.title,
    color: pageInfo.color,
    focusLabel,
  };
}

function createGeneralPlan() {
  return {
    kind: 'general',
    title: 'SMART EXERCISES',
    sourceDetail: 'No measurement results were found, so this starter set uses the same movement games from measurement.',
    focusAreas: [
      'Use comfortable range only.',
      'Keep the forearm supported during each drill.',
    ],
    steps: FALLBACK_PAGE_NAMES.map((pageName) => createPlanEntry(pageName, PAGE_LIBRARY[pageName].metricKey)),
  };
}

function createPersonalizedPlan(results, sourceDetail) {
  const candidatesByPage = new Map();

  RESULT_METRIC_KEYS.forEach((metricKey) => {
    const rawValue = results?.[metricKey];
    const pageName = METRIC_TO_PAGE[metricKey];
    const info = METRIC_INFO[metricKey];
    if (rawValue === undefined || rawValue === null || !pageName || !info) return;

    const candidate = {
      ratio: getMetricRatio(metricKey, rawValue),
      entry: createPlanEntry(
        pageName,
        metricKey,
        `${info.label}: ${formatMetricValue(metricKey, rawValue)}`
      ),
    };

    const existing = candidatesByPage.get(pageName);
    if (!existing || candidate.ratio < existing.ratio) {
      candidatesByPage.set(pageName, candidate);
    }
  });

  const rankedCandidates = Array.from(candidatesByPage.values()).sort((a, b) => a.ratio - b.ratio);
  if (rankedCandidates.length === 0) return createGeneralPlan();

  const steps = rankedCandidates.slice(0, 3).map((candidate) => candidate.entry);
  const usedPages = new Set(steps.map((step) => step.pageName));

  FALLBACK_PAGE_NAMES.forEach((pageName) => {
    if (steps.length >= 3 || usedPages.has(pageName)) return;
    steps.push(createPlanEntry(pageName, PAGE_LIBRARY[pageName].metricKey));
    usedPages.add(pageName);
  });

  return {
    kind: 'personalized',
    title: 'SMART EXERCISES',
    sourceDetail,
    focusAreas: rankedCandidates.slice(0, 3).map((candidate) => candidate.entry.focusLabel).filter(Boolean),
    steps,
  };
}

export function buildExercisePlan() {
  const currentResults = getCurrentResults();
  if (currentResults) {
    return createPersonalizedPlan(currentResults, 'Built from your current measurement results.');
  }

  const sessions = getSessions();
  if (sessions.length > 0 && hasMeasurementData(sessions[0])) {
    return createPersonalizedPlan(
      sessions[0],
      `Built from your latest saved session on ${formatSessionMeta(sessions[0].date)}.`
    );
  }

  return createGeneralPlan();
}

export function launchExerciseFlow(plan) {
  const flow = {
    startedAt: Date.now(),
    steps: plan.steps,
  };
  sessionStorage.setItem(EXERCISE_FLOW_KEY, JSON.stringify(flow));
  sessionStorage.removeItem(EXERCISE_RESULTS_KEY);
  return getExerciseStepUrl(plan.steps[0].pageName, 0);
}

export function clearExerciseFlow() {
  sessionStorage.removeItem(EXERCISE_FLOW_KEY);
}

function readExerciseFlow() {
  try {
    return JSON.parse(sessionStorage.getItem(EXERCISE_FLOW_KEY) || 'null');
  } catch {
    return null;
  }
}

export function getExerciseStepUrl(pageName, stepIndex) {
  return `${createPageUrl(pageName)}?mode=exercise&step=${stepIndex}`;
}

export function getExercisePageContext(pageName) {
  const params = new URLSearchParams(window.location.search);
  if (params.get('mode') !== 'exercise') return null;

  const flow = readExerciseFlow();
  const steps = Array.isArray(flow?.steps) ? flow.steps : [];
  if (steps.length === 0) return null;

  const requestedStep = Number(params.get('step') || '0');
  const stepIndex = Number.isFinite(requestedStep) && requestedStep >= 0 && requestedStep < steps.length
    ? requestedStep
    : steps.findIndex((step) => step.pageName === pageName);

  if (stepIndex < 0) return null;

  const currentStep = steps[stepIndex];
  if (!currentStep || currentStep.pageName !== pageName) return null;

  return {
    mode: 'exercise',
    stepIndex,
    totalSteps: steps.length,
    currentStep,
    nextStep: steps[stepIndex + 1] || null,
    isLastStep: stepIndex >= steps.length - 1,
  };
}

export function getExerciseNextRoute(exerciseContext, fallbackPageName) {
  if (!exerciseContext) return createPageUrl(fallbackPageName);
  if (exerciseContext.nextStep) {
    return getExerciseStepUrl(exerciseContext.nextStep.pageName, exerciseContext.stepIndex + 1);
  }
  return createPageUrl('Results');
}

export function saveGameResult(metricKey, value, exerciseContext) {
  if (exerciseContext) {
    try {
      const existing = JSON.parse(sessionStorage.getItem(EXERCISE_RESULTS_KEY) || '{}');
      const storageKey = exerciseContext.currentStep?.metricKey || metricKey;
      sessionStorage.setItem(EXERCISE_RESULTS_KEY, JSON.stringify({ ...existing, [storageKey]: value }));
    } catch {
      // Ignore storage errors during exercise mode.
    }
    return;
  }

  const existing = JSON.parse(sessionStorage.getItem('wrist_results') || '{}');
  sessionStorage.setItem('wrist_results', JSON.stringify({ ...existing, [metricKey]: value }));
}
