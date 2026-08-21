#!/usr/bin/env python3
"""
Renders the narration with Kokoro, one wav per beat, plus a timings file the
recorder uses to pace the picture. Neural, local, and no account required.
"""
import json, os, sys, warnings
warnings.filterwarnings("ignore")

# The bundled espeak wheels bake in their build machine's data path, so point
# everything at the Homebrew install before anything tries to load it.
os.environ.setdefault("PHONEMIZER_ESPEAK_LIBRARY", "/opt/homebrew/lib/libespeak-ng.dylib")
os.environ.setdefault("ESPEAK_DATA_PATH", "/opt/homebrew/share")

from phonemizer.backend.espeak.wrapper import EspeakWrapper
EspeakWrapper.set_library("/opt/homebrew/lib/libespeak-ng.dylib")
try:
    EspeakWrapper.set_data_path("/opt/homebrew/share/espeak-ng-data")
except Exception:
    pass

import numpy as np, soundfile as sf
from kokoro import KPipeline

HERE = os.path.dirname(os.path.abspath(__file__))
VOICE = os.environ.get("KVOICE", "am_michael")
SPEED = float(os.environ.get("KSPEED", "1.08"))
SR = 24000

out_dir = os.path.join(HERE, "audio", VOICE)
os.makedirs(out_dir, exist_ok=True)
segments = json.load(open(os.path.join(HERE, "script.json")))
pipe = KPipeline(lang_code="a")

timings, total = {}, 0.0
for seg in segments:
    parts = [a for _, _, a in pipe(seg["text"], voice=VOICE, speed=SPEED)]
    wav = np.concatenate(parts)
    # A breath at the end of each line, so beats do not collide.
    wav = np.concatenate([wav, np.zeros(int(SR * 0.22), dtype=wav.dtype)])
    path = os.path.join(out_dir, seg["id"] + ".wav")
    sf.write(path, wav, SR)
    seconds = len(wav) / SR
    # The picture holds for the line plus a beat of air.
    timings[seg["id"]] = round(seconds + 0.62, 3)
    total += timings[seg["id"]]
    print(f"  {seg['id']}  {seconds:6.2f}s  {seg['beat']}")

json.dump(timings, open(os.path.join(HERE, "timings.json"), "w"), indent=1)
print(f"\n  voice {VOICE} @ {SPEED}x")
print(f"  film length {total:.1f}s  ({int(total//60)}:{int(total%60):02d})")
