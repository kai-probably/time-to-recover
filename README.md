# Time to Recover

Fitness recovery time can be calculated, probably.
--


A tiny GitHub Pages proof-of-concept that visualizes a simple recovery curve from:
- intensity (1–10)
- duration (minutes)
- hours since last training

### What it is
A model of **remaining training load** that decays over time:
- load = duration × intensity^p
- remaining(t) = exp(-t/τ)

Intensity also slows recovery by increasing τ (harder sessions recover slower).

### What it is NOT
Medical advice. It doesn’t know:
- injury status
- sleep quality
- soreness distribution
- stress or illness

It answers a narrower question:
**“When does training again stop being obviously inefficient?”**

### GitHub Pages
https://kai-probably.github.io/time-to-recover/
