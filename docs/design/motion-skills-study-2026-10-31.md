# Motion skills study: @e1genqq's "20 repos. One studio." (Oct 31, 2026)

Source post: https://x.com/e1genqq/status/2116270712390316375 (posted Oct 30, 2026, 3:47 PM CT; about 208k views, 5.9k bookmarks when read).
It quotes the X Article "How to Build an Automated Motion Design System that Generates $$$" (https://x.com/i/article/2109996653650354178). **I couldn't read it:** the API only returns the title, and the article needs a login.

**Where the list came from:** the post text names only #01 and #02. The author's 23 self-replies in the thread are short thank-yous and don't list anything. The full list of 20 appears only in the post's 20-second video. I pulled its last frame and saved it at `design/motion-skills-grid-frame.png`. That frame shows **names and categories only, not URLs**. I matched each name to its canonical GitHub repo and checked that the repo exists, plus its star count and license, through the GitHub API on Oct 31. The author never confirms which repos he meant, so the URL column is my mapping (marked *mapped*). The one exception is #01, which is linked in the post.

Box facts: Node 24, Chromium at /usr/local/bin/chromium, ffmpeg at /usr/bin/ffmpeg, Python 3, no GPU (assumed, not tested).

## Summary table

| # | Name (category in video) | Repo | License (GitHub API) | Stars | Runs on our box? |
|---|---|---|---|---|---|
| 01 | Remotion (Engine) | https://github.com/remotion-dev/remotion (linked in post) | Remotion License (source-available, see below) | 69.4k | Yes |
| 02 | Remotion Skills (Skills) | https://github.com/remotion-dev/skills (*mapped*) | No license file reported | 6.0k | Yes (they're text files) |
| 03 | Anime.js (Motion) | https://github.com/juliangarnier/anime (*mapped*) | MIT | 74.1k | Yes |
| 04 | Motion (Motion) | https://github.com/motiondivision/motion (*mapped*) | MIT | 34.7k | Yes |
| 05 | Manim (Vector) | https://github.com/ManimCommunity/manim (*mapped*; original is 3b1b/manim, MIT, 95.9k) | MIT | 42.1k | Probably (needs cairo/pango and LaTeX for formulas; untested) |
| 06 | Lottie (Vector) | https://github.com/airbnb/lottie-web (*mapped*) | MIT | 32.3k | Yes (playback); you need After Effects or another tool to author files |
| 07 | MCP for Blender (3D) | https://github.com/ahujasid/mcp-for-blender (formerly ahujasid/blender-mcp) (*mapped*) | MIT | 32.9k | Hard: needs a running Blender with the add-on open. Not practical headless. |
| 08 | Three.js (3D) | https://github.com/mrdoob/three.js (*mapped*) | MIT | 117.3k | Yes, but software WebGL in headless Chromium is slow |
| 09 | GPU Pathtracer (3D) | https://github.com/gkjohnson/three-gpu-pathtracer (*mapped*) | MIT | 1.9k | Not realistically: needs a real GPU |
| 10 | Jolt Physics (Physics) | https://github.com/jrouwe/JoltPhysics (*mapped*) | MIT | 12.0k | The C++ library builds. For JS there's a WASM port (JoltPhysics.js); I didn't check that port's repo. |
| 11 | postprocessing (FX) | https://github.com/pmndrs/postprocessing (*mapped*) | Zlib | 2.9k | Yes (same WebGL caveat as Three.js) |
| 12 | Three.quarks (FX) | https://github.com/Alchemist0823/three.quarks (*mapped*) | MIT | 1.1k | Yes (same WebGL caveat) |
| 13 | Tweakpane (Controls) | https://github.com/cocopon/tweakpane (*mapped*) | MIT | 4.6k | Yes (it's a UI for tuning by hand, so it adds nothing to automated renders) |
| 14 | ComfyUI (Generation) | https://github.com/Comfy-Org/ComfyUI (formerly comfyanonymous) (*mapped*) | GPL-3.0 | 144.3k | CPU only, which is very slow. Not practical. |
| 15 | CosyVoice (Audio) | https://github.com/QwenAudio/CosyVoice (formerly FunAudioLLM) (*mapped*) | Apache-2.0 (code; **model-weight license not checked**) | 24.2k | Slow on CPU; a GPU is recommended |
| 16 | librosa (Audio) | https://github.com/librosa/librosa (*mapped*) | ISC | 8.7k | Yes (pip) |
| 17 | WhisperX (Captions) | https://github.com/m-bain/whisperX (*mapped*) | BSD-2-Clause | 25.0k | Yes on CPU with a small model; slow but fine for a 30-second reel (untested) |
| 18 | OBS Studio (Capture) | https://github.com/obsproject/obs-studio (*mapped*) | GPL-2.0 | 78.7k | Possible but pointless; we screenshot with headless Chrome |
| 19 | LosslessCut (Edit) | https://github.com/mifi/lossless-cut (*mapped*) | GPL-2.0 | 45.5k | It's a GUI (Electron) app. Runs on the box desktop, but it's a manual tool. |
| 20 | FFmpeg (Export) | https://github.com/FFmpeg/FFmpeg (mirror) (*mapped*) | LGPL/GPL (API says NOASSERTION) | 66.2k | Yes, already installed |

The labels for #17 and #18 are cut off in the frame ("Whisper X", "OBS Studio" are readable); their categories are my reading.

---

## The 20, one by one (equal depth)

Each entry covers what it is, how you use it, and an example. I wrote the examples from the documented APIs and **haven't run them**, except where noted.

### 01 Remotion: make videos with React code
- **What it is:** You write each frame as a React component. `useCurrentFrame()` returns the current frame number, and `interpolate()` and `spring()` turn that into motion. Remotion opens headless Chrome, screenshots every frame, and ffmpeg stitches them into MP4. Rendering is deterministic, so the same props always give the same video. That's ideal for a daily template driven by data. Latest release is v4.0.539.
- **How to use it:** `npx create-video@latest`. Register a `<Composition id width height fps durationInFrames component defaultProps>`. Preview with `npx remotion studio`. Render with `npx remotion render <entry> <id> out.mp4 --props=props.json`. To use the box's Chromium, add `--browser-executable=/usr/local/bin/chromium`. For server rendering use `@remotion/renderer` (`bundle`, `selectComposition`, `renderMedia`). `@remotion/lambda` exists too, but it's paid AWS, so we don't need it.
- **Vertical reel:** set `width={1080} height={1920} fps={30}`. That's all it takes; the aspect ratio is just the composition size.
- **Example:**
```tsx
import {AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate} from 'remotion';
export const Title: React.FC<{text: string}> = ({text}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const s = spring({frame: f, fps, config: {damping: 12}});
  return <AbsoluteFill style={{background:'#0f1a14',justifyContent:'center',alignItems:'center'}}>
    <h1 style={{color:'#fff',fontSize:110,transform:`scale(${s})`,opacity:interpolate(f,[0,10],[0,1])}}>{text}</h1>
  </AbsoluteFill>;
};
// Root: <Composition id="Title" component={Title} width={1080} height={1920} fps={30} durationInFrames={90} defaultProps={{text:'Fold or call?'}}/>
```
- **License (checked in LICENSE.md, Oct 31):** free, including commercial use, for "an individual" or "a for-profit organization with up to 3 employees". You need a paid Company License only above that size. **Poker Gym is Wes alone, so it qualifies for the free license, and I see no blocker.** The one restriction is that you can't resell Remotion itself. The file notes that "In Remotion 5.0, the license will slightly change" (PR #3750); I didn't read that PR, so re-check if we upgrade to 5.x.

### 02 Remotion Skills: official agent skills for Remotion
- **What it is:** Remotion's own SKILL.md packs that teach coding agents Remotion best practices. The repo holds 12 skills (I listed the folders): `remotion-best-practices` (the umbrella), `remotion-create`, `remotion-render`, `remotion-captions`, `remotion-multimedia`, `remotion-markup`, `remotion-interactivity`, `remotion-maps`, `remotion-studio`, `remotion-docs`, `remotion-upgrade`, `remotion-saas`.
- **How to use it:** `npx skills add remotion-dev/skills` or `gh skill install remotion-dev/skills`, or pick them when running `create video`. Then ask the agent for "/remotion-best-practices", or name a specific skill.
- **Example:** "Use /remotion-captions to add TikTok-style word-by-word captions from captions.json to the HandReveal composition." For Poker Gym, `remotion-captions`, `remotion-render` and `remotion-multimedia` (audio and video assets) are the relevant ones. GitHub reports no license file, so treat the skills as reference docs.

### 03 Anime.js: lightweight JS animation engine
- **What it is:** Animates CSS, SVG, DOM attributes and JS objects with timelines, staggering and easing. v4 has a modular API.
- **How to use it:** `npm i animejs`. In the browser it runs on real time. To use it inside Remotion, drive it from the frame number (seek a paused timeline to `frame/fps*1000`). Otherwise frames render out of sync.
- **Example:** `import {animate, stagger} from 'animejs'; animate('.chip', {y: [-40, 0], opacity: [0,1], delay: stagger(80), ease: 'outBack'});`

### 04 Motion (formerly Framer Motion): animation for React and JS
- **What it is:** Declarative animation for React (`<motion.div animate>`), plus layout animations, gestures and springs. Also has a vanilla JS `animate()`.
- **How to use it:** `npm i motion`; `import {motion} from 'motion/react'`. Great for **the website** (Poker Gym's trainer UI). In Remotion videos, use Remotion's own `spring()`/`interpolate()`, because Motion's real-time animations aren't frame-deterministic.
- **Example:** `<motion.div initial={{rotateY:180}} animate={{rotateY:0}} transition={{type:'spring',stiffness:200}}>A♠</motion.div>` (a card flip on the site)

### 05 Manim: Python engine for math animation (3Blue1Brown style)
- **What it is:** You build Scenes from Mobjects (shapes, text, LaTeX, graphs, number lines) and Animations (Create, Transform, FadeIn). It renders to MP4.
- **How to use it:** `pip install manim` (needs cairo/pango; LaTeX for `MathTex`). `manim -qh scene.py Equity`. For vertical video, set `config.pixel_width=1080; config.pixel_height=1920`.
- **Example:**
```python
from manim import *
class Equity(Scene):
    def construct(self):
        bar = BarChart([62, 38], bar_names=["AK","QQ"], y_range=[0,100,25])
        self.play(Create(bar)); self.play(bar.animate.change_bar_values([46, 54]))
```
- Good fit for poker math: pot odds, equity changing street by street, EV graphs.

### 06 Lottie: play After Effects animations as JSON
- **What it is:** lottie-web plays Bodymovin JSON exports (vector, small, scalable). Remotion has `@remotion/lottie`, which seeks the animation per frame.
- **How to use it:** `npm i lottie-web` or `@remotion/lottie`, then `<Lottie animationData={json}/>`. Authoring needs After Effects (paid) or a Lottie editor. Free community animations are on LottieFiles; check each file's license.
- **Example:** `import {Lottie} from '@remotion/lottie'; <Lottie animationData={confettiJson} playbackRate={1}/>` (a "correct!" burst over the coach's answer)

### 07 MCP for Blender: let an agent drive Blender
- **What it is:** An MCP server plus Blender add-on. The agent can create and modify objects, materials and cameras, run Python in Blender, and pull assets (Poly Haven and others).
- **How to use it:** Install the add-on in Blender, click "Connect", then add the MCP server (`uvx blender-mcp`, per its README) to the agent. It **needs an interactive Blender session**.
- **Example prompt:** "Create a green felt poker table with a top-down camera, two face-down cards and a chip stack; render 1080x1920 at frame 1." Fine for one-off hero assets. Too heavy for a daily automated pipeline on our box.

### 08 Three.js: WebGL/WebGPU 3D in the browser
- **What it is:** Scene, Camera, Renderer, Mesh/Geometry/Material, lights, loaders (glTF). The base layer for #09, #11 and #12. In Remotion, use `@remotion/three` (`<ThreeCanvas>` plus react-three-fiber), which syncs to the frame.
- **How to use it:** `npm i three @react-three/fiber @remotion/three`. In headless Chromium, add `--gl=angle` or `--gl=swangle`. Expect slow software rendering on our box.
- **Example:**
```tsx
<ThreeCanvas width={1080} height={1920}><ambientLight/>
  <mesh rotation={[0, frame/20, 0]}><boxGeometry args={[2.5,3.5,0.02]}/><meshStandardMaterial color="white"/></mesh>
</ThreeCanvas>
```
(a 3D card spin)

### 09 three-gpu-pathtracer: photoreal path tracing for Three.js
- **What it is:** Progressive path tracing (global illumination, real reflections) on top of three-mesh-bvh.
- **How to use it:** `npm i three-gpu-pathtracer`; `const pt = new WebGLPathTracer(renderer); pt.setScene(scene, camera); loop: pt.renderSample();`. Each frame needs many samples, so **without a GPU it's impractical**.
- **Example use:** a photoreal still of chips and cards for a thumbnail, rendered somewhere with a GPU.

### 10 Jolt Physics: multi-core rigid-body physics
- **What it is:** A C++ physics engine (used in Horizon Forbidden West) for collisions, constraints and character controllers. There's also a WASM build for the browser (JoltPhysics.js, not verified).
- **How to use it:** Create a `PhysicsSystem`, add bodies, then call `Update(dt)` each step. In video, step with a **fixed dt per frame** so renders stay deterministic.
- **Example use:** chips tumbling into the pot when the coach says "shove", simulated, then rendered with Three.js.

### 11 postprocessing: screen-space effects for Three.js
- **What it is:** An `EffectComposer` with bloom, depth of field, vignette, noise, chromatic aberration, SMAA and more. It merges effects into few passes, so it's fast.
- **How to use it:** `npm i postprocessing`; `composer.addPass(new RenderPass(scene,cam)); composer.addPass(new EffectPass(cam, new BloomEffect(), new VignetteEffect()));`. In React, use `@react-three/postprocessing`.
- **Example use:** a soft bloom on the winning card and a vignette for a casino mood.

### 12 Three.quarks: particles and VFX for Three.js
- **What it is:** A particle system with emitters, behaviors (size and color over life, gravity) and a JSON-driven VFX editor.
- **How to use it:** `npm i three.quarks`; create a `BatchedRenderer`, then add a `ParticleSystem({shape: new ConeEmitter(), startSpeed: ..., ...})` and call `.update(dt)` with a fixed dt.
- **Example use:** a gold-coin burst on "Correct play: +EV".

### 13 Tweakpane: compact parameter GUI
- **What it is:** A small floating panel of sliders, color pickers and graphs bound to JS object fields.
- **How to use it:** `npm i tweakpane`; `const pane = new Pane(); pane.addBinding(params, 'damping', {min: 1, max: 30});`.
- **Example use:** tuning spring damping and timing by eye in Remotion Studio, then hard-coding the values. It's a human tool; no value for automated renders. (Remotion Studio already has props editing via a zod schema.)

### 14 ComfyUI: node-based Stable Diffusion and video generation
- **What it is:** A graph UI and API for diffusion models (images, video models, upscaling, ControlNet).
- **How to use it:** `git clone; pip install -r requirements.txt; python main.py`, then build workflows in the browser or POST workflow JSON to `/prompt`. **It needs a GPU** to be usable. Model licenses vary by model.
- **Example use:** generating stylized background art. It costs a lot on our box, and our brand mascot already exists.

### 15 CosyVoice: multilingual text-to-speech and voice cloning
- **What it is:** Zero-shot voice cloning from a short sample, multilingual, with streaming. From the Qwen/Alibaba audio team.
- **How to use it:** Clone the repo, install the conda env, download pretrained models, then `CosyVoice2(model_dir).inference_zero_shot(text, prompt_text, prompt_wav)`. A GPU is recommended. **The model-weight license wasn't checked; check it before any commercial use.** Only clone a voice with that person's consent (e.g. Wes's own).
- **Example use:** a consistent "coach" voiceover reading the correct play.

### 16 librosa: audio analysis in Python
- **What it is:** Beat tracking, onset detection, tempo, spectrograms, loudness features.
- **How to use it:** `pip install librosa`; `y, sr = librosa.load('track.mp3'); tempo, beats = librosa.beat.beat_track(y=y, sr=sr); times = librosa.frames_to_time(beats, sr=sr)`.
- **Example use:** export beat times to JSON, then cut card reveals on the beat in Remotion (`frame = round(t*30)`). Cheap, runs on our box, and makes reels feel edited.

### 17 WhisperX: transcription with word-level timestamps
- **What it is:** Whisper plus forced alignment, which gives accurate per-word times. Speaker diarization is optional; it uses pyannote models, which need a Hugging Face token. **Skip diarization: no new accounts.**
- **How to use it:** `pip install whisperx`; `whisperx vo.wav --model small --compute_type int8 --output_format json`, then read `segments[].words[] {word,start,end}`.
- **Example use:** feed the word timings into the `remotion-captions` skill or `@remotion/captions` to get word-by-word animated captions. Most viewers watch reels muted, so this is high value.

### 18 OBS Studio: screen recording and streaming
- **What it is:** Records and streams scenes made of sources (screen, window, camera, browser).
- **How to use it:** A GUI; can be scripted through obs-websocket.
- **Example use:** recording a live run through the trainer for a "watch me play" reel. Our headless Chrome plus Remotion `<Video>` already covers this, so it has low value for us.

### 19 LosslessCut: fast lossless trim and cut
- **What it is:** An Electron GUI on top of ffmpeg. It cuts and merges without re-encoding.
- **How to use it:** A GUI. Mark segments, then export. You can export the matching ffmpeg command.
- **Example use:** trimming raw clips by hand. For automation, use plain `ffmpeg -ss -to -c copy`.

### 20 FFmpeg: the encoding Swiss army knife
- **What it is:** Converts, encodes, filters and muxes anything. Remotion uses it internally.
- **How to use it:** Already on the box (`/usr/bin/ffmpeg`).
- **Examples:**
  - Normalize audio for Instagram: `ffmpeg -i in.mp4 -af loudnorm=I=-14:TP=-1.5 -c:v copy out.mp4`
  - Make a cover frame: `ffmpeg -ss 1.5 -i out.mp4 -frames:v 1 cover.jpg`
  - Final Instagram-safe encode: `-c:v libx264 -pix_fmt yuv420p -profile:v high -r 30 -b:v 8M -c:a aac -b:a 192k -movflags +faststart`

---

## What this means for Poker Gym reels

Our numbers, from earlier this session: Instagram reels get about 130–224 views, and shares and saves are near zero. The tools don't fix the hook. They make a **repeatable, polished, captioned template** cheap, which lets the crew A/B test endings (like "send this to a friend") without hand editing. Remember the Nov 1–12 QF/AF hook test stays untouched; any pilot ships after Nov 12, or only as a side render.

### Top 3
1. **Remotion + Remotion Skills (#01–02).** It's a data-driven template: noon production writes `props.json` (hand, board, options, correct answer), and the same code renders identical-quality reels daily on our box (Node 24 plus Chromium). It's free for a one-person business. The official skills mean any agent on the crew (Beam, DeepSeek) writes idiomatic code. It also absorbs #06, #08 and #11 later through `@remotion/lottie` and `@remotion/three`.
2. **WhisperX (#17) → Remotion captions.** It gives word-synced burned-in captions for muted viewers. It runs on CPU with a small model and is free (BSD-2), with no account if we skip diarization.
3. **FFmpeg (#20) + librosa (#16).** FFmpeg handles loudness normalization, covers and Instagram-safe encodes. librosa gives beat-timed cuts. Both are free, run on the box, and add polish at no cost.

I'd pass on the others for now. #07, #09, #14 and #15 need a GPU or an interactive app. #13, #18 and #19 are manual tools. #03 and #04 duplicate Remotion's timing tools (keep Motion in mind for the site redesign). #05 is a good later add-on for "the math" reels. #10 and #12 are eye candy that come after the template works.

### Pilot: "Hand Reveal: what's the right play?" (1080x1920, 30fps, about 15s, 450 frames)
| Frames | Beat |
|---|---|
| 0–45 | Hook text slams in with a spring: "You have A♠Q♠ on the button. Villain 3-bets." |
| 45–120 | Hole cards flip in (scale plus rotateY via interpolate); the board deals out with a stagger |
| 120–210 | Three option chips: FOLD / CALL / 4-BET, with a countdown ring ("pause and pick") |
| 210–300 | The correct one lights up with a glow and a short burst; the wrong ones grey out |
| 300–390 | Coach line, captioned word by word: "Call. Q-high suited plays well vs this range…" |
| 390–450 | Ending card (whichever variant Muse is testing), with the mascot and playpokergym.com |

Props: `{hero:["As","Qs"], board:["Kd","7s","2s"], spot:"BTN vs 3-bet", options:["Fold","Call","4-bet"], correct:1, coachLine:"…", cta:"Send this to the friend who always folds"}`
Render: `npx remotion render src/index.ts HandReveal out/reel.mp4 --props=props.json --browser-executable=/usr/local/bin/chromium`, then the ffmpeg loudnorm and cover step.
Effort: about a day for an agent using the Remotion skills. The cost is $0. Measure it against current reels on 3-second hold, watch time, shares and saves, with Muse reporting.

## License blockers
- **None for the top 3.** Remotion is free for individuals and companies of up to 3 people; re-check when 5.0 lands. WhisperX is BSD-2. FFmpeg is LGPL/GPL, used as a tool. librosa is ISC.
- **Watch out for:**
  - CosyVoice model weights: license unchecked.
  - ComfyUI models: per-model licenses.
  - WhisperX diarization: needs a Hugging Face account.
  - Lottie files from LottieFiles: per-file licenses.
  - Remotion Skills repo: GitHub reports no license.
  - OBS, LosslessCut and ComfyUI are GPL. That's fine for use; it only matters if we redistribute modified code.

## Unverified
- Which repos the author actually meant: everything except #01 is my mapping from names shown in the video.
- The quoted article's content (needs a login).
- Whether WhisperX, Manim and WebGL actually run on this box: untested. Nothing was installed or rendered.
