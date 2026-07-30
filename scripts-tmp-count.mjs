import { triviaQuestionsData } from "./lib/trivia-questions-data.ts";

let grand = 0;
const grandByDiff = { easy: 0, medium: 0, hard: 0 };
for (const [theme, qs] of Object.entries(triviaQuestionsData)) {
  const counts = { easy: 0, medium: 0, hard: 0 };
  for (const q of qs) counts[q.difficulty]++;
  grand += qs.length;
  grandByDiff.easy += counts.easy;
  grandByDiff.medium += counts.medium;
  grandByDiff.hard += counts.hard;
  console.log(theme, qs.length, JSON.stringify(counts));
}
console.log("GRAND TOTAL", grand, JSON.stringify(grandByDiff));
