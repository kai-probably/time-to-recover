# Time to Recover

Fitness recovery time calculation. Not medical advice!
--
https://kai-probably.github.io/time-to-recover/

A tiny GitHub Pages proof-of-concept that visualizes a simple recovery curve from:
- intensity (1–10)
- duration (minutes)
- hours since last training

### What it is
A model of **remaining training load** that decays over time:
- load = duration × intensity^p
- remaining(t) = exp(-t/τ)

## Scientific inspiration (simplified)

This proof-of-concept is **inspired by** training load approaches where a training “impulse” produces an effect that **decays exponentially** over time (impulse-response / fitness–fatigue style modeling).  
It also borrows the general idea behind TRIMP-like methods where training load is related to **duration × intensity** (often with intensity weighted nonlinearly).

**Important:** this repo does *not* implement a validated performance model.  
It intentionally uses a **single-decay** curve (“remaining load”) to answer a narrower UX question:

> “When does training again stop being obviously inefficient?”

References / background reading:
- Fitness–fatigue / impulse-response model overviews and time constants: (see literature review)  
- Discussion of impulse-response modeling and exponential decay in training effects  
- Practical use of exponentially weighted training load concepts in Performance Manager-style systems  
- TRIMP concept for quantifying training impulse (duration × intensity weighting)

Intensity also slows recovery by increasing τ (harder sessions recover slower).

### What it is NOT
Medical advice. It doesn’t know:
- injury status
- sleep quality
- soreness distribution
- stress or illness

It answers a narrower question:
**“When does training again stop being obviously inefficient?”**

