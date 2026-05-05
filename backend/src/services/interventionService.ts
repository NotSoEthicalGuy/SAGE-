import { prisma } from '../db/client';

export async function updateInterventionOutcomes(
  studentId: string,
  newDriftScore: number,
  reportGeneratedAt: Date
): Promise<void> {
  const pendingOutcomes = await prisma.interventionOutcome.findMany({
    where: {
      driftScoreAfter: null,
      intervention: {
        studentId,
        interventionDate: { lt: reportGeneratedAt },
      },
    },
    include: { intervention: true },
  });

  if (pendingOutcomes.length === 0) return;

  await prisma.$transaction(
    pendingOutcomes.map(outcome =>
      prisma.interventionOutcome.update({
        where: { id: outcome.id },
        data: {
          driftScoreAfter: newDriftScore,
          effectivenessScore: outcome.driftScoreBefore - newDriftScore,
          measuredAt: reportGeneratedAt,
        },
      })
    )
  );
}
