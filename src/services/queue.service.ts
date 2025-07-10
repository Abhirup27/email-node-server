import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { Email } from '../types/email';
import { CustomLogger } from './logger.service';
import {EmailService} from "./EmailService/email.service";
import Redis from "ioredis";

export class QueueService {
    private emailServiceInstance: EmailService | null;

    private emailQueue: Queue;
    private worker: Worker;
   // private readonly redisClient: IORedis;

    constructor(
        private readonly logger: CustomLogger,
        private readonly redisInstance: Redis,

    ) {
        this.emailServiceInstance = null;

        // this.redisClient = new IORedis(redisUrl, {
        //     maxRetriesPerRequest: null,
        //     enableOfflineQueue: true,
        // });

        this.emailQueue = new Queue('emailQueue', {
            connection: redisInstance,
        });

        this.worker = new Worker(
            'emailQueue',
            async (job) => {
                logger.debug(`Processing job ${job.id}`, 'QueueService');
                await this.emailServiceInstance!.processEmailJob(job);
                // This will be implemented in EmailService later
                return job.data;
            },
            { connection: this.redisInstance, concurrency: 10},
        );

        this.setupEventListeners();
    }

    private setupEventListeners() {
        this.worker.on('completed', (job) => {
            this.logger.log(`Job ${job.id} completed`, 'QueueService');
        });

        this.worker.on('failed', (job, err) => {
            this.logger.error(`Job ${job?.id} failed: ${err.message}`, err.stack);
        });

        this.worker.on('error', (err) => {
            this.logger.error(`Worker error: ${err.message}`, err.stack);
        });
    }

    async addEmailJob(email: Email, jobId?: string) {
        return await this.emailQueue.add('sendEmail', email, {
            jobId: jobId || undefined,
            attempts: 10,
            backoff: {
                type: 'exponential',
                delay: 5000,
            },
            removeOnComplete: true,
            removeOnFail: false,
        });
    }

    async close() {
        await this.worker.close();
        await this.emailQueue.close();
        await this.redisInstance.quit();
    }

    public setEmailServiceInstance(emailService: EmailService) {
        this.emailServiceInstance = emailService;
    }
}