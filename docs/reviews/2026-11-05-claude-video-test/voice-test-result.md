# Voice test result — 2026-11-06 (scheduled run)

**Result: FAILED — no TTS access from the cloud sandbox. No voiced draft was produced.**

## Setup
- `pip install --break-system-packages -q edge-tts pillow` — OK (PyPI is reachable).
- Voice: `en-US-AndrewNeural`, rate `+10%`, line (a) "Pair of nines against a seven. Split, or stand?"

## Network check
`curl -s -o /dev/null -w "%{http_code}" https://speech.platform.bing.com/` → `000`
With `-sS`: `curl: (56) CONNECT tunnel failed, response 403`

## Attempt 1 — edge-tts, no `--proxy`
```
aiohttp.client_exceptions.ClientConnectorDNSError: Cannot connect to host speech.platform.bing.com:443 ssl:<ssl.SSLContext ...> [Name or service not known]
```
(Direct DNS is not available in the sandbox; all egress must go through the agent proxy.)

## Attempt 2 — edge-tts, `--proxy "$HTTPS_PROXY"`
```
aiohttp.client_exceptions.ClientHttpProxyError: 403, message='Forbidden', url='http://127.0.0.1:42717'
  -> edge_tts.exceptions.SkewAdjustmentError: No server date in headers.
```
(The `SkewAdjustmentError` is edge-tts misreporting the proxy's 403 — there was no server response at all.)

## Proxy status
`$HTTPS_PROXY/__agentproxy/status` logs `connect_rejected` for `speech.platform.bing.com:443`:
"gateway answered 403 to CONNECT (policy denial or upstream failure)". Retried twice, same result — this is an
egress policy block, not a transient failure.

## What would unblock it
- Allow `speech.platform.bing.com` in the environment's network egress settings, or
- Generate the four mp3 lines locally (edge-tts works on a normal connection) and commit them to this folder;
  the mix/mux steps (adelay, cues, loudnorm -14 LUFS, AAC 160k/48 kHz, `-c:v copy`) can then run in the cloud.

Steps 3–5 (voice lines, audio mix, `draft-voiced.mp4`) were not run.
