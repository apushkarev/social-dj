# Beat, Bar & Phrase Detection in Music — Research Summary

## State of the Field
- **Beat detection**: ~95% accurate for modern pop — mature, effectively solved
- **Downbeat (bar) detection**: active research, multiple viable approaches
- **Phrase detection**: unsolved in general; tractable for pop due to structural homogeneity

---

## Waveform Visualizations (VDJ Reference)

### Scratchwave (colored waveform)
Colors = frequency content per time-slice (FFT or band-pass):
- Blue/Cyan → highs (hi-hats, cymbals)
- Green/Yellow → mids (vocals, instruments)
- Red → lows (kick, bass)
- White peaks = all bands peaking simultaneously (beat moments)

### Beatwave
Onset/transient-focused. Spectral flux suppresses sustained sounds, highlights rhythmic skeleton. Beat markers from autocorrelation-based grid algorithm.

---

## Mixxx Codebase Analysis (`/Users/ap/Documents/_git/mixxx`)
- Beat detection only: Queen Mary DSP `DetectionFunction` (spectral flux) + `TempoTrackV2` (DP beat tracker)
- No downbeat/bar/phrase detection implemented
- 2020 GSoC proposal (Cristiano Lacerda) for `measures_downbeats_bars_and_phrases` — never merged
- `beatutils.cpp:315` admits first beat anchor should be the downbeat but isn't solved
- Wiki article: tempogram finds metric level pulse rates but can't determine phase (where bars actually start)

---

## Approaches for Downbeat / Structure Detection

### 1. madmom (Python, `CPJKU/madmom`)
- `RNNDownBeatProcessor` → joint beat/downbeat activation via multiple RNNs
- `DBNDownBeatTrackingProcessor` → HMM-based decoding with metrical constraints (`beats_per_bar=[3, 4]`)
- Handles downbeats (bars) but not phrases
- State-of-the-art in MIREX 2016, still competitive
- Used as foundation by multiple other approaches

### 2. Ensemble CNNs + Viterbi (Durand et al.)
- Tatum-level segmentation → harmony/melody/rhythm/bass features → separate CNNs → ensemble → Viterbi decoding
- +16.8% over second-best system at time of publication

### 3. Tempo-Invariant CNNs (Apple Research, 2024)
- Deterministic time-warping enables learning rhythmic patterns independently of tempo
- Better generalization to unseen tempi than conventional approaches

### 4. All-In-One (`allin1`, Taejun Kim, 2023) ⭐ Most Promising
- Unified model: beat + downbeat + functional structure segmentation + labeling
- Source-separated spectrograms + dilated neighborhood attentions
- State-of-the-art on Harmonix Set
- `pip install allin1` — returns BPM, beats, beat_positions (1,2,3,4...), downbeats, labeled segments (intro, verse, chorus, bridge, outro)
- Concurrent learning of all tasks improves each individual task
- Key insight: tasks are mutually reinforcing — beat tracking helps structure, structure helps downbeat

### 5. Barwise Segmentation (Marmoret et al., 2023)
- Uses madmom for bar detection, builds bar-aligned spectrograms
- Self-similarity analysis for structure segmentation
- Confirms experimentally: section boundaries synchronize on downbeats in Western pop

---

## Advantage: Precise Beatgrids Already Exist
Since the library has manually verified beatgrids:
- **Bars**: trivial — every 4 beats for 4/4 pop
- **Downbeat**: reduces to 4-way phase classification (which beat is "1"?)
- **Phrases**: detect structural changes at 4 or 8 bar boundaries

---

## Two-Step Beat Alignment ⭐ Novel Approach

### Observation
The perceptually correct beat moment = peak amplitude of the bass waveform. FFT-based detectors have ±12ms resolution (512 samples at 44.1kHz ≈ one bass wave cycle at ~86Hz), which is visually noticeable in beat animation.

### Algorithm
1. **Coarse**: any FFT-based beat detector (±12ms accuracy)
2. **Fine**: low-pass filter (Butterworth, cutoff ~120Hz) → amplitude envelope → snap each beat to peak within ±25ms window
3. For constant-BPM: rebuild equidistant grid from refined positions

### Why It Works for Pop
- Kick drum dominates below 120Hz
- Modern kicks are compressed → sharp, consistent peaks
- Deterministic (no ML), sub-second processing
- `scipy.signal.butter` + `scipy.signal.sosfilt`

### Limitations
- No kick → no reference (acoustic, piano ballads)
- Sustained synth bass may shift peak from rhythmic beat
- Variable-BPM needs per-beat snapping instead of grid rebuild

---

## Proposed Combined Pipeline
1. `allin1` for structure analysis (beats, downbeats, sections)
2. Two-step alignment for sample-precise beatgrid
3. Result: automated beatgrid + bar markers + phrase/section boundaries
