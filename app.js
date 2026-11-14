(() => {
  "use strict";
  const $ = id => document.getElementById(id);

  // Surface JavaScript startup/runtime failures instead of leaving controls silent.
  window.addEventListener("error", event => {
    const msg = event && event.message ? event.message : "Unknown JavaScript error";
    const status = $("soundMsg");
    if (status) { status.textContent = "App error: " + msg; status.classList.add("err"); }
  });
  window.addEventListener("unhandledrejection", event => {
    const reason = event && event.reason;
    const msg = reason && reason.message ? reason.message : String(reason || "Unknown async error");
    const status = $("soundMsg");
    if (status) { status.textContent = "App error: " + msg; status.classList.add("err"); }
  });
  const LANG = {
    ja: { name: "日本語", tts: "ja-JP", sr: "ja-JP", mm: "ja", short: "ja" },
    en: { name: "English", tts: "en-US", sr: "en-US", mm: "en", short: "en" }
  };

  const I18N = {
    en: {
      s1: "Select language", s2: "Type or paste text", paste: "📋 Paste", clear: "Clear", autoStop: "Auto at full stop",
      go: "🔊 Translate & Speak", speak: "🔊 Speak", stop: "⏹ Stop", copy: "Copy", toReply: "Next: record the reply →",
      translate: "Translate", clearHist: "Clear history", tabTranslate: "Translate", tabReply: "Reply", tabHistory: "History",
      installTitle: "Install on iPhone", installBody: "In Safari tap Share ⎋, then “Add to Home Screen”, then Add.", gotIt: "Got it",
      settings: "🔊 Sound & settings", testVoice: "🔈 Test voice", testBeep: "🔔 Beep", speed: "Speed", slow: "Slow", normal: "Normal", fast: "Fast",
      voiceEn: "English voice", voiceJa: "Japanese voice", auto: "Automatic", autoSpeak: "Speak automatically after translating",
      bypass: "Play over the mute switch (experimental)", muteTip: "🔕 If you hear nothing, check if your iPhone’s physical mute switch (left side) is ON.", diagTitle: "🩺 Audio diagnostic", diagHint: "Run the steps in order. After each one tap ✅ if you heard it, ❌ if not.", keyLabel: "Better translation (optional)",
      keyHint: "Without a key the app uses free services and switches between them automatically.",
      replyTitle: "Record the reply", recLabel: "Record reply", dictLabel: "🎤 Dictate reply", recStop: "Listening… tap to stop",
      dictTitle: "🎤 Use the keyboard microphone",
      dictBody: "Tap the 🎤 key at the bottom right of the keyboard, speak, then tap Done. The translation starts by itself. Tip: add the Japanese keyboard in Settings → General → Keyboard, and switch with the 🌐 key.",
      autoReply: "Auto translate",
      tTitle: "Translate", tSub: "Japanese ⇄ English · Type, paste or speak · Hear the translation",
      rTitle: "Reply", rSub: "Dictate or type the answer · It is translated back to you",
      hTitle: "History", hSub: "Your last 30 translations · Tap one to hear it again",
      replyHint: (f, t) => `Reply in ${f}. It will be translated to ${t}.`, empty: "Nothing yet."
    },
    ja: {
      s1: "言語を選択", s2: "テキストを入力・貼り付け", paste: "📋 貼り付け", clear: "消去", autoStop: "句点で自動実行",
      go: "🔊 翻訳して読み上げ", speak: "🔊 読み上げ", stop: "⏹ 停止", copy: "コピー", toReply: "次へ：返答を録音 →",
      translate: "翻訳", clearHist: "履歴を消去", tabTranslate: "翻訳", tabReply: "返答", tabHistory: "履歴",
      installTitle: "iPhoneにインストール", installBody: "Safariで共有 ⎋ をタップし、「ホーム画面に追加」を選んでください。", gotIt: "OK",
      settings: "🔊 音声と設定", testVoice: "🔈 音声テスト", testBeep: "🔔 ビープ音", speed: "速度", slow: "ゆっくり", normal: "標準", fast: "速い",
      voiceEn: "英語の音声", voiceJa: "日本語の音声", auto: "自動", autoSpeak: "翻訳後に自動で読み上げ",
      bypass: "消音スイッチでも再生（試験的）", muteTip: "🔕 音が出ない場合は、iPhone本体（左側）の消音スイッチがオンになっていないか確認してください。", diagTitle: "🩺 音声診断", diagHint: "順番に実行し、聞こえたら✅、聞こえなければ❌をタップしてください。", keyLabel: "高品質翻訳（任意）",
      keyHint: "キーなしでも無料サービスを自動で切り替えて翻訳します。",
      replyTitle: "返答を録音", recLabel: "返答を録音", dictLabel: "🎤 返答を音声入力", recStop: "聞き取り中… タップで停止",
      dictTitle: "🎤 キーボードのマイクを使う",
      dictBody: "キーボード右下の🎤をタップして話し、「完了」を押すと自動で翻訳します。設定 → 一般 → キーボードで日本語キーボードを追加し、🌐キーで切り替えてください。",
      autoReply: "自動翻訳",
      tTitle: "翻訳", tSub: "日本語 ⇄ 英語 · 入力・貼り付け・音声 · 翻訳を読み上げ",
      rTitle: "返答", rSub: "音声入力または入力 · あなたの言語に翻訳します",
      hTitle: "履歴", hSub: "直近30件の翻訳 · タップで再生",
      replyHint: (f, t) => `${f}で返答すると、${t}に翻訳されます。`, empty: "まだありません。"
    }
  };

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
  };
  let ui = store.get("ilnUI", "en");
  let dir = store.get("ilnDir", ["ja", "en"]);   // [from, to]
  let tab = "translate";
  let lastOut = "", lastOut2 = "", lastDone = "", lastDone2 = "";

  const hide = id => { $(id).hidden = true; };
  const setStatus = (id, msg, err) => { const el = $(id); el.textContent = msg || ""; el.classList.toggle("err", !!err); };
  const soundMsg = (m, err) => setStatus("soundMsg", m, err);
  let toastT;
  function toast(m, ms) { const t = $("toast"); t.textContent = m; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), ms || 2400); }

  const standalone = window.navigator.standalone === true || (window.matchMedia && matchMedia("(display-mode: standalone)").matches);
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  /* ================= Text helpers ================= */
  function chunk(text, max = 450) {
    const parts = text.match(/[^。.!?！？\n]+[。.!?！？]*\s*|\n/g) || [text];
    const out = []; let cur = "";
    for (let p of parts) {
      while (p.length > max) { if (cur) { out.push(cur); cur = ""; } out.push(p.slice(0, max)); p = p.slice(max); }
      if ((cur + p).length > max) { out.push(cur); cur = p; } else cur += p;
    }
    if (cur) out.push(cur);
    return out.filter(s => s.trim());
  }

  /* ================= Translation (engine chain + cache) ================= */
  const cache = store.get("ilnCache", {});
  function cacheSet(k, v) { cache[k] = v; const ks = Object.keys(cache); if (ks.length > 150) delete cache[ks[0]]; store.set("ilnCache", cache); }
  let lastEngine = "";

  async function ftch(url, opts) {
    const c = new AbortController(); const t = setTimeout(() => c.abort(), 9000);
    try { return await fetch(url, Object.assign({ signal: c.signal }, opts || {})); } finally { clearTimeout(t); }
  }
  async function viaCloud(q, from, to, key) {
    const r = await ftch("https://translation.googleapis.com/language/translate/v2?key=" + encodeURIComponent(key), {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q, source: LANG[from].short, target: LANG[to].short, format: "text" })
    });
    const j = await r.json();
    if (!r.ok) throw new Error((j.error && j.error.message) || "HTTP " + r.status);
    return j.data.translations[0].translatedText;
  }
  async function viaGoogle(q, from, to) {
    const r = await ftch("https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=" + LANG[from].short + "&tl=" + LANG[to].short + "&q=" + encodeURIComponent(q));
    if (!r.ok) throw new Error("HTTP " + r.status);
    const j = await r.json();
    return j[0].map(x => x[0]).join("");
  }
  async function viaMyMemory(q, from, to) {
    const r = await ftch("https://api.mymemory.translated.net/get?q=" + encodeURIComponent(q) + "&langpair=" + LANG[from].mm + "|" + LANG[to].mm);
    if (!r.ok) throw new Error("HTTP " + r.status);
    const j = await r.json();
    const t = j && j.responseData && j.responseData.translatedText;
    if (!t || /MYMEMORY WARNING|QUERY LENGTH LIMIT/i.test(t)) throw new Error("daily limit");
    return t;
  }
  async function translateChunk(q, from, to) {
    const key = ($("gkey").value || "").trim();
    const engines = [];
    if (key) engines.push(["Google Cloud", () => viaCloud(q, from, to, key)]);
    engines.push(["Google", () => viaGoogle(q, from, to)], ["MyMemory", () => viaMyMemory(q, from, to)]);
    const errs = [];
    for (const [name, fn] of engines) {
      try { const t = await fn(); if (t && t.trim()) { lastEngine = name; return t; } }
      catch (e) { errs.push(name + ": " + (e.name === "AbortError" ? "timeout" : e.message)); }
    }
    throw new Error(errs.join(" · "));
  }
  async function translate(text, from, to) {
    const ck = from + to + "|" + text;
    if (cache[ck]) { lastEngine = "saved"; return cache[ck]; }
    const res = [];
    for (const p of chunk(text)) res.push(await translateChunk(p, from, to));
    const out = res.join(from === "ja" ? " " : "");
    cacheSet(ck, out);
    return out;
  }

  /* ================= Speech output: native iPhone / browser cachedVoices ================= */
  const synth = window.speechSynthesis || null;
  let cachedVoices = [];
  let speechToken = 0;
  let speechWatchdog = null;

  const vcode = v => String(v.lang || "").replace("_", "-").toLowerCase();

  function refreshVoices() {
    if (!synth) return [];
    try { cachedVoices = synth.getVoices() || []; } catch { cachedVoices = []; }
    fillVoices();
    return cachedVoices;
  }

  // Only an explicitly chosen voice is set on the utterance. With "Automatic" we set utterance.lang
  // and let iOS pick its default voice (never assign voice = null).
  function explicitVoice(code) {
    const base = code.slice(0, 2).toLowerCase();
    const pref = store.get("ilnVoice_" + base, "");
    if (!pref) return null;
    const chosen = cachedVoices.find(x => x.voiceURI === pref);
    return chosen && vcode(chosen).startsWith(base) ? chosen : null;
  }

  function fillVoices() {
    ["en", "ja"].forEach(l => {
      const sel = $("voice_" + l);
      if (!sel) return;
      const cur = store.get("ilnVoice_" + l, "");
      sel.innerHTML = "";
      sel.add(new Option(I18N[ui].auto, ""));
      cachedVoices.filter(v => vcode(v).startsWith(l)).forEach(v =>
        sel.add(new Option(v.name + " (" + v.lang + ")", v.voiceURI)));
      sel.value = cur;
      if (sel.value !== cur) sel.value = "";
      sel.onchange = () => store.set("ilnVoice_" + l, sel.value);
    });

    const help = $("voiceHelp");
    if (help) {
      help.textContent = !synth
        ? "Device speech is unavailable in this browser. Open InterpretLiveNow in Safari."
        : cachedVoices.length
          ? "Device voices are ready. Choose an English and a Japanese voice above. Your choices are saved on this iPhone."
          : "Waiting for iPhone voices. If none appear, check Settings → Accessibility → Spoken Content → Voices.";
    }
  }

  if (synth) {
    refreshVoices();
    if (typeof synth.addEventListener === "function") synth.addEventListener("voiceschanged", refreshVoices);
    else synth.onvoiceschanged = refreshVoices;
  }

  let primed = false, lastCancelAt = 0, diagEv = null;
  let speechLog = { started: false, ended: false, error: "" };

  function unlockSpeechFromGesture() {
    try { if (synth && synth.paused) synth.resume(); } catch {}
  }
  // Call only from a tap: lets iOS accept later, automatic speech after the translation arrives.
  function primeSpeech() {
    if (primed || !synth || typeof window.SpeechSynthesisUtterance !== "function") return;
    primed = true;
    try { const u = new SpeechSynthesisUtterance(" "); u.volume = 0; synth.speak(u); } catch {}
  }

  // Optional mute-switch workaround: a silent looping <audio> moves iOS to the "playback" audio session.
  function makeSilentUrl() {
    const n = 8000, b = new ArrayBuffer(44 + n), d = new DataView(b);
    const w = (o, t) => [...t].forEach((c, i) => d.setUint8(o + i, c.charCodeAt(0)));
    w(0, "RIFF"); d.setUint32(4, 36 + n, true); w(8, "WAVEfmt "); d.setUint32(16, 16, true); d.setUint16(20, 1, true);
    d.setUint16(22, 1, true); d.setUint32(24, 8000, true); d.setUint32(28, 8000, true); d.setUint16(32, 1, true); d.setUint16(34, 8, true);
    w(36, "data"); d.setUint32(40, n, true); for (let i = 0; i < n; i++) d.setUint8(44 + i, 128);
    return URL.createObjectURL(new Blob([b], { type: "audio/wav" }));
  }
  let bypassAudio = null;
  function bypassOn() {
    try {
      if (!bypassAudio) { bypassAudio = new Audio(makeSilentUrl()); bypassAudio.loop = true; bypassAudio.setAttribute("playsinline", ""); bypassAudio.volume = 0.01; }
      if (bypassAudio.paused) bypassAudio.play().catch(() => {});
    } catch {}
  }
  function bypassOff() { try { if (bypassAudio) bypassAudio.pause(); } catch {} }

  // iOS bug: speak() right after cancel() can be dropped. Cancel only when something is queued, then wait >=150 ms.
  function stopSpeech(quiet) {
    speechToken++;
    clearTimeout(speechWatchdog);
    try { if (synth && (synth.speaking || synth.pending)) { synth.cancel(); lastCancelAt = Date.now(); } } catch {}
    if (!quiet) soundMsg("Speech stopped.");
  }

  function splitSpeech(text, max = 220) {
    const parts = chunk(text, max);
    return parts.length ? parts : [text];
  }

  // Runs synchronously inside the tap when nothing needs cancelling (no await, no timers, no voice refresh).
  function speak(text, code, onFinish, opts) {
    opts = opts || {};
    const isJa = String(code || "").startsWith("ja");
    const clean = String(text || "").trim();
    if (!clean) { soundMsg("Nothing to speak yet. Translate some text first.", true); return; }
    if (!synth || typeof window.SpeechSynthesisUtterance !== "function") {
      soundMsg("Device speech is not available here. Open this app in Safari on your iPhone.", true); return;
    }
    unlockSpeechFromGesture();
    (opts.bypass !== undefined ? opts.bypass : $("bypass").checked) ? bypassOn() : bypassOff();
    soundMsg("Preparing " + (isJa ? "Japanese" : "English") + " voice…", false);

    const my = ++speechToken;
    clearTimeout(speechWatchdog);
    speechLog = { started: false, ended: false, error: "" };
    const parts = splitSpeech(clean);
    const voice = explicitVoice(code);          // null = let the system choose from utterance.lang
    let index = 0;

    function next() {
      if (my !== speechToken) return;
      if (index >= parts.length) {
        clearTimeout(speechWatchdog);
        speechLog.ended = true;
        soundMsg("Speech finished.");
        if (typeof onFinish === "function") onFinish();
        return;
      }
      const utterance = new SpeechSynthesisUtterance(parts[index++]);
      utterance.lang = code;
      if (voice) utterance.voice = voice;
      utterance.rate = Math.max(0.65, Math.min(1.25, parseFloat($("rate").value) || 0.95));
      utterance.pitch = 1; utterance.volume = 1;
      utterance.onstart = () => {
        if (my !== speechToken) return;
        speechLog.started = true; clearTimeout(speechWatchdog);
        soundMsg("Speaking " + (voice ? voice.name : code + " (system voice)") + "…");
      };
      utterance.onend = () => { if (my === speechToken) next(); };
      utterance.onerror = e => {
        if (my !== speechToken || /canceled|interrupted/i.test(e.error || "")) return;
        clearTimeout(speechWatchdog); speechLog.error = e.error || "unknown";
        soundMsg("Device voice error: " + speechLog.error + ". Check iPhone volume and the selected voice.", true);
      };
      try { if (synth.paused) synth.resume(); synth.speak(utterance); }
      catch (e) { clearTimeout(speechWatchdog); soundMsg("Could not start device voice: " + (e.message || "unknown error"), true); return; }
      speechWatchdog = setTimeout(() => {
        if (my === speechToken && !speechLog.started) {
          soundMsg(opts.auto
            ? "iPhone needs a tap to speak. Tap 🔊 Speak."
            : "The iPhone speech engine did not start. Download a voice in Settings → Accessibility → Spoken Content → Voices, then reopen Safari.", true);
        }
      }, opts.auto ? 2500 : 6000);
    }

    let queued = false;
    try { queued = !!(synth.speaking || synth.pending); } catch {}
    if (queued) { try { synth.cancel(); lastCancelAt = Date.now(); } catch {} }
    const wait = Math.max(0, 150 - (Date.now() - lastCancelAt));
    if (wait > 0) setTimeout(() => { if (my === speechToken) next(); }, wait);
    else next();
  }

  // iPhone-safe beep: use a short WAV played by HTMLAudioElement.
  // Audio.play() is invoked immediately inside the user's button gesture.
  let activeBeep = null;
  function makeBeepUrl() {
    const sampleRate = 22050;
    const samples = Math.floor(sampleRate * 0.34);
    const buffer = new ArrayBuffer(44 + samples * 2);
    const view = new DataView(buffer);
    const write = (offset, value) => {
      for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
    };
    write(0, "RIFF"); view.setUint32(4, 36 + samples * 2, true);
    write(8, "WAVE"); write(12, "fmt "); view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true); view.setUint16(34, 16, true);
    write(36, "data"); view.setUint32(40, samples * 2, true);
    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      const fadeIn = Math.min(1, t / 0.015);
      const fadeOut = Math.min(1, (0.34 - t) / 0.07);
      const envelope = Math.max(0, Math.min(fadeIn, fadeOut));
      const sample = Math.sin(2 * Math.PI * 880 * t) * envelope * 0.72;
      view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, sample)) * 32767, true);
    }
    return URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
  }
  function playBeepFromTap() {
    try {
      if (activeBeep) {
        try { activeBeep.pause(); } catch {}
      }
      const url = makeBeepUrl();
      const audio = new Audio(url);
      activeBeep = audio;
      audio.preload = "auto";
      audio.volume = 1;
      audio.playsInline = true;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        if (activeBeep === audio) activeBeep = null;
      };
      const result = audio.play();
      if (result && typeof result.then === "function") {
        result.then(() => {
          soundMsg("Beep playback started. If it is still silent, check iPhone media volume and audio output.", false);
        }).catch(error => {
          URL.revokeObjectURL(url);
          if (activeBeep === audio) activeBeep = null;
          soundMsg("iPhone blocked beep playback (" + (error.name || "audio error") + "). Open this page in Safari and tap Beep again.", true);
        });
      } else {
        soundMsg("Beep playback requested. Check iPhone media volume.", false);
      }
      return true;
    } catch (error) {
      soundMsg("Could not create beep audio: " + (error.message || "unknown error"), true);
      return false;
    }
  }

  const MUTE_TIP = "If you hear nothing, check if your iPhone's physical mute switch is ON.";
  const testPhrase = code => code.startsWith("ja") ? "音声テストです。聞こえますか？" : "This is a voice test. Can you hear me?";
  $("testBeep").onclick = () => { playBeepFromTap(); };
  $("testVoice").onclick = () => {
    toast("🔕 " + MUTE_TIP, 6000);
    const code = LANG[dir[1]].tts;
    speak(testPhrase(code), code);                 // direct call inside the tap
  };
  $("testBoth").onclick = () => {
    toast("🔕 " + MUTE_TIP, 6000);
    speak(testPhrase("ja-JP"), "ja-JP", () => speak(testPhrase("en-US"), "en-US"));
  };
  $("rate").value = store.get("ilnRate", "0.95");
  $("rate").onchange = e => store.set("ilnRate", e.target.value);
  $("autoSpeak").checked = store.get("ilnAutoSpeak", true);
  $("autoSpeak").onchange = e => store.set("ilnAutoSpeak", e.target.checked);
  $("bypass").checked = store.get("ilnBypass", false);
  $("bypass").onchange = e => { store.set("ilnBypass", e.target.checked); if (!e.target.checked) bypassOff(); };

  /* ----- Audio diagnostic: beep vs. speech vs. speech + mute-switch workaround ----- */
  const diag = {};
  const evText = ev => "Speech engine: " + (ev.started ? "started ✓" : "did not start ✗") + " · " + (ev.ended ? "finished ✓" : "not finished") + (ev.error ? " · error: " + ev.error : "");
  function diagConclude() {
    const { beep, voice, bypass } = diag; let msg = "";
    if (beep === false) msg = "No sound at all. Raise the media volume, disconnect Bluetooth, and end any call, then repeat step 1.";
    else if (voice === true) msg = "✅ Voice works. If a translation stays silent, tap 🔊 Speak after it appears.";
    else if (voice === false && bypass === true) {
      msg = "✅ The mute switch was silencing speech. “Play over the mute switch” is now ON. You can also slide the switch off.";
      $("bypass").checked = true; store.set("ilnBypass", true);
    } else if (voice === false && bypass === false) {
      const ev = diagEv || speechLog;
      msg = ev.started
        ? "The engine says it is speaking but you hear nothing. Check Silent/Focus mode, Bluetooth output and volume, or pick another voice above."
        : "The iPhone speech engine did not start. Download a voice (Settings → Accessibility → Spoken Content → Voices), then close and reopen Safari or restart the phone.";
    } else if (voice === false) msg = "Now run step 3.";
    else if (beep === true) msg = "Beep works. Now run step 2.";
    setStatus("diagResult", msg, voice === false && bypass === false);
  }
  document.querySelectorAll(".yn").forEach(b => b.onclick = () => {
    diag[b.dataset.d] = b.dataset.v === "1";
    if (b.dataset.d === "voice") diagEv = Object.assign({}, speechLog);
    diagConclude();
  });
  $("dBeep").onclick = () => { playBeepFromTap(); };
  function diagVoice(bypass) {
    toast("🔕 " + MUTE_TIP, 6000);
    const code = LANG[dir[1]].tts;
    speak(testPhrase(code), code, null, { bypass });
    setTimeout(() => { $("diagEvents").textContent = evText(speechLog); }, 3500);
  }
  $("dVoice").onclick = () => diagVoice(false);
  $("dBypass").onclick = () => diagVoice(true);
  $("gkey").value = store.get("ilnKey", "");
  $("gkey").onchange = e => store.set("ilnKey", e.target.value.trim());

  /* ================= UI language, direction, tabs ================= */
  function renderPage() {
    const t = I18N[ui], k = tab === "translate" ? "t" : tab === "reply" ? "r" : "h";
    $("pageTitle").textContent = t[k + "Title"]; $("pageSub").textContent = t[k + "Sub"];
  }
  function renderDir() {
    const [f, t] = dir;
    $("fromPill").textContent = LANG[f].name; $("toPill").textContent = LANG[t].name;
    $("src").lang = LANG[f].mm; $("outText").lang = LANG[t].mm; $("reply").lang = LANG[t].mm; $("outText2").lang = LANG[f].mm;
    $("src").placeholder = f === "ja" ? "日本語を入力、または貼り付け…" : "Type a letter, number, word, question or paragraph…";
    $("replyHint").textContent = I18N[ui].replyHint(LANG[t].name, LANG[f].name);
  }
  function setRecLabel(on) { $("recLabel").textContent = on ? I18N[ui].recStop : (canSR ? I18N[ui].recLabel : I18N[ui].dictLabel); $("rec").classList.toggle("live", on); }
  function applyUI() {
    const t = I18N[ui];
    document.querySelectorAll("[data-i18n]").forEach(el => { const v = t[el.dataset.i18n]; if (typeof v === "string") el.textContent = v; });
    document.querySelectorAll(".ui-lang button").forEach(b => b.classList.toggle("on", b.dataset.ui === ui));
    document.documentElement.lang = ui === "ja" ? "ja" : "en";
    setRecLabel(false); renderDir(); renderPage(); renderHist(); fillVoices();
  }
  document.querySelectorAll(".ui-lang button").forEach(b => b.onclick = () => { ui = b.dataset.ui; store.set("ilnUI", ui); applyUI(); });
  $("swap").onclick = () => { dir = [dir[1], dir[0]]; store.set("ilnDir", dir); renderDir(); hide("out"); hide("out2"); lastDone = lastDone2 = ""; };
  function showTab(n) {
    tab = n;
    document.querySelectorAll(".view").forEach(v => v.classList.toggle("on", v.id === "view-" + n));
    document.querySelectorAll(".tabs button").forEach(b => b.classList.toggle("on", b.dataset.tab === n));
    renderPage(); window.scrollTo(0, 0);
  }
  document.querySelectorAll(".tabs button").forEach(b => b.onclick = () => showTab(b.dataset.tab));
  $("toReply").onclick = () => showTab("reply");

  /* ================= Step 2: type / paste → translate → speak ================= */
  let busy = false;
  function errMsg(e) { return navigator.onLine ? "Translation failed: " + e.message : "Offline. Connect to the internet to translate."; }
  async function runMain() {
    const text = $("src").value.trim();
    if (!text || busy) return;
    busy = true; $("go").disabled = true; setStatus("status", "…");
    try {
      const out = await translate(text, dir[0], dir[1]);
      lastOut = out; lastDone = text;
      $("outText").textContent = out; $("via").textContent = "via " + lastEngine; $("out").hidden = false; setStatus("status", "");
      pushHist(text, out, dir[0] + "→" + dir[1]);
      if ($("autoSpeak").checked) speak(out, LANG[dir[1]].tts, null, { auto: true });
      else soundMsg("Translation ready. Tap Speak to hear it.", false);
    } catch (e) { setStatus("status", errMsg(e), true); }
    busy = false; $("go").disabled = false;
  }
  $("go").onclick = () => { unlockSpeechFromGesture(); primeSpeech(); runMain(); };
  $("clearSrc").onclick = () => { $("src").value = ""; hide("out"); lastDone = ""; setStatus("status", ""); stopSpeech(); };
  $("paste").onclick = async () => {
    try { const t = await navigator.clipboard.readText(); if (t) { $("src").value = t; $("src").focus(); } }
    catch { setStatus("status", "Paste blocked. Long-press the text box and choose Paste.", true); }
  };
  let timer;
  $("src").addEventListener("input", () => {
    if (!$("autoStop").checked) return;
    clearTimeout(timer);
    const v = $("src").value.trim();
    if (/[。.!?！？]$/.test(v) && v !== lastDone) timer = setTimeout(runMain, 500);
  });
  $("autoStop").checked = store.get("ilnAuto", false); $("autoStop").onchange = e => store.set("ilnAuto", e.target.checked);
  $("speakOut").onclick = () => {
    if (!lastOut) { setStatus("status", "Translate text first, then tap Speak.", true); return; }
    speak(lastOut, LANG[dir[1]].tts);
  };
  $("stopOut").onclick = stopSpeech;
  $("copyOut").onclick = () => navigator.clipboard && navigator.clipboard.writeText(lastOut).then(() => toast("Copied")).catch(() => {});

  /* ================= Step 3: reply (voice or keyboard dictation) ================= */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const canSR = !!SR && !(isIOS && standalone);     // iOS blocks Web Speech recognition in home-screen apps
  let rec = null, listening = false;
  function showDictation() { $("dictHint").hidden = false; $("reply").focus(); toast(ui === "ja" ? "キーボードの🎤をタップ" : "Tap the 🎤 on the keyboard"); }
  $("rec").onclick = () => {
    unlockSpeechFromGesture();
    if (!canSR) { showDictation(); return; }
    if (listening) { rec.stop(); return; }
    stopSpeech();
    rec = new SR(); rec.lang = LANG[dir[1]].sr; rec.interimResults = true; rec.continuous = false;
    let final = "";
    rec.onstart = () => { listening = true; setRecLabel(true); setStatus("status2", ""); };
    rec.onresult = e => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) { const t = e.results[i][0].transcript; e.results[i].isFinal ? final += t : interim += t; }
      $("reply").value = final + interim;
    };
    rec.onerror = e => {
      if (/not-allowed|service-not-allowed|audio-capture|language-not-supported/.test(e.error)) { showDictation(); return; }
      setStatus("status2", e.error === "no-speech" ? "Didn't hear anything. Tap Record and try again." : "Recording error: " + e.error, true);
    };
    rec.onend = () => { listening = false; setRecLabel(false); if ($("reply").value.trim()) runReply(); };
    try { rec.start(); }
    catch (e) {
      listening = false;
      setRecLabel(false);
      setStatus("status2", "Microphone could not start: " + (e.message || "permission or browser restriction") + ". Use the keyboard microphone instead.", true);
      showDictation();
    }
  };
  async function runReply() {
    const text = $("reply").value.trim(); if (!text) return;
    $("goReply").disabled = true; setStatus("status2", "…");
    try {
      const out = await translate(text, dir[1], dir[0]);
      lastOut2 = out; lastDone2 = text;
      $("outText2").textContent = out; $("via2").textContent = "via " + lastEngine; $("out2").hidden = false; setStatus("status2", "");
      pushHist(text, out, dir[1] + "→" + dir[0]);
      if ($("autoSpeak").checked) speak(out, LANG[dir[0]].tts, null, { auto: true });
      else soundMsg("Reply translated. Tap Speak to hear it.", false);
    } catch (e) { setStatus("status2", errMsg(e), true); }
    $("goReply").disabled = false;
  }
  $("goReply").onclick = () => { unlockSpeechFromGesture(); primeSpeech(); runReply(); };
  let timer2;
  $("reply").addEventListener("input", () => {
    if (!$("autoReply").checked) return;
    clearTimeout(timer2);
    const v = $("reply").value.trim();
    if (v && v !== lastDone2) timer2 = setTimeout(runReply, 1600);
  });
  $("autoReply").checked = store.get("ilnAutoReply", true); $("autoReply").onchange = e => store.set("ilnAutoReply", e.target.checked);
  $("clearReply").onclick = () => { $("reply").value = ""; hide("out2"); lastDone2 = ""; setStatus("status2", ""); stopSpeech(); };
  $("speakOut2").onclick = () => {
    if (!lastOut2) { setStatus("status2", "Translate the reply first, then tap Speak.", true); return; }
    speak(lastOut2, LANG[dir[0]].tts);
  };
  $("stopOut2").onclick = stopSpeech;
  $("copyOut2").onclick = () => navigator.clipboard && navigator.clipboard.writeText(lastOut2).then(() => toast("Copied")).catch(() => {});

  /* ================= History ================= */
  let hist = store.get("ilnHist", []);
  function pushHist(src, out, d) { hist.unshift({ src, out, d }); hist = hist.slice(0, 30); store.set("ilnHist", hist); renderHist(); }
  function renderHist() {
    const ol = $("hist"); ol.innerHTML = ""; ol.dataset.empty = I18N[ui].empty;
    hist.forEach(h => {
      const li = document.createElement("li");
      const s = document.createElement("div"); s.className = "s"; s.textContent = h.d.replace("ja", "日本語").replace("en", "English").replace("→", " → ") + " · " + h.src;
      const t = document.createElement("div"); t.className = "t"; t.textContent = h.out;
      li.append(s, t); li.onclick = () => speak(h.out, LANG[h.d.split("→")[1]].tts); ol.append(li);
    });
  }
  $("clearHist").onclick = () => { hist = []; store.set("ilnHist", hist); renderHist(); };

  /* ================= Reset & Save ================= */
  $("btnReset").onclick = () => {
    stopSpeech();
    $("src").value = ""; $("reply").value = "";
    hide("out"); hide("out2"); setStatus("status", ""); setStatus("status2", ""); setStatus("soundMsg", "");
    lastOut = lastOut2 = lastDone = lastDone2 = ""; showTab("translate");
    toast(ui === "ja" ? "リセットしました" : "Reset done");
  };
  function sessionText() {
    const L = x => LANG[x].name, out = [];
    const a = $("src").value.trim(), c = $("reply").value.trim();
    if (a || lastOut) out.push(L(dir[0]) + " → " + L(dir[1]) + "\n" + a + "\n=> " + lastOut);
    if (c || lastOut2) out.push(L(dir[1]) + " → " + L(dir[0]) + "\n" + c + "\n=> " + lastOut2);
    return out.length ? "InterpretLiveNow\n" + new Date().toLocaleString() + "\n\n" + out.join("\n\n") + "\n\n© 2026 Rafat Kotaki. All rights reserved.\n" : "";
  }
  $("btnSave").onclick = async () => {
    const t = sessionText();
    if (!t) { toast(ui === "ja" ? "保存する内容がありません" : "Nothing to save yet"); return; }
    const name = "InterpretLiveNow-" + new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-") + ".txt";
    const file = new File([t], name, { type: "text/plain" });
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: "InterpretLiveNow" }); toast(ui === "ja" ? "保存しました" : "Saved"); return; }
    } catch (e) { if (e && e.name === "AbortError") return; }
    const a = document.createElement("a"); a.href = URL.createObjectURL(file); a.download = name; document.body.appendChild(a); a.click(); a.remove();
    toast(ui === "ja" ? "保存しました" : "Saved");
  };

  /* ================= Install hint & service worker ================= */
  if (!standalone && isIOS && !store.get("ilnInstallSeen", false)) $("installCard").hidden = false;
  $("installClose").onclick = () => { $("installCard").hidden = true; store.set("ilnInstallSeen", true); };
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  applyUI();
  soundMsg("App ready. Open 🔊 Sound & settings → Test voice.", false);
})();
