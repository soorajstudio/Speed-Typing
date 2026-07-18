/* ═══════════════════════════════════════════════════════
   KEYFLOW  —  Full Application Logic
   ═══════════════════════════════════════════════════════ */

// ── WORD BANKS ───────────────────────────────────────────
const COMMON_WORDS = [
  "the","be","to","of","and","a","in","that","have","it","for","not","on","with",
  "as","you","do","at","this","but","his","by","from","they","we","say","her","she",
  "or","an","will","my","one","all","would","there","their","what","so","up","out",
  "if","about","who","get","which","go","me","when","make","can","like","time","no",
  "just","him","know","take","people","into","year","your","good","some","could",
  "them","see","other","than","then","now","look","only","come","its","over","think",
  "also","back","after","use","two","how","our","work","first","well","way","even",
  "new","want","because","any","these","give","day","most","us","great","between",
  "need","large","often","hand","high","place","hold","turn","ask","men","read",
  "write","run","never","change","play","off","still","real","life","few","north"
];

const QUOTES = {
  short: [
    "I'm not gonna die, partner.",
    "I never go back on my word, because that is my ninja way.",
    "I am serious. And don't call me Shirley.",
    "Get busy living, or get busy dying.",
    "To infinity and beyond!",
    "May the Force be with you."
  ],
  medium: [
    "I don't wanna conquer anything. It's just that the person with the most freedom on the sea is the Pirate King.",
    "Whatever you are, be a good one. The best way to predict your future is to create it.",
    "The only way to do great work is to love what you do. If you haven't found it yet, keep looking."
  ],
  large: [
    "When do you think people die? When they are shot through the heart by the bullet of a pistol? No. When they drink a soup made from a poisonous mushroom? No! It's when they are forgotten.",
    "Whether you think you can, or you think you can't, you are right. The secret of getting ahead is getting started. The secret of getting started is breaking your complex overwhelming tasks into small manageable tasks."
  ]
};

// ── CONFIG OPTIONS ───────────────────────────────────────
const MODE_CONFIGS = {
  time:  [15, 30, 60],
  words: [10, 25, 50],
  quote: ['short', 'medium', 'large']
};

// ── STATE ────────────────────────────────────────────────
let mode       = 'time';
let config     = 30;
let words      = [];
let hasStarted = false;
let isFinished = false;
let showTimer  = true;
let timeLeft   = 30;
let liveWpmVal = 0;

let wordIndex    = 0;
let letterIndex  = 0;
let startTime    = null;
let totalTyped   = 0;
let errors       = 0;
let correctChars = 0;
let history      = [];

let mainInterval = null;
let chartInstance = null;

// ── DOM REFS ─────────────────────────────────────────────
const wordsContainer = document.getElementById('wordsContainer');
const hiddenInput    = document.getElementById('hiddenInput');
const caretEl        = document.getElementById('caret');
const timerDisplay   = document.getElementById('timerDisplay');
const timerToggle    = document.getElementById('timerToggle');
const timerToggleLabel = document.getElementById('timerToggleLabel');
const timerToggleIcon  = document.getElementById('timerToggleIcon');
const liveStats      = document.getElementById('liveStats');
const liveWpmEl      = document.getElementById('liveWpm');
const progressFill   = document.getElementById('progressFill');
const startOverlay   = document.getElementById('startOverlay');
const startBtn       = document.getElementById('startBtn');
const typingWrapper  = document.getElementById('typingWrapper');
const dashboardWrap  = document.getElementById('dashboardWrap');
const kbdHint        = document.getElementById('kbdHint');
const configGroup    = document.getElementById('configGroup');
const modeGroup      = document.getElementById('modeGroup');

// ── CONTENT GENERATION ───────────────────────────────────
function generateContent(m, cfg) {
  if (m === 'time' || m === 'words') {
    const count = m === 'time' ? 300 : cfg;
    return Array.from({ length: count }, () =>
      COMMON_WORDS[Math.floor(Math.random() * COMMON_WORDS.length)]
    );
  }
  if (m === 'quote') {
    const list = QUOTES[cfg];
    const q = list[Math.floor(Math.random() * list.length)];
    return q.split(' ');
  }
  return [];
}

// ── RENDER WORDS ─────────────────────────────────────────
function renderWords() {
  wordsContainer.innerHTML = '';
  words.forEach((word, wIdx) => {
    const wordEl = document.createElement('div');
    wordEl.className = 'word';
    word.split('').forEach(ch => {
      const span = document.createElement('span');
      span.className = 'letter';
      span.textContent = ch;
      wordEl.appendChild(span);
    });
    wordsContainer.appendChild(wordEl);
  });
}

// ── SETTINGS BAR ─────────────────────────────────────────
function renderConfigButtons() {
  configGroup.innerHTML = '';
  MODE_CONFIGS[mode].forEach(val => {
    const btn = document.createElement('button');
    btn.className = 'settings-btn' + (val === config ? ' active' : '');
    btn.textContent = val;
    btn.addEventListener('click', () => {
      config = val;
      resetTest();
      renderConfigButtons();
    });
    configGroup.appendChild(btn);
  });
}

modeGroup.querySelectorAll('.settings-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    mode = btn.dataset.mode;
    const defaults = { time: 30, words: 25, quote: 'short' };
    config = defaults[mode];
    modeGroup.querySelectorAll('.settings-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    timerToggle.style.display = mode === 'time' ? 'flex' : 'none';
    renderConfigButtons();
    resetTest();
  });
});

// ── TIMER TOGGLE ─────────────────────────────────────────
timerToggle.addEventListener('click', () => {
  showTimer = !showTimer;
  updateTimerDisplay();
  if (showTimer) {
    timerToggleLabel.textContent = 'hide';
    timerToggleIcon.innerHTML = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`;
  } else {
    timerToggleLabel.textContent = 'show';
    timerToggleIcon.innerHTML = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
  }
});

function updateTimerDisplay() {
  if (mode !== 'time') {
    timerDisplay.textContent = '';
    timerDisplay.style.color = 'transparent';
    return;
  }
  if (!hasStarted) {
    timerDisplay.textContent = '';
    timerDisplay.style.color = 'transparent';
    return;
  }
  const val = showTimer ? timeLeft : '?';
  timerDisplay.textContent = val;
  const urgent = timeLeft <= 5;
  timerDisplay.style.color = urgent ? 'var(--incorrect)' : 'var(--gold)';
  timerDisplay.classList.toggle('urgent', urgent);
}

// ── CARET ─────────────────────────────────────────────────
function updateCaret() {
  if (!hasStarted || isFinished) return;
  const containerRect = wordsContainer.getBoundingClientRect();
  const currentWordEl = wordsContainer.children[wordIndex];
  if (!currentWordEl) return;
  const currentLetterEl = currentWordEl.children[letterIndex];
  if (currentLetterEl) {
    const r = currentLetterEl.getBoundingClientRect();
    caretEl.style.transform = `translate(${r.left - containerRect.left - 1}px, ${r.top - containerRect.top}px)`;
  } else {
    const last = currentWordEl.children[currentWordEl.children.length - 1];
    if (last) {
      const r = last.getBoundingClientRect();
      caretEl.style.transform = `translate(${r.right - containerRect.left}px, ${r.top - containerRect.top}px)`;
    }
  }
}

// ── PROGRESS ──────────────────────────────────────────────
function updateProgress() {
  const totalLetters = words.reduce((a, w) => a + w.length, 0);
  const typedLetters = words.slice(0, wordIndex).reduce((a, w) => a + w.length, 0) + letterIndex;
  progressFill.style.width = ((typedLetters / totalLetters) * 100) + '%';
}

// ── START ─────────────────────────────────────────────────
function handleStart() {
  hasStarted = true;
  startTime  = Date.now();
  timeLeft   = mode === 'time' ? config : null;

  startOverlay.style.display = 'none';
  wordsContainer.classList.remove('blurred');
  caretEl.style.display = 'block';
  liveStats.classList.add('visible');
  kbdHint.style.opacity = '0';
  updateTimerDisplay();
  updateCaret();
  hiddenInput.focus();
  hiddenInput.click();

  mainInterval = setInterval(() => {
    const elapsedMins = (Date.now() - startTime) / 60000;
    const currentWpm  = Math.round((correctChars / 5) / elapsedMins) || 0;
    const currentRaw  = Math.round((totalTyped   / 5) / elapsedMins) || 0;

    history.push({ second: history.length + 1, wpm: currentWpm, raw: currentRaw, errors });
    liveWpmVal = currentWpm;
    liveWpmEl.textContent = currentWpm;

    if (mode === 'time') {
      timeLeft--;
      updateTimerDisplay();
      if (timeLeft <= 0) endTest();
    }
  }, 1000);
}

startBtn.addEventListener('click', handleStart);
startBtn.addEventListener('touchend', (e) => { e.preventDefault(); handleStart(); });
document.getElementById('typingAreaWrap').addEventListener('click', () => {
  if (hasStarted && !isFinished) hiddenInput.focus();
});
document.getElementById('typingAreaWrap').addEventListener('touchend', (e) => {
  if (hasStarted && !isFinished) { e.preventDefault(); hiddenInput.focus(); }
});

// ── DETECT INPUT METHOD ───────────────────────────────────
// On mobile, keydown fires unreliably so we use the 'input' event.
// On desktop, keydown is authoritative. We use a flag so only ONE
// handler processes each keystroke — never both.
let keydownHandled = false;

// ── KEY HANDLER (desktop / physical keyboard) ─────────────
hiddenInput.addEventListener('keydown', e => {
  if (!hasStarted || isFinished) return;

  const { key } = e;
  const currentWordEl = wordsContainer.children[wordIndex];
  const targetWord    = words[wordIndex];
  if (!currentWordEl) return;

  // BACKSPACE
  if (key === 'Backspace') {
    keydownHandled = true;
    if (letterIndex > 0) {
      letterIndex--;
      const lEl = currentWordEl.children[letterIndex];
      if (lEl.classList.contains('correct')) correctChars--;
      lEl.className = 'letter';
      updateCaret();
      updateProgress();
    }
    return;
  }

  // SPACE — advance to next word
  if (key === ' ') {
    keydownHandled = true;
    e.preventDefault();
    if (letterIndex > 0) {
      for (let i = letterIndex; i < targetWord.length; i++) {
        currentWordEl.children[i].className = 'letter incorrect';
        errors++;
      }
      currentWordEl.classList.add('completed');
      setTimeout(() => currentWordEl.classList.remove('completed'), 200);

      wordIndex++;
      letterIndex = 0;
      totalTyped++;
      correctChars++;

      if (wordIndex >= words.length && mode !== 'time') { endTest(); return; }
      updateCaret();
      updateProgress();
    }
    return;
  }

  // REGULAR CHARACTER
  if (key.length === 1 && !e.ctrlKey && !e.metaKey) {
    keydownHandled = true;
    if (letterIndex >= targetWord.length) return;
    const lEl = currentWordEl.children[letterIndex];
    totalTyped++;
    if (key === targetWord[letterIndex]) {
      lEl.className = 'letter correct flash';
      setTimeout(() => lEl.classList.remove('flash'), 200);
      correctChars++;
    } else {
      lEl.className = 'letter incorrect';
      errors++;
    }
    letterIndex++;
    updateCaret();
    updateProgress();

    if (mode !== 'time' && wordIndex === words.length - 1 && letterIndex === targetWord.length) {
      endTest();
    }
  }
});

// ── MOBILE INPUT HANDLER (virtual keyboard fallback) ──────
// Only runs when keydown did NOT already handle the character.
let lastInputValue = '';
hiddenInput.addEventListener('input', e => {
  if (!hasStarted || isFinished) return;

  // If keydown already handled this, skip — reset flag and sync value
  if (keydownHandled) {
    keydownHandled = false;
    lastInputValue = hiddenInput.value;
    return;
  }

  const currentVal = hiddenInput.value;
  const diff = currentVal.length - lastInputValue.length;

  // Deletion (backspace on mobile)
  if (diff < 0) {
    const deleteCount = Math.abs(diff);
    for (let d = 0; d < deleteCount; d++) {
      if (letterIndex > 0) {
        letterIndex--;
        const currentWordEl = wordsContainer.children[wordIndex];
        const lEl = currentWordEl && currentWordEl.children[letterIndex];
        if (lEl) {
          if (lEl.classList.contains('correct')) correctChars--;
          lEl.className = 'letter';
        }
      }
    }
    updateCaret();
    updateProgress();
    lastInputValue = currentVal;
    return;
  }

  // New characters typed
  const newChars = currentVal.slice(lastInputValue.length);
  for (const ch of newChars) {
    const currentWordEl = wordsContainer.children[wordIndex];
    const targetWord    = words[wordIndex];
    if (!currentWordEl) break;

    // Space — advance word
    if (ch === ' ') {
      if (letterIndex > 0) {
        for (let i = letterIndex; i < targetWord.length; i++) {
          currentWordEl.children[i].className = 'letter incorrect';
          errors++;
        }
        currentWordEl.classList.add('completed');
        setTimeout(() => currentWordEl.classList.remove('completed'), 200);
        wordIndex++;
        letterIndex = 0;
        totalTyped++;
        correctChars++;
        if (wordIndex >= words.length && mode !== 'time') { endTest(); break; }
      }
    } else {
      // Regular char
      if (letterIndex < targetWord.length) {
        const lEl = currentWordEl.children[letterIndex];
        totalTyped++;
        if (ch === targetWord[letterIndex]) {
          lEl.className = 'letter correct flash';
          setTimeout(() => lEl.classList.remove('flash'), 200);
          correctChars++;
        } else {
          lEl.className = 'letter incorrect';
          errors++;
        }
        letterIndex++;
        if (mode !== 'time' && wordIndex === words.length - 1 && letterIndex === targetWord.length) {
          endTest(); break;
        }
      }
    }
  }

  updateCaret();
  updateProgress();
  lastInputValue = currentVal;

  // Keep input from growing too long to avoid browser auto-correct weirdness
  if (hiddenInput.value.length > 50) {
    hiddenInput.value = '';
    lastInputValue = '';
  }
});

// Tab+Enter to restart
document.addEventListener('keydown', e => {
  if (e.key === 'Tab') { e.preventDefault(); }
  if (e.key === 'Enter' && e.target !== startBtn) { resetTest(); }
});

// ── END TEST ──────────────────────────────────────────────
function endTest() {
  if (isFinished) return;
  isFinished = true;
  clearInterval(mainInterval);

  const durationMins = (Date.now() - startTime) / 60000;
  const wpm  = Math.round((correctChars / 5) / durationMins) || 0;
  const raw  = Math.round((totalTyped   / 5) / durationMins) || 0;
  const acc  = totalTyped > 0 ? Math.round(((totalTyped - errors) / totalTyped) * 100) : 0;
  const cons = Math.round(Math.max(0, 100 - (errors / Math.max(totalTyped, 1)) * 100));
  const time = Math.round(durationMins * 60);
  const hist = history.length > 0 ? history : [{ second: 1, wpm, raw, errors }];

  showDashboard({ wpm, acc, raw, cons, time, hist });
}

// ── GRADE ─────────────────────────────────────────────────
function getGrade(wpm, acc) {
  if (wpm >= 100 && acc >= 98) return { label: 'S+', color: '#e2b714' };
  if (wpm >= 80  && acc >= 96) return { label: 'S',  color: '#e2b714' };
  if (wpm >= 60  && acc >= 94) return { label: 'A',  color: '#4ade80' };
  if (wpm >= 40  && acc >= 90) return { label: 'B',  color: '#60a5fa' };
  if (wpm >= 25  && acc >= 85) return { label: 'C',  color: '#a78bfa' };
  return { label: 'D', color: '#f87171' };
}

// ── ANIMATED COUNTER ──────────────────────────────────────
function animateCount(el, target, suffix, duration) {
  let start = 0;
  const step = target / (duration / 16);
  const isHTML = el.innerHTML.includes('<');
  const timer = setInterval(() => {
    start += step;
    if (start >= target) {
      start = target;
      clearInterval(timer);
    }
    if (isHTML) {
      el.childNodes[0].nodeValue = Math.floor(start);
    } else {
      el.textContent = Math.floor(start) + (suffix || '');
    }
  }, 16);
}

// ── SHOW DASHBOARD ────────────────────────────────────────
function showDashboard(stats) {
  typingWrapper.style.display = 'none';
  dashboardWrap.classList.add('visible');

  const grade = getGrade(stats.wpm, stats.acc);

  // Animate big numbers
  const wpmEl = document.getElementById('dashWpm');
  const accEl = document.getElementById('dashAcc');
  wpmEl.textContent = '0';
  accEl.innerHTML   = '0<span class="stat-unit">%</span>';
  animateCount(wpmEl, stats.wpm, '', 1000);
  setTimeout(() => {
    let a = 0;
    const step = stats.acc / (900 / 16);
    const t = setInterval(() => {
      a += step;
      if (a >= stats.acc) { a = stats.acc; clearInterval(t); }
      accEl.innerHTML = Math.floor(a) + '<span class="stat-unit">%</span>';
    }, 16);
  }, 100);

  // Grade
  const gradeEl = document.getElementById('dashGrade');
  gradeEl.textContent = grade.label;
  gradeEl.style.color = grade.color;
  gradeEl.style.textShadow = `0 0 30px ${grade.color}60`;

  // Details
  document.getElementById('dashTestType').textContent  = `${mode} ${config}`;
  document.getElementById('dashRaw').textContent        = stats.raw;
  document.getElementById('dashChars').textContent      = `${correctChars}/${errors}/0/0`;
  document.getElementById('dashConsistency').innerHTML  = stats.cons + '<span style="font-size:1rem;color:var(--text-secondary)">%</span>';
  document.getElementById('dashTime').innerHTML         = stats.time + '<span style="font-size:1rem;color:var(--text-secondary)">s</span>';

  // Average WPM reference
  const avgWpm = stats.hist.length > 0
    ? Math.round(stats.hist.reduce((a, b) => a + b.wpm, 0) / stats.hist.length)
    : stats.wpm;

  // Chart
  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
  const ctx = document.getElementById('wpmChart').getContext('2d');
  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: stats.hist.map(h => h.second),
      datasets: [
        {
          label: 'raw',
          data: stats.hist.map(h => h.raw),
          borderColor: '#646669',
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0.4,
          fill: false
        },
        {
          label: 'wpm',
          data: stats.hist.map(h => h.wpm),
          borderColor: '#e2b714',
          borderWidth: 2.5,
          pointRadius: 3,
          pointBackgroundColor: '#13151a',
          pointBorderColor: '#e2b714',
          pointBorderWidth: 1.5,
          tension: 0.4,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 1400, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1a1d24',
          borderColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1,
          titleColor: '#646669',
          bodyColor: '#d1d0c5',
          titleFont: { family: "'JetBrains Mono', monospace", size: 11 },
          bodyFont:  { family: "'JetBrains Mono', monospace", size: 12 },
          padding: 10,
          callbacks: {
            title: items => `second ${items[0].label}`
          }
        },
        annotation: undefined
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
          ticks: { color: '#646669', font: { family: "'JetBrains Mono', monospace", size: 11 } }
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
          ticks: { color: '#646669', font: { family: "'JetBrains Mono', monospace", size: 11 } }
        }
      }
    }
  });
}

// ── RESTART ───────────────────────────────────────────────
function resetTest() {
  clearInterval(mainInterval);

  // Reset state
  hasStarted   = false;
  isFinished   = false;
  wordIndex    = 0;
  letterIndex  = 0;
  startTime    = null;
  totalTyped   = 0;
  errors       = 0;
  correctChars = 0;
  history      = [];
  liveWpmVal   = 0;
  timeLeft     = mode === 'time' ? config : null;

  // Reset UI
  typingWrapper.style.display  = 'block';
  dashboardWrap.classList.remove('visible');
  startOverlay.style.display   = 'flex';
  wordsContainer.classList.add('blurred');
  caretEl.style.display        = 'none';
  liveStats.classList.remove('visible');
  liveWpmEl.textContent        = '0';
  progressFill.style.width     = '0%';
  kbdHint.style.opacity        = '1';

  timerDisplay.textContent = '';
  timerDisplay.style.color = 'transparent';

  // Regenerate words
  words = generateContent(mode, config);
  renderWords();
  updateProgress();

  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
  lastInputValue = '';
  hiddenInput.value = '';
}

document.getElementById('restartBtn').addEventListener('click', resetTest);
document.getElementById('shareBtn').addEventListener('click', () => {
  const wpm = document.getElementById('dashWpm').textContent;
  const acc = document.getElementById('dashAcc').textContent;
  const text = `I just scored ${wpm} WPM with ${acc} accuracy on Keyflow! 🎯`;
  navigator.clipboard?.writeText(text).then(() => {
    const btn = document.getElementById('shareBtn');
    btn.innerHTML = btn.innerHTML.replace('share result', 'copied!');
    setTimeout(() => { btn.innerHTML = btn.innerHTML.replace('copied!', 'share result'); }, 2000);
  });
});

// ── RESIZE CARET ─────────────────────────────────────────
window.addEventListener('resize', updateCaret);

// ── BOOT ─────────────────────────────────────────────────
function boot() {
  words = generateContent(mode, config);
  renderWords();
  renderConfigButtons();
  timerToggle.style.display = mode === 'time' ? 'flex' : 'none';
  updateTimerDisplay();
  updateProgress();
}

boot();