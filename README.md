# Time to Recover

Fitness recovery time calculation. Not medical advice!
--
https://kai-probably.github.io/time-to-recover/

A tiny GitHub Pages proof-of-concept that visualizes a simple recovery curve from:
- intensity (1–5)
- duration (minutes)
- hours since last training

## What this models (and what it doesn’t)

This tool models **fatigue decay over time** after a single training session.
It does **not** model performance, adaptation, or long-term supercompensation.

The curve represents how *remaining fatigue* decreases.
“Recovery” is defined as the inverse of remaining fatigue.

## Interpreting the graph

- **Red zone (Too early)**  
  Fatigue is still dominant. Training here is more likely to feel heavy and less productive.

- **Middle zone (Ready)**  
  Enough recovery has occurred that another session is generally worth doing.

- **Green zone (Fully recovered, conservative)**  
  Fatigue is unlikely to be the limiting factor. This does not imply peak performance.

  ## Assumptions

- Fatigue decays exponentially over time
- Intensity matters more than duration
- Readiness is a configurable threshold, not a biological constant
- The model is deliberately conservative
