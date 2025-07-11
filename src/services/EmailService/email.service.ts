import {CustomLogger} from "../logger.service";
import {CacheProvider} from "../../providers/cache.provider";
import {Email} from "../../types/email";
import {QueueService} from "../QueueService/queue.service";
import {CircuitBreaker} from "./circuit-breaker";
import {MailSenderProvider} from "./providers/MailSender/mailSender.provider";
import {createMailProvider, MailProvider} from "./providers/mailSender.factory";
import {RateLimiter} from "./rate-limiter";
import {Job} from "bullmq";

export class EmailService {
    private providers : MailSenderProvider[];
    private circuitBreakers: Map<string, CircuitBreaker>;
    private rateLimiters: Map<string, RateLimiter>;
    private readonly maxAttempts = 3;
    private readonly baseDelay = 1000;
    constructor(

        protected logger: CustomLogger,
        protected cacheInstance: CacheProvider,
        private queueService: QueueService,
        testProviders: MailSenderProvider[] = [],
    ) {
        /**
         * passed from the tests
         * */
        if(!testProviders.length) {
            this.providers = [createMailProvider(MailProvider.Provider1),
                createMailProvider(MailProvider.Provider2)];
        }else {
            this.providers = testProviders.map(provider => provider);
        }
        this.circuitBreakers = new Map();
        this.rateLimiters = new Map();
        this.providers.forEach(provider => {
            this.circuitBreakers.set(provider.name, new CircuitBreaker());
            this.rateLimiters.set(
                provider.name,
                new RateLimiter(cacheInstance, 10, 15)
            );
        });
    }
    async getEmailStatus(key:string, userEmail: string): Promise<string | null> {
        this.logger.debug("Fetching email status", this.getEmailStatus.name);
        const email =await this.cacheInstance.get<string>(key);
        // if(email) {
        //     if(email.email.senderEmail == userEmail){
        //
        //     }
        // }

        if(email){
            return email;
        }
        return null;
    }

    async getEmails() {


    }
    async initSendEmail(email: Email, key: string) {
        try{
            //send the email to the bullmq queue
            await this.queueService.addEmailJob(email, key);
            return JSON.parse(await this.cacheInstance.get<string>(key) ?? '');
        } catch(error){
            if(error instanceof Error){
                await this.updateStatus(key, 'failed', 'Failed adding to job queue \n' + error.message);
                this.logger.error(`Error adding email to queue: ${error.message}`, error.stack);
            }
        }
        return {
            status: 'failed',
            message: 'Error adding email to queue'
        }

    }
    async processEmailJob(job: Job | { id: string, data: object, attemptsMade: number}): Promise<void> {
        const email: Email = job.data;
        const idempotencyKey = job.id!;

        try {
            await this.updateStatus(idempotencyKey, 'processing', 'Email entered in queue. Sending email now.');
            await this.sendEmail(email);
            await this.updateStatus(idempotencyKey, 'sent', 'Email sent successfully');
            this.logger.log(`Email sent successfully: ${idempotencyKey}`);
        } catch (error) {
            if(error instanceof Error){
                await this.updateStatus(idempotencyKey, 'failed', error.message);
                throw error;
            }
        }
    }
    async sendEmail(email: Email) {
        let lastError: Error | null = null;

        for( const provider of this.providers) {
            const circuitBreaker = this.circuitBreakers.get(provider.name)!;
            const rateLimiter = this.rateLimiters.get(provider.name)!;

            if(!circuitBreaker.isAvailable()) {continue};
            if(!await rateLimiter.checkLimit(provider.name)) {continue};

            for(let attempt=1; attempt <= this.maxAttempts; attempt++) {
                try{
                    await provider.sendEmail(email);
                    circuitBreaker.recordSuccess();
                    return;
                } catch(error){
                    lastError = error as Error;
                    circuitBreaker.recordFailure();
                    if(error instanceof Error){
                        this.logger.warn(`Error sending email to ${email.recipientEmail} using ${provider.name}: ${error.message}`, error.stack);
                    }

                    // Exponential backoff between retrying with the next provider.
                    const delay = Math.pow(2, attempt) * this.baseDelay;
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        throw lastError || new Error('All providers failed');
    }
    private async updateStatus(idempotencyKey: string, status: string, message: string = '') {
        const existing = await this.cacheInstance.get<string>(idempotencyKey);
        const parsedExisting = existing ? JSON.parse(existing) : null;
        switch(status){
            case 'processing':
                this.logger.log(`Email ${idempotencyKey} is being processed`);
                await this.cacheInstance.set(
                    idempotencyKey,
                    JSON.stringify({
                        status: 'processing',
                        message: message,
                        senderEmail: parsedExisting.senderEmail,
                        requestHash: parsedExisting.requestHash,
                        statusCode: 202,
                        jobId: idempotencyKey,
                        createdAt: parsedExisting.createdAt,
                    }),
                    24 * 60 * 60 // 24 hours TTL
                );
                break;
                case 'sent':
                    this.logger.log(`Email ${idempotencyKey} was sent successfully`);
                    await this.cacheInstance.set(
                        idempotencyKey,
                        JSON.stringify({
                            message: message,
                        status: 'sent',
                            senderEmail: parsedExisting.senderEmail,
                        statusCode: 201,
                        requestHash: parsedExisting.requestHash,
                        createdAt: parsedExisting.createdAt,

                        }),
                        24 * 60 * 60
                    )
                break;
            case 'failed':
                this.logger.log(`Email ${idempotencyKey} failed to send`);
                await this.cacheInstance.set(idempotencyKey, JSON.stringify({
                    status: 'failed',

                    senderEmail: parsedExisting.senderEmail,
                    statusCode: 503,
                    message: message,
                    requestHash: parsedExisting.requestHash,
                    createdAt: parsedExisting.createdAt,
                    }),
                    24 * 60 * 60
                )
                break;
        }
    }

}

// Export a singleton instance
//export const emailService = new EmailService();