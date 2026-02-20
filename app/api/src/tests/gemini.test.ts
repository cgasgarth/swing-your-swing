import { describe, it, expect, mock } from 'bun:test';
import { generateLessonRoadmap } from '../services/gemini.service.js';

mock.module('../services/gemini.service.js', () => {
  return {
    generateLessonRoadmap: mock().mockResolvedValue([
      {
        goalType: "Ideal",
        drills: ["Drill 1", "Drill 2"],
        aiReview: "Focus on spine angle."
      }
    ])
  };
});

describe('Gemini Service Mock', () => {
  it('should return a generated roadmap', async () => {
    const dummyMetrics = {
      addressAngles: { spineAngle: 45, shoulderTurn: 10, hipTurn: 5, leadArmAngle: 90 }
    };

    const result = await generateLessonRoadmap(dummyMetrics, 'Driver');

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].goalType).toBe('Ideal');
    expect(result[0].drills.length).toBe(2);
  });
});
