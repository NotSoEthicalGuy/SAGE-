/**
 * SAGE — Zod Validation Schemas
 * Validates Claude's JSON output and API inputs.
 * Zod is the TypeScript equivalent of Python's Pydantic.
 */

import { z } from "zod";

// ─────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────

export const DriftLevelSchema = z.enum([
  "on_track",
  "early_warning",
  "drifting",
  "critical",
]);

export const SeveritySchema = z.enum(["low", "medium", "high"]);

// ─────────────────────────────────────────────
// AI ANALYSIS OUTPUT SCHEMA
// Must exactly match what we ask Claude to return.
// ─────────────────────────────────────────────

export const DriftSignalSchema = z.object({
  signal_type: z.string(),
  severity: SeveritySchema,
  description: z.string(),
  affected_courses: z.array(z.string()).nullable().optional(),
});

export const StrengthAreaSchema = z.object({
  domain: z.string(),
  evidence: z.string(),
  relevant_courses: z.array(z.string()),
});

export const WeaknessAreaSchema = z.object({
  domain: z.string(),
  evidence: z.string(),
  relevant_courses: z.array(z.string()),
});

export const MajorRecommendationSchema = z.object({
  major_name: z.string(),
  match_score: z.number().min(0).max(1),
  reasoning: z.string(),
  transferable_credits_estimate: z.number().nullable().optional(),
  key_matching_domains: z.array(z.string()),
});

// This is the full schema Claude must return
export const AIAnalysisOutputSchema = z.object({
  drift_score: z.number().min(0).max(1),
  drift_level: DriftLevelSchema,
  trajectory_summary: z.string(),
  drift_signals: z.array(DriftSignalSchema),
  strengths: z.array(StrengthAreaSchema),
  weaknesses: z.array(WeaknessAreaSchema),
  is_reroute_recommended: z.boolean(),
  recommendations: z.array(MajorRecommendationSchema).nullable().optional(),
  confidence: z.number().min(0).max(1),
  data_gaps: z.array(z.string()).nullable().optional(),
});

export type AIAnalysisOutput = z.infer<typeof AIAnalysisOutputSchema>;
