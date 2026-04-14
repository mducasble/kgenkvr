import fs from "fs";
import log from "electron-log";
import type { UploadQueueItem, EnqueueUploadPayload, UploadQueueState } from "../../shared/types";

/**
 * UploadQueueService — manages a persistent queue of file uploads with retry logic.
 *
 * TODO: Implement real upload functionality.
 * Recommended approach:
 *   - Use electron-store to persist the queue across app restarts
 *   - Use got or node-fetch for HTTP uploads with progress tracking
 *   - Support multipart upload for large files
 *   - Implement exponential backoff for retries
 *
 * Upload strategies:
 *   - Direct upload: POST to presigned S3/GCS URL
 *   - Server-mediated: POST to your backend, which relays to storage
 */
export class UploadQueueService {
  private queue: UploadQueueItem[] = [];
  private isProcessing = false;
  private readonly maxConcurrent = 2;
  private readonly maxRetries = 3;

  enqueue(payload: EnqueueUploadPayload): UploadQueueItem {
    const item: UploadQueueItem = {
      id: `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      recordingId: payload.recordingId,
      filePath: payload.filePath,
      fileName: payload.filePath.split("/").pop() ?? "unknown",
      fileSizeBytes: fs.existsSync(payload.filePath)
        ? fs.statSync(payload.filePath).size
        : 0,
      status: "pending",
      progress: 0,
      uploadedBytes: 0,
      destinationUrl: payload.destinationUrl,
      retryCount: 0,
      maxRetries: this.maxRetries,
      enqueuedAt: new Date().toISOString(),
    };

    this.queue.push(item);
    log.info("UploadQueueService: enqueued", item.id);

    if (!this.isProcessing) {
      this.processQueue();
    }

    return item;
  }

  private async processQueue(): Promise<void> {
    this.isProcessing = true;

    // TODO: Implement queue processing
    // 1. Get up to maxConcurrent pending items
    // 2. Upload each with progress tracking
    // 3. On success: update status to "completed"
    // 4. On failure: increment retryCount, schedule retry with backoff
    //    If retryCount >= maxRetries: mark as "failed"

    log.warn("UploadQueueService.processQueue not implemented");
    this.isProcessing = false;
  }

  private async uploadItem(item: UploadQueueItem): Promise<void> {
    log.info("UploadQueueService.uploadItem", item.id);
    item.status = "uploading";
    item.startedAt = new Date().toISOString();

    // TODO: Implement actual HTTP upload
    // Option A — presigned URL (recommended for large files):
    //   const presignedUrl = item.destinationUrl ?? await getPresignedUrl(item);
    //   await fetch(presignedUrl, { method: "PUT", body: fs.createReadStream(item.filePath) })
    //
    // Option B — multipart upload for very large files:
    //   Use AWS SDK or similar for chunked upload with per-chunk progress

    throw new Error("UploadQueueService.uploadItem not implemented");
  }

  retry(uploadId: string): void {
    const item = this.queue.find((i) => i.id === uploadId);
    if (!item) throw new Error(`Upload ${uploadId} not found`);
    item.status = "pending";
    item.retryCount = 0;
    item.error = undefined;
    if (!this.isProcessing) this.processQueue();
  }

  cancel(uploadId: string): void {
    const idx = this.queue.findIndex((i) => i.id === uploadId);
    if (idx !== -1) {
      this.queue[idx].status = "cancelled";
      log.info("UploadQueueService: cancelled", uploadId);
    }
  }

  getState(): UploadQueueState {
    return {
      items: [...this.queue],
      isProcessing: this.isProcessing,
      totalPending: this.queue.filter((i) => i.status === "pending").length,
      totalCompleted: this.queue.filter((i) => i.status === "completed").length,
      totalFailed: this.queue.filter((i) => i.status === "failed").length,
    };
  }
}
