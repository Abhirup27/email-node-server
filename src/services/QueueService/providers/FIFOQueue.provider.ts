import { EmailService } from "../../EmailService/email.service";
import {QueueProvider} from "./queue.provider";
import {Email} from "../../../types/email";
import {CustomLogger} from "../../logger.service";

//**
// This is a FIFO queue implementation. It does not create a new thread or a process like BullMQ does if you have multiple workers.
// It uses promises and the event loop to have concurrency.
// */
export class FIFOQueueProvider implements QueueProvider {
    public name: string = 'FIFOQueue';

    private emailServiceInstance: EmailService | null = null;
    private queue: { id: string; data: Email; attempts: number; nextDelay: number }[] = [];
    private inProgress = 0;
    private concurrency = 10;
    private intervalId: NodeJS.Timeout;
    private timeoutIds: NodeJS.Timeout[] = [];

    constructor(private logger: CustomLogger) {
        this.intervalId = setInterval(() => this.processQueue(), 500);
    }

    private generateJobId(): string {
        return `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    private async processJob(job: { id: string; data: Email; attempts: number; nextDelay: number }) {
        try {
            this.logger.debug(`Processing job ${job.id}`, 'SimpleQueueProvider');
            await this.emailServiceInstance!.processEmailJob({
                id: job.id,
                data: job.data,
                attemptsMade: 10 - job.attempts,
            });
            this.logger.log(`Job ${job.id} completed`, 'SimpleQueueProvider');
        } catch (err) {
            this.logger.error(`Job ${job.id} failed: ${(err as Error).message}`, 'SimpleQueueProvider');

            if (job.attempts > 1) {
                job.attempts--;
                job.nextDelay *= 2;
                //when the timeout(the delay) is done, the job is pushed back to the queue. The timeout object from the array is removed by filtering the id out.
                const timeoutId = setTimeout(() => {
                    this.queue.push(job);
                    this.timeoutIds = this.timeoutIds.filter(id => id !== timeoutId);
                }, job.nextDelay);

                this.timeoutIds.push(timeoutId);
            }
        } finally {
            this.inProgress--;
        }
    }

    private processQueue() {
        while (this.inProgress < this.concurrency && this.queue.length > 0) {
            const job = this.queue.shift()!;
            this.inProgress++;
            this.processJob(job);
        }
    }

    async addEmailJob(email: Email, jobId?: string) {
        this.queue.push({
            id: jobId || this.generateJobId(),
            data: email,
            attempts: 10, //attempts is decremented in processJob()
            nextDelay: 5000
        });
    }

    async close() {
        clearInterval(this.intervalId);
        this.timeoutIds.forEach(clearTimeout);
        this.queue = [];
    }

    setEmailServiceInstance(emailService: EmailService) {
        this.emailServiceInstance = emailService;
    }
}