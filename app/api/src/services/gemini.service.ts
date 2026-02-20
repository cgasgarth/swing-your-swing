import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import { SwingMetrics } from "shared";

const apiKey = process.env.GEMINI_API_KEY || "DUMMY_KEY";
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

async function uploadToGemini(filePath: string, mimeType: string) {
  const fileBytes = fs.readFileSync(filePath);
  return {
    inlineData: {
      data: fileBytes.toString("base64"),
      mimeType,
    },
  };
}

export async function analyzeSwingVideo(videoPath: string, club: string, mimeType: string) {
  if (apiKey === "DUMMY_KEY") return null;

  try {
    console.log(`Analyzing video: ${videoPath} for club: ${club} with MIME: ${mimeType}`);
    const videoPart = await uploadToGemini(videoPath, mimeType);

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

    const result = await model.generateContent([prompt, videoPart]);
    const responseText = result.response.text();

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
    const imagePart = await uploadToGemini(imagePath, "image/jpeg");

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

    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();

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
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const jsonStr = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error(e);
    return null;
  }

}
