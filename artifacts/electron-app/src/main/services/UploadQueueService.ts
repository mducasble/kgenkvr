import fs from "fs";
import path from "path";
import log from "electron-log";
import { S3Client, HeadBucketCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import type { UploadQueueItem, EnqueueUploadPayload, UploadQueueState } from "../../shared/types";

type ProgressCallback = (item: UploadQueueItem) => void;

function buildS3Client(): S3Client | null {
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!region || !accessKeyId || !secretAccessKey) {
    log.warn("UploadQueueService: AWS credentials not configured — uploads will be simulated");
    return null;
  }

  return new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export class UploadQueueService {
  private queue: UploadQueueItem[] = [];
  private isProcessing = false;
  private readonly maxConcurrent = 1;
  private readonly maxRetries = 3;
  private progressCallback?: ProgressCallback;

  private readonly s3: S3Client | null;
  private readonly bucket: string | undefined;

  constructor() {
    this.s3 = buildS3Client();
    this.bucket = process.env.AWS_S3_BUCKET;

    if (this.s3 && this.bucket) {
      log.info(`UploadQueueService: S3 configured — bucket=${this.bucket}, region=${process.env.AWS_REGION}`);
      // Verify bucket accessibility at startup (non-blocking)
      this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }))
        .then(() => log.info("UploadQueueService: bucket accessible ✓"))
        .catch((e: Error) => log.warn("UploadQueueService: bucket check failed —", e.message));
    } else {
      log.warn("UploadQueueService: running in mock-upload mode (set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_S3_BUCKET to enable real uploads)");
    }
  }

  onProgress(cb: ProgressCallback): void {
    this.progressCallback = cb;
  }

  enqueue(payload: EnqueueUploadPayload): UploadQueueItem {
    const item: UploadQueueItem = {
      id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      recordingId: payload.recordingId,
      filePath: payload.filePath,
      fileName: path.basename(payload.filePath),
      fileSizeBytes: this.getFileSize(payload.filePath),
      status: "pending",
      progress: 0,
      uploadedBytes: 0,
      destinationUrl: payload.destinationUrl,
      retryCount: 0,
      maxRetries: this.maxRetries,
      enqueuedAt: new Date().toISOString(),
    };

    this.queue.push(item);
    log.info("UploadQueueService: enqueued", item.id, item.fileName);

    if (!this.isProcessing) {
      setImmediate(() => this.processQueue());
    }

    return item;
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (true) {
      const pending = this.queue.filter(
        (i) => i.status === "pending" && i.retryCount < i.maxRetries
      );
      if (pending.length === 0) break;

      const batch = pending.slice(0, this.maxConcurrent);
      await Promise.all(batch.map((item) => this.uploadItem(item)));
    }

    this.isProcessing = false;
    log.info("UploadQueueService: queue exhausted");
  }

  private async uploadItem(item: UploadQueueItem): Promise<void> {
    item.status = "uploading";
    item.startedAt = new Date().toISOString();
    this.progressCallback?.(item);
    log.info("UploadQueueService: uploading", item.id, item.fileName);

    try {
      if (this.s3 && this.bucket) {
        await this.uploadToS3(item);
      } else {
        await this.simulateUpload(item);
      }
      item.status = "completed";
      item.progress = 100;
      item.uploadedBytes = item.fileSizeBytes;
      item.completedAt = new Date().toISOString();
      this.progressCallback?.(item);
      log.info("UploadQueueService: completed", item.id);
    } catch (err) {
      item.retryCount++;
      if (item.retryCount >= item.maxRetries) {
        item.status = "failed";
        item.error = (err as Error).message;
        this.progressCallback?.(item);
        log.error("UploadQueueService: failed after retries", item.id, err);
      } else {
        item.status = "pending";
        log.warn("UploadQueueService: will retry", item.id, item.retryCount);
      }
    }
  }

  private async uploadToS3(item: UploadQueueItem): Promise<void> {
    const bucket = this.bucket!;
    const s3 = this.s3!;

    if (!fs.existsSync(item.filePath)) {
      throw new Error(`File not found: ${item.filePath}`);
    }

    // S3 key: sessions/<recordingId>/<filename>
    const s3Key = `sessions/${item.recordingId}/${item.fileName}`;
    const fileSize = this.getFileSize(item.filePath);
    item.fileSizeBytes = fileSize;

    const fileStream = fs.createReadStream(item.filePath);

    const uploader = new Upload({
      client: s3,
      params: {
        Bucket: bucket,
        Key: s3Key,
        Body: fileStream,
        ContentType: this.guessContentType(item.fileName),
        Metadata: {
          recordingId: item.recordingId,
          originalName: item.fileName,
        },
      },
      // 10 MB parts, max 4 concurrent part uploads
      partSize: 10 * 1024 * 1024,
      queueSize: 4,
    });

    uploader.on("httpUploadProgress", (progress) => {
      if (progress.loaded && progress.total) {
        item.uploadedBytes = progress.loaded;
        item.progress = Math.round((progress.loaded / progress.total) * 100);
        this.progressCallback?.(item);
      }
    });

    const result = await uploader.done();

    // Store the S3 URL back on the item
    const region = process.env.AWS_REGION ?? "us-east-1";
    item.destinationUrl = `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}`;
    log.info("UploadQueueService: S3 upload complete", (result as { Location?: string }).Location ?? item.destinationUrl);
  }

  private simulateUpload(item: UploadQueueItem): Promise<void> {
    const durationMs = 4000 + Math.random() * 4000;
    const steps = 20;
    const interval = durationMs / steps;

    return new Promise((resolve) => {
      let step = 0;
      const timer = setInterval(() => {
        step++;
        item.progress = Math.round((step / steps) * 100);
        item.uploadedBytes = Math.round((item.fileSizeBytes * step) / steps);
        this.progressCallback?.(item);

        if (step >= steps) {
          clearInterval(timer);
          resolve();
        }
      }, interval);
    });
  }

  private guessContentType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const map: Record<string, string> = {
      ".webm": "video/webm",
      ".mp4": "video/mp4",
      ".mp3": "audio/mpeg",
      ".wav": "audio/wav",
      ".ogg": "audio/ogg",
      ".json": "application/json",
      ".txt": "text/plain",
    };
    return map[ext] ?? "application/octet-stream";
  }

  retry(uploadId: string): void {
    const item = this.queue.find((i) => i.id === uploadId);
    if (!item) throw new Error(`Upload ${uploadId} not found`);
    item.status = "pending";
    item.retryCount = 0;
    item.error = undefined;
    item.progress = 0;
    item.uploadedBytes = 0;
    log.info("UploadQueueService: retry queued", uploadId);
    if (!this.isProcessing) {
      setImmediate(() => this.processQueue());
    }
  }

  cancel(uploadId: string): void {
    const item = this.queue.find((i) => i.id === uploadId);
    if (item && item.status !== "completed") {
      item.status = "cancelled";
      log.info("UploadQueueService: cancelled", uploadId);
    }
  }

  getState(): UploadQueueState {
    return {
      items: this.queue.map((i) => ({ ...i })),
      isProcessing: this.isProcessing,
      totalPending: this.queue.filter((i) => i.status === "pending" || i.status === "uploading").length,
      totalCompleted: this.queue.filter((i) => i.status === "completed").length,
      totalFailed: this.queue.filter((i) => i.status === "failed").length,
    };
  }

  private getFileSize(filePath: string): number {
    try {
      return fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;
    } catch {
      return 0;
    }
  }
}
