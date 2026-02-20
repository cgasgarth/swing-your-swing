import { GoogleGenAI } from "@google/genai";
import { SwingMetrics } from "shared";

const apiKey = process.env.GEMINI_API_KEY || "DUMMY_KEY";
const MODEL_NAME = "gemini-2.5-flash";

const ai = new GoogleGenAI({ apiKey });

async function waitForFileActive(fileName: string): Promise<void> {
  const MAX_WAIT_MS = 120_000;
  const POLL_INTERVAL_MS = 3_000;
  const start = Date.now();

  while (Date.now() - start < MAX_WAIT_MS) {
    const file = await ai.files.get({ name: fileName });
    if (file.state === "ACTIVE") {
      console.log(`File ${fileName} is ACTIVE and ready for inference.`);
      return;
    }
    if (file.state === "FAILED") {
      throw new Error(`File ${fileName} processing failed.`);
    }
    console.log(`File ${fileName} state: ${file.state}. Waiting...`);
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  throw new Error(`File ${fileName} did not become ACTIVE within ${MAX_WAIT_MS / 1000}s.`);
}

async function uploadVideoToGemini(filePath: string, mimeType: string) {
  const uploadResult = await ai.files.upload({
    file: filePath,
    config: { mimeType },
  });
  console.log(`Uploaded file to Gemini: ${uploadResult.name} (${uploadResult.uri})`);

  // Wait for file to be processed before returning
  await waitForFileActive(uploadResult.name!);

  return uploadResult;
}

export async function analyzeSwingVideo(videoPath: string, club: string, mimeType: string) {
  if (apiKey === "DUMMY_KEY") return null;

  try {
    console.log(`Analyzing video: ${videoPath} for club: ${club} with MIME: ${mimeType}`);
    const uploadedFile = await uploadVideoToGemini(videoPath, mimeType);

    const prompt = `
      You are an expert golf biomechanics analyst with a background in sports science and motion capture.
      Analyze the provided golf swing video with extreme precision. The club used is a ${club}.

      IMPORTANT CONTEXT:
      - This video may be recorded in iPhone slow-motion (120fps or 240fps) which makes the swing appear much longer than real time.
      - A real golf swing from address to finish takes approximately 1.0-1.5 seconds in real time.
      - Timestamps should be the ACTUAL VIDEO PLAYBACK timestamps in milliseconds (not real-world time).
      - Look for the FIRST full swing in the video if there are multiple or if there is setup/walking time.

      STEP 1: Identify the 4 key positions by their visual characteristics:
      - ADDRESS: The golfer is standing still over the ball, club grounded behind the ball, weight balanced, just before the takeaway begins.
      - TOP OF BACKSWING: The club has reached its highest point behind the golfer, hands are at or above shoulder height, maximum shoulder rotation away from target.
      - IMPACT: The exact frame where the clubhead meets the ball. Look for: the club is at the lowest point of its arc, the ball is still on the tee/ground or just leaving it, the golfer's hips are open toward the target.
      - FINISH: The golfer has completed the follow-through, weight is on the front foot, belt buckle faces the target, club is wrapped behind the body.

      STEP 2: For each position, measure these body angles by examining the golfer's body carefully:
      - spineAngle: The forward tilt of the spine from vertical (0° = standing perfectly upright, 30-45° = typical address). Measured as the angle between vertical and the line from hips to shoulders in the down-the-line or face-on view.
      - shoulderTurn: Rotation of the shoulder line relative to the target line (0° = square to target, 90° = shoulders perpendicular to target). At address this should be near 0°, at the top it should be 80-100°.
      - hipTurn: Rotation of the hips relative to the target line (0° = square, 45° = typical top of backswing). Hips always rotate less than shoulders.
      - leadArmAngle: The angle at the lead elbow (left elbow for right-handed golfer). 180° = perfectly straight arm, 90° = bent 90°. At address and impact this should be close to 170-180°.

      STEP 3: Estimate these performance metrics for a ${club}:
      - estimatedClubSpeed: in mph. A typical amateur driver is 80-100mph, mid-iron 70-85mph, wedge 60-75mph.
      - estimatedClubPath: Describe as one of: "Inside-Out", "Straight", "Outside-In", "Slightly Inside-Out", "Slightly Outside-In"
      - estimatedDistance: in yards. Be realistic for an amateur golfer.

      Respond ONLY with a valid JSON object. No markdown, no explanation, just the JSON:
      {
        "timestampsMs": { "address": number, "top": number, "impact": number, "finish": number },
        "addressAngles": { "spineAngle": number, "shoulderTurn": number, "hipTurn": number, "leadArmAngle": number },
        "topAngles": { "spineAngle": number, "shoulderTurn": number, "hipTurn": number, "leadArmAngle": number },
        "impactAngles": { "spineAngle": number, "shoulderTurn": number, "hipTurn": number, "leadArmAngle": number },
        "finishAngles": { "spineAngle": number, "shoulderTurn": number, "hipTurn": number, "leadArmAngle": number },
        "estimatedClubSpeed": number,
        "estimatedClubPath": string,
        "estimatedDistance": number
      }
    `;

    const result = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            { fileData: { fileUri: uploadedFile.uri!, mimeType: uploadedFile.mimeType! } },
          ],
        },
      ],
    });

    const responseText = result.text ?? "";
    const jsonStr = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(jsonStr);

  } catch (error) {
    console.error("Error analyzing swing video with Gemini:", error);
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
