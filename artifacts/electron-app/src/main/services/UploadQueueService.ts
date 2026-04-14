import fs from "fs";
import log from "electron-log";
import type { UploadQueueItem, EnqueueUploadPayload, UploadQueueState } from "../../shared/types";

type ProgressCallback = (item: UploadQueueItem) => void;

/**
 * UploadQueueService — persistent upload queue with simulated progress.
 *
 * MOCK IMPLEMENTATION: simulates upload progress over 4–8 seconds.
 * For real integration, replace simulateUpload() with actual HTTP multipart upload.
 *
 * Real integration options:
 *   - Presigned S3 URL: PUT with Content-Length + progress via readable stream
 *   - Custom backend: POST multipart/form-data
 *   - Resumable: TUS protocol (tus-js-client)
 */
export class UploadQueueService {
  private queue: UploadQueueItem[] = [];
  private isProcessing = false;
  private readonly maxConcurrent = 1;
  private readonly maxRetries = 3;
  private progressCallback?: ProgressCallback;

  onProgress(cb: ProgressCallback): void {
    this.progressCallback = cb;
  }

  enqueue(payload: EnqueueUploadPayload): UploadQueueItem {
    const item: UploadQueueItem = {
      id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      recordingId: payload.recordingId,
      filePath: payload.filePath,
      fileName: payload.filePath.split("/").pop() ?? "recording.webm",
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
    log.info("UploadQueueService: uploading", item.id);

    try {
      await this.simulateUpload(item);
      item.status = "completed";
      item.progress = 100;
      item.uploadedBytes = item.fileSizeBytes;
      item.completedAt = new Date().toISOString();
      log.info("UploadQueueService: completed", item.id);
    } catch (err) {
      item.retryCount++;
      if (item.retryCount >= item.maxRetries) {
        item.status = "failed";
        item.error = (err as Error).message;
        log.error("UploadQueueService: failed after retries", item.id, err);
      } else {
        item.status = "pending";
        log.warn("UploadQueueService: will retry", item.id, item.retryCount);
      }
    }
  }

  private simulateUpload(item: UploadQueueItem): Promise<void> {
    const durationMs = 4000 + Math.random() * 4000;
    const steps = 20;
    const interval = durationMs / steps;

    return new Promise((resolve, reject) => {
      if (!process.env.UPLOAD_ENDPOINT && item.destinationUrl === undefined) {
        // Mock mode — no real endpoint configured
        log.info("UploadQueueService: mock upload (no UPLOAD_ENDPOINT set)");
      }

      let step = 0;
      const timer = setInterval(() => {
        step++;
        item.progress = Math.round((step / steps) * 100);
        item.uploadedBytes = Math.round((item.fileSizeBytes * step) / steps);
        this.progressCallback?.(item);

        if (step >= steps) {
          clearInterval(timer);
          // Simulate 5% chance of failure for testing retry logic
          if (item.retryCount === 0 && Math.random() < 0.05) {
            reject(new Error("Simulated upload error"));
          } else {
            resolve();
          }
        }
      }, interval);
    });
  }

  retry(uploadId: string): void {
    const item = this.queue.find((i) => i.id === uploadId);
    if (!item) throw new Error(`Upload ${uploadId} not found`);
    item.status = "pending";
    item.retryCount = 0;
    item.error = undefined;
    item.progress = 0;
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
