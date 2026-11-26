// Голосовой ввод через распознавание речи браузера (SPEC §8).
const SR = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
const MAX_MS = 3 * 60 * 1000;
const unsupportedLangs = new Set((() => {
  try { return JSON.parse(sessionStorage.getItem('aihr.noVoice') || '[]'); } catch { return []; }
})());

export function voiceSupported(lang) {
  return Boolean(SR) && !unsupportedLangs.has(lang);
}

export function createVoice({ lang, onInterim, onFinal, onPulse, onError, onState }) {
  let rec = null;
  let active = false;
  let timer = null;

  function stop() {
    active = false;
    clearTimeout(timer);
    try { rec?.stop(); } catch { /* уже остановлен */ }
    onInterim?.('');
    onState?.(false);
  }

  function begin() {
    rec = new SR();
    rec.lang = lang === 'uz' ? 'uz-UZ' : 'ru-RU';
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i += 1) {
        const r = e.results[i];
        if (r.isFinal) onFinal?.(r[0].transcript.trim());
        else interim += r[0].transcript;
      }
      onInterim?.(interim);
      onPulse?.();
    };
    rec.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      if (e.error === 'language-not-supported') {
        unsupportedLangs.add(lang);
        try { sessionStorage.setItem('aihr.noVoice', JSON.stringify([...unsupportedLangs])); } catch { /* нет хранилища */ }
        onError?.('lang');
      } else if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        onError?.('denied');
      } else {
        onError?.('other');
      }
      stop();
    };
    // Браузер сам останавливает распознавание после паузы — перезапускаем, пока пользователь не нажал «Стоп».
    rec.onend = () => { if (active) { try { rec.start(); } catch { stop(); } } };
    rec.start();
  }

  return {
    get active() { return active; },
    start() {
      if (active || !SR) return;
      active = true;
      onState?.(true);
      try { begin(); } catch { stop(); onError?.('other'); return; }
      timer = setTimeout(stop, MAX_MS);
    },
    stop,
  };
}
