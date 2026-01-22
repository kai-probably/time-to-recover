// recoveryModel.js
// Framework-free, inspectable math.
// Philosophy: predict "efficiency readiness", not medical recovery.

// NOTE:
// This model estimates short-term fatigue decay and "readiness".
// It does NOT model performance, adaptation, or supercompensation.

export function makeModel(inputs, params) {
  // Intensity is a coarse, user-estimated scale (1–5)
  const intensity = clamp(inputs.intensity, 1, 5);
  const durationMin = clamp(inputs.durationMin, 0, 10000);
  const hoursSince = clamp(inputs.hoursSince, 0, 10000);

  const p = {
    intensityExponent: params.intensityExponent ?? 1.25,
    baseTauHours: params.baseTauHours ?? 14.0,
    // Higher intensity slows recovery; tuned for 1–5 scale
    tauPerIntensity: params.tauPerIntensity ?? 4.0,
    readyFraction: clamp(params.readyFraction ?? 0.25, 0.01, 0.99),
  };

  // Load: duration contributes linearly, intensity non-linearly.
  const load = durationMin * Math.pow(intensity, p.intensityExponent);

  // Recovery time constant τ (hours): harder sessions recover slower.
  const tauHours = p.baseTauHours + p.tauPerIntensity * intensity;

  function fatigueAt(tHours) {
    if (load <= 0) return 0;
    return load * Math.exp(-tHours / tauHours);
  }

  const fatigueNow = fatigueAt(hoursSince);
  const fatigueFractionNow = load > 0 ? (fatigueNow / load) : 0;

  const recoveryPercent = (1 - fatigueFractionNow) * 100;

  const readyFatigue = load * p.readyFraction;

  // Solve for t where fatigue(t) == readyFatigue.
  // t = -τ * ln(target/load)
  function hoursToReachFatigue(target) {
    if (load <= 0) return 0;
    const clampedTarget = clamp(target, 1e-12, load);
    return -tauHours * Math.log(clampedTarget / load);
  }

  const tReady = hoursToReachFatigue(readyFatigue);
  const hoursUntilReady = Math.max(0, tReady - hoursSince);

  return {
    inputs: { intensity, durationMin, hoursSince },
    params: p,
    load,
    tauHours,
    fatigueNow,
    fatigueFractionNow,
    recoveryPercent,
    readyFraction: p.readyFraction,
    hoursUntilReady,
    fatigueAt,
  };
}

function clamp(x, min, max) {
  return Math.max(min, Math.min(max, x));
}