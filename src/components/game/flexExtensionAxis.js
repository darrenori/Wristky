function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

const AXIS_LOCK_THRESHOLD = 6;
const GAMMA_PREFERENCE_RATIO = 0.75;
const BETA_FALLBACK_RATIO = 1.25;
const ORTHOGONAL_ASSIST_RATIO = 0.65;
const REVERSE_DIRECTION_THRESHOLD = -0.25;
const SIGN_CAPTURE_THRESHOLD = 9;
const SIGN_CAPTURE_DWELL_MS = 140;

function getPreferredAxis(absBeta, absGamma) {
  if (absGamma >= AXIS_LOCK_THRESHOLD && absGamma >= absBeta * GAMMA_PREFERENCE_RATIO) {
    return 'gamma';
  }

  if (absBeta >= AXIS_LOCK_THRESHOLD && absBeta > absGamma * BETA_FALLBACK_RATIO) {
    return 'beta';
  }

  return null;
}

function getDirectionVector(rawBeta, rawGamma) {
  const magnitude = Math.hypot(rawBeta, rawGamma);
  if (magnitude < AXIS_LOCK_THRESHOLD) return null;

  return {
    beta: rawBeta / magnitude,
    gamma: rawGamma / magnitude,
  };
}

export function getFlexExtensionMeasurement({
  orientation,
  baseline,
  axisLock = null,
  directionLock = 0,
  maxDegrees = 90,
  measuringHand = 'right',
  target = null,
}) {
  const handMirror = measuringHand === 'left' ? -1 : 1;
  const rawBeta = ((orientation.rawBeta ?? orientation.beta ?? 0) - (baseline.beta || 0)) * handMirror;
  const rawGamma = ((orientation.rawGamma ?? orientation.gamma ?? 0) - (baseline.gamma || 0)) * handMirror;
  const absBeta = Math.abs(rawBeta);
  const absGamma = Math.abs(rawGamma);
  const movementMagnitude = Math.hypot(rawBeta, rawGamma);
  const explicitTargetDirection = target === 'extension' ? 1 : target === 'flexion' ? -1 : 0;

  let nextAxisLock = axisLock;
  if (nextAxisLock && typeof nextAxisLock === 'string') {
    nextAxisLock = { axis: nextAxisLock, directionVector: null };
  }

  // The demo videos show the phone moving mostly through the horizontal screen axis.
  // Prefer gamma, but keep a beta fallback in case a device reports the hinge there.
  // Once the movement is established, keep a direction vector so higher-angle orientation
  // shifts do not make the live angle collapse back to zero.
  if (!nextAxisLock) {
    const preferredAxis = getPreferredAxis(absBeta, absGamma);
    if (preferredAxis) {
      nextAxisLock = {
        axis: preferredAxis,
        directionVector: getDirectionVector(rawBeta, rawGamma),
      };
    }
  }

  if (nextAxisLock && !nextAxisLock.directionVector) {
    nextAxisLock = {
      ...nextAxisLock,
      directionVector: getDirectionVector(rawBeta, rawGamma),
    };
  }

  const activeAxis = nextAxisLock?.axis || 'gamma';
  const rawActive = activeAxis === 'beta' ? rawBeta : rawGamma;
  let nextDirectionLock = directionLock;

  if (!nextDirectionLock && Math.abs(rawActive) >= AXIS_LOCK_THRESHOLD) {
    nextDirectionLock = explicitTargetDirection || Math.sign(rawActive) || 1;
  }

  const directionVector = nextAxisLock?.directionVector;
  const directionSimilarity =
    directionVector && movementMagnitude > 0
      ? ((rawBeta * directionVector.beta) + (rawGamma * directionVector.gamma)) / movementMagnitude
      : 1;

  const assistedMagnitude = activeAxis === 'beta'
    ? Math.hypot(rawBeta, rawGamma * ORTHOGONAL_ASSIST_RATIO)
    : Math.hypot(rawGamma, rawBeta * ORTHOGONAL_ASSIST_RATIO);
  const signedProjection = directionVector
    ? (rawBeta * directionVector.beta) + (rawGamma * directionVector.gamma)
    : rawActive * (nextDirectionLock || 1);
  const signedTargetAngle = clamp(
    explicitTargetDirection
      ? Math.sign(rawActive || 0) * assistedMagnitude
      : Math.sign(signedProjection || 0) * assistedMagnitude,
    -maxDegrees,
    maxDegrees
  );

  const directedValue = explicitTargetDirection
    ? signedTargetAngle * explicitTargetDirection
    : nextDirectionLock && directionSimilarity >= REVERSE_DIRECTION_THRESHOLD
      ? assistedMagnitude
      : 0;
  const targetAngle = clamp(directedValue, 0, maxDegrees);

  return {
    rawBeta,
    rawGamma,
    activeAxis,
    axisLock: nextAxisLock,
    directionLock: nextDirectionLock,
    signedTargetAngle,
    targetAngle,
  };
}

export function captureSignedMotionDirection({
  signedAngle,
  directionRef,
  candidateRef,
  threshold = SIGN_CAPTURE_THRESHOLD,
  dwellMs = SIGN_CAPTURE_DWELL_MS,
  now = Date.now(),
}) {
  if (directionRef.current) return directionRef.current;

  const sign = Math.sign(signedAngle);
  if (!sign || Math.abs(signedAngle) < threshold) {
    candidateRef.current = { sign: 0, since: 0 };
    return 0;
  }

  if (candidateRef.current.sign !== sign) {
    candidateRef.current = { sign, since: now };
    return 0;
  }

  if (now - candidateRef.current.since >= dwellMs) {
    directionRef.current = sign;
    return sign;
  }

  return 0;
}
