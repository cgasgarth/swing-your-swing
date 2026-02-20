import ffmpeg from 'fluent-ffmpeg';
import installer from '@ffmpeg-installer/ffmpeg';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

ffmpeg.setFfmpegPath(installer.path);

/**
 * Compresses an input video to a maximum height of 1080p proportionally.
 * If the video is already smaller than 1080p, it will re-encode it at original size
 * to ensure a standard format and reasonable bitrate.
 *
 * @param inputPath - Absolute path to the raw video file
 * @returns The absolute path to the newly compressed video file
 */
export async function compressVideo(inputPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const fileName = path.basename(inputPath);
    const dirName = path.dirname(inputPath);
    const ext = path.extname(fileName);
    const outputPath = path.join(dirName, `compressed-${uuidv4()}${ext}`);

    console.log(`Starting compression for: ${inputPath}`);

    ffmpeg(inputPath)
    // Scale proportionally, capping height at 1080px.
    // Using a raw output filter guarantees we don't upscale sub-1080p footage.
      .outputOptions(['-vf scale=-2:\'min(1080,ih)\''])
      .videoCodec('libx264')
      .outputOptions([
        '-crf 28',         // Constant Rate Factor (0-51) - 28 is a good balance for smaller files
        '-preset fast',      // Speed vs compression tradeoff
        '-movflags +faststart' // Allows video to start playing before fully downloaded
      ])
      .on('end', async () => {
        console.log(`Compression finished. Output: ${outputPath}`);

        // Delete the original raw upload to save space
        try {
          await fs.unlink(inputPath);
          console.log(`Deleted original raw file: ${inputPath}`);
        } catch (e) {
          console.error(`Failed to delete raw file ${inputPath}:`, e);
        }

        resolve(outputPath);
      })
      .on('error', (err: Error) => {
        console.error('Error during video compression:', err);
        reject(err);
      })
      .save(outputPath);
  });
}
