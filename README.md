# InterpretLiveNow V1.2.2
Japanese ⇄ English interpreter (iPhone-first PWA). All files are in one folder.

## Deploy / update GitHub Pages
1. Upload and replace the files in the repository root.
2. GitHub → Settings → Pages → confirm `main` and `/ (root)`.
3. Open the site in Safari. If the old app is still cached, close the Home Screen app, open the website in Safari, refresh, then reopen the app.

## Voice notes
- On iPhone, tap **Speak** after translation. Safari may block speech started after an asynchronous network request.
- **Test voice** checks the iPhone's built-in speech engine.
- **Online voice** uses a network TTS endpoint and requires internet.
- **Beep** tests basic audio output only; it does not test speech voices.
- iPhone browser speech recognition is limited and may not work in Home Screen mode. Use the iPhone keyboard microphone as the fallback.

Translation services and online voice endpoints are third-party services and may change availability or usage limits.

© 2026 Rafat Kotaki. All rights reserved.


V1.1.1 audio fix: beep uses a short WAV through HTMLAudioElement and reports playback rejection instead of showing a false success. Test audio first in Safari with media volume turned up.

V1.2.2 speech fix: voices are cached at load (no refresh inside speak), cancel() is only used when speech is queued and followed by a 150 ms wait, the system picks the voice unless one is chosen, and Sound & settings has a guided audio diagnostic plus a mute-switch warning.
