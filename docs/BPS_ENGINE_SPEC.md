# BPS Engine

## Product Concept

BPS Engine is a production-minded, local-first ROS Terminal module for serious biopsychosocial observation. It translates the biopsychosocial model into a privacy-first operator analysis surface for note-taking, behavior review, psychology-adjacent research structure, and reflective drift detection.

The module is intentionally framed as human system monitoring:

- not therapy
- not diagnosis
- not medical advice
- not cloud-dependent

It is designed for operator-grade documentation, structured abnormal-psych-style note capture, behavioral pattern review, and longitudinal self or subject observation inside the ROS workspace.

## Information Architecture

The module lives as a single ROS app surface with internal sections:

1. Dashboard
2. BIO
3. PSYCHO
4. SOCIAL
5. Research Mode
6. Risk / Drift
7. Terminal / Export

The default landing view is Dashboard. Subjects are switched from a registry panel in the left rail.

## Core Features

### Dashboard

- overall BPS state summary
- Bio, Psycho, Social, and combined drift metrics
- recent logs
- active heuristic flags
- research note counts
- influence mapping counts
- direct quick-entry actions

### BIO

Structured logging for:

- sleep hours and quality
- fatigue
- exercise / movement
- physical stress
- work intensity
- caffeine
- nutrition notes
- environment notes

Outputs:

- `bioStressScore`
- fatigue / recovery pressure
- stimulation loading

### PSYCHO

Structured logging for:

- mood tags
- thought patterns
- cognitive distortions
- cognitive biases
- confidence
- impulsivity
- avoidance
- rumination
- stress interpretation
- decision replay

The initial taxonomy includes:

- loss aversion
- overconfidence
- framing effect
- availability bias
- sunk cost
- catastrophizing
- black-and-white thinking
- emotional reasoning
- hypervigilance
- dissociation-like note
- compulsive loop

Outputs:

- `psychoBiasLoad`
- bias clustering
- decision replay support
- baseline deviation

### SOCIAL

Structured logging for:

- contacts
- groups / systems
- authority exposure
- pressure
- conflict
- isolation
- support
- conformity risk
- post-interaction shift

Outputs:

- `socialPressureLoad`
- influence mapping
- pressure and conformity review

### Research Mode

Templates:

- Observation Entry
- Event Log
- Trigger-Response Log
- Behavioral Chain
- Environment-State-Outcome
- Case Note
- Longitudinal Comparison

Suggested fields:

- subject
- context
- precipitating factor
- observed behavior
- cognitive interpretation
- emotional markers
- physiological markers
- social context
- outcome
- follow-up

### Risk / Drift Engine

Derived local heuristic outputs:

- `bioStressScore`
- `psychoBiasLoad`
- `socialPressureLoad`
- `combinedDriftScore`

Flags are generated from recent cluster density and baseline deviation. They are prompts for deeper observation, not truth claims.

### Terminal / Export

Supported commands:

- `bps.status [subject]`
- `bps.log [subject] [layer]`
- `bps.bias [subject]`
- `bps.map [subject]`
- `bps.replay [subject]`
- `bps.alerts [subject]`
- `bps.research [subject]`
- `bps.export [subject] [json|md]`

Exports support:

- JSON
- Markdown

## Data Model

Workspace additions:

- `bpsSubjects`
- `bpsEntries`
- `bpsResearchNotes`
- `bpsScores`
- `bpsAlerts`
- `bpsRelationships`
- `bpsBaselines`

Each record is keyed by `subjectId` where applicable and includes:

- `id`
- `createdAt`
- `updatedAt`
- `source`
- `confidence`

## UX and Visual Direction

- desktop-first
- local-first
- dark matte surfaces
- terminal-adjacent research aesthetic
- restrained amber / copper / cyan accents
- no consumer wellness branding
- no playful illustrations
- no manipulative nudging

The Bos Taurus visual refresh anchors the shell with a darker operator-grade theme and a Version 0.2 release treatment.

## Safety Framing

BPS Engine does not:

- diagnose
- predict psychiatric conditions
- provide medical guidance
- claim clinical truth

It does:

- support structured self-observation
- support multi-subject research notes
- surface repeatable patterns
- provide local-first exports for analysis

