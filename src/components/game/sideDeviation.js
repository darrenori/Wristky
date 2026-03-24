function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeHeadingDelta(delta) {
  return ((delta + 540) % 360) - 180;
}

export function getMeasuringHand() {
  try {
    const stored = JSON.parse(sessionStorage.getItem('wrist_hand') || '{}');
    return stored?.measuring === 'left' ? 'left' : 'right';
  } catch {
    return 'right';
  }
}

export function getSignedFlatSideTilt({ orientation, baselineGamma = 0, measuringHand = 'right' }) {
  const rawGamma = (orientation.rawGamma ?? orientation.gamma ?? 0) - baselineGamma;
  const handMirror = measuringHand === 'left' ? -1 : 1;

  // Positive means thumb-side (radial) tilt, negative means pinky-side (ulnar) tilt,
  // regardless of whether the user is measuring the right or left wrist.
  return rawGamma * handMirror;
}

export function getSignedFlatYaw({ orientation, baselineAlpha = 0, measuringHand = 'right' }) {
  const rawAlpha = orientation.rawAlpha ?? orientation.alpha ?? 0;
  const handMirror = measuringHand === 'left' ? -1 : 1;
  const deltaAlpha = normalizeHeadingDelta(rawAlpha - baselineAlpha);

  // Positive means thumb-side (radial) motion and negative means pinky-side (ulnar)
  // after mirroring the left hand to match the right-hand convention.
  return deltaAlpha * handMirror;
}

export function getTargetSideDeviationAngle({
  orientation,
  baselineAlpha = 0,
  baselineGamma = 0,
  measuringHand = 'right',
  target = 'ulnar',
  deadzone = 1.5,
  maxDegrees = 40,
}) {
  const signedYaw = getSignedFlatYaw({ orientation, baselineAlpha, measuringHand });
  const signedTilt = getSignedFlatSideTilt({ orientation, baselineGamma, measuringHand });
  const primaryAxis = Math.abs(signedYaw) > 0.75 ? signedYaw : signedTilt;
  const targetAngle = target === 'radial' ? primaryAxis : -primaryAxis;
  const clamped = clamp(targetAngle, 0, maxDegrees);

  return Math.abs(clamped) < deadzone ? 0 : clamped;
}
