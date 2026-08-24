# More Than Conquerors — 4-Week Study Companion (v2)

A no-build, static web app for the *Mahragan El-Keraza 2026* workbook (Grades 9–12), for middle/high schoolers to study over 4 weeks, finishing by **September 20**.

## What's inside

**Home** — 4-week schedule, today's highlighted study day, overall progress bar, and a locked/unlocked view of future weeks.

**Day page** (Lesson / Flashcards / Daily Quiz tabs)
- **Lesson** — short study-guide-style summary for that day, tied to its workbook/Bible reference.
- **Flashcards** — Quizlet-style, tap to flip, shuffle, next/prev.
- **Daily Quiz** — ~5 auto-generated multiple-choice questions per day, built from that day's own flashcard content (distinct wording from the real workbook questions). Repeatable practice — no attempt limit.

**Review** — pick any week and browse everything covered so far: lesson summaries, flashcards, and the full list of real workbook questions with their answers revealed, for pre-exam studying.

**Exam Prep** — one 15-question exam per week, randomly pulled from that week's real workbook question bank (all 5 days' worth). Unlocked for the whole week once that week opens. **One attempt only** — after submitting, the student can review their answers but not retake it.

**Scorecard** — nickname (no accounts/emails/passwords, just local to the device), total points, points by week, days completed, exam average, and a "study streak." Includes **Share** (Web Share API where supported) and **Copy Text** buttons so a student can paste a clean scorecard into the group chat.

## Points system (fully configurable)
Edit the `POINTS_CONFIG` object at the top of `data.js` (or in `build_data.py` and regenerate) — nothing is hardcoded elsewhere:
```js
{
  "lesson": 10,             // completing the lesson tab
  "flashcards": 10,         // going through the flashcard deck once
  "dailyQuiz": 15,          // completing the daily quiz
  "examComplete": 15,       // completing a weekly exam
  "examBonusPerCorrect": 1, // +1 per correct exam answer (up to +15)
  "examMaxQuestions": 15
}
```

## Week unlocking
Weeks unlock automatically based on a calendar date, so students can't jump ahead to material you haven't covered yet — but **all days within an unlocked week are open** (no day-by-day locking), per your instructions.

**⚠️ Set the real start date before sharing this with students:**
Open `app.js` and edit the very top:
```js
const START_DATE = "2026-08-24"; // <-- change to the real Monday Week 1 starts
```

## Files
- `index.html` — page shell (nav: Home / Review / Exam Prep / Scorecard) + nickname modal
- `style.css` — visual design
- `app.js` — all app logic: navigation, points, progress, locking, exam engine
- `data.js` — generated content: `STUDY_DATA` (20 days), `WEEKS_DATA` (4 weeks + exam pools), `POINTS_CONFIG`
- `build_data.py` — the script that generates `data.js` from the source answer key (edit this, then run `python3 build_data.py`, to change any content)

## How progress is stored
Everything (nickname, lesson/flashcard/quiz completion, exam attempts and scores, points) is saved in each student's own browser via `localStorage`. There is **no shared server or login** — this is why the scorecard is "share by copy/paste" rather than a live leaderboard. If a student clears their browser data or switches devices, their progress resets.

## Host it on GitHub Pages (free, ~5 minutes)
1. Create a new **public** GitHub repository (e.g. `more-than-conquerors-study`).
2. Upload `index.html`, `style.css`, `app.js`, and `data.js` to the root of the repo (skip `build_data.py`/README if you like, they don't affect the site).
3. **Settings → Pages** → Source: **Deploy from a branch**, branch **main**, folder **/ (root)** → Save.
4. Wait ~1 minute; your site will be live at `https://<your-username>.github.io/<repo-name>/`.
5. Share that link — no login or install needed, works on phones, tablets, and computers.

## ⚠️ Please review the answer key before publishing
The original workbook PDF has **no printed answer key**. I determined the correct answer to all 194 questions from the workbook's own scripture citations and internal cross-references — most are very solidly sourced, but a handful were more interpretive judgment calls. Please have a priest, deacon, or servant familiar with the material spot-check these before students see them:

- Q3, Q22, Q50, Q84, Q88, Q106, Q116, Q117, Q152/Q153 (paired), Q163, Q187

To fix any answer: open `build_data.py`, find the question by number in the `Q` list, adjust the `correct` index (0 = option a, 1 = b, etc.), then re-run `python3 build_data.py` to regenerate `data.js`.

## Content honesty note
Per your instructions, nothing beyond the workbook PDF is used as source material:
- Lesson summaries paraphrase only the workbook's own content.
- Flashcards and daily-quiz questions are built only from that content (the daily quiz auto-generates *new phrasing* around the same facts, but introduces no outside information).
- Bible references are cited (e.g. "Colossians 1:15") but no verse text is reproduced anywhere in the app.
