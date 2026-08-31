#!/usr/bin/env python3
"""
Lays the narration onto the recorded session.

Each line is placed at the exact timestamp its beat began during recording, so
the voice cannot drift from the picture no matter how long a page took to load.
"""
import json, os, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
VOICE = os.environ.get("KVOICE", "am_michael")
SESSION = os.path.join(HERE, "session.webm")
OUT = os.path.join(HERE, "ignition-demo.mp4")

beats = json.load(open(os.path.join(HERE, "beats.json")))
segments = json.load(open(os.path.join(HERE, "script.json")))
audio_dir = os.path.join(HERE, "audio", VOICE)

inputs = ["-i", SESSION]
graph, labels = [], []
for index, seg in enumerate(segments, start=1):
    inputs += ["-i", os.path.join(audio_dir, seg["id"] + ".wav")]
    delay = int(round(beats[seg["id"]] * 1000))
    graph.append(f"[{index}:a]aresample=48000,adelay={delay}|{delay}[n{index}]")
    labels.append(f"[n{index}]")

graph.append(
    "".join(labels)
    + f"amix=inputs={len(labels)}:normalize=0,"
    # Even out the reading, then keep peaks off the ceiling.
    "dynaudnorm=f=250:g=7:p=0.9,alimiter=level_in=1:limit=0.92,apad[aout]"
)

# The screencast stream carries no duration header, so the video itself
# bounds the render via -shortest.
subprocess.run(
    ["ffmpeg", "-y", *inputs,
     "-filter_complex", ";".join(graph),
     "-map", "0:v", "-map", "[aout]", "-shortest",
     # Hackathon submissions usually cap at three minutes exactly.
     "-t", os.environ.get("MAXLEN", "179.6"),
     "-c:v", "libx264", "-preset", "slow", "-crf", "20",
     "-pix_fmt", "yuv420p", "-r", "30", "-movflags", "+faststart",
     "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
     OUT],
    check=True)
print("wrote", OUT)
