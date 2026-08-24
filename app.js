/* ==========================================================
   MORE THAN CONQUERORS — App Logic
   Vanilla JS, no build step. Works straight from GitHub Pages.
   ========================================================== */

// ---- Set this to the real Monday your group starts Week 1 ----
// Format: YYYY-MM-DD. Weeks unlock one at a time based on this date.
const START_DATE = "2026-08-24";

const NAME_KEY = "mtc_name";
const PROGRESS_KEY = "mtc_progress_v2";

// ---------------- Storage helpers ----------------
function loadProgress(){
  try{
    const p = JSON.parse(localStorage.getItem(PROGRESS_KEY));
    if(p && p.days && p.exams) return p;
  }catch(e){/* ignore */}
  return { days:{}, exams:{} };
}
function saveProgress(){ try{ localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress)); }catch(e){} }
var progress = loadProgress();

function dayProg(dayNum){
  if(!progress.days[dayNum]) progress.days[dayNum] = { lessonDone:false, flashDone:false, quizDone:false, quizScore:null };
  return progress.days[dayNum];
}
function examProg(weekNum){
  return progress.exams[weekNum] || null;
}

function getName(){ return localStorage.getItem(NAME_KEY) || ""; }
function setName(n){ localStorage.setItem(NAME_KEY, n); }

// ---------------- Week unlocking (by calendar date) ----------------
function weekdaysBetween(startISO, endDate){
  const start = new Date(startISO + "T00:00:00");
  if(endDate < start) return -1;
  let d = new Date(start);
  let count = 0;
  while(d < endDate){
    d.setDate(d.getDate()+1);
    if(d.getDay() !== 0 && d.getDay() !== 6) count++;
  }
  return count;
}
function currentUnlockedWeek(){
  const elapsed = weekdaysBetween(START_DATE, new Date());
  if(elapsed < 0) return 1; // before start date, allow week 1 early
  return Math.min(4, Math.floor(elapsed/5) + 1);
}
function isWeekUnlocked(weekNum){ return weekNum <= currentUnlockedWeek(); }

// ---------------- Points ----------------
function dayPoints(dayNum){
  const p = dayProg(dayNum);
  let pts = 0;
  if(p.lessonDone) pts += POINTS_CONFIG.lesson;
  if(p.flashDone) pts += POINTS_CONFIG.flashcards;
  if(p.quizDone) pts += POINTS_CONFIG.dailyQuiz;
  return pts;
}
function examPoints(weekNum){
  const e = examProg(weekNum);
  if(!e || !e.done) return 0;
  return POINTS_CONFIG.examComplete + (e.score * POINTS_CONFIG.examBonusPerCorrect);
}
function weekPoints(weekNum){
  const days = STUDY_DATA.filter(d => d.weekNum === weekNum);
  let pts = days.reduce((sum,d) => sum + dayPoints(d.day), 0);
  pts += examPoints(weekNum);
  return pts;
}
function totalPoints(){
  let pts = 0;
  for(let w=1; w<=4; w++) pts += weekPoints(w);
  return pts;
}
function daysCompletedCount(){
  return STUDY_DATA.filter(d => dayProg(d.day).quizDone).length;
}
function currentStreak(){
  let streak = 0;
  for(const d of STUDY_DATA){
    if(dayProg(d.day).quizDone) streak++; else break;
  }
  return streak;
}
function examAverage(){
  const scores = [];
  for(let w=1; w<=4; w++){
    const e = examProg(w);
    if(e && e.done) scores.push(e.score);
  }
  if(scores.length === 0) return null;
  return (scores.reduce((a,b)=>a+b,0) / scores.length);
}

// ---------------- Nickname modal ----------------
function initNameModal(){
  const name = getName();
  if(!name){
    document.getElementById("nameModal").style.display = "flex";
  }
  updateGreeting();
}
function saveName(){
  const val = document.getElementById("nameInput").value.trim();
  if(!val) return;
  setName(val);
  document.getElementById("nameModal").style.display = "none";
  updateGreeting();
  renderCurrentView();
}
function updateGreeting(){
  const name = getName();
  document.getElementById("greetingBadge").textContent = name ? `👋 ${name} · ${totalPoints()} pts` : "Set your name";
}

// ---------------- View switching ----------------
var currentView = "home";
function showView(view){
  currentView = view;
  ["home","day","review","exam","scorecard"].forEach(v => {
    document.getElementById(v + "View").style.display = (v === view) ? "" : "none";
  });
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.view === view));
  renderCurrentView();
  window.scrollTo(0,0);
}
function renderCurrentView(){
  updateGreeting();
  if(currentView === "home") renderHome();
  if(currentView === "review") renderReview();
  if(currentView === "exam") renderExamList();
  if(currentView === "scorecard") renderScorecard();
}

// ================================================================
// HOME VIEW
// ================================================================
function renderHome(){
  const totalDays = STUDY_DATA.length;
  const completed = daysCompletedCount();
  document.getElementById("overallBar").style.width = Math.round((completed/totalDays)*100) + "%";
  document.getElementById("overallText").textContent = `${completed} of ${totalDays} days completed`;

  // Today card = first not-yet-completed day that is in an unlocked week
  const unlockedWeek = currentUnlockedWeek();
  let todayDay = STUDY_DATA.find(d => d.weekNum <= unlockedWeek && !dayProg(d.day).quizDone);
  if(!todayDay) todayDay = STUDY_DATA[STUDY_DATA.length-1]; // everything done

  const wrap = document.getElementById("todayCardWrap");
  if(completed === totalDays){
    wrap.innerHTML = `
      <div class="today-card">
        <div class="eyebrow">All Done!</div>
        <h2>You finished all 20 days 🎉</h2>
        <div class="btn-row">
          <button onclick="showView('exam')">Go to Exam Prep</button>
          <button onclick="showView('scorecard')">View Scorecard</button>
        </div>
      </div>`;
  } else {
    wrap.innerHTML = `
      <div class="today-card">
        <div class="eyebrow">${todayDay.week} · ${todayDay.weekday}</div>
        <h2>${todayDay.topic}</h2>
        <div class="btn-row">
          <button onclick="openDay(${todayDay.day})">Start Today's Study →</button>
        </div>
      </div>`;
  }

  const weeks = {};
  STUDY_DATA.forEach(d => { (weeks[d.weekNum] = weeks[d.weekNum] || []).push(d); });

  const container = document.getElementById("weeksContainer");
  container.innerHTML = "";
  Object.keys(weeks).sort((a,b)=>a-b).forEach(wkNum => {
    const wk = parseInt(wkNum);
    const unlocked = isWeekUnlocked(wk);
    const block = document.createElement("div");
    block.className = "week-block";

    const titleRow = document.createElement("div");
    titleRow.className = "week-title-row";
    titleRow.innerHTML = `
      <span class="week-title">Week ${wk}</span>
      ${unlocked ? "" : '<span class="week-lock-tag">🔒 Unlocks later</span>'}
    `;
    block.appendChild(titleRow);

    const grid = document.createElement("div");
    grid.className = "day-grid";

    weeks[wkNum].forEach(d => {
      const done = dayProg(d.day).quizDone;
      const card = document.createElement("div");
      card.className = "day-card" + (done ? " completed" : "") + (unlocked ? "" : " locked");
      const quizScore = dayProg(d.day).quizScore;
      const pct = quizScore ? Math.round((quizScore.score/quizScore.total)*100) : 0;

      card.innerHTML = `
        <div class="day-card-top">
          <span class="day-label">${d.weekday}</span>
          ${done ? '<span class="day-check">✓</span>' : (unlocked ? '' : '<span>🔒</span>')}
        </div>
        <div class="day-topic">${d.topic}</div>
        <div class="day-meta">
          <span>📘 ${d.workbookRange}</span>
          <span>⏱ ${d.time}</span>
        </div>
        <div class="day-mini-progress"><div class="day-mini-progress-inner" style="width:${pct}%"></div></div>
      `;
      if(unlocked) card.onclick = () => openDay(d.day);
      grid.appendChild(card);
    });

    block.appendChild(grid);
    container.appendChild(block);
  });
}

// ================================================================
// DAY VIEW (Lesson / Flashcards / Daily Quiz)
// ================================================================
var currentDay = null;
var currentTab = "lesson";

function openDay(dayNum){
  currentDay = dayNum;
  showView("day");
  renderDayHeader();
  switchTab("lesson");
}
function getDay(dayNum){ return STUDY_DATA.find(d => d.day === dayNum); }

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
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  ["lesson","flashcards","quiz"].forEach(t => {
    document.getElementById("tab-" + t).style.display = (t === tab) ? "" : "none";
  });
  if(tab === "lesson") renderLesson();
  if(tab === "flashcards") renderFlashcards();
  if(tab === "quiz") renderDailyQuiz();
}

function renderLesson(){
  const d = getDay(currentDay);
  const p = dayProg(currentDay);
  if(!p.lessonDone){ p.lessonDone = true; saveProgress(); updateGreeting(); }
  document.getElementById("tab-lesson").innerHTML = `
    <div class="lesson-card">
      <h3>Lesson of the Day</h3>
      <p>${d.summary}</p>
      <div class="lesson-complete-note">✓ Lesson marked complete (+${POINTS_CONFIG.lesson} pts)</div>
    </div>
  `;
}

// ---- Flashcards ----
var flashOrder = [], flashIndex = 0, flashFlipped = false;
function shuffleArray(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
}
function renderFlashcards(){
  const d = getDay(currentDay);
  const el = document.getElementById("tab-flashcards");
  if(!d.flashcards || d.flashcards.length === 0){
    el.innerHTML = `<p style="color:var(--muted)">No flashcards for this day.</p>`; return;
  }
  if(flashOrder.length === 0 || flashOrder._day !== currentDay){
    flashOrder = shuffleArray(d.flashcards.map((_,i)=>i));
    flashOrder._day = currentDay; flashIndex = 0; flashFlipped = false;
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
      <div class="flash-btn-row"><button class="small-btn secondary" onclick="reshuffleFlashcards()">🔀 Shuffle</button></div>
    </div>
    <div class="flash-hint">Tap the card to flip it</div>
    <div class="flashcard-wrap">
      <div class="flashcard ${flashFlipped?'flipped':''}" id="flashcardEl">
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
  const p = dayProg(currentDay);
  if(!p.flashDone){ p.flashDone = true; saveProgress(); updateGreeting(); }
}
function nextFlashcard(){ flashFlipped=false; flashIndex=(flashIndex+1)%flashOrder.length; drawFlashcard(); }
function prevFlashcard(){ flashFlipped=false; flashIndex=(flashIndex-1+flashOrder.length)%flashOrder.length; drawFlashcard(); }
function reshuffleFlashcards(){ flashOrder=shuffleArray(flashOrder); flashIndex=0; flashFlipped=false; drawFlashcard(); }

// ---- Daily Quiz (repeatable practice, auto-generated questions) ----
var dqIndex = 0, dqScore = 0, dqAnswered = false, dqSelected = [], dqSet = [];
function renderDailyQuiz(){
  const d = getDay(currentDay);
  if(dqSet.length === 0 || dqSet._day !== currentDay){
    dqSet = d.dailyQuiz.slice(); dqSet._day = currentDay;
    dqIndex = 0; dqScore = 0; dqAnswered = false;
  }
  drawDailyQuiz();
}
function drawDailyQuiz(){
  const el = document.getElementById("tab-quiz");
  if(dqSet.length === 0){
    el.innerHTML = `<p style="color:var(--muted)">No daily quiz for this day.</p>`; return;
  }
  if(dqIndex >= dqSet.length){
    const total = dqSet.length;
    const p = dayProg(currentDay);
    p.quizDone = true;
    p.quizScore = { score: dqScore, total: total };
    saveProgress();
    el.innerHTML = `
      <div class="quiz-card quiz-result">
        <div class="score">${dqScore}/${total}</div>
        <div class="score-sub">Daily Quiz complete (+${POINTS_CONFIG.dailyQuiz} pts)</div>
        <button class="small-btn" onclick="retakeDailyQuiz()">↻ Practice Again</button>
        <button class="small-btn secondary" onclick="showView('home')">Back to All Days</button>
      </div>`;
    updateGreeting();
    return;
  }
  const q = dqSet[dqIndex];
  dqSelected = []; dqAnswered = false;
  el.innerHTML = `
    <div class="quiz-progress">Question ${dqIndex+1} of ${dqSet.length} &nbsp;•&nbsp; Score so far: ${dqScore}</div>
    <div class="quiz-card">
      <div class="quiz-question">${q.q}</div>
      <div id="dqOptionsWrap"></div>
      <div id="dqExplainWrap"></div>
      <div class="quiz-actions"><button id="dqActionBtn" class="quiz-nextbtn" disabled>Select an answer</button></div>
    </div>`;
  const wrap = document.getElementById("dqOptionsWrap");
  q.options.forEach((opt, idx) => {
    const btn = document.createElement("button");
    btn.className = "quiz-option";
    btn.textContent = String.fromCharCode(97+idx) + ". " + opt;
    btn.onclick = () => selectDQOption(idx);
    wrap.appendChild(btn);
  });
  document.getElementById("dqActionBtn").onclick = () => handleDQAction(q);
}
function selectDQOption(idx){
  if(dqAnswered) return;
  dqSelected = [idx];
  document.querySelectorAll("#dqOptionsWrap .quiz-option").forEach((o,i)=>o.classList.toggle("selected", i===idx));
  const btn = document.getElementById("dqActionBtn");
  btn.disabled = false; btn.textContent = "Check Answer";
}
function handleDQAction(q){
  const btn = document.getElementById("dqActionBtn");
  if(!dqAnswered){
    dqAnswered = true;
    const isCorrect = q.correct.includes(dqSelected[0]);
    if(isCorrect) dqScore++;
    document.querySelectorAll("#dqOptionsWrap .quiz-option").forEach((o,i)=>{
      o.classList.remove("selected");
      if(q.correct.includes(i)) o.classList.add("correct");
      else if(dqSelected.includes(i)) o.classList.add("incorrect");
      o.onclick = null;
    });
    document.getElementById("dqExplainWrap").innerHTML = `
      <div class="quiz-explain ${isCorrect?'correct':'incorrect'}"><strong>${isCorrect?'✅ Correct!':'❌ Not quite.'}</strong> ${q.explain}</div>`;
    btn.textContent = (dqIndex === dqSet.length-1) ? "See Results" : "Next Question →";
    btn.disabled = false;
  } else {
    dqIndex++; drawDailyQuiz();
  }
}
function retakeDailyQuiz(){ dqSet = []; renderDailyQuiz(); }

// ================================================================
// REVIEW VIEW
// ================================================================
var reviewWeek = 1;
function renderReview(){
  const picker = document.getElementById("reviewWeekPicker");
  picker.innerHTML = "";
  for(let w=1; w<=4; w++){
    const btn = document.createElement("button");
    btn.className = "week-pill" + (w === reviewWeek ? " active" : "");
    btn.textContent = "Week " + w;
    btn.onclick = () => { reviewWeek = w; renderReview(); };
    picker.appendChild(btn);
  }
  const days = STUDY_DATA.filter(d => d.weekNum === reviewWeek);
  const content = document.getElementById("reviewContent");
  content.innerHTML = "";
  days.forEach(d => {
    const block = document.createElement("div");
    block.className = "review-day-block";
    const flashChips = d.flashcards.map(f => `<div class="review-flash-chip"><b>${f.term}</b>${f.def}</div>`).join("");
    const qId = `qs-${d.day}`;
    const qList = d.workbookQuestions.map(q => {
      const letters = q.correct.map(c => String.fromCharCode(97+c).toUpperCase()).join(", ");
      const correctText = q.correct.map(c => q.options[c]).join(" / ");
      return `<div class="review-q"><div class="qtext">Q${q.num}. ${q.q}</div><div class="qans">✓ ${letters}: ${correctText}</div></div>`;
    }).join("");

    block.innerHTML = `
      <div class="review-day-title">${d.weekday} — ${d.topic}</div>
      <div class="review-day-summary">${d.summary}</div>
      <div class="review-sub-title">Key Flashcards</div>
      <div class="review-flash-row">${flashChips || '<span style="color:var(--muted); font-size:13px;">None</span>'}</div>
      <button class="review-toggle" onclick="toggleReviewQs('${qId}')">Show/hide workbook questions &amp; answers (${d.workbookQuestions.length})</button>
      <div id="${qId}" style="display:none; margin-top:8px;">${qList}</div>
    `;
    content.appendChild(block);
  });
}
function toggleReviewQs(id){
  const el = document.getElementById(id);
  el.style.display = el.style.display === "none" ? "" : "none";
}

// ================================================================
// EXAM VIEW (weekly, real workbook questions, one attempt)
// ================================================================
function renderExamList(){
  document.getElementById("examRunner").style.display = "none";
  document.getElementById("examWeekList").style.display = "";
  const wrap = document.getElementById("examWeekList");
  wrap.innerHTML = "";
  WEEKS_DATA.forEach(w => {
    const unlocked = isWeekUnlocked(w.weekNum);
    const attempt = examProg(w.weekNum);
    const card = document.createElement("div");
    card.className = "exam-week-card" + (unlocked ? "" : " locked");
    let statusHtml, actionHtml;
    if(!unlocked){
      statusHtml = `<span class="exam-status-pill locked">🔒 Locked</span>`;
      actionHtml = "";
    } else if(attempt && attempt.done){
      statusHtml = `<span class="exam-status-pill done">✓ ${attempt.score}/${attempt.total}</span>`;
      actionHtml = `<button class="small-btn secondary" onclick="reviewExam(${w.weekNum})">Review Answers</button>`;
    } else {
      statusHtml = `<span class="exam-status-pill ready">Ready</span>`;
      actionHtml = `<button class="small-btn" onclick="startExam(${w.weekNum})">Start Exam</button>`;
    }
    card.innerHTML = `
      <div>
        <div class="exam-week-title">Week ${w.weekNum} Exam</div>
        <div class="exam-week-sub">15 questions · ${w.topics[0]} → ${w.topics[w.topics.length-1]}</div>
      </div>
      <div style="display:flex; align-items:center; gap:10px;">${statusHtml}${actionHtml}</div>
    `;
    wrap.appendChild(card);
  });
}

var examState = null; // { week, questions, index, answers[], score, mode: 'take'|'review' }

function pickRandomExamQuestions(weekNum){
  const pool = WEEKS_DATA.find(w => w.weekNum === weekNum).examPool;
  const n = Math.min(POINTS_CONFIG.examMaxQuestions, pool.length);
  const shuffled = pool.slice().sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function startExam(weekNum){
  if(examProg(weekNum) && examProg(weekNum).done){ reviewExam(weekNum); return; }
  const questions = pickRandomExamQuestions(weekNum);
  examState = { week: weekNum, questions: questions, index: 0, answers: new Array(questions.length).fill(null), score: 0, mode: "take" };
  document.getElementById("examWeekList").style.display = "none";
  const runner = document.getElementById("examRunner");
  runner.style.display = "";
  runner.innerHTML = `<div class="exam-warning">⚠️ You only get <strong>one attempt</strong> at the Week ${weekNum} exam. Make sure you're ready before you pick an answer.</div><div id="examBody"></div>`;
  drawExamQuestion();
}

function drawExamQuestion(){
  const body = document.getElementById("examBody");
  const st = examState;
  if(st.index >= st.questions.length){ finishExam(); return; }
  const q = st.questions[st.index];
  const selected = st.answers[st.index] || [];
  body.innerHTML = `
    <div class="quiz-progress">Week ${st.week} Exam — Question ${st.index+1} of ${st.questions.length}</div>
    <div class="quiz-card">
      <div class="quiz-question">${q.q}</div>
      ${q.multi ? '<div class="multi-hint">Select all that apply.</div>' : ''}
      <div id="examOptionsWrap"></div>
      <div class="quiz-actions">
        <button id="examBackBtn" class="small-btn secondary" ${st.index===0?'disabled':''} onclick="examGoBack()">← Back</button>
        <button id="examNextBtn" class="quiz-nextbtn" ${selected.length===0?'disabled':''} onclick="examGoNext()">${st.index===st.questions.length-1?'Submit Exam':'Next →'}</button>
      </div>
    </div>`;
  const wrap = document.getElementById("examOptionsWrap");
  q.options.forEach((opt, idx) => {
    const btn = document.createElement("button");
    btn.className = "quiz-option" + (selected.includes(idx) ? " selected" : "");
    btn.textContent = String.fromCharCode(97+idx) + ". " + opt;
    btn.onclick = () => examSelectOption(idx, q);
    wrap.appendChild(btn);
  });
}
function examSelectOption(idx, q){
  const st = examState;
  let sel = st.answers[st.index] || [];
  if(q.multi){
    const pos = sel.indexOf(idx);
    if(pos === -1) sel.push(idx); else sel.splice(pos,1);
  } else {
    sel = [idx];
  }
  st.answers[st.index] = sel;
  drawExamQuestion();
}
function examGoBack(){ examState.index--; drawExamQuestion(); }
function examGoNext(){ examState.index++; drawExamQuestion(); }

function finishExam(){
  const st = examState;
  let score = 0;
  st.questions.forEach((q, i) => {
    const chosen = (st.answers[i] || []).slice().sort().join(",");
    const correct = q.correct.slice().sort().join(",");
    if(chosen === correct) score++;
  });
  progress.exams[st.week] = {
    done: true, score: score, total: st.questions.length,
    dateISO: new Date().toISOString(),
    questions: st.questions, answers: st.answers
  };
  saveProgress();
  updateGreeting();
  showExamResult(st.week, score, st.questions.length);
}

function showExamResult(weekNum, score, total){
  const body = document.getElementById("examBody") || document.getElementById("examRunner");
  const bonus = score * POINTS_CONFIG.examBonusPerCorrect;
  document.getElementById("examRunner").innerHTML = `
    <div class="quiz-card quiz-result">
      <div class="score">${score}/${total}</div>
      <div class="score-sub">Week ${weekNum} Exam complete! +${POINTS_CONFIG.examComplete} pts + ${bonus} bonus pts</div>
      <button class="small-btn" onclick="reviewExam(${weekNum})">Review Answers</button>
      <button class="small-btn secondary" onclick="renderExamList()">Back to Exam List</button>
    </div>`;
}

function reviewExam(weekNum){
  const attempt = examProg(weekNum);
  if(!attempt){ return; }
  document.getElementById("examWeekList").style.display = "none";
  const runner = document.getElementById("examRunner");
  runner.style.display = "";
  let html = `<div class="quiz-progress">Week ${weekNum} Exam — Review (Score: ${attempt.score}/${attempt.total})</div>`;
  attempt.questions.forEach((q, i) => {
    const chosen = attempt.answers[i] || [];
    const isCorrect = chosen.slice().sort().join(",") === q.correct.slice().sort().join(",");
    html += `<div class="quiz-card" style="margin-bottom:12px;">
      <div class="quiz-question">${i+1}. ${q.q}</div>`;
    q.options.forEach((opt, idx) => {
      let cls = "quiz-option";
      if(q.correct.includes(idx)) cls += " correct";
      else if(chosen.includes(idx)) cls += " incorrect";
      html += `<div class="${cls}">${String.fromCharCode(97+idx)}. ${opt}</div>`;
    });
    html += `<div class="quiz-explain ${isCorrect?'correct':'incorrect'}">${q.explain}</div></div>`;
  });
  html += `<button class="small-btn secondary" onclick="renderExamList()">Back to Exam List</button>`;
  runner.innerHTML = html;
}

// ================================================================
// SCORECARD VIEW
// ================================================================
function renderScorecard(){
  const name = getName() || "Student";
  const total = totalPoints();
  const completed = daysCompletedCount();
  const streak = currentStreak();
  const avg = examAverage();

  let weekRows = "";
  for(let w=1; w<=4; w++){
    const e = examProg(w);
    const examTxt = e && e.done ? `Exam: ${e.score}/${e.total}` : "Exam: not taken";
    weekRows += `<div class="week-score-row"><span>Week ${w}</span><span>${weekPoints(w)} pts · ${examTxt}</span></div>`;
  }

  document.getElementById("scorecardContent").innerHTML = `
    <div class="score-hero">
      <div class="big-points">${total}</div>
      <div class="points-label">TOTAL POINTS</div>
    </div>
    <div class="score-grid">
      <div class="score-stat"><div class="val">${completed}/20</div><div class="lbl">Days Completed</div></div>
      <div class="score-stat"><div class="val">${streak}</div><div class="lbl">Day Streak</div></div>
      <div class="score-stat"><div class="val">${avg!==null ? avg.toFixed(1)+'/15' : '—'}</div><div class="lbl">Exam Average</div></div>
      <div class="score-stat"><div class="val">${currentUnlockedWeek()}</div><div class="lbl">Current Week</div></div>
    </div>
    <h3 style="color:var(--purple-dark); margin-bottom:8px;">Points by Week</h3>
    ${weekRows}
    <div class="share-box">
      <h3 style="margin-top:0; color:var(--purple-dark);">Share Your Scorecard</h3>
      <div class="share-preview" id="sharePreview"></div>
      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <button class="small-btn" onclick="shareScorecard()">📤 Share</button>
        <button class="small-btn secondary" onclick="copyScorecard()">📋 Copy Text</button>
      </div>
      <div class="name-edit-row">
        <span style="font-size:13px; color:var(--muted);">Not you?</span>
        <input id="renameInput" type="text" placeholder="Change name" maxlength="20"/>
        <button class="small-btn secondary" onclick="renameFromScorecard()">Save</button>
      </div>
    </div>
  `;
  document.getElementById("sharePreview").textContent = buildScorecardText();
}

function buildScorecardText(){
  const name = getName() || "Student";
  const total = totalPoints();
  const completed = daysCompletedCount();
  const streak = currentStreak();
  const avg = examAverage();
  return [
    "🏆 MORE THAN CONQUERORS 🏆",
    "",
    `Student: ${name}`,
    `Current Week: ${currentUnlockedWeek()}`,
    `Days Completed: ${completed}/20`,
    `Total Points: ${total}`,
    `Exam Average: ${avg!==null ? avg.toFixed(1)+'/15' : 'N/A'}`,
    `Study Streak: ${streak} day${streak===1?'':'s'}`,
    "",
    "Romans 8:37 — We are more than conquerors!"
  ].join("\n");
}

async function shareScorecard(){
  const text = buildScorecardText();
  if(navigator.share){
    try{ await navigator.share({ text: text, title: "My More Than Conquerors Scorecard" }); }
    catch(e){ /* user cancelled */ }
  } else {
    copyScorecard();
  }
}
function copyScorecard(){
  const text = buildScorecardText();
  navigator.clipboard.writeText(text).then(() => {
    alert("Scorecard copied! Paste it in your group chat.");
  }).catch(() => {
    prompt("Copy this text:", text);
  });
}
function renameFromScorecard(){
  const val = document.getElementById("renameInput").value.trim();
  if(!val) return;
  setName(val);
  renderScorecard();
  updateGreeting();
}

// ---------------- INIT ----------------
document.addEventListener("DOMContentLoaded", () => {
  initNameModal();
  showView("home");
});
