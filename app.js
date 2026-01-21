import { makeModel } from "./recoveryModel.js";

function mustGet(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element: #${id}`);
  return el;
}

const els = {
  intensity: mustGet("intensity"),
  duration: mustGet("duration"),
  hoursSince: mustGet("hoursSince"),
  readyFraction: mustGet("readyFraction"),
  horizon: mustGet("horizon"),

  intensityOut: mustGet("intensityOut"),
  durationOut: mustGet("durationOut"),
  hoursSinceOut: mustGet("hoursSinceOut"),
  readyFractionOut: mustGet("readyFractionOut"),
  horizonOut: mustGet("horizonOut"),

  recoveryPct: mustGet("recoveryPct"),
  timeToRecover: mustGet("timeToRecover"),
  remainingLoad: mustGet("remainingLoad"),
  explainText: mustGet("explainText"),
};

const ctx = mustGet("recoveryChart");

if (!window.Chart) {
  throw new Error("Chart.js not loaded. Check the CDN script tag in index.html or your network connection.");
}

// Add a vertical "Now" line using a lightweight plugin
const nowLinePlugin = {
  id: "nowLine",
  afterDraw(chartInstance, args, pluginOptions) {
    const xNow = pluginOptions?.xNow;
    if (xNow == null) return;

    const { ctx, chartArea, scales } = chartInstance;
    const xScale = scales.x;
    const x = xScale.getPixelForValue(xNow);

    if (x < chartArea.left || x > chartArea.right) return;

    ctx.save();
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.moveTo(x, chartArea.top);
    ctx.lineTo(x, chartArea.bottom);
    ctx.stroke();

    ctx.globalAlpha = 0.9;
    ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace";
    ctx.fillText("Now", Math.min(x + 6, chartArea.right - 30), chartArea.top + 14);
    ctx.restore();
  }
};
Chart.register(nowLinePlugin);

const chart = new Chart(ctx, {
  type: "line",
  data: {
    labels: [],
    datasets: [
      {
        label: "Remaining load",
        data: [],
        tension: 0.25,
        borderWidth: 2,
        pointRadius: 0,
      },
      {
        label: "Ready threshold",
        data: [],
        tension: 0,
        borderWidth: 1,
        borderDash: [6, 4],
        pointRadius: 0,
      }
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        min: 0,
        max: 1,
        ticks: {
          callback: (v) => `${Math.round(v * 100)}%`,
        },
      },
      x: {
        ticks: { maxTicksLimit: 8 },
      },
    },
    plugins: {
      legend: { display: true },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const v = ctx.parsed.y;
            return `${ctx.dataset.label}: ${Math.round(v * 100)}%`;
          }
        }
      }
    },
    animation: false,
  },
});

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function applyChartTheme() {
  const text = cssVar("--text");
  const muted = cssVar("--muted");
  const border = cssVar("--border");

  chart.options.scales.x.ticks.color = muted;
  chart.options.scales.y.ticks.color = muted;
  chart.options.scales.x.grid.color = border;
  chart.options.scales.y.grid.color = border;

  chart.options.plugins.legend.labels.color = muted;

  // Dataset colors
  chart.data.datasets[0].borderColor = text;
  chart.data.datasets[1].borderColor = muted;

  chart.update();
}

// Apply on load and when system theme changes
applyChartTheme();
window
  .matchMedia("(prefers-color-scheme: light)")
  .addEventListener("change", applyChartTheme);

function readInputs() {
  return {
    intensity: Number(els.intensity.value),
    durationMin: Number(els.duration.value),
    hoursSince: Number(els.hoursSince.value),
    readyFraction: Number(els.readyFraction.value),
    horizon: Number(els.horizon.value),
  };
}

function formatHours(hours) {
  if (hours < 1) return "<1h";
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = hours / 24;
  return `${roundTo(days, 1)}d`;
}

function roundTo(x, places) {
  const p = Math.pow(10, places);
  return Math.round(x * p) / p;
}

function update() {
  const inp = readInputs();

  // update outputs
  els.intensityOut.textContent = `${inp.intensity}`;
  els.durationOut.textContent = `${inp.durationMin}`;
  els.hoursSinceOut.textContent = `${inp.hoursSince}`;
  els.readyFractionOut.textContent = `${Math.round(inp.readyFraction * 100)}%`;
  els.horizonOut.textContent = `${inp.horizon}`;

  const model = makeModel(
    { intensity: inp.intensity, durationMin: inp.durationMin, hoursSince: inp.hoursSince },
    {
      // keep these "hidden assumptions" simple:
      intensityExponent: 1.25,
      baseTauHours: 14.0,
      tauPerIntensity: 2.0,
      readyFraction: inp.readyFraction
    }
  );

  const recoveryPct = Math.max(0, Math.min(100, model.recoveryPercent));
  const remainingPct = Math.max(0, Math.min(1, model.fatigueFractionNow));

  els.recoveryPct.textContent = `${Math.round(recoveryPct)}%`;
  els.remainingLoad.textContent = `${Math.round(remainingPct * 100)}%`;
  els.timeToRecover.textContent = formatHours(model.hoursUntilReady);

  els.explainText.textContent =
    model.hoursUntilReady <= 0
      ? "You’re past the threshold where another session should be comparatively efficient (in this model)."
      : "Remaining load is above the threshold. Waiting longer should increase the efficiency of your next session.";

  // build chart series
  const step = 1; // hours
  const labels = [];
  const series = [];
  const threshold = [];

  const horizon = inp.horizon;
  for (let h = 0; h <= horizon; h += step) {
    labels.push(h);
    const frac = model.load > 0 ? (model.fatigueAt(h) / model.load) : 0;
    series.push(frac);
    threshold.push(model.readyFraction);
  }

  chart.data.labels = labels;
  chart.data.datasets[0].data = series;
  chart.data.datasets[1].data = threshold;

  chart.options.plugins.nowLine = { xNow: inp.hoursSince };
  chart.update();
}

["input", "change"].forEach(evt => {
  els.intensity.addEventListener(evt, update);
  els.duration.addEventListener(evt, update);
  els.hoursSince.addEventListener(evt, update);
  els.readyFraction.addEventListener(evt, update);
  els.horizon.addEventListener(evt, update);
});

update();