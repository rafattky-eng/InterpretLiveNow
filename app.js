(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const LANG = { ja: { name: "日本語", tts: "ja-JP", sr: "ja-JP", mm: "ja" }, en: { name: "English", tts: "en-US", sr: "en-US", mm: "en" } };

  const I18N = {
    en: { s1:"Select language", s2:"Type or paste text", paste:"📋 Paste", clear:"Clear", autoStop:"Auto at full stop",
      go:"🔊 Translate & Speak", speak:"🔊 Speak", stop:"⏹ Stop", copy:"Copy", toReply:"Next: record the reply →",
      test:"🔈 Test sound", slow:"Slow", normal:"Normal", fast:"Fast", autoSpeak:"Speak automatically", translate:"Translate", history:"History", clearHist:"Clear history", tabTranslate:"Translate", tabReply:"Reply", tabHistory:"History",
      installTitle:"Install on iPhone", installBody:"In Safari tap Share ⎋, then “Add to Home Screen”, then Add.", gotIt:"Got it",
      step12:"Steps 1–2 of 3 · Translate", step3:"Step 3 of 3 · Reply", stepH:"History",
      replyTitle:"Record the reply", recLabel:"Record reply", recStop:"Listening… tap to stop",
      replyHint: (f,t)=>`Record the reply in ${f}. It will be translated to ${t}.`, empty:"Nothing yet." },
    ja: { s1:"言語を選択", s2:"テキストを入力・貼り付け", paste:"📋 貼り付け", clear:"消去", autoStop:"句点で自動実行",
      go:"🔊 翻訳して読み上げ", speak:"🔊 読み上げ", stop:"⏹ 停止", copy:"コピー", toReply:"次へ：返答を録音 →",
      test:"🔈 音声テスト", slow:"ゆっくり", normal:"標準", fast:"速い", autoSpeak:"自動で読み上げ", translate:"翻訳", history:"履歴", clearHist:"履歴を消去", tabTranslate:"翻訳", tabReply:"返答", tabHistory:"履歴",
      installTitle:"iPhoneにインストール", installBody:"Safariで共有 ⎋ をタップし、「ホーム画面に追加」を選んでください。", gotIt:"OK",
      step12:"ステップ1–2 / 3 · 翻訳", step3:"ステップ3 / 3 · 返答", stepH:"履歴",
      replyTitle:"返答を録音", recLabel:"返答を録音", recStop:"聞き取り中… タップで停止",
      replyHint: (f,t)=>`${f}で返答を録音すると、${t}に翻訳されます。`, empty:"まだありません。" }
  };

  const store = {
    get(k, d){ try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
  };

  let ui = store.get("ilnUI", "en");
  let dir = store.get("ilnDir", ["ja", "en"]);       // [from, to]
  let tab = "translate";
  let lastOut = "", lastOut2 = "";

  /* ---------- UI language ---------- */
  function applyUI(){
    const t = I18N[ui];
    document.querySelectorAll("[data-i18n]").forEach(el => { const v = t[el.dataset.i18n]; if (typeof v === "string") el.textContent = v; });
    document.querySelectorAll(".ui-lang button").forEach(b => b.classList.toggle("on", b.dataset.ui === ui));
    $("replyTitle").textContent = t.replyTitle;
    setRecLabel(false); renderDir(); renderStep(); renderHist();
  }
  document.querySelectorAll(".ui-lang button").forEach(b => b.onclick = () => { ui = b.dataset.ui; store.set("ilnUI", ui); applyUI(); });

  /* ---------- Direction (step 1) ---------- */
  function renderDir(){
    const [f, t] = dir;
    $("fromPill").textContent = LANG[f].name; $("toPill").textContent = LANG[t].name;
    $("src").lang = LANG[f].mm; $("outText").lang = LANG[t].mm; $("reply").lang = LANG[t].mm; $("outText2").lang = LANG[f].mm;
    $("src").placeholder = f === "ja" ? "日本語を入力、または貼り付け…" : "Type a letter, number, word, question or paragraph…";
    $("replyHint").textContent = I18N[ui].replyHint(LANG[t].name, LANG[f].name);
  }
  $("swap").onclick = () => { dir = [dir[1], dir[0]]; store.set("ilnDir", dir); renderDir(); hide("out"); hide("out2"); };

  /* ---------- Tabs ---------- */
  function renderStep(){ $("stepLabel").textContent = I18N[ui][tab === "translate" ? "step12" : tab === "reply" ? "step3" : "stepH"]; }
  function showTab(n){
    tab = n;
    document.querySelectorAll(".view").forEach(v => v.classList.toggle("on", v.id === "view-" + n));
    document.querySelectorAll(".tabs button").forEach(b => b.classList.toggle("on", b.dataset.tab === n));
    renderStep(); window.scrollTo(0, 0);
  }
  document.querySelectorAll(".tabs button").forEach(b => b.onclick = () => showTab(b.dataset.tab));
  $("toReply").onclick = () => showTab("reply");

  const hide = id => { $(id).hidden = true; };
  const setStatus = (id, msg, err) => { const el = $(id); el.textContent = msg || ""; el.classList.toggle("err", !!err); };

  /* ---------- Translation (chunked) ---------- */
  function chunk(text, max = 450){
    const parts = text.match(/[^。.!?！？\n]+[。.!?！？]*\s*|\n/g) || [text];
    const out = []; let cur = "";
    for (let p of parts){
      while (p.length > max){ if (cur){ out.push(cur); cur = ""; } out.push(p.slice(0, max)); p = p.slice(max); }
      if ((cur + p).length > max){ out.push(cur); cur = p; } else cur += p;
    }
    if (cur) out.push(cur);
    return out.filter(s => s.trim());
  }
  async function translateChunk(q, from, to){
    const url = "https://api.mymemory.translated.net/get?q=" + encodeURIComponent(q) + "&langpair=" + LANG[from].mm + "|" + LANG[to].mm;
    const r = await fetch(url);
    if (!r.ok) throw new Error("service " + r.status);
    const j = await r.json();
    const t = j && j.responseData && j.responseData.translatedText;
    if (!t || /MYMEMORY WARNING|QUERY LENGTH LIMIT/i.test(t)) throw new Error("daily limit reached or no result");
    return t;
  }
  async function translate(text, from, to){
    const parts = chunk(text);
    const res = [];
    for (const p of parts) res.push(await translateChunk(p, from, to));
    return res.join(from === "ja" ? " " : "");
  }

  /* ---------- Speech output (iPhone speaker) ---------- */
  const synth = window.speechSynthesis || null;
  let voices = [];
  const loadVoices = () => { voices = synth ? synth.getVoices() : []; };
  if (synth){ loadVoices(); synth.onvoiceschanged = loadVoices; }
  function pickVoice(code){
    const base = code.slice(0, 2).toLowerCase();
    const m = voices.filter(v => v.lang.replace("_", "-").toLowerCase().startsWith(base));
    return m.find(v => v.lang.replace("_", "-").toLowerCase() === code.toLowerCase()) || m[0] || null;
  }
  const soundMsg = (m, err) => setStatus("soundMsg", m, err);

  // A looping silent <audio> switches iOS to the "playback" audio session,
  // so speech is audible even with the silent switch on and after recording.
  function silentWavUrl(){
    const n = 8000, b = new ArrayBuffer(44 + n), d = new DataView(b);
    const w = (o, t) => [...t].forEach((c, i) => d.setUint8(o + i, c.charCodeAt(0)));
    w(0, "RIFF"); d.setUint32(4, 36 + n, true); w(8, "WAVEfmt "); d.setUint32(16, 16, true); d.setUint16(20, 1, true);
    d.setUint16(22, 1, true); d.setUint32(24, 8000, true); d.setUint32(28, 8000, true); d.setUint16(32, 1, true); d.setUint16(34, 8, true);
    w(36, "data"); d.setUint32(40, n, true); for (let i = 0; i < n; i++) d.setUint8(44 + i, 128);
    return URL.createObjectURL(new Blob([b], { type: "audio/wav" }));
  }
  const SILENT = silentWavUrl();
  const keepAlive = new Audio(SILENT); keepAlive.loop = true; keepAlive.setAttribute("playsinline", ""); keepAlive.volume = 0.01;
  const player = new Audio(); player.setAttribute("playsinline", "");   // online-voice fallback player
  let unlocked = false;
  function unlock(){
    try { if (keepAlive.paused) keepAlive.play().catch(() => {}); } catch {}
    if (unlocked) return; unlocked = true;
    try { player.src = SILENT; player.play().then(() => player.pause()).catch(() => {}); } catch {}
    if (synth){ const u = new SpeechSynthesisUtterance("a"); u.volume = 0; synth.speak(u); }
  }
  ["touchstart", "touchend", "click", "keydown"].forEach(e => document.addEventListener(e, unlock, { passive: true }));

  let token = 0;
  function stopSpeech(){ token++; if (synth) synth.cancel(); try { player.pause(); } catch {} }
  function ttsUrl(t, code){ return "https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=" + code.slice(0, 2) + "&q=" + encodeURIComponent(t); }
  function playFallback(parts, code, my){
    soundMsg("🔊 Online voice");
    let i = 0;
    const next = () => {
      if (my !== token || i >= parts.length) return;
      player.src = ttsUrl(parts[i++], code);
      player.onended = next;
      player.onerror = () => soundMsg("No sound. Check volume, the silent switch, and your connection.", true);
      player.play().catch(() => soundMsg("Tap 🔈 Test sound once, then try again.", true));
    };
    next();
  }
  function speak(text, code){
    if (!text) return;
    unlock();
    const busy = synth && (synth.speaking || synth.pending);
    stopSpeech(); const my = token;
    const parts = chunk(text, 180);
    const go = () => {
      if (my !== token) return;
      if (!synth){ playFallback(parts, code, my); return; }
      const v = pickVoice(code); let started = false;
      parts.forEach((p, i) => {
        const u = new SpeechSynthesisUtterance(p);
        u.lang = code; if (v) u.voice = v; u.rate = parseFloat($("rate").value) || 0.95; u.volume = 1;
        if (i === 0) u.onstart = () => { started = true; soundMsg("🔊 " + (v ? v.name : code)); };
        synth.speak(u);
      });
      setTimeout(() => { if (my === token && !started){ synth.cancel(); playFallback(parts, code, my); } }, 2000);
    };
    busy ? setTimeout(go, 120) : go();
  }
  let actx;
  function beep(){
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === "suspended") actx.resume();
      const o = actx.createOscillator(), g = actx.createGain();
      o.frequency.value = 880; g.gain.value = 0.2; o.connect(g); g.connect(actx.destination);
      o.start(); o.stop(actx.currentTime + 0.25); return true;
    } catch { return false; }
  }
  $("testSound").onclick = () => {
    unlock();
    const ok = beep();
    soundMsg(ok ? "🔔 Beep… then voice. No beep? Raise the volume and turn the silent switch off." : "Audio unavailable in this browser.", !ok);
    const code = LANG[dir[1]].tts;
    setTimeout(() => speak(dir[1] === "ja" ? "音声テストです。聞こえますか？" : "Sound test. Can you hear me?", code), 400);
  };
  $("rate").value = store.get("ilnRate", "0.95");
  $("rate").onchange = e => store.set("ilnRate", e.target.value);
  $("autoSpeak").checked = store.get("ilnAutoSpeak", true);
  $("autoSpeak").onchange = e => store.set("ilnAutoSpeak", e.target.checked);

  /* ---------- Step 2: translate source ---------- */
  let busy = false, lastDone = "";
  async function runMain(){
    const text = $("src").value.trim();
    if (!text || busy) return;
    busy = true; $("go").disabled = true; setStatus("status", "…");
    try {
      const out = await translate(text, dir[0], dir[1]);
      lastOut = out; lastDone = text;
      $("outText").textContent = out; $("out").hidden = false; setStatus("status", "");
      pushHist(text, out, dir[0] + "→" + dir[1]);
      if ($("autoSpeak").checked) speak(out, LANG[dir[1]].tts);
    } catch (e) { setStatus("status", navigator.onLine ? "Translation failed: " + e.message : "Offline. Connect to the internet to translate.", true); }
    busy = false; $("go").disabled = false;
  }
  $("go").onclick = () => { unlock(); runMain(); };
  $("clearSrc").onclick = () => { $("src").value = ""; hide("out"); lastDone = ""; setStatus("status", ""); stopSpeech(); };
  $("paste").onclick = async () => {
    try { const t = await navigator.clipboard.readText(); if (t){ $("src").value = t; $("src").focus(); } }
    catch { setStatus("status", "Paste blocked. Long-press the text box and choose Paste.", true); }
  };
  let timer;
  $("src").addEventListener("input", () => {
    if (!$("autoStop").checked) return;
    clearTimeout(timer);
    const v = $("src").value.trim();
    if (/[。.!?！？]$/.test(v) && v !== lastDone) timer = setTimeout(runMain, 500);
  });
  $("autoStop").checked = store.get("ilnAuto", false);
  $("autoStop").onchange = e => store.set("ilnAuto", e.target.checked);
  $("speakOut").onclick = () => speak(lastOut, LANG[dir[1]].tts);
  $("stopOut").onclick = () => window.stopSpeech();
  $("copyOut").onclick = () => navigator.clipboard && navigator.clipboard.writeText(lastOut).catch(() => {});

  /* ---------- Step 3: record reply ---------- */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null, listening = false;
  function setRecLabel(on){ $("recLabel").textContent = on ? I18N[ui].recStop : I18N[ui].recLabel; $("rec").classList.toggle("live", on); }
  $("rec").onclick = () => {
    unlock();
    if (!SR){ setStatus("status2", "Voice recording isn't available here. Tap the text box and use the 🎤 key on the iPhone keyboard.", true); $("reply").focus(); return; }
    if (listening){ rec.stop(); return; }
    stopSpeech();
    rec = new SR(); rec.lang = LANG[dir[1]].sr; rec.interimResults = true; rec.continuous = false;
    let final = "";
    rec.onstart = () => { listening = true; setRecLabel(true); setStatus("status2", ""); };
    rec.onresult = e => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++){ const t = e.results[i][0].transcript; e.results[i].isFinal ? final += t : interim += t; }
      $("reply").value = final + interim;
    };
    rec.onerror = e => {
      const m = e.error === "not-allowed" || e.error === "service-not-allowed"
        ? "Microphone or speech recognition is blocked. Use the 🎤 key on the iPhone keyboard instead, or enable Settings → Siri & Search / Dictation."
        : e.error === "no-speech" ? "Didn't hear anything. Tap Record and try again." : "Recording error: " + e.error;
      setStatus("status2", m, true);
    };
    rec.onend = () => { listening = false; setRecLabel(false); try { keepAlive.play().catch(() => {}); } catch {} if ($("reply").value.trim()) runReply(); };
    try { rec.start(); } catch {}
  };
  async function runReply(){
    const text = $("reply").value.trim(); if (!text) return;
    $("goReply").disabled = true; setStatus("status2", "…");
    try {
      const out = await translate(text, dir[1], dir[0]);
      lastOut2 = out; $("outText2").textContent = out; $("out2").hidden = false; setStatus("status2", "");
      pushHist(text, out, dir[1] + "→" + dir[0]);
    } catch (e) { setStatus("status2", navigator.onLine ? "Translation failed: " + e.message : "Offline. Connect to the internet to translate.", true); }
    $("goReply").disabled = false;
  }
  $("goReply").onclick = () => { unlock(); runReply(); };
  $("clearReply").onclick = () => { $("reply").value = ""; hide("out2"); setStatus("status2", ""); };
  $("speakOut2").onclick = () => speak(lastOut2, LANG[dir[0]].tts);
  $("stopOut2").onclick = () => window.stopSpeech();
  $("copyOut2").onclick = () => navigator.clipboard && navigator.clipboard.writeText(lastOut2).catch(() => {});

  /* ---------- History ---------- */
  let hist = store.get("ilnHist", []);
  function pushHist(src, out, d){ hist.unshift({ src, out, d }); hist = hist.slice(0, 30); store.set("ilnHist", hist); renderHist(); }
  function renderHist(){
    const ol = $("hist"); ol.innerHTML = ""; ol.dataset.empty = I18N[ui].empty;
    hist.forEach(h => {
      const li = document.createElement("li");
      const s = document.createElement("div"); s.className = "s"; s.textContent = h.d.replace("ja", "日本語").replace("en", "English").replace("→", " → ") + " · " + h.src;
      const t = document.createElement("div"); t.className = "t"; t.textContent = h.out;
      li.append(s, t); li.onclick = () => speak(h.out, LANG[h.d.split("→")[1]].tts); ol.append(li);
    });
  }
  $("clearHist").onclick = () => { hist = []; store.set("ilnHist", hist); renderHist(); };

  /* ---------- Toast, Reset, Save ---------- */
  let toastT;
  function toast(m){ const t = $("toast"); t.textContent = m; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 2200); }
  $("btnReset").onclick = () => {
    stopSpeech();
    $("src").value = ""; $("reply").value = "";
    hide("out"); hide("out2"); setStatus("status", ""); setStatus("status2", ""); setStatus("soundMsg", "");
    lastOut = lastOut2 = ""; lastDone = ""; showTab("translate");
    toast(ui === "ja" ? "リセットしました" : "Reset done");
  };
  function sessionText(){
    const L = x => LANG[x].name, out = [];
    const a = $("src").value.trim(), b = lastOut, c = $("reply").value.trim(), d = lastOut2;
    if (a || b) out.push(L(dir[0]) + " → " + L(dir[1]) + "\n" + a + "\n=> " + b);
    if (c || d) out.push(L(dir[1]) + " → " + L(dir[0]) + "\n" + c + "\n=> " + d);
    return out.length ? "InterpretLiveNow\n" + new Date().toLocaleString() + "\n\n" + out.join("\n\n") + "\n\n© 2026 Rafat Kotaki. All rights reserved.\n" : "";
  }
  $("btnSave").onclick = async () => {
    const t = sessionText();
    if (!t){ toast(ui === "ja" ? "保存する内容がありません" : "Nothing to save yet"); return; }
    const name = "InterpretLiveNow-" + new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-") + ".txt";
    const file = new File([t], name, { type: "text/plain" });
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })){ await navigator.share({ files: [file], title: "InterpretLiveNow" }); toast(ui === "ja" ? "保存しました" : "Saved"); return; }
    } catch (e) { if (e && e.name === "AbortError") return; }
    const a = document.createElement("a"); a.href = URL.createObjectURL(file); a.download = name; document.body.appendChild(a); a.click(); a.remove();
    toast(ui === "ja" ? "保存しました" : "Saved");
  };

  /* ---------- Install status ---------- */
  const standalone = window.navigator.standalone === true || matchMedia("(display-mode: standalone)").matches;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (!standalone && isIOS && !store.get("ilnInstallSeen", false)) $("installCard").hidden = false;
  $("installClose").onclick = () => { $("installCard").hidden = true; store.set("ilnInstallSeen", true); };

  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  applyUI();
})();
