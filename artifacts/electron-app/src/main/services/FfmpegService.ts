import fs from "fs";
import path from "path";
import log from "electron-log";
import type { FfmpegJob, FfmpegJobConfig } from "../../shared/types";

/**
 * FfmpegService — post-processing wrapper.
 *
 * STUB IMPLEMENTATION for prototype. The stub:
 *   - "concat" operation: verifies input files exist, resolves immediately
 *   - "extract-audio": copies the source file as audio output (same container)
 *   - All other operations: resolve immediately with no-op
 *
 * For real integration, replace processJob() bodies with actual ffmpeg-static calls.
 * Install: pnpm add ffmpeg-static && pnpm add -D @types/ffmpeg-static
 */
export class FfmpegService {
  private jobs = new Map<string, FfmpegJob>();

  async processJob(config: FfmpegJobConfig, jobId: string): Promise<FfmpegJob> {
    log.info("FfmpegService.processJob (stub)", { jobId, operation: config.operation });

    const job: FfmpegJob = {
      id: jobId,
      config,
      status: "running",
      progress: 0,
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
    };
    this.jobs.set(jobId, job);

    try {
      await this.runStubOperation(config, job);
      job.status = "completed";
      job.progress = 100;
      job.outputPath = config.outputPath;
      job.completedAt = new Date().toISOString();
      log.info("FfmpegService: job completed (stub)", jobId);
    } catch (err) {
      job.status = "failed";
      job.error = (err as Error).message;
      log.error("FfmpegService: job failed", jobId, err);
    }

    this.jobs.set(jobId, job);
    return job;
  }

  private async runStubOperation(config: FfmpegJobConfig, job: FfmpegJob): Promise<void> {
    switch (config.operation) {
      case "concat": {
        // Validate inputs exist
        for (const inputPath of config.inputPaths) {
          if (!fs.existsSync(inputPath)) {
            throw new Error(`Input file not found: ${inputPath}`);
          }
        }
        // STUB: copy first input to output (no real concatenation)
        if (config.inputPaths.length > 0 && config.inputPaths[0] !== config.outputPath) {
          fs.copyFileSync(config.inputPaths[0], config.outputPath);
        }
        await this.fakeProgress(job, 1500);
        break;
      }

      case "extract-audio": {
        const inputPath = config.inputPaths[0];
        if (!inputPath || !fs.existsSync(inputPath)) {
          throw new Error(`Input file not found: ${inputPath}`);
        }
        // STUB: copy recording file as "audio" file (same container, different path)
        const ext = path.extname(inputPath);
        const audioOut = config.outputPath.endsWith(ext)
          ? config.outputPath
          : config.outputPath.replace(/\.[^.]+$/, ext);
        fs.copyFileSync(inputPath, audioOut);
        // Update outputPath to the actual extension used
        config.outputPath = audioOut;
        await this.fakeProgress(job, 800);
        break;
      }

      case "transcode":
      case "compress":
        if (config.inputPaths[0] && fs.existsSync(config.inputPaths[0])) {
          fs.copyFileSync(config.inputPaths[0], config.outputPath);
        }
        await this.fakeProgress(job, 2000);
        break;

      case "thumbnail":
        // STUB: write a tiny placeholder file
        fs.writeFileSync(config.outputPath, "THUMBNAIL_STUB");
        await this.fakeProgress(job, 300);
        break;

      case "trim":
        if (config.inputPaths[0] && fs.existsSync(config.inputPaths[0])) {
          fs.copyFileSync(config.inputPaths[0], config.outputPath);
        }
        await this.fakeProgress(job, 1000);
        break;

      default:
        await this.fakeProgress(job, 500);
    }
  }

  private fakeProgress(job: FfmpegJob, durationMs: number): Promise<void> {
    return new Promise((resolve) => {
      const steps = 10;
      const interval = durationMs / steps;
      let step = 0;
      const timer = setInterval(() => {
        step++;
        job.progress = Math.min(95, (step / steps) * 100);
        if (step >= steps) {
          clearInterval(timer);
          resolve();
        }
      }, interval);
    });
  }

  cancelJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (job && job.status === "running") {
      job.status = "cancelled";
      log.info("FfmpegService: cancelled job", jobId);
    }
  }

  getJob(jobId: string): FfmpegJob | undefined {
    return this.jobs.get(jobId);
  }
}
