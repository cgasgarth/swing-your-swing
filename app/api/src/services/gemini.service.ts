import { GoogleGenAI } from "@google/genai";
import { SwingMetrics } from "shared";
import type { PoseAnalysisResult } from './pose.service.js';

const apiKey = process.env.GEMINI_API_KEY || "DUMMY_KEY";
const MODEL_NAME = "gemini-2.5-flash";

const ai = new GoogleGenAI({ apiKey });


/**
 * Takes locally-computed pose angles and uses Gemini only for performance
 * estimates (club speed, path, distance) and coaching narrative.
 * The body angles come from MediaPipe — not from Gemini vision.
 */
export async function getCoachingFromPoseData(poseData: PoseAnalysisResult, club: string) {
  if (apiKey === "DUMMY_KEY") return null;

  try {
    const prompt = `
      You are an elite PGA-certified golf coach and sports scientist.

      A local pose analysis system has measured the following precise body angles from a ${club} golf swing.
      These angles were computed from MediaPipe skeletal landmarks — they are measurements, not estimates.

      MEASURED SWING DATA:
      ${JSON.stringify(poseData, null, 2)}

      ANGLE DEFINITIONS USED:
      - spineAngle: Forward tilt of spine from vertical (30-45° is typical at address)
      - shoulderTurn: Rotation of shoulder line from square to target (0° = square, 90° = max turn)
      - hipTurn: Rotation of hips from square (typically 45° max at top, hips always less than shoulders)
      - leadArmAngle: Angle at lead elbow (180° = straight, should be near 180° at address/impact)

      Using these measurements, provide:
      1. Performance estimates appropriate for a ${club}:
         - estimatedClubSpeed (mph): Based on shoulder/hip rotation speed and sequence shown
         - estimatedClubPath: One of "Inside-Out", "Slightly Inside-Out", "Straight", "Slightly Outside-In", "Outside-In" — infer from hip vs shoulder sequencing at impact
         - estimatedDistance (yards): Realistic for this swing speed

      Respond ONLY with a valid JSON object. No markdown, no explanation:
      {
        "estimatedClubSpeed": number,
        "estimatedClubPath": string,
        "estimatedDistance": number
      }
    `;

    const result = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });

    const responseText = result.text ?? "";
    const jsonStr = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    const coaching = JSON.parse(jsonStr);

    // Merge pose data with coaching estimates into the full swing analysis format
    return {
      timestampsMs: poseData.timestampsMs,
      addressAngles: poseData.addressAngles,
      topAngles: poseData.topAngles,
      impactAngles: poseData.impactAngles,
      finishAngles: poseData.finishAngles,
      estimatedClubSpeed: coaching.estimatedClubSpeed,
      estimatedClubPath: coaching.estimatedClubPath,
      estimatedDistance: coaching.estimatedDistance,
    };

  } catch (error) {
    console.error("Error getting coaching from Gemini:", error);
    throw error;
  }
}

export async function extractLaunchMonitorData(imagePath: string) {
  if (apiKey === "DUMMY_KEY") return null;

  try {
    console.log(`Extracting data from launch monitor image: ${imagePath}`);
    const fs = await import("fs");
    const fileBytes = fs.readFileSync(imagePath);

    const prompt = `
      You are an OCR and data extraction expert for golf launch monitors.
      Extract the following numbers from the image, if visible. 
      Return null for any value you cannot find.
      
      Respond ONLY with a valid JSON object matching this interface:
      {
        "ballSpeed": number | null,
        "clubSpeed": number | null,
        "smashFactor": number | null,
        "carry": number | null,
        "spinRate": number | null,
        "extractedRawText": string
      }
    `;

    const result = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            { inlineData: { data: fileBytes.toString("base64"), mimeType: "image/jpeg" } },
          ],
        },
      ],
    });

    const responseText = result.text ?? "";
    const jsonStr = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Error analyzing launch monitor image:", error);
    throw error;
  }
}

export async function generateLessonRoadmap(metrics: Partial<SwingMetrics>, club: string) {
  if (apiKey === "DUMMY_KEY") return null;

  try {
    const prompt = `
      Based on the following golf swing metrics for a ${club}:
      ${JSON.stringify(metrics, null, 2)}

      Act as an elite golf instructor. Formulate a lesson roadmap.
      Identify the primary mechanical flaws compared to an ideal professional swing.
      
      Provide two distinct paths:
      1. An "Ideal" goal 
      2. A "Playable" goal 

      For each, provide 3 specific drills.

      Respond ONLY with a JSON array containing two objects:
      [
        {
          "goalType": "Ideal",
          "drills": ["String array of 3 drill titles"],
          "aiReview": "Narrative explanation"
        },
        {
          "goalType": "Playable",
          "drills": ["String array of 3 drill titles"],
          "aiReview": "Narrative explanation"
        }
      ]
    `;

    const result = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });

    const responseText = result.text ?? "";
    const jsonStr = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error(e);
    return null;
  }
}
