import ffmpeg from 'fluent-ffmpeg';
import installer from '@ffmpeg-installer/ffmpeg';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

ffmpeg.setFfmpegPath(installer.path);

const TARGET_SIZE_MB = 25;

/**
 * Gets the duration of a video in seconds using ffprobe.
 */
function getVideoDuration(inputPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) return reject(err);
      const duration = metadata.format.duration || 10;
      resolve(duration);
    });
  });
}

/**
 * Compresses a video to target approximately TARGET_SIZE_MB.
 * Uses calculated bitrate based on video duration to hit the target size.
 * Also caps resolution at 1080p.
 *
 * @param inputPath - Absolute path to the raw video file
 * @returns The absolute path to the newly compressed video file
 */
export async function compressVideo(inputPath: string): Promise<string> {
  const fileName = path.basename(inputPath);
  const dirName = path.dirname(inputPath);
  const ext = path.extname(fileName);
  const outputPath = path.join(dirName, `compressed-${uuidv4()}${ext}`);

  console.log(`Starting compression for: ${inputPath}`);

  // Get video duration to calculate target bitrate
  const durationSec = await getVideoDuration(inputPath);
  const inputSizeBytes = (await fs.stat(inputPath)).size;
  const inputSizeMB = inputSizeBytes / (1024 * 1024);

  console.log(`Video duration: ${durationSec.toFixed(1)}s, input size: ${inputSizeMB.toFixed(1)}MB`);

  // If already under target, just scale to 1080p max without heavy re-encoding
  if (inputSizeMB <= TARGET_SIZE_MB) {
    console.log(`File already under ${TARGET_SIZE_MB}MB, light re-encode only.`);
    return encodeWithCrf(inputPath, outputPath, 23);
  }

  // Calculate target video bitrate in kbps
  // target_size_bits = TARGET_SIZE_MB * 8 * 1024 * 1024
  // Subtract ~128kbps for audio
  const targetBitsPerSec = (TARGET_SIZE_MB * 8 * 1024 * 1024) / durationSec;
  const audioBitrate = 128 * 1024; // 128kbps in bits
  const videoBitrateKbps = Math.max(500, Math.floor((targetBitsPerSec - audioBitrate) / 1024));

  console.log(`Target video bitrate: ${videoBitrateKbps}kbps for ~${TARGET_SIZE_MB}MB output`);

  return encodeWithBitrate(inputPath, outputPath, videoBitrateKbps);
}

function encodeWithCrf(inputPath: string, outputPath: string, crf: number): Promise<string> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions(['-vf scale=-2:\'min(1080,ih)\''])
      .videoCodec('libx264')
      .outputOptions([
        `-crf ${crf}`,
        '-preset fast',
        '-movflags +faststart'
      ])
      .on('end', async () => {
        console.log(`Compression finished. Output: ${outputPath}`);
        await cleanupOriginal(inputPath);
        resolve(outputPath);
      })
      .on('error', (err: Error) => {
        console.error('Error during video compression:', err);
        reject(err);
      })
      .save(outputPath);
  });
}

function encodeWithBitrate(inputPath: string, outputPath: string, videoBitrateKbps: number): Promise<string> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions(['-vf scale=-2:\'min(1080,ih)\''])
      .videoCodec('libx264')
      .videoBitrate(`${videoBitrateKbps}k`)
      .audioBitrate('128k')
      .outputOptions([
        `-maxrate ${videoBitrateKbps}k`,
        `-bufsize ${videoBitrateKbps * 2}k`,
        '-preset fast',
        '-movflags +faststart'
      ])
      .on('end', async () => {
        console.log(`Compression finished. Output: ${outputPath}`);
        const outSize = (await fs.stat(outputPath)).size / (1024 * 1024);
        console.log(`Output size: ${outSize.toFixed(1)}MB (target: ${TARGET_SIZE_MB}MB)`);
        await cleanupOriginal(inputPath);
        resolve(outputPath);
      })
      .on('error', (err: Error) => {
        console.error('Error during video compression:', err);
        reject(err);
      })
      .save(outputPath);
  });
}

async function cleanupOriginal(inputPath: string) {
  try {
    await fs.unlink(inputPath);
    console.log(`Deleted original raw file: ${inputPath}`);
  } catch (e) {
    console.error(`Failed to delete raw file ${inputPath}:`, e);
  }
}
