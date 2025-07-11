import {QueueProvider} from "./queue.provider";
import {CustomLogger} from "../../logger.service";
import Redis from "ioredis";
import { Queue, Worker } from 'bullmq';
import {EmailService} from "../../EmailService/email.service";
import {Email} from "../../../types/email";

export class BullQueueProvider implements QueueProvider {
    private emailServiceInstance: EmailService | null = null;
    private emailQueue: Queue;
    private worker: Worker;
    public name: string = 'BullMQueue';
    constructor(
        private logger: CustomLogger,
        private redisInstance: Redis,
    ) {

        this.emailQueue = new Queue('emailQueue', {
            connection: redisInstance,
        });

        this.worker = new Worker(
            'emailQueue',
            async (job) => {
                logger.debug(`Processing job ${job.id}`, 'BullQueueProvider');
                await this.emailServiceInstance!.processEmailJob(job);
                return job.data;
            },
            { connection: this.redisInstance, concurrency: 10 }
        );

        this.setupEventListeners();
    }

    private setupEventListeners() {
        this.worker.on('completed', (job) => {
            this.logger.log(`Job ${job.id} completed`, 'BullQueueProvider');
        });

        this.worker.on('failed', (job, err) => {
            this.logger.error(`Job ${job?.id} failed: ${err.message}`, 'BullQueueProvider');
        });

        this.worker.on('error', (err) => {
            this.logger.error(`Worker error: ${err.message}`, 'BullQueueProvider');
        });
    }

    async addEmailJob(email: Email, jobId?: string) {
        await this.emailQueue.add('sendEmail', email, {
            jobId: jobId || undefined,
            attempts: 10,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: true,
            removeOnFail: false,
        });
    }

    async close() {
        await this.worker.close();
        await this.emailQueue.close();
        await this.redisInstance.quit();
    }

    setEmailServiceInstance(emailService: EmailService) {
        this.emailServiceInstance = emailService;
    }
}