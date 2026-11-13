document.addEventListener('DOMContentLoaded', () => {
    const sourceLang = document.getElementById('sourceLang');
    const targetLang = document.getElementById('targetLang');
    const swapLangBtn = document.getElementById('swapLangBtn');
    const inputText = document.getElementById('inputText');
    const translateBtn = document.getElementById('translateBtn');
    const speakInputBtn = document.getElementById('speakInputBtn');
    const outputContainer = document.getElementById('outputContainer');
    const translatedText = document.getElementById('translatedText');
    const speakOutputBtn = document.getElementById('speakOutputBtn');
    const recordBtn = document.getElementById('recordBtn');
    const replyOutput = document.getElementById('replyOutput');
    const replyText = document.getElementById('replyText');
    const speakReplyBtn = document.getElementById('speakReplyBtn');

    // Swap Languages
    swapLangBtn.addEventListener('click', () => {
        const temp = sourceLang.value;
        sourceLang.value = targetLang.value;
        targetLang.value = temp;
    });

    // Text-to-Speech
    const speak = (text, lang) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel(); 
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = lang;
            window.speechSynthesis.speak(utterance);
        }
    };

    speakInputBtn.addEventListener('click', () => {
        if (inputText.value.trim()) speak(inputText.value, sourceLang.value);
    });

    // Live Translation API (MyMemory - Free, no API key needed)
    const translateText = async (text, from, to) => {
        const langPair = `${from.split('-')[0]}|${to.split('-')[0]}`;
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`;
        const response = await fetch(url);
        const data = await response.json();
        return data.responseData.translatedText;
    };

    // Translate Button
    translateBtn.addEventListener('click', async () => {
        const text = inputText.value.trim();
        if (!text) return;
        translateBtn.innerText = "Translating...";
        try {
            const result = await translateText(text, sourceLang.value, targetLang.value);
            translatedText.innerText = result;
            outputContainer.classList.remove('hidden');
            speak(result, targetLang.value); // Auto-speak
        } catch (e) {
            alert("Translation failed. Check internet.");
        } finally {
            translateBtn.innerText = "Translate ➔";
        }
    });

    speakOutputBtn.addEventListener('click', () => speak(translatedText.innerText, targetLang.value));

    // Voice Recording
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition;
    let isRecording = false;

    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;

        recordBtn.addEventListener('click', () => {
            if (isRecording) { recognition.stop(); return; }
            recognition.lang = targetLang.value; 
            recognition.start();
        });

        recognition.onstart = () => {
            isRecording = true;
            recordBtn.innerText = "🔴 Listening... Tap to stop";
            recordBtn.classList.add('recording');
            replyOutput.classList.add('hidden');
        };

        recognition.onresult = async (event) => {
            const transcript = event.results[0][0].transcript;
            replyText.innerText = "Translating...";
            replyOutput.classList.remove('hidden');
            try {
                const result = await translateText(transcript, targetLang.value, sourceLang.value);
                replyText.innerText = result;
                speak(result, sourceLang.value); // Auto-speak
            } catch (e) {
                replyText.innerText = "Translation failed.";
            }
        };

        recognition.onend = () => {
            isRecording = false;
            recordBtn.innerText = "🎤 Tap to Record Reply";
            recordBtn.classList.remove('recording');
        };
    } else {
        recordBtn.innerText = "Voice Recording Not Supported";
        recordBtn.disabled = true;
        recordBtn.style.backgroundColor = "#555";
    }

    speakReplyBtn.addEventListener('click', () => speak(replyText.innerText, sourceLang.value));
});