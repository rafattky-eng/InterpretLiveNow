# InterpretLiveNow V1.1.0
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
