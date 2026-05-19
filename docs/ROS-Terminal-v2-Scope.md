# ROS Terminal v2 Scope

## Summary

Terminal v2 is a **Command Memory Console**. Its first job is to preserve operational context inside the encrypted workspace, not to become a full host shell.

This foundation pass makes Terminal usable inside the cockpit and prepares it for appliance work without adding arbitrary shell execution.

## Current Scope

- Capture commands, outputs, and operational notes into active project memory.
- Keep simulated workspace commands available:
  - `help`
  - `find`
  - `health`
  - `stats`
  - `capture`
  - BPS command family
- Keep the input reachable while output grows.
- Keep output wrapped and contained inside embedded and floating module surfaces.
- Save command memory as existing `memoryItems` with `kind: "command"`.

## Not In This Pass

- No full PTY terminal.
- No arbitrary host shell execution.
- No OmniX/TZE native runner yet.
- No model-triggered terminal execution.
- No Raspberry Pi or Orange Pi appliance scaffold.

## Next Step

After embedded usability is stable, add guarded button-first native actions for OmniX and system readiness checks. Full host shell control remains a later appliance-readiness phase.
