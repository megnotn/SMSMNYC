/* ==========================================================
   MORE THAN CONQUERORS — App Logic
   Vanilla JS, no build step. Works straight from GitHub Pages.
   ========================================================== */

const STORAGE_KEY = "mtc_progress_v1";

function loadProgress(){
  try{ return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch(e){ return {}; }
}
function saveProgress(){
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); }catch(e){/* ignore */}
}
let progress = loadProgress();
// progress[day] = { flashSeen:bool, quizBest:{score,total}, quizDone:bool }

function getDayProgress(day){
  if(!progress[day]) progress[day] = { flashSeen:false, quizBest:null, quizDone:false };
  return progress[day];
}

function isDayCompleted(day){
  const p = progress[day];
  return !!(p && p.quizDone);
}

let currentDay = null;
let currentTab = "lesson";

// ---------------- HOME VIEW ----------------
function showHome(){
  document.getElementById("homeView").style.display = "";
  document.getElementById("dayView").style.display = "none";
  renderHome();
  window.scrollTo(0,0);
}

function renderHome(){
  const totalDays = STUDY_DATA.length;
  const completed = STUDY_DATA.filter(d => isDayCompleted(d.day)).length;
  document.getElementById("overallBar").style.width = Math.round((completed/totalDays)*100) + "%";
  document.getElementById("overallText").textContent = `${completed} of ${totalDays} days completed`;

  const weeks = {};
  STUDY_DATA.forEach(d => {
    if(!weeks[d.week]) weeks[d.week] = [];
    weeks[d.week].push(d);
  });

  const container = document.getElementById("weeksContainer");
  container.innerHTML = "";
  Object.keys(weeks).forEach(weekName => {
    const block = document.createElement("div");
    block.className = "week-block";
    const title = document.createElement("div");
    title.className = "week-title";
    title.textContent = weekName;
    block.appendChild(title);

    const grid = document.createElement("div");
    grid.className = "day-grid";

    weeks[weekName].forEach(d => {
      const card = document.createElement("div");
      const done = isDayCompleted(d.day);
      card.className = "day-card" + (done ? " completed" : "");
      const p = getDayProgress(d.day);
      const quizPct = p.quizBest ? Math.round((p.quizBest.score / p.quizBest.total) * 100) : 0;

      card.innerHTML = `
        <div class="day-card-top">
          <span class="day-label">${d.weekday}</span>
          ${done ? '<span class="day-check">✓</span>' : ''}
        </div>
        <div class="day-topic">${d.topic}</div>
        <div class="day-meta">
          <span>📘 ${d.workbookRange}</span>
          <span>⏱ ${d.time}</span>
        </div>
        <div class="day-mini-progress"><div class="day-mini-progress-inner" style="width:${quizPct}%"></div></div>
      `;
      card.onclick = () => openDay(d.day);
      grid.appendChild(card);
    });

    block.appendChild(grid);
    container.appendChild(block);
  });
}

// ---------------- DAY VIEW ----------------
function openDay(dayNum){
  currentDay = dayNum;
  document.getElementById("homeView").style.display = "none";
  document.getElementById("dayView").style.display = "";
  renderDayHeader();
  switchTab("lesson");
  window.scrollTo(0,0);
}

function getDay(dayNum){
  return STUDY_DATA.find(d => d.day === dayNum);
}

function renderDayHeader(){
  const d = getDay(currentDay);
  document.getElementById("dayHeader").innerHTML = `
    <div class="day-header-box">
      <div class="day-header-eyebrow">${d.week} · ${d.weekday}</div>
      <div class="day-header-title">${d.topic}</div>
      <div class="day-header-tags">
        <span>📘 Workbook ${d.workbookRange}</span>
        <span>📖 Bible: ${d.bible}</span>
        <span>⏱ ${d.time}</span>
      </div>
    </div>
  `;
}

function switchTab(tab){
  currentTab = tab;
  document.querySelectorAll(".tab-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.tab === tab);
  });
  ["lesson","flashcards","quiz"].forEach(t => {
    document.getElementById("tab-" + t).style.display = (t === tab) ? "" : "none";
  });
  if(tab === "lesson") renderLesson();
  if(tab === "flashcards") renderFlashcards();
  if(tab === "quiz") renderQuiz();
}

// ---------------- LESSON ----------------
function renderLesson(){
  const d = getDay(currentDay);
  const el = document.getElementById("tab-lesson");
  el.innerHTML = `
    <div class="lesson-card">
      <h3>Lesson of the Day</h3>
      <p>${d.summary}</p>
    </div>
  `;
}

// ---------------- FLASHCARDS ----------------
let flashOrder = [];
let flashIndex = 0;
let flashFlipped = false;

function shuffleArray(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}

function renderFlashcards(){
  const d = getDay(currentDay);
  const el = document.getElementById("tab-flashcards");
  if(!d.flashcards || d.flashcards.length === 0){
    el.innerHTML = `<p style="color:var(--muted)">No flashcards for this day.</p>`;
    return;
  }
  if(flashOrder.length === 0 || flashOrder._day !== currentDay){
    flashOrder = shuffleArray(d.flashcards.map((_,i)=>i));
    flashOrder._day = currentDay;
    flashIndex = 0;
    flashFlipped = false;
  }
  drawFlashcard();
}

function drawFlashcard(){
  const d = getDay(currentDay);
  const el = document.getElementById("tab-flashcards");
  const cardIdx = flashOrder[flashIndex];
  const card = d.flashcards[cardIdx];

  el.innerHTML = `
    <div class="flash-controls">
      <div class="flash-counter">Card ${flashIndex+1} of ${flashOrder.length}</div>
      <div class="flash-btn-row">
        <button class="small-btn secondary" onclick="reshuffleFlashcards()">🔀 Shuffle</button>
      </div>
    </div>
    <div class="flash-hint">Tap the card to flip it</div>
    <div class="flashcard-wrap">
      <div class="flashcard ${flashFlipped ? 'flipped' : ''}" id="flashcardEl">
        <div class="flash-face flash-front">${card.term}</div>
        <div class="flash-face flash-back">${card.def}</div>
      </div>
    </div>
    <div class="flash-nav">
      <button class="small-btn secondary" onclick="prevFlashcard()">← Prev</button>
      <button class="small-btn" onclick="nextFlashcard()">Next →</button>
    </div>
  `;
  document.getElementById("flashcardEl").onclick = () => {
    flashFlipped = !flashFlipped;
    document.getElementById("flashcardEl").classList.toggle("flipped", flashFlipped);
  };

  getDayProgress(currentDay).flashSeen = true;
  saveProgress();
}

function nextFlashcard(){
  flashFlipped = false;
  flashIndex = (flashIndex + 1) % flashOrder.length;
  drawFlashcard();
}
function prevFlashcard(){
  flashFlipped = false;
  flashIndex = (flashIndex - 1 + flashOrder.length) % flashOrder.length;
  drawFlashcard();
}
function reshuffleFlashcards(){
  flashOrder = shuffleArray(flashOrder);
  flashIndex = 0;
  flashFlipped = false;
  drawFlashcard();
}

// ---------------- QUIZ ----------------
let quizIndex = 0;
let quizScore = 0;
let quizAnswered = false;
let quizSelected = [];
let quizSet = [];

function renderQuiz(){
  const d = getDay(currentDay);
  if(quizSet.length === 0 || quizSet._day !== currentDay){
    quizSet = d.quiz.slice();
    quizSet._day = currentDay;
    quizIndex = 0;
    quizScore = 0;
    quizAnswered = false;
    quizSelected = [];
  }
  drawQuiz();
}

function drawQuiz(){
  const el = document.getElementById("tab-quiz");
  if(quizIndex >= quizSet.length){
    const total = quizSet.length;
    const pct = Math.round((quizScore/total)*100);
    getDayProgress(currentDay).quizBest = { score: quizScore, total: total };
    getDayProgress(currentDay).quizDone = true;
    saveProgress();

    el.innerHTML = `
      <div class="quiz-card quiz-result">
        <div class="score">${quizScore}/${total}</div>
        <div class="score-sub">${pct}% correct</div>
        <button class="small-btn" onclick="retakeQuiz()">↻ Retake Quiz</button>
        <button class="small-btn secondary" onclick="showHome()">Back to All Days</button>
      </div>
    `;
    return;
  }

  const q = quizSet[quizIndex];
  quizSelected = [];
  quizAnswered = false;

  el.innerHTML = `
    <div class="quiz-progress">Question ${quizIndex+1} of ${quizSet.length} &nbsp;•&nbsp; Score so far: ${quizScore}</div>
    <div class="quiz-card">
      <div class="quiz-question">Q${q.num}. ${q.q}</div>
      ${q.multi ? '<div class="multi-hint">Select all that apply, then submit.</div>' : ''}
      <div id="optionsWrap"></div>
      <div id="explainWrap"></div>
      <div class="quiz-actions">
        <button id="quizActionBtn" class="quiz-nextbtn" disabled>${q.multi ? 'Submit' : 'Select an answer'}</button>
      </div>
    </div>
  `;

  const wrap = document.getElementById("optionsWrap");
  q.options.forEach((opt, idx) => {
    const btn = document.createElement("button");
    btn.className = "quiz-option";
    btn.textContent = String.fromCharCode(97+idx) + ". " + opt;
    btn.onclick = () => selectOption(idx, q);
    wrap.appendChild(btn);
  });

  document.getElementById("quizActionBtn").onclick = () => handleQuizAction(q);
}

function selectOption(idx, q){
  if(quizAnswered) return;
  const opts = document.querySelectorAll("#optionsWrap .quiz-option");

  if(q.multi){
    const pos = quizSelected.indexOf(idx);
    if(pos === -1) quizSelected.push(idx); else quizSelected.splice(pos,1);
    opts.forEach((o,i) => o.classList.toggle("selected", quizSelected.includes(i)));
    document.getElementById("quizActionBtn").disabled = quizSelected.length === 0;
  } else {
    quizSelected = [idx];
    opts.forEach((o,i) => o.classList.toggle("selected", i===idx));
    document.getElementById("quizActionBtn").disabled = false;
    document.getElementById("quizActionBtn").textContent = "Check Answer";
  }
}

function handleQuizAction(q){
  const btn = document.getElementById("quizActionBtn");
  if(!quizAnswered){
    // grade it
    quizAnswered = true;
    const correctSet = q.correct.slice().sort().join(",");
    const chosenSet = quizSelected.slice().sort().join(",");
    const isCorrect = correctSet === chosenSet;
    if(isCorrect) quizScore++;

    const opts = document.querySelectorAll("#optionsWrap .quiz-option");
    opts.forEach((o,i) => {
      o.classList.remove("selected");
      if(q.correct.includes(i)) o.classList.add("correct");
      else if(quizSelected.includes(i)) o.classList.add("incorrect");
      o.onclick = null;
    });

    document.getElementById("explainWrap").innerHTML = `
      <div class="quiz-explain ${isCorrect ? 'correct' : 'incorrect'}">
        <strong>${isCorrect ? '✅ Correct!' : '❌ Not quite.'}</strong> ${q.explain}
      </div>
    `;
    btn.textContent = (quizIndex === quizSet.length-1) ? "See Results" : "Next Question →";
    btn.disabled = false;
  } else {
    quizIndex++;
    drawQuiz();
  }
}

function retakeQuiz(){
  quizSet = [];
  renderQuiz();
}

// ---------------- INIT ----------------
document.addEventListener("DOMContentLoaded", () => {
  showHome();
});
