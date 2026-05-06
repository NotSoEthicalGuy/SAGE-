/**
 * SAGE — AI Orchestrator
 * ============================================
 * The brain of SAGE. For a given student ID it:
 *  1. Loads the full student record from the DB
 *  2. Builds a rich prompt describing their academic history
 *  3. Calls Claude via the Anthropic Node.js SDK
 *  4. Parses + validates the JSON response with Zod
 *  5. Stores the report in ai_reports
 *  6. Returns the structured AIAnalysisOutput
 */

import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "../db/client";
import { AIAnalysisOutputSchema, type AIAnalysisOutput } from "../schemas/schemas";
import { buildStudentIntelligence, simulateStudentScenarios, type IntelligenceProfile, type ScenarioSet } from "./intelligenceEngine";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env automatically

const PROMPT_VERSION = "v1.0";

// ─────────────────────────────────────────────
// SYSTEM PROMPT
// Defines Claude's role and exact output format.
// ─────────────────────────────────────────────

const SYSTEM_PROMPT = `You are SAGE, an academic analysis engine embedded in a university advisor platform.
Your role is to analyze a single student's complete academic record and detect signs of academic drift.

ACADEMIC DRIFT is defined as: a pattern where a student's performance is declining or misaligned
with their declared major — either through grade deterioration, repeated weakness in core areas,
or a consistent mismatch between the student's strengths and the demands of their program.

YOUR TASK:
1. Analyze the student's full course history, grades, GPA trend, and exam performance.
2. Identify specific drift signals from the list of signal types below.
3. Score the overall drift severity from 0.0 to 1.0.
4. Identify genuine strength and weakness domains.
5. If drift_score >= 0.75, recommend alternative majors ranked by fit.

DRIFT SIGNAL TYPES (use these exact values for signal_type):
- "gpa_decline"              : Cumulative GPA is trending downward over semesters
- "core_underperformance"    : Consistently low grades in courses core to their major
- "elective_vs_core_gap"     : Performs much better in electives than required core courses
- "prereq_grade_decay"       : Grades in advanced courses lower than prerequisite courses
- "repeated_topic_weakness"  : Exam analysis shows persistent failure in specific topic areas
- "semester_over_semester"   : Each new semester average is lower than the previous
- "high_withdrawal_rate"     : Student withdrew from multiple courses
- "skill_domain_mismatch"    : Student's strengths lie in a different academic domain than their major

SEVERITY LEVELS: "low", "medium", "high"

DRIFT SCORE GUIDE:
0.0–0.3  : on_track       — healthy, no intervention needed
0.3–0.6  : early_warning  — monitor closely, advisor should check in
0.6–0.8  : drifting       — intervention recommended
0.8–1.0  : critical       — consider major change

OUTPUT FORMAT:
You MUST respond with ONLY a valid JSON object. No preamble, no explanation, no markdown fences.
The JSON must exactly match this structure:
{
  "drift_score": float (0.0–1.0),
  "drift_level": "on_track" | "early_warning" | "drifting" | "critical",
  "trajectory_summary": "string (2-4 sentences for the advisor)",
  "drift_signals": [
    {
      "signal_type": "string",
      "severity": "low" | "medium" | "high",
      "description": "string",
      "affected_courses": ["CS301"] or null
    }
  ],
  "strengths": [
    { "domain": "string", "evidence": "string", "relevant_courses": ["codes"] }
  ],
  "weaknesses": [
    { "domain": "string", "evidence": "string", "relevant_courses": ["codes"] }
  ],
  "is_reroute_recommended": boolean,
  "recommendations": [
    {
      "major_name": "string",
      "match_score": float,
      "reasoning": "string",
      "transferable_credits_estimate": integer or null,
      "key_matching_domains": ["string"]
    }
  ] or null,
  "confidence": float (0.0–1.0),
  "data_gaps": ["string"] or null
}

Write as a confident academic analytics engine delivering actionable insights to advisors. Be direct and specific. Never use uncertain language like 'may', 'might', 'could suggest', or 'it appears'. State all findings as facts derived from the student's data. When writing trajectory_summary, lead with the most critical signal first, be concrete about which courses or semesters are problematic, and close with one clear implication for the advisor.`;

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

type StudentCore = Awaited<ReturnType<typeof loadStudentCore>>;
type MajorWithCourses = { majorId: string; name: string; faculty: string; courses: { topicsCovered: string[] }[] };

// ─────────────────────────────────────────────
// MAIN ENTRY POINT
// ─────────────────────────────────────────────

export async function analyzeStudent(studentId: string): Promise<AIAnalysisOutput> {
  // 1. Load core student info + all majors in parallel, build intelligence profile
  const [student, allMajors, profile] = await Promise.all([
    loadStudentCore(studentId),
    prisma.major.findMany({ include: { courses: { select: { topicsCovered: true } } } }),
    buildStudentIntelligence(studentId),
  ]);
  if (!student) throw new Error(`Student ${studentId} not found`);

  // 2. Simulate intervention scenarios
  const scenarios = simulateStudentScenarios(profile);

  // 3. Build structured prompt from intelligence profile
  const userPrompt = buildPrompt(student, allMajors, profile, scenarios);

  // 4. Call Claude
  console.log(`[SAGE] Calling Claude for student: ${student.name} | local drift: ${profile.driftScore.toFixed(2)} | risk: ${profile.riskLevel}`);
  const rawResponse = await callClaude(userPrompt);

  // 5. Parse and validate
  const analysis = parseResponse(rawResponse);

  // 6. Store the report
  await storeReport(studentId, analysis);

  return analysis;
}

// ─────────────────────────────────────────────
// STEP 1: LOAD STUDENT (core info only — raw data no longer sent to Claude)
// ─────────────────────────────────────────────

async function loadStudentCore(studentId: string) {
  return prisma.student.findUnique({
    where: { studentId },
    select: {
      studentId: true,
      name: true,
      enrollmentYear: true,
      currentSemester: true,
      cumulativeGpa: true,
      major: { select: { name: true, faculty: true, description: true } },
    },
  });
}

// ─────────────────────────────────────────────
// STEP 2: BUILD PROMPT (from intelligence profile — no raw DB data)
// ─────────────────────────────────────────────

function buildPrompt(
  student: NonNullable<StudentCore>,
  allMajors: MajorWithCourses[],
  profile: IntelligenceProfile,
  scenarios: ScenarioSet,
): string {
  const lines: string[] = [];

  lines.push("═══════════════════════════════════════");
  lines.push("STUDENT INTELLIGENCE PROFILE");
  lines.push("═══════════════════════════════════════");
  lines.push(`Name              : ${student.name}`);
  lines.push(`Declared Major    : ${student.major.name} (${student.major.faculty})`);
  lines.push(`Enrollment Year   : ${student.enrollmentYear}`);
  lines.push(`Current Semester  : ${student.currentSemester}`);
  lines.push(`Cumulative GPA    : ${student.cumulativeGpa ?? "Not calculated"}`);
  lines.push(`Total Courses     : ${profile.totalCoursesAttempted}`);
  lines.push(`Failure Rate      : ${(profile.failureRate * 100).toFixed(1)}%`);
  lines.push("");

  lines.push("DECLARED MAJOR OVERVIEW:");
  lines.push(student.major.description ?? "No description available.");
  lines.push("");

  lines.push("── COMPUTED INTELLIGENCE METRICS ──────────────────");
  lines.push(`Pre-computed Drift Score   : ${profile.driftScore.toFixed(3)} (0=safe, 1=critical)  ← USE THIS EXACT VALUE`);
  lines.push(`Risk Level                 : ${profile.riskLevel}  ← USE THIS EXACT LEVEL`);
  lines.push(`GPA Trend (slope)          : ${profile.gpaTrend.toFixed(2)} pts/semester ${profile.gpaTrend < 0 ? "(DECLINING)" : profile.gpaTrend > 0 ? "(IMPROVING)" : "(FLAT)"}`);
  lines.push(`Average Grade (all courses): ${profile.avgGrade.toFixed(1)}/100`);
  lines.push(`Low Grade Rate (below 60)  : ${(profile.lowGradeRate * 100).toFixed(1)}%`);
  lines.push(`Performance Volatility     : ${profile.performanceVolatility.toFixed(3)} (0=stable, 1=erratic)`);
  lines.push(`Attendance Score           : ${(profile.attendanceScore * 100).toFixed(1)}%`);
  lines.push(`Difficulty Mismatch        : ${profile.courseDifficultyMismatch.toFixed(3)} (0=none, 1=severe)`);
  lines.push(`Prerequisite Violations    : ${profile.prerequisiteViolations.length}`);

  if (profile.prerequisiteViolations.length > 0) {
    lines.push("");
    lines.push("PREREQUISITE VIOLATIONS:");
    for (const v of profile.prerequisiteViolations) {
      lines.push(`  • ${v.courseName} — missing prereq: ${v.missingPrerequisiteCode}`);
    }
  }

  lines.push("");
  lines.push("── SEMESTER-BY-SEMESTER PERFORMANCE ───────────────");
  if (profile.semesterAverages.length === 0) {
    lines.push("  No completed semesters on record.");
  } else {
    for (const { label, avg } of profile.semesterAverages) {
      const bar = "█".repeat(Math.floor(avg / 10));
      lines.push(`  ${label}: ${avg.toFixed(1)}/100  ${bar}`);
    }
  }

  lines.push("");
  lines.push("── ACADEMIC STRENGTHS (by topic domain) ────────────");
  if (profile.strengths.length === 0) {
    lines.push("  No clear strengths identified yet.");
  } else {
    for (const s of profile.strengths) {
      lines.push(`  • ${s.domain}: avg ${s.avgGrade}/100 (${s.courses.join(", ")})`);
    }
  }

  lines.push("");
  lines.push("── ACADEMIC WEAKNESSES (by topic domain) ───────────");
  if (profile.weaknesses.length === 0) {
    lines.push("  No significant weaknesses identified.");
  } else {
    for (const w of profile.weaknesses) {
      lines.push(`  • ${w.domain}: avg ${w.avgGrade}/100 (${w.courses.join(", ")})`);
    }
  }

  lines.push("");
  lines.push("── INTERVENTION SCENARIO PROJECTIONS ───────────────");
  lines.push(`  Current               : drift=${scenarios.current.driftScore.toFixed(3)}, risk=${scenarios.current.riskLevel}, proj_grade=${scenarios.current.projectedGrade}/100`);
  lines.push(`  + Improved Attendance : drift=${scenarios.improvedAttendance.driftScore.toFixed(3)}, risk=${scenarios.improvedAttendance.riskLevel}, proj_grade=${scenarios.improvedAttendance.projectedGrade}/100`);
  lines.push(`  + Improved Grades     : drift=${scenarios.improvedGrades.driftScore.toFixed(3)}, risk=${scenarios.improvedGrades.riskLevel}, proj_grade=${scenarios.improvedGrades.projectedGrade}/100`);
  lines.push(`  + Reduced Course Load : drift=${scenarios.reducedCourseLoad.driftScore.toFixed(3)}, risk=${scenarios.reducedCourseLoad.riskLevel}, proj_grade=${scenarios.reducedCourseLoad.projectedGrade}/100`);

  lines.push("");
  lines.push("AVAILABLE MAJORS IN THIS UNIVERSITY:");
  lines.push("(Use only if rerouting is recommended)");
  lines.push("─────────────────────────────────────");
  for (const major of allMajors) {
    const topics = [...new Set(major.courses.flatMap((c) => c.topicsCovered))].slice(0, 8);
    lines.push(`  • ${major.name} (${major.faculty})`);
    if (topics.length > 0) lines.push(`    Key domains: ${topics.join(", ")}`);
  }

  lines.push("");
  lines.push("═══════════════════════════════════════");
  lines.push("IMPORTANT — DRIFT SCORE RULES:");
  lines.push(`1. Set drift_score to exactly ${profile.driftScore.toFixed(2)}. This is non-negotiable.`);
  lines.push(`2. Set drift_level to exactly "${profile.riskLevel}". This is non-negotiable.`);
  lines.push("3. Your role is to EXPLAIN the drift signals behind this score, not to recalculate it.");
  lines.push("4. Identify which specific drift signals (from the list above) are present.");
  lines.push("5. The quantitative model already accounts for GPA, grade averages, and grade distribution.");
  lines.push("Return ONLY the JSON object as specified. No preamble. No markdown.");
  lines.push("═══════════════════════════════════════");

  return lines.join("\n");
}

// ─────────────────────────────────────────────
// STEP 3: CALL CLAUDE
// ─────────────────────────────────────────────

async function callClaude(userPrompt: string): Promise<string> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  // Extract text blocks from response
  const text = message.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  return text.trim();
}

// ─────────────────────────────────────────────
// STEP 4: PARSE + VALIDATE RESPONSE
// ─────────────────────────────────────────────

function parseResponse(raw: string): AIAnalysisOutput {
  // Strip accidental markdown fences
  let clean = raw;
  if (clean.startsWith("```")) {
    const parts = clean.split("```");
    clean = parts[1] ?? parts[0];
    if (clean.startsWith("json")) clean = clean.slice(4);
  }
  clean = clean.trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(clean);
  } catch (e) {
    console.error("[SAGE] Failed to parse Claude response:", raw);
    throw new Error(`Claude returned invalid JSON: ${e}`);
  }

  const result = AIAnalysisOutputSchema.safeParse(parsed);
  if (!result.success) {
    console.error("[SAGE] Zod validation failed:", result.error.format());
    throw new Error(`Claude response schema mismatch: ${result.error.message}`);
  }

  return result.data;
}

// ─────────────────────────────────────────────
// STEP 5: STORE REPORT
// ─────────────────────────────────────────────

async function storeReport(studentId: string, analysis: AIAnalysisOutput) {
  const report = await prisma.aIReport.create({
    data: {
      studentId,
      driftScore: analysis.drift_score,
      driftLevel: analysis.drift_level,
      trajectorySummary: analysis.trajectory_summary,
      driftSignals: analysis.drift_signals.map((s) => ({
        signalType: s.signal_type,
        severity: s.severity,
        description: s.description,
        affectedCourses: s.affected_courses,
      })) as object[],
      strengths: analysis.strengths.map((s) => ({
        domain: s.domain,
        evidence: s.evidence,
        relevantCourses: s.relevant_courses,
      })) as object[],
      weaknesses: analysis.weaknesses.map((w) => ({
        domain: w.domain,
        evidence: w.evidence,
        relevantCourses: w.relevant_courses,
      })) as object[],
      recommendation: {
        isRerouteRecommended: analysis.is_reroute_recommended,
        alternatives: analysis.recommendations
          ? analysis.recommendations.map((r) => ({
              majorName: r.major_name,
              matchScore: r.match_score,
              reasoning: r.reasoning,
              transferableCreditsEstimate: r.transferable_credits_estimate,
              keyMatchingDomains: r.key_matching_domains,
            }))
          : [],
      },
      promptVersion: PROMPT_VERSION,
    },
  });

  console.log(
    `[SAGE] Report saved — student: ${studentId} | drift_score: ${analysis.drift_score.toFixed(2)} | level: ${analysis.drift_level}`
  );

  return report;
}
