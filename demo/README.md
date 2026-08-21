# The demo film

`LaunchPilot-demo.mp4` — 2:59, 1920×1080, H.264/AAC. Narrated by `af_heart` (Kokoro).

**It is a screen recording, not a slideshow.** One continuous browser session. The idea is
typed in character by character, the pipeline animates, the score counts up from zero, the
page really scrolls, the exhibit filter is really clicked, ⌘K is really pressed, and the
launch brief really opens. A cursor is drawn on top because a headless browser renders none.

**The camera points at what the voice is discussing.** A spotlight dims the page around the
score when the number is called, the sensitivity line when it is read out, the coverage
figures when they are quoted, and the cross-examined verdict at the turn. It is the difference
between showing a page and directing attention.

**The narration is a monologue, not a brochure.** Present tense, first person, reacting to
what just happened on screen and asking the question the viewer is already forming — "fifty
three according to who?" — then answering it with what the app shows.

Narration is Kokoro — a local neural TTS model, not the macOS `say` voice.

## How the sync works

Beats are absolute. Each narration line owns a fixed slice of the timeline, and the recorder
does its navigation, clicking and scrolling *inside* that slice — so a slow page load never
pushes the picture out of step with the voice. The recorder writes `beats.json` with the real
timestamp each beat began, and the mux places each line at exactly that moment.

## Rebuilding

```bash
npm run dev                                    # the app must be running

# 1. Narration (writes audio/<voice>/NN.wav and timings.json)
KVOICE=af_heart KSPEED=1.08 npm run demo:voice

# 2. Record the session (ids: the recorded run, then a cross-examined run)
npm run demo:record -- <reportId> <crossExaminedReportId> demo/session.webm

# 3. Lay the voice onto the picture
KVOICE=af_heart npm run demo:mux
```

### One-time setup for the voice

Kokoro needs a working espeak-ng; the bundled Python wheels ship a broken path.

```bash
brew install espeak-ng
python3.12 -m venv demo/tts-venv
demo/tts-venv/bin/pip install kokoro soundfile
```

`narrate.py` points `PHONEMIZER_ESPEAK_LIBRARY` and `ESPEAK_DATA_PATH` at the Homebrew
install, which is what makes it work.

## Changing the narrator

`demo/voice-samples/` has five Kokoro voices reading the same line. Pick one and set `KVOICE`:
`af_heart` (default), `am_michael`, `am_puck`, `am_fenrir`, `bm_george`.
Pace is `KSPEED` — 1.08 for `af_heart`, 1.13 for the male voices, which run slower.

**Your own voice will still beat all of them.** Replace `demo/audio/<voice>/NN.wav` with your
takes at the same filenames, then run steps 2 and 3 — the film re-times itself to your
recording.

## The numbers in the script are load-bearing

The narration quotes the run that plays on screen: **53/100 · Refine**, 17 points from Build,
most room in competition, holds unless demand falls 28, 57% of factual claims sourced, 5 of 21
exhibits used, 3 things unestablished, competitors DishGen / Food Mood / recipeGPT.

If you re-record the demo run (`npm run record-demo`), those change. Re-derive them before
re-recording narration, or the film will assert things the screen contradicts — which is
exactly the failure this product exists to prevent.

## Adding music

No track is bundled; none is licensed.

```bash
ffmpeg -i LaunchPilot-demo.mp4 -i bed.mp3 -filter_complex \
  "[1:a]volume=0.08,afade=t=out:st=174:d=6[m];[0:a][m]amix=inputs=2:duration=first" \
  -c:v copy -c:a aac -b:a 192k LaunchPilot-demo-music.mp4
```
