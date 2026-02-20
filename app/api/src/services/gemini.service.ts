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
      You are an expert golf coach and biomechanics specialist. 
      Analyze the provided golf swing video. The club being used is a ${club}.

      Perform a frame-by-frame analysis to locate four critical timestamps:
      1. Address 
      2. Top 
      3. Impact 
      4. Finish 
      
      For each of these 4 key positions, measure and estimate the following body angles to the best of your ability:
      - spineAngle 
      - shoulderTurn 
      - hipTurn 
      - leadArmAngle 

      Also estimate the following based on the entire swing:
      - estimatedClubSpeed 
      - estimatedClubPath 
      - estimatedDistance 

      Respond ONLY with a valid JSON object matching this TypeScript interface exactly:
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
