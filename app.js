/* ==========================================================
   MORE THAN CONQUERORS — App Logic
   Vanilla JS, no build step. Works straight from GitHub Pages.
   ========================================================== */

const STORAGE_KEY   = "mtc_progress_v1";
const NAME_KEY       = "mtc_name_v1";
const POINTS_KEY      = "mtc_points_v1";

// ---- Gamification config (tweak freely, nothing else in the app is hardcoded) ----
const POINTS = {
  lesson: 10,            // reading the lesson for a day (first time)
  flashcards: 10,        // stepping through every flashcard for a day (first time)
  quiz: 15,              // finishing the daily quiz (first time)
  exam: 15,              // finishing a weekly exam-prep attempt
  examPerfectBonus: 15   // max bonus for exam performance, scaled by score/total
};

// ---------------- PROGRESS STORAGE ----------------
function loadProgress(){
  try{ return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch(e){ return {}; }
}
function saveProgress(){
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); }catch(e){/* ignore */}
}
let progress = loadProgress();
// progress[day] = {
//   flashSeen:bool, flashAllSeen:bool, quizBest:{score,total}, quizDone:bool,
//   lessonDone:bool, quizMissed:[num,...],
//   examDone:bool, examResult:{score,total,date,details:[{num,q,chosenIdx,correctIdx,isCorrect}]}
// }

function getDayProgress(day){
  if(!progress[day]) progress[day] = {
    flashSeen:false, flashAllSeen:false, quizBest:null, quizDone:false,
    lessonDone:false, quizMissed:[],
    examDone:false, examResult:null
  };
  const p = progress[day];
  if(p.quizMissed === undefined) p.quizMissed = [];
  return p;
}

function isDayCompleted(day){
  const p = progress[day];
  return !!(p && p.quizDone);
}

// ---------------- STUDENT NAME ----------------
function getStudentName(){
  try{ return localStorage.getItem(NAME_KEY) || ""; }catch(e){ return ""; }
}
function setStudentName(name){
  try{ localStorage.setItem(NAME_KEY, name); }catch(e){/* ignore */}
}

// ---------------- POINTS / STREAK ----------------
function loadPoints(){
  try{ return JSON.parse(localStorage.getItem(POINTS_KEY)) || { total:0, awarded:{}, activityDates:[] }; }
  catch(e){ return { total:0, awarded:{}, activityDates:[] }; }
}
function savePoints(){
  try{ localStorage.setItem(POINTS_KEY, JSON.stringify(pointsData)); }catch(e){/* ignore */}
}
let pointsData = loadPoints();
if(!pointsData.activityDates) pointsData.activityDates = [];

function logActivityToday(){
  const today = new Date().toDateString();
  if(!pointsData.activityDates.includes(today)){
    pointsData.activityDates.push(today);
  }
}

// Award points once per (day, type). Returns true if newly awarded.
function awardPoints(day, type, amount){
  const key = day + ":" + type;
  if(pointsData.awarded[key]) return false;
  pointsData.awarded[key] = true;
  pointsData.total += amount;
  logActivityToday();
  savePoints();
  return true;
}

function getTotalPoints(){ return pointsData.total; }

function getCompletedDaysCount(){
  return STUDY_DATA.filter(d => isDayCompleted(d.day)).length;
}

// Current streak = consecutive calendar days (ending today or yesterday) with any recorded activity.
function getStreak(){
  const dates = new Set(pointsData.activityDates);
  if(dates.size === 0) return 0;
  let streak = 0;
  let cursor = new Date();
  // if nothing today yet, streak can still count through yesterday
  if(!dates.has(cursor.toDateString())){
    cursor.setDate(cursor.getDate() - 1);
    if(!dates.has(cursor.toDateString())) return 0;
  }
  while(dates.has(cursor.toDateString())){
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function getExamAverage(){
  const scores = STUDY_DATA
    .map(d => progress[d.day] && progress[d.day].examResult)
    .filter(Boolean);
  if(scores.length === 0) return null;
  const totalScore = scores.reduce((s,r) => s + r.score, 0);
  const totalOf = scores.reduce((s,r) => s + r.total, 0);
  return { avgScore: totalScore/scores.length, avgTotal: totalOf/scores.length, count: scores.length };
}

// ---------------- NAV / ROUTER ----------------
let currentDay = null;
let currentTab = "lesson";
let currentReviewWeek = "Week 1";

function hideAllViews(){
  ["homeView","dayView","reviewView","examView"].forEach(id => {
    document.getElementById(id).style.display = "none";
  });
}

function showHome(){
  hideAllViews();
  document.getElementById("homeView").style.display = "";
  renderHome();
  window.scrollTo(0,0);
}

function showReview(){
  hideAllViews();
  document.getElementById("reviewView").style.display = "";
  renderReview();
  window.scrollTo(0,0);
}

function showExamPrep(){
  hideAllViews();
  document.getElementById("examView").style.display = "";
  renderExamHub();
  window.scrollTo(0,0);
}

// ---------------- NAME CAPTURE MODAL ----------------
function ensureStudentName(){
  const name = getStudentName();
  if(!name){
    openModal(`
      <div class="modal-card">
        <h3>Welcome! 👋</h3>
        <p>What's your first name or nickname? This stays only on this device — no email, no account.</p>
        <input id="nameInput" class="text-input" type="text" maxlength="24" placeholder="e.g. Mina" />
        <div class="modal-actions">
          <button class="small-btn" onclick="submitName()">Let's Go</button>
        </div>
      </div>
    `, false);
    setTimeout(() => { const el = document.getElementById("nameInput"); if(el) el.focus(); }, 50);
  }
}
function submitName(){
  const val = (document.getElementById("nameInput").value || "").trim();
  if(!val) return;
  setStudentName(val.slice(0,24));
  closeModal();
  renderHome();
}
function changeName(){
  openModal(`
    <div class="modal-card">
      <h3>Update your name</h3>
      <input id="nameInput" class="text-input" type="text" maxlength="24" value="${escapeHtml(getStudentName())}" />
      <div class="modal-actions">
        <button class="small-btn" onclick="submitName()">Save</button>
        <button class="small-btn secondary" onclick="closeModal()">Cancel</button>
      </div>
    </div>
  `, true);
}

// ---------------- MODAL HELPERS ----------------
function openModal(innerHtml, dismissible){
  let overlay = document.getElementById("modalOverlay");
  overlay.innerHTML = innerHtml;
  overlay.style.display = "flex";
  overlay.onclick = (e) => { if(dismissible && e.target === overlay) closeModal(); };
}
function closeModal(){
  const overlay = document.getElementById("modalOverlay");
  overlay.style.display = "none";
  overlay.innerHTML = "";
}
function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
}

// ---------------- HOME VIEW ----------------
function renderHome(){
  const totalDays = STUDY_DATA.length;
  const completed = getCompletedDaysCount();
  document.getElementById("overallBar").style.width = Math.round((completed/totalDays)*100) + "%";
  document.getElementById("overallText").textContent = `${completed} of ${totalDays} days completed`;

  const name = getStudentName();
  document.getElementById("homeGreeting").innerHTML = name
    ? `Hi, ${escapeHtml(name)}! <a href="#" class="edit-name-link" onclick="changeName();return false;">(edit)</a>`
    : "";

  const streak = getStreak();
  const avg = getExamAverage();
  document.getElementById("statsRow").innerHTML = `
    <div class="stat-pill"><div class="stat-num">${getTotalPoints()}</div><div class="stat-label">Points</div></div>
    <div class="stat-pill"><div class="stat-num">${completed}/${totalDays}</div><div class="stat-label">Days Done</div></div>
    <div class="stat-pill"><div class="stat-num">${streak}🔥</div><div class="stat-label">Streak</div></div>
    <div class="stat-pill"><div class="stat-num">${avg ? avg.avgScore.toFixed(1)+"/"+Math.round(avg.avgTotal) : "—"}</div><div class="stat-label">Exam Avg</div></div>
  `;

  // Today's study = first day not yet quiz-completed
  const nextDay = STUDY_DATA.find(d => !isDayCompleted(d.day));
  const todayBox = document.getElementById("todayStudyBox");
  if(nextDay){
    todayBox.innerHTML = `
      <div class="today-eyebrow">Today's Study — ${nextDay.week} ${nextDay.weekday}</div>
      <div class="today-topic">${nextDay.topic}</div>
      <div class="today-actions">
        <button class="small-btn" onclick="openDay(${nextDay.day})">Start Lesson</button>
        <button class="small-btn secondary" onclick="openDay(${nextDay.day});switchTab('flashcards')">Flashcards</button>
        <button class="small-btn secondary" onclick="openDay(${nextDay.day});switchTab('quiz')">Daily Quiz</button>
      </div>
    `;
    todayBox.style.display = "";
  } else {
    todayBox.innerHTML = `
      <div class="today-eyebrow">🎉 All 20 days complete!</div>
      <div class="today-topic">Head to Exam Prep or Review anything you'd like to brush up on.</div>
      <div class="today-actions">
        <button class="small-btn" onclick="showExamPrep()">Exam Prep</button>
        <button class="small-btn secondary" onclick="showReview()">Review</button>
      </div>
    `;
    todayBox.style.display = "";
  }

  const weeks = {};
  STUDY_DATA.forEach(d => {
    if(!weeks[d.week]) weeks[d.week] = [];
    weeks[d.week].push(d);
  });

  const container = document.getElementById("weeksContainer");
  container.innerHTML = "";
  Object.keys(weeks).forEach(weekName => {
    const weekDays = weeks[weekName];
    const weekDone = weekDays.filter(d => isDayCompleted(d.day)).length;

    const block = document.createElement("div");
    block.className = "week-block";
    const title = document.createElement("div");
    title.className = "week-title";
    title.textContent = `${weekName}  ·  ${weekDone}/${weekDays.length} completed`;
    block.appendChild(title);

    const grid = document.createElement("div");
    grid.className = "day-grid";

    weekDays.forEach(d => {
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

function openScorecard(){
  const name = getStudentName() || "Student";
  const completed = getCompletedDaysCount();
  const total = STUDY_DATA.length;
  const streak = getStreak();
  const points = getTotalPoints();
  const avg = getExamAverage();
  // find current week label from next incomplete day, else last week
  const nextDay = STUDY_DATA.find(d => !isDayCompleted(d.day));
  const weekLabel = nextDay ? nextDay.week : STUDY_DATA[STUDY_DATA.length-1].week;

  const text = `MORE THAN CONQUERORS 🏆
Student: ${name}
${weekLabel}
Days Completed: ${completed}/${total}
Total Points: ${points}
Exam Average: ${avg ? avg.avgScore.toFixed(1)+"/"+Math.round(avg.avgTotal) : "—"}
Study Streak: ${streak} day${streak===1?"":"s"} 🔥`;

  openModal(`
    <div class="modal-card scorecard-modal">
      <h3>🏆 My Scorecard</h3>
      <pre class="scorecard-pre">${escapeHtml(text)}</pre>
      <div class="modal-actions">
        <button class="small-btn" onclick="shareScorecard()">Share</button>
        <button class="small-btn secondary" onclick="copyScorecard()">Copy</button>
        <button class="small-btn secondary" onclick="closeModal()">Close</button>
      </div>
      <div id="scorecardMsg" class="scorecard-msg"></div>
    </div>
  `, true);
  window._scorecardText = text;
}
function shareScorecard(){
  const text = window._scorecardText || "";
  if(navigator.share){
    navigator.share({ text }).catch(()=>{});
  } else {
    copyScorecard();
  }
}
function copyScorecard(){
  const text = window._scorecardText || "";
  const msg = document.getElementById("scorecardMsg");
  navigator.clipboard.writeText(text).then(() => {
    if(msg) msg.textContent = "Copied! Paste it into your group chat.";
  }).catch(() => {
    if(msg) msg.textContent = "Couldn't copy automatically — select the text above manually.";
  });
}

// ---------------- DAY VIEW ----------------
function openDay(dayNum){
  currentDay = dayNum;
  hideAllViews();
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
  const p = getDayProgress(currentDay);
  const el = document.getElementById("tab-lesson");

  const sectionHtml = d.sectionContext ? `
    <div class="lesson-card section-card">
      <div class="section-card-label">This Week's Bigger Picture — ${d.sectionContext.sectionTitle}</div>
      <p class="section-objectives">${d.sectionContext.objectives}</p>
      <div class="section-topics">
        ${d.sectionContext.topics.map(t => `
          <div class="section-topic">
            <div class="section-topic-title">${t.title}</div>
            <div class="section-topic-summary">${t.summary}</div>
          </div>
        `).join("")}
      </div>
    </div>
  ` : "";

  const keyConceptsHtml = (d.flashcards && d.flashcards.length) ? `
    <div class="lesson-card">
      <h3>Key Concepts at a Glance</h3>
      <div class="key-concept-grid">
        ${d.flashcards.map(f => `
          <div class="key-concept-item">
            <div class="key-concept-term">${f.term}</div>
            <div class="key-concept-def">${f.def}</div>
          </div>
        `).join("")}
      </div>
    </div>
  ` : "";

  el.innerHTML = `
    <div class="lesson-card">
      <div class="lesson-meta-row">
        <span class="lesson-meta-chip">📘 Workbook ${d.workbookRange}</span>
        <span class="lesson-meta-chip">📖 ${d.bible}</span>
        <span class="lesson-meta-chip">⏱ ${d.time}</span>
      </div>
      <h3>Lesson of the Day</h3>
      <p>${d.summary}</p>
    </div>

    ${keyConceptsHtml}

    ${sectionHtml}

    <div class="lesson-card lesson-done-card">
      <div class="lesson-done-row">
        ${p.lessonDone
          ? `<span class="lesson-done-badge">✓ Lesson complete</span>`
          : `<button class="small-btn" onclick="markLessonDone()">Mark Lesson as Read (+${POINTS.lesson} pts)</button>`
        }
      </div>
      <div class="lesson-next-row">
        <button class="small-btn secondary" onclick="switchTab('flashcards')">Start Flashcards →</button>
      </div>
    </div>
  `;
}
function markLessonDone(){
  getDayProgress(currentDay).lessonDone = true;
  saveProgress();
  const newlyAwarded = awardPoints(currentDay, "lesson", POINTS.lesson);
  renderLesson();
  if(newlyAwarded) toast(`+${POINTS.lesson} points — lesson complete!`);
}

// ---------------- FLASHCARDS ----------------
let flashOrder = [];
let flashIndex = 0;
let flashFlipped = false;
let flashSeenSet = new Set();

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
    flashSeenSet = new Set();
  }
  drawFlashcard();
}

function drawFlashcard(){
  const d = getDay(currentDay);
  const el = document.getElementById("tab-flashcards");
  const cardIdx = flashOrder[flashIndex];
  const card = d.flashcards[cardIdx];
  flashSeenSet.add(cardIdx);

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

  if(flashSeenSet.size >= flashOrder.length && !getDayProgress(currentDay).flashAllSeen){
    getDayProgress(currentDay).flashAllSeen = true;
    saveProgress();
    const newlyAwarded = awardPoints(currentDay, "flashcards", POINTS.flashcards);
    if(newlyAwarded) toast(`+${POINTS.flashcards} points — flashcards complete!`);
  } else {
    saveProgress();
  }
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

// ---------------- DAILY QUIZ ----------------
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
    const wasAlreadyDone = getDayProgress(currentDay).quizDone;
    getDayProgress(currentDay).quizDone = true;
    saveProgress();

    let earned = 0;
    if(awardPoints(currentDay, "quiz", POINTS.quiz)) earned += POINTS.quiz;

    el.innerHTML = `
      <div class="quiz-card quiz-result">
        <div class="score">${quizScore}/${total}</div>
        <div class="score-sub">${pct}% correct</div>
        ${earned ? `<div class="points-earned">+${earned} points!</div>` : ``}
        <button class="small-btn" onclick="retakeQuiz()">↻ Retake Quiz</button>
        <button class="small-btn secondary" onclick="switchTab('flashcards')">Review Flashcards</button>
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
    quizAnswered = true;
    const correctSet = q.correct.slice().sort().join(",");
    const chosenSet = quizSelected.slice().sort().join(",");
    const isCorrect = correctSet === chosenSet;
    if(isCorrect) quizScore++;

    // track missed questions for the Review page
    const p = getDayProgress(currentDay);
    const missedSet = new Set(p.quizMissed);
    if(isCorrect) missedSet.delete(q.num); else missedSet.add(q.num);
    p.quizMissed = Array.from(missedSet);
    saveProgress();

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

// ---------------- REVIEW PAGE ----------------
function renderReview(){
  const weeks = [...new Set(STUDY_DATA.map(d => d.week))];
  const tabsEl = document.getElementById("reviewWeekTabs");
  tabsEl.innerHTML = weeks.map(w => `
    <button class="tab-btn ${w === currentReviewWeek ? 'active' : ''}" onclick="setReviewWeek('${w}')">${w}</button>
  `).join("");

  const showMissedOnly = document.getElementById("reviewMissedToggle")
    ? document.getElementById("reviewMissedToggle").checked
    : false;

  const weekDays = STUDY_DATA.filter(d => d.week === currentReviewWeek);
  const container = document.getElementById("reviewContent");

  container.innerHTML = `
    <label class="missed-toggle-row">
      <input type="checkbox" id="reviewMissedToggle" ${showMissedOnly ? "checked" : ""} onchange="renderReview()" />
      Show only questions I've missed
    </label>
    <div id="reviewDaysWrap"></div>
  `;

  const wrap = document.getElementById("reviewDaysWrap");
  weekDays.forEach(d => {
    const p = getDayProgress(d.day);
    const missedNums = new Set(p.quizMissed || []);
    const examMissedNums = new Set(
      (p.examResult && p.examResult.details || []).filter(x => !x.isCorrect).map(x => x.num)
    );
    const allMissed = new Set([...missedNums, ...examMissedNums]);

    let questionsToShow = d.quiz;
    if(showMissedOnly) questionsToShow = d.quiz.filter(q => allMissed.has(q.num));

    const block = document.createElement("div");
    block.className = "review-day-block";
    block.innerHTML = `
      <div class="review-day-header" onclick="this.parentElement.classList.toggle('open')">
        <span>${d.weekday} — ${d.topic}</span>
        <span class="review-caret">▾</span>
      </div>
      <div class="review-day-body">
        ${showMissedOnly ? "" : `
          <div class="review-section">
            <h4>Lesson Summary</h4>
            <p>${d.summary}</p>
          </div>
          <div class="review-section">
            <h4>Flashcards (${d.flashcards.length})</h4>
            <div class="review-flash-grid">
              ${d.flashcards.map(f => `
                <div class="review-flash-item"><strong>${f.term}</strong><span>${f.def}</span></div>
              `).join("")}
            </div>
          </div>
        `}
        <div class="review-section">
          <h4>${showMissedOnly ? "Questions You've Missed" : "Workbook Questions"}</h4>
          ${questionsToShow.length === 0
            ? `<p class="muted-note">${showMissedOnly ? "Nothing missed here yet — nice work!" : "No questions for this day."}</p>`
            : questionsToShow.map(q => `
              <div class="review-q">
                <div class="review-q-text">Q${q.num}. ${q.q}</div>
                <div class="review-q-answer">✅ ${q.options[q.correct[0]]}</div>
                <div class="review-q-explain">${q.explain}</div>
              </div>
            `).join("")
          }
        </div>
      </div>
    `;
    wrap.appendChild(block);
  });
}

function setReviewWeek(w){
  currentReviewWeek = w;
  renderReview();
}

// ---------------- EXAM PREP PAGE ----------------
function getExamPool(dayNum){
  const day = getDay(dayNum);
  // Only pull from this day's week, and only from days at or before this one
  // that the student has actually completed the daily quiz for (covered material).
  const eligibleDays = STUDY_DATA.filter(d =>
    d.week === day.week && d.day <= dayNum && isDayCompleted(d.day)
  );
  let pool = [];
  eligibleDays.forEach(d => { pool = pool.concat(d.quiz); });
  return pool;
}

function renderExamHub(){
  const container = document.getElementById("examDaysWrap");
  container.innerHTML = `
    <p class="exam-intro">Each study day unlocks a short weekly exam once you've finished that day's quiz.
    Questions are pulled only from material you've already covered this week. <strong>You get one attempt — make it count.</strong></p>
  `;

  const weeks = {};
  STUDY_DATA.forEach(d => { (weeks[d.week] = weeks[d.week] || []).push(d); });

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
      const p = getDayProgress(d.day);
      const unlocked = isDayCompleted(d.day);
      const done = p.examDone;
      const poolSize = unlocked ? getExamPool(d.day).length : 0;

      const card = document.createElement("div");
      card.className = "day-card exam-card" + (done ? " completed" : "") + (!unlocked ? " locked" : "");
      card.innerHTML = `
        <div class="day-card-top">
          <span class="day-label">${d.weekday}</span>
          ${done ? '<span class="day-check">✓</span>' : (!unlocked ? '<span class="lock-icon">🔒</span>' : '')}
        </div>
        <div class="day-topic">${d.topic}</div>
        ${done
          ? `<div class="exam-score-chip">${p.examResult.score}/${p.examResult.total}</div>`
          : unlocked
            ? `<div class="exam-ready-chip">${Math.min(15, poolSize)} questions ready</div>`
            : `<div class="exam-locked-chip">Finish today's quiz to unlock</div>`
        }
      `;
      if(done){
        card.onclick = () => showExamResults(d.day);
      } else if(unlocked){
        card.onclick = () => startExam(d.day);
      }
      grid.appendChild(card);
    });

    block.appendChild(grid);
    container.appendChild(block);
  });
}

let examState = null; // { dayNum, questions:[...], index, answers:{} }

function startExam(dayNum){
  const pool = shuffleArray(getExamPool(dayNum));
  if(pool.length === 0){
    toast("No questions available yet for this exam.");
    return;
  }
  const questions = pool.slice(0, 15);
  openModal(`
    <div class="modal-card">
      <h3>${getDay(dayNum).week} Exam</h3>
      <p>${questions.length} questions, one attempt only. Once you submit, you can't retake this exam.</p>
      <div class="modal-actions">
        <button class="small-btn" onclick="closeModal();beginExam(${dayNum})">I'm Ready — Start</button>
        <button class="small-btn secondary" onclick="closeModal()">Not Yet</button>
      </div>
    </div>
  `, true);
}

function beginExam(dayNum){
  const pool = shuffleArray(getExamPool(dayNum));
  const questions = pool.slice(0, 15);
  examState = { dayNum, questions, index: 0, answers: {} };
  hideAllViews();
  document.getElementById("examView").style.display = "";
  drawExamQuestion();
  window.scrollTo(0,0);
}

function drawExamQuestion(){
  const container = document.getElementById("examDaysWrap");
  const { questions, index } = examState;
  const q = questions[index];
  const chosen = examState.answers[index] || [];

  container.innerHTML = `
    <div class="quiz-progress">Exam Question ${index+1} of ${questions.length}</div>
    <div class="quiz-card">
      <div class="quiz-question">${q.q}</div>
      ${q.multi ? '<div class="multi-hint">Select all that apply.</div>' : ''}
      <div id="examOptionsWrap"></div>
      <div class="quiz-actions">
        <button class="small-btn secondary" ${index===0 ? "disabled" : ""} onclick="examPrev()">← Prev</button>
        <button id="examNextBtn" class="quiz-nextbtn">${index === questions.length-1 ? "Review & Submit" : "Next →"}</button>
      </div>
    </div>
  `;
  const wrap = document.getElementById("examOptionsWrap");
  q.options.forEach((opt, idx) => {
    const btn = document.createElement("button");
    btn.className = "quiz-option" + (chosen.includes(idx) ? " selected" : "");
    btn.textContent = String.fromCharCode(97+idx) + ". " + opt;
    btn.onclick = () => examSelectOption(idx, q);
    wrap.appendChild(btn);
  });
  document.getElementById("examNextBtn").onclick = () => examNext();
}

function examSelectOption(idx, q){
  const { index } = examState;
  let chosen = examState.answers[index] || [];
  if(q.multi){
    const pos = chosen.indexOf(idx);
    if(pos === -1) chosen.push(idx); else chosen.splice(pos,1);
  } else {
    chosen = [idx];
  }
  examState.answers[index] = chosen;
  drawExamQuestion();
}

function examPrev(){
  examState.index = Math.max(0, examState.index - 1);
  drawExamQuestion();
}
function examNext(){
  if(examState.index < examState.questions.length - 1){
    examState.index++;
    drawExamQuestion();
  } else {
    confirmSubmitExam();
  }
}

function confirmSubmitExam(){
  const unanswered = examState.questions.filter((q,i) => !(examState.answers[i] && examState.answers[i].length));
  openModal(`
    <div class="modal-card">
      <h3>Submit exam?</h3>
      <p>${unanswered.length > 0 ? `You have ${unanswered.length} unanswered question(s). ` : ""}Once you submit, this exam is locked — no retakes.</p>
      <div class="modal-actions">
        <button class="small-btn" onclick="closeModal();submitExam()">Submit Final Answers</button>
        <button class="small-btn secondary" onclick="closeModal()">Keep Reviewing</button>
      </div>
    </div>
  `, true);
}

function submitExam(){
  const { dayNum, questions, answers } = examState;
  let score = 0;
  const details = questions.map((q, i) => {
    const chosen = (answers[i] || []).slice().sort().join(",");
    const correct = q.correct.slice().sort().join(",");
    const isCorrect = chosen === correct;
    if(isCorrect) score++;
    return { num: q.num, q: q.q, options: q.options, chosen: answers[i] || [], correctIdx: q.correct, isCorrect, explain: q.explain };
  });

  const p = getDayProgress(dayNum);
  p.examDone = true;
  p.examResult = { score, total: questions.length, date: new Date().toDateString(), details };
  saveProgress();

  let earned = 0;
  if(awardPoints(dayNum, "exam", POINTS.exam)) earned += POINTS.exam;
  const bonus = Math.round((score/questions.length) * POINTS.examPerfectBonus);
  if(awardPoints(dayNum, "examBonus", bonus)) earned += bonus;

  examState = null;
  showExamResults(dayNum, earned);
}

function showExamResults(dayNum, earned){
  hideAllViews();
  document.getElementById("examView").style.display = "";
  const p = getDayProgress(dayNum);
  const r = p.examResult;
  const pct = Math.round((r.score/r.total)*100);
  const container = document.getElementById("examDaysWrap");

  container.innerHTML = `
    <div class="quiz-card quiz-result">
      <div class="score">${r.score}/${r.total}</div>
      <div class="score-sub">${pct}% correct</div>
      ${earned ? `<div class="points-earned">+${earned} points!</div>` : ``}
      <button class="small-btn secondary" onclick="renderExamHub()">Back to Exam Prep</button>
    </div>
    <div class="review-section">
      <h4>What You Got Right</h4>
      ${r.details.filter(d=>d.isCorrect).map(d => `<div class="review-q"><div class="review-q-text">✅ Q${d.num}. ${d.q}</div></div>`).join("") || "<p class='muted-note'>None this time.</p>"}
    </div>
    <div class="review-section">
      <h4>What to Review</h4>
      ${r.details.filter(d=>!d.isCorrect).map(d => `
        <div class="review-q">
          <div class="review-q-text">❌ Q${d.num}. ${d.q}</div>
          <div class="review-q-answer">✅ ${d.options[d.correctIdx[0]]}</div>
          <div class="review-q-explain">${d.explain}</div>
        </div>
      `).join("") || "<p class='muted-note'>Nothing to review — perfect score!</p>"}
    </div>
  `;
  window.scrollTo(0,0);
}

// ---------------- TOAST ----------------
let toastTimer = null;
function toast(msg){
  let el = document.getElementById("toastEl");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}

// ---------------- INIT ----------------
document.addEventListener("DOMContentLoaded", () => {
  showHome();
  ensureStudentName();
});
