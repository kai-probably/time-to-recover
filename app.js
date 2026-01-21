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

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
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

const zoneAndGradientPlugin = {
  id: "zoneAndGradient",
  beforeDraw(chartInstance, args, pluginOptions) {
    const { ctx, chartArea, scales } = chartInstance;
    if (!chartArea) return;

    const yScale = scales.y;
    const threshold = pluginOptions?.threshold;
    if (threshold == null) return;

    const yThreshold = yScale.getPixelForValue(threshold);

    // For RECOVERY (0..1 increasing), "not ready yet" is BELOW threshold.
    const danger = pluginOptions?.dangerColor || "rgba(216,29,58,0.10)";
    ctx.save();
    ctx.fillStyle = danger;
    ctx.fillRect(chartArea.left, yThreshold, chartArea.right - chartArea.left, chartArea.bottom - yThreshold);
    ctx.restore();
  }
};
Chart.register(zoneAndGradientPlugin);

const chart = new Chart(ctx, {
  type: "line",
  data: {
    labels: [],
    datasets: [
      {
        label: "Recovery",
        data: [],
        tension: 0.25,
        borderWidth: 2,
        pointRadius: 0,
        fill: "origin",
        borderColor: (context) => {
          const { chart } = context;
          const { ctx: c, chartArea } = chart;
          if (!chartArea) return cssVar("--accent") || "#1d68d8";

          const accent = cssVar("--accent") || "#1d68d8";
          const danger = cssVar("--danger") || "#d81d3a";

          const grad = c.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
          grad.addColorStop(0, danger);
          grad.addColorStop(1, accent);
          return grad;
        },
        backgroundColor: "rgba(29,104,216,0.08)",
      },
      {
        label: "Ready line",
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

function applyChartTheme() {
  const text = cssVar("--text");
  const muted = cssVar("--muted");
  const border = cssVar("--border");

  chart.options.scales.x.ticks.color = muted;
  chart.options.scales.y.ticks.color = muted;
  chart.options.scales.x.grid.color = border;
  chart.options.scales.y.grid.color = border;

  chart.options.plugins.legend.labels.color = muted;

  // Dataset colors (leave dataset[0] scriptable gradient intact)
  const danger = cssVar("--danger") || muted;
  chart.data.datasets[1].borderColor = danger;

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
      tauPerIntensity: 4.0,
      readyFraction: inp.readyFraction
    }
  );

  const recoveryPct = Math.max(0, Math.min(100, model.recoveryPercent));
  const recoveryFrac = Math.max(0, Math.min(1, 1 - model.fatigueFractionNow));

  els.recoveryPct.textContent = `${Math.round(recoveryPct)}%`;
  els.remainingLoad.textContent = `${Math.round(recoveryFrac * 100)}%`;
  els.timeToRecover.textContent = formatHours(model.hoursUntilReady);

  els.explainText.textContent =
    model.hoursUntilReady <= 0
      ? "You’re good to go — another session should be worth doing now."
      : "Give it a bit more time — you’ll get more value from your next session once you’re past the line.";

  // build chart series
  const step = 1; // hours
  const labels = [];
  const series = [];
  const threshold = [];

  const horizon = inp.horizon;
  for (let h = 0; h <= horizon; h += step) {
    labels.push(h);
    const remaining = model.load > 0 ? (model.fatigueAt(h) / model.load) : 0;
    const recovery = 1 - remaining;
    series.push(recovery);

    // Ready when recovery >= 1 - readyFraction
    threshold.push(1 - model.readyFraction);
  }

  chart.data.labels = labels;
  chart.data.datasets[0].data = series;
  chart.data.datasets[1].data = threshold;

  chart.options.plugins.nowLine = { xNow: inp.hoursSince };
  chart.options.plugins.zoneAndGradient = {
    threshold: 1 - model.readyFraction,
    dangerColor: "rgba(216,29,58,0.10)"
  };
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