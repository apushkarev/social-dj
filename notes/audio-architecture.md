# Audio Architecture — Web Audio API in Electron

## Requirements
- Integrate with audio analysis and visualization tools
- Playback to two different audio output devices (master + headphones) with manual device selection
- Simultaneous playback of two tracks into one or two outputs with fading/cross-fading
- Future: quality real-time audio retiming (time-stretch without pitch change)

## Why Not a Library
howler.js, audio-controller, audiojs — all wrap Web Audio API but don't expose `setSinkId`, `AnalyserNode` routing, or dual-context patterns. A DJ app needs direct access.

## Web Audio API Covers Everything Natively

### Analysis & Visualization
- `AnalyserNode` — real-time FFT (frequency) and time-domain waveform data
- Directly usable for scratchwave (frequency-colored) and beatwave (transient) rendering
- `AudioWorkletNode` — custom processing on dedicated high-priority thread for anything beyond `AnalyserNode`

### Two Output Devices
- `navigator.mediaDevices.enumerateDevices()` — lists available audio outputs for device selector UI
- `AudioContext.setSinkId(deviceId)` — routes a context to a specific device
- Two `AudioContext` instances: one for master (speakers), one for headphones (cueing)
- Requires Chromium 110+ / Electron 23+ (we're on Electron 33)

### Dual Playback + Crossfade
- Two `MediaElementAudioSourceNode` instances (or `AudioBufferSourceNode`) in the same context
- `GainNode` per track — `gain.linearRampToValueAtTime()` for smooth crossfade
- Route both to same `destination` for single-output mix
- Or split: track A → master context, track B → headphone context

### Future: Real-Time Retiming
- `AudioBufferSourceNode.playbackRate` — real-time speed change (pitch linked)
- Independent pitch/time: `AudioWorkletNode` with phase vocoder (WASM)
- `AudioWorklet` runs at real-time priority, processes in 128-sample frames
- `OfflineAudioContext` for pre-processing (non-real-time time-stretch)

## Architecture

```
Track A → MediaElementSourceNode → GainNode ─┐
                                               ├→ Master AudioContext (sinkId: speakers)
Track B → MediaElementSourceNode → GainNode ─┘
                                    │
                                    └→ Headphone AudioContext (sinkId: headphones)
                                         (pre-listening / cueing)
```

Each track can be routed to master, headphones, or both. Crossfader controls the two GainNodes on the master context. Cue button connects/disconnects a track from the headphone context.

## Key APIs
- `AudioContext` — processing graph container
- `MediaElementAudioSourceNode` — wraps `<audio>` element as source node
- `GainNode` — volume control, crossfade automation
- `AnalyserNode` — FFT / waveform data for visualization
- `AudioWorkletNode` — custom DSP on real-time thread
- `AudioContext.setSinkId()` — output device selection
- `navigator.mediaDevices.enumerateDevices()` — device listing
