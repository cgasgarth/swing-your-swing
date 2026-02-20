import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PYTHON_SCRIPT = path.join(__dirname, 'pose_analysis.py');

// Use .venv/bin/python3 if available (MediaPipe requires Python 3.12, not 3.13+)
const PROJECT_ROOT = path.resolve(__dirname, '../../../../');
const VENV_PYTHON = path.join(PROJECT_ROOT, '.venv', 'bin', 'python3');
const PYTHON_BIN = existsSync(VENV_PYTHON) ? VENV_PYTHON : 'python3';

export interface PoseAngles {
  spineAngle: number;
  shoulderTurn: number;
  hipTurn: number;
  leadArmAngle: number;
}

export interface PoseAnalysisResult {
  timestampsMs: {
    address: number;
    top: number;
    impact: number;
    finish: number;
  };
  addressAngles: PoseAngles;
  topAngles: PoseAngles;
  impactAngles: PoseAngles;
  finishAngles: PoseAngles;
  metadata: {
    fps: number;
    totalFrames: number;
    totalDurationMs: number;
  };
}

/**
 * Runs MediaPipe pose analysis on a golf swing video.
 * Requires Python 3 with mediapipe and opencv-python installed.
 */
export async function analyzePose(videoPath: string): Promise<PoseAnalysisResult> {
  return new Promise((resolve, reject) => {
    console.log(`Running local pose analysis on: ${videoPath} (python: ${PYTHON_BIN})`);

    const python = spawn(PYTHON_BIN, [PYTHON_SCRIPT, videoPath]);

    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
      // MediaPipe prints a lot of info to stderr — only log warnings/errors
      const line = data.toString().trim();
      if (line.includes('ERROR') || line.includes('error')) {
        console.error('[pose.py]', line);
      }
    });

    python.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Pose analysis failed (exit ${code}): ${stderr.slice(0, 500)}`));
      }

      try {
        const result = JSON.parse(stdout.trim());
        if (result.error) {
          return reject(new Error(`Pose analysis error: ${result.error}`));
        }
        console.log(`Pose analysis complete. Timestamps: address=${result.timestampsMs.address}ms, top=${result.timestampsMs.top}ms, impact=${result.timestampsMs.impact}ms`);
        resolve(result as PoseAnalysisResult);
      } catch {
        reject(new Error(`Failed to parse pose analysis output: ${stdout.slice(0, 200)}`));
      }
    });

    python.on('error', (err) => {
      reject(new Error(`Failed to spawn ${PYTHON_BIN}: ${err.message}. Run: python3.12 -m venv .venv && source .venv/bin/activate && pip install mediapipe opencv-python numpy`));
    });
  });
}
