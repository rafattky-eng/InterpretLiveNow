(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const LANG = { ja: { name: "日本語", tts: "ja-JP", sr: "ja-JP", mm: "ja" }, en: { name: "English", tts: "en-US", sr: "en-US", mm: "en" } };

  const I18N = {
    en: { s1:"Select language", s2:"Type or paste text", paste:"📋 Paste", clear:"Clear", autoStop:"Auto at full stop",
      go:"🔊 Translate & Speak", speak:"🔊 Speak", stop:"⏹ Stop", copy:"Copy", toReply:"Next: record the reply →",
      translate:"Translate", history:"History", clearHist:"Clear history", tabTranslate:"Translate", tabReply:"Reply", tabHistory:"History",
      installTitle:"Install on iPhone", installBody:"In Safari tap Share ⎋, then “Add to Home Screen”, then Add.", gotIt:"Got it",
      step12:"Steps 1–2 of 3 · Translate", step3:"Step 3 of 3 · Reply", stepH:"History",
      replyTitle:"Record the reply", recLabel:"Record reply", recStop:"Listening… tap to stop",
      replyHint: (f,t)=>`Record the reply in ${f}. It will be translated to ${t}.`, empty:"Nothing yet." },
    ja: { s1:"言語を選択", s2:"テキストを入力・貼り付け", paste:"📋 貼り付け", clear:"消去", autoStop:"句点で自動実行",
      go:"🔊 翻訳して読み上げ", speak:"🔊 読み上げ", stop:"⏹ 停止", copy:"コピー", toReply:"次へ：返答を録音 →",
      translate:"翻訳", history:"履歴", clearHist:"履歴を消去", tabTranslate:"翻訳", tabReply:"返答", tabHistory:"履歴",
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
  let voices = [];
  const loadVoices = () => { voices = window.speechSynthesis ? speechSynthesis.getVoices() : []; };
  if (window.speechSynthesis){ loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
  function pickVoice(code){
    const base = code.slice(0, 2);
    const m = voices.filter(v => v.lang.replace("_", "-").toLowerCase().startsWith(base));
    return m.find(v => v.lang.replace("_", "-").toLowerCase() === code.toLowerCase()) || m[0] || null;
  }
  function speak(text, code){
    if (!window.speechSynthesis || !text) return;
    speechSynthesis.cancel(); speechSynthesis.resume();
    const v = pickVoice(code);
    chunk(text, 200).forEach(s => {
      const u = new SpeechSynthesisUtterance(s);
      u.lang = code; if (v) u.voice = v; u.rate = 0.95;
      speechSynthesis.speak(u);
    });
  }
  // iOS only allows speech after a user tap: unlock once, silently.
  let unlocked = false;
  function unlock(){
    if (unlocked || !window.speechSynthesis) return; unlocked = true;
    const u = new SpeechSynthesisUtterance(" "); u.volume = 0; speechSynthesis.speak(u);
  }
  ["touchend", "click", "keydown"].forEach(e => document.addEventListener(e, unlock, { passive: true }));

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
      speak(out, LANG[dir[1]].tts);
    } catch (e) { setStatus("status", navigator.onLine ? "Translation failed: " + e.message : "Offline. Connect to the internet to translate.", true); }
    busy = false; $("go").disabled = false;
  }
  $("go").onclick = () => { unlock(); runMain(); };
  $("clearSrc").onclick = () => { $("src").value = ""; hide("out"); lastDone = ""; setStatus("status", ""); speechSynthesis && speechSynthesis.cancel(); };
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
  $("stopOut").onclick = () => window.speechSynthesis && speechSynthesis.cancel();
  $("copyOut").onclick = () => navigator.clipboard && navigator.clipboard.writeText(lastOut).catch(() => {});

  /* ---------- Step 3: record reply ---------- */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null, listening = false;
  function setRecLabel(on){ $("recLabel").textContent = on ? I18N[ui].recStop : I18N[ui].recLabel; $("rec").classList.toggle("live", on); }
  $("rec").onclick = () => {
    unlock();
    if (!SR){ setStatus("status2", "Voice recording isn't available here. Tap the text box and use the 🎤 key on the iPhone keyboard.", true); $("reply").focus(); return; }
    if (listening){ rec.stop(); return; }
    speechSynthesis && speechSynthesis.cancel();
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
    rec.onend = () => { listening = false; setRecLabel(false); if ($("reply").value.trim()) runReply(); };
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
  $("stopOut2").onclick = () => window.speechSynthesis && speechSynthesis.cancel();
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

  /* ---------- Install status ---------- */
  const standalone = window.navigator.standalone === true || matchMedia("(display-mode: standalone)").matches;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  $("mode").textContent = standalone ? "✓ Installed app mode" : "Running in browser · not installed";
  if (!standalone && isIOS && !store.get("ilnInstallSeen", false)) $("installCard").hidden = false;
  $("installClose").onclick = () => { $("installCard").hidden = true; store.set("ilnInstallSeen", true); };

  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  applyUI();
})();
