(() => {
  "use strict";
  const $ = id => document.getElementById(id);
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
      voiceEn: "English voice", voiceJa: "Japanese voice", auto: "Automatic", autoSpeak: "Speak automatically",
      bypass: "Play even if the silent switch is on", keyLabel: "Better translation (optional)",
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
      voiceEn: "英語の音声", voiceJa: "日本語の音声", auto: "自動", autoSpeak: "自動で読み上げ",
      bypass: "消音スイッチがオンでも再生", keyLabel: "高品質翻訳（任意）",
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
  function toast(m) { const t = $("toast"); t.textContent = m; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 2400); }

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

  /* ================= Speech output ================= */
  const synth = window.speechSynthesis || null;
  let voices = [];
  const vcode = v => v.lang.replace("_", "-").toLowerCase();
  function pickVoice(code) {
    const base = code.slice(0, 2).toLowerCase();
    const pref = store.get("ilnVoice_" + base, "");
    if (pref) { const v = voices.find(x => x.voiceURI === pref); if (v) return v; }
    const m = voices.filter(v => vcode(v).startsWith(base));
    return m.find(v => vcode(v) === code.toLowerCase()) || m[0] || null;
  }
  function fillVoices() {
    ["en", "ja"].forEach(l => {
      const sel = $("voice_" + l); if (!sel) return;
      const cur = store.get("ilnVoice_" + l, "");
      sel.innerHTML = ""; sel.add(new Option(I18N[ui].auto, ""));
      voices.filter(v => vcode(v).startsWith(l)).forEach(v => sel.add(new Option(v.name + " (" + v.lang + ")", v.voiceURI)));
      sel.value = cur; if (sel.value !== cur) sel.value = "";
      sel.onchange = () => store.set("ilnVoice_" + l, sel.value);
    });
  }
  function loadVoices() { voices = synth ? synth.getVoices() : []; fillVoices(); }
  if (synth) { loadVoices(); synth.onvoiceschanged = loadVoices; }

  // Silent looping <audio>: moves iOS to the "playback" audio session so speech is audible with the silent switch on.
  function silentWavUrl() {
    const n = 8000, b = new ArrayBuffer(44 + n), d = new DataView(b);
    const w = (o, t) => [...t].forEach((c, i) => d.setUint8(o + i, c.charCodeAt(0)));
    w(0, "RIFF"); d.setUint32(4, 36 + n, true); w(8, "WAVEfmt "); d.setUint32(16, 16, true); d.setUint16(20, 1, true);
    d.setUint16(22, 1, true); d.setUint32(24, 8000, true); d.setUint32(28, 8000, true); d.setUint16(32, 1, true); d.setUint16(34, 8, true);
    w(36, "data"); d.setUint32(40, n, true); for (let i = 0; i < n; i++) d.setUint8(44 + i, 128);
    return URL.createObjectURL(new Blob([b], { type: "audio/wav" }));
  }
  const SILENT = silentWavUrl();
  const keepAlive = new Audio(SILENT); keepAlive.loop = true; keepAlive.setAttribute("playsinline", ""); keepAlive.volume = 0.01;
  const player = new Audio(); player.setAttribute("playsinline", "");
  let unlocked = false;
  function keepAliveOn() { try { if ($("bypass").checked) { if (keepAlive.paused) keepAlive.play().catch(() => {}); } else keepAlive.pause(); } catch {} }
  function unlock() {
    keepAliveOn();
    if (unlocked) return; unlocked = true;
    try { player.src = SILENT; player.play().then(() => player.pause()).catch(() => {}); } catch {}
  }
  ["touchstart", "touchend", "click", "keydown"].forEach(e => document.addEventListener(e, unlock, { passive: true }));

  let token = 0;
  function stopSpeech() { token++; try { if (synth && (synth.speaking || synth.pending)) synth.cancel(); } catch {} try { player.pause(); } catch {} }
  function ttsUrl(t, code) { return "https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=" + code.slice(0, 2) + "&q=" + encodeURIComponent(t); }
  function playOnline(parts, code, my) {
    soundMsg("🔊 Online voice");
    let i = 0;
    const next = () => {
      if (my !== token || i >= parts.length) return;
      player.src = ttsUrl(parts[i++], code); player.onended = next;
      player.onerror = () => soundMsg("No sound from the online voice. Check volume, the silent switch and your connection.", true);
      player.play().catch(() => soundMsg("Tap 🔈 Test voice once, then try again.", true));
    };
    next();
  }
  function speak(text, code) {
    if (!text) return;
    unlock();
    const my = ++token;
    try { player.pause(); } catch {}
    const parts = chunk(text, 160);
    const run = () => {
      if (my !== token) return;
      if (!synth) { playOnline(parts, code, my); return; }
      if (voices.length && !pickVoice(code)) soundMsg("No " + (code.startsWith("ja") ? "Japanese" : "English") + " voice found. iPhone Settings → Accessibility → Spoken Content → Voices → download one.", true);
      const v = pickVoice(code); let started = false;
      try { synth.resume(); } catch {}
      parts.forEach((p, i) => {
        const u = new SpeechSynthesisUtterance(p);
        u.lang = code; if (v) u.voice = v; u.rate = parseFloat($("rate").value) || 0.95; u.volume = 1;
        u.onstart = () => { if (!started) { started = true; soundMsg("🔊 " + (v ? v.name : code)); } };
        u.onerror = e => { if (e.error && !/cancel|interrupt/i.test(e.error)) soundMsg("Voice error: " + e.error, true); };
        synth.speak(u);
      });
      setTimeout(() => {
        if (my === token && !started) { try { synth.cancel(); } catch {} soundMsg("iPhone voice did not start. Trying the online voice…"); playOnline(parts, code, my); }
      }, 2000);
    };
    // iOS drops a speak() issued right after cancel(): wait before speaking again.
    if (synth && (synth.speaking || synth.pending)) { try { synth.cancel(); } catch {} setTimeout(run, 200); } else run();
  }

  let actx;
  function beep() {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === "suspended") actx.resume();
      const o = actx.createOscillator(), g = actx.createGain();
      o.frequency.value = 880; g.gain.value = 0.2; o.connect(g); g.connect(actx.destination);
      o.start(); o.stop(actx.currentTime + 0.25); return true;
    } catch { return false; }
  }
  $("testBeep").onclick = () => { unlock(); soundMsg(beep() ? "🔔 Beep played." : "Audio unavailable in this browser.", false); };
  $("testVoice").onclick = () => {
    soundMsg("…");
    const code = LANG[dir[1]].tts;
    speak(dir[1] === "ja" ? "音声テストです。聞こえますか？" : "Sound test. Can you hear me?", code);   // called directly inside the tap
  };
  $("rate").value = store.get("ilnRate", "0.95"); $("rate").onchange = e => store.set("ilnRate", e.target.value);
  $("autoSpeak").checked = store.get("ilnAutoSpeak", true); $("autoSpeak").onchange = e => store.set("ilnAutoSpeak", e.target.checked);
  $("bypass").checked = store.get("ilnBypass", true); $("bypass").onchange = e => { store.set("ilnBypass", e.target.checked); keepAliveOn(); };
  $("gkey").value = store.get("ilnKey", ""); $("gkey").onchange = e => store.set("ilnKey", e.target.value.trim());

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
      if ($("autoSpeak").checked) speak(out, LANG[dir[1]].tts);
    } catch (e) { setStatus("status", errMsg(e), true); }
    busy = false; $("go").disabled = false;
  }
  $("go").onclick = () => { unlock(); runMain(); };
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
  $("speakOut").onclick = () => speak(lastOut, LANG[dir[1]].tts);
  $("stopOut").onclick = stopSpeech;
  $("copyOut").onclick = () => navigator.clipboard && navigator.clipboard.writeText(lastOut).then(() => toast("Copied")).catch(() => {});

  /* ================= Step 3: reply (voice or keyboard dictation) ================= */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const canSR = !!SR && !(isIOS && standalone);     // iOS blocks Web Speech recognition in home-screen apps
  let rec = null, listening = false;
  function showDictation() { $("dictHint").hidden = false; $("reply").focus(); toast(ui === "ja" ? "キーボードの🎤をタップ" : "Tap the 🎤 on the keyboard"); }
  $("rec").onclick = () => {
    unlock();
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
    rec.onend = () => { listening = false; setRecLabel(false); keepAliveOn(); if ($("reply").value.trim()) runReply(); };
    try { rec.start(); } catch {}
  };
  async function runReply() {
    const text = $("reply").value.trim(); if (!text) return;
    $("goReply").disabled = true; setStatus("status2", "…");
    try {
      const out = await translate(text, dir[1], dir[0]);
      lastOut2 = out; lastDone2 = text;
      $("outText2").textContent = out; $("via2").textContent = "via " + lastEngine; $("out2").hidden = false; setStatus("status2", "");
      pushHist(text, out, dir[1] + "→" + dir[0]);
      if ($("autoSpeak").checked) speak(out, LANG[dir[0]].tts);
    } catch (e) { setStatus("status2", errMsg(e), true); }
    $("goReply").disabled = false;
  }
  $("goReply").onclick = () => { unlock(); runReply(); };
  let timer2;
  $("reply").addEventListener("input", () => {
    if (!$("autoReply").checked) return;
    clearTimeout(timer2);
    const v = $("reply").value.trim();
    if (v && v !== lastDone2) timer2 = setTimeout(runReply, 1600);
  });
  $("autoReply").checked = store.get("ilnAutoReply", true); $("autoReply").onchange = e => store.set("ilnAutoReply", e.target.checked);
  $("clearReply").onclick = () => { $("reply").value = ""; hide("out2"); lastDone2 = ""; setStatus("status2", ""); stopSpeech(); };
  $("speakOut2").onclick = () => speak(lastOut2, LANG[dir[0]].tts);
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
})();
