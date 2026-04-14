import { spawn, ChildProcess } from "child_process";
import path from "path";
import log from "electron-log";
import type { FfmpegJob, FfmpegJobConfig } from "../../shared/types";

/**
 * FfmpegService — wraps ffmpeg subprocess for post-processing recordings.
 *
 * TODO: Install and configure ffmpeg-static or fluent-ffmpeg.
 * Recommended: use `ffmpeg-static` for bundled binary.
 *
 * Install:
 *   pnpm add ffmpeg-static
 *   pnpm add -D @types/ffmpeg-static
 *
 * Supported operations (see FfmpegOperation type):
 *   - concat: Join multiple segments into a single output file
 *   - transcode: Re-encode to different format/codec/quality
 *   - extract-audio: Strip audio track to separate file (for transcription)
 *   - compress: Reduce file size
 *   - thumbnail: Extract a single frame as image
 *   - trim: Cut a specific time range
 */
export class FfmpegService {
  private activeJobs = new Map<string, { job: FfmpegJob; process: ChildProcess }>();
  private ffmpegPath: string;

  constructor() {
    // TODO: Use ffmpeg-static for bundled binary
    // import ffmpegPath from "ffmpeg-static";
    // this.ffmpegPath = ffmpegPath!;
    this.ffmpegPath = "ffmpeg"; // fallback to system ffmpeg
  }

  async processJob(config: FfmpegJobConfig, jobId: string): Promise<FfmpegJob> {
    log.info("FfmpegService.processJob", { jobId, operation: config.operation });

    const job: FfmpegJob = {
      id: jobId,
      config,
      status: "pending",
      progress: 0,
      createdAt: new Date().toISOString(),
    };

    // TODO: Build ffmpeg args based on operation type
    const args = this.buildArgs(config);

    return new Promise((resolve, reject) => {
      const process = spawn(this.ffmpegPath, args);

      job.status = "running";
      job.startedAt = new Date().toISOString();
      this.activeJobs.set(jobId, { job, process });

      process.stderr.on("data", (data: Buffer) => {
        // TODO: Parse ffmpeg progress output to update job.progress
        // ffmpeg outputs progress to stderr with "time=HH:MM:SS.ms" format
        log.debug("ffmpeg stderr:", data.toString());
      });

      process.on("close", (code) => {
        this.activeJobs.delete(jobId);
        if (code === 0) {
          job.status = "completed";
          job.progress = 100;
          job.completedAt = new Date().toISOString();
          job.outputPath = config.outputPath;
          resolve(job);
        } else {
          job.status = "failed";
          job.error = `ffmpeg exited with code ${code}`;
          reject(new Error(job.error));
        }
      });

      process.on("error", (error) => {
        job.status = "failed";
        job.error = error.message;
        this.activeJobs.delete(jobId);
        reject(error);
      });
    });
  }

  private buildArgs(config: FfmpegJobConfig): string[] {
    // TODO: Implement arg building for each operation type
    switch (config.operation) {
      case "concat":
        // Use concat demuxer for lossless joining
        // return ["-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", config.outputPath]
        break;
      case "transcode":
        break;
      case "extract-audio":
        // return ["-i", config.inputPaths[0], "-vn", "-acodec", "pcm_s16le", config.outputPath]
        break;
      case "compress":
        break;
      case "thumbnail":
        break;
      case "trim":
        break;
    }
    throw new Error(`FfmpegService: operation "${config.operation}" not implemented`);
  }

  cancelJob(jobId: string): void {
    const entry = this.activeJobs.get(jobId);
    if (entry) {
      entry.process.kill("SIGTERM");
      entry.job.status = "cancelled";
      this.activeJobs.delete(jobId);
      log.info("FfmpegService: cancelled job", jobId);
    }
  }

  getJob(jobId: string): FfmpegJob | undefined {
    return this.activeJobs.get(jobId)?.job;
  }
}
