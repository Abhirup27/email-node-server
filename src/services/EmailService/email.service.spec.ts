import { EmailService } from './email.service';
import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { CustomLogger } from "../logger.service";
import { QueueService } from "../QueueService/queue.service";
import { Job } from "bullmq";
import { Email } from "../../types/email";
import { MemoryCacheProvider } from "../../providers/memoryCache.provider";
import { MailSenderProvider } from "./providers/MailSender/mailSender.provider";

// Mock external dependencies
jest.mock("../logger.service");
jest.mock("../QueueService/queue.service");
jest.mock("./circuit-breaker");
jest.mock("./rate-limiter");

describe('EmailService', () => {
    let testHash = 'test-hash';
    let emailService: EmailService;
    let mockLogger: jest.Mocked<CustomLogger>;
    let mockQueueService: jest.Mocked<QueueService>;
    let mockProvider1: jest.Mocked<MailSenderProvider>;
    let mockProvider2: jest.Mocked<MailSenderProvider>;
    let cache: MemoryCacheProvider;

    beforeEach(() => {
        // Setup mock implementations
        mockLogger = {
            log: jest.fn(),
            debug: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        } as any;

        mockQueueService = {
            addEmailJob: jest.fn()
        } as any;

        // Create real memory cache instance
        cache = new MemoryCacheProvider();

        // Mock email providers
        mockProvider1 = {
            name: 'Provider1',
            sendEmail: jest.fn()
        } as any;

        mockProvider2 = {
            name: 'Provider2',
            sendEmail: jest.fn()
        } as any;

        // Initialize service
        emailService = new EmailService(
            mockLogger,
            cache,
            mockQueueService,
            [mockProvider1, mockProvider2]
        );
    });

    // Helper to initialize cache before sending
    const initCacheForEmail = async (key: string, email: Email) => {
        await cache.set(
            key,
            JSON.stringify({
                senderEmail: email.senderEmail,
                status: "queued",
                requestHash:  testHash,
                createdAt: new Date().toISOString()
            }),
            300 // 5-minute reservation
        );
    };

    describe('initSendEmail', () => {
        let testHash = 'test-hash';
        const testEmail = {
            id: 'xyz123',
            body: 'hello world123',
            subject: 'test email',
            senderName: 'test123',
            senderEmail: 'abc@test.com',
            recipientEmail: 'test@test.com',
            requestHash: 'hash123',
            createdAt: new Date().toDateString()
        } as Email;

        const testKey = 'test-key';

        beforeEach(async () => {
            // Initialize cache with queued status before each test
            await initCacheForEmail(testKey, testEmail);
        });

        it('should add email to queue and return pending status', async () => {
            // Setup
            mockQueueService.addEmailJob.mockResolvedValueOnce();

            // Execute
            const result = await emailService.initSendEmail(testEmail, testKey);

            // Verify
            expect(mockQueueService.addEmailJob).toHaveBeenCalledWith(testEmail, testKey);

            // Check cache was updated to pending
            const cacheValue = await cache.get<string>(testKey);
            const parsedValue = JSON.parse(cacheValue!);
            expect(parsedValue.status).toBe('queued');
            expect(result.status).toBe('queued');
        });

        it('should handle queue errors and update cache', async () => {
            // Setup
            const error = new Error('Queue failed');
            mockQueueService.addEmailJob.mockRejectedValueOnce(error);

            // Execute
            const result = await emailService.initSendEmail(testEmail, testKey);

            // Verify cache was updated to failed
            const cacheValue = await cache.get<string>(testKey);
            const parsedValue = JSON.parse(cacheValue!);
            expect(parsedValue.status).toBe('failed');
            expect(parsedValue.message).toContain('Failed adding to job queue');

            // Verify return value
            expect(result.status).toBe('failed');
        });

        it('should preserve original data when updating status', async () => {
            // Setup
            mockQueueService.addEmailJob.mockResolvedValueOnce();

            // Execute
            await emailService.initSendEmail(testEmail, testKey);

            // Verify
            const cacheValue = await cache.get<string>(testKey);
            const parsedValue = JSON.parse(cacheValue!);

            // Original data should be preserved
            expect(parsedValue.senderEmail).toBe(testEmail.senderEmail);
            expect(parsedValue.requestHash).toBe(testHash);
            expect(parsedValue.createdAt).toBe(testEmail.createdAt);
        });
    });

    describe('processEmailJob', () => {
        const testJob = {
            id: 'job-123',
            data: {
                id: 'xyz123',
                body: 'hello world123',
                subject: 'test email',
                senderName: 'test123',
                senderEmail: 'abc@test.com',
                recipientEmail: 'test@test.com',
                requestHash: 'hash123',
                createdAt: new Date().toISOString()
            } as Email,
            attemptsMade: 1,
            testHash: testHash
        };

        beforeEach(async () => {
            // Initialize cache with queued status
            await initCacheForEmail(testJob.id, testJob.data);
        });

        it('should update status to processing when starting', async () => {
            // Setup
            jest.spyOn(emailService, 'sendEmail').mockResolvedValueOnce();

            // Execute
            await emailService.processEmailJob(testJob);

            // Verify initial status update to processing
            const initialCacheValue = await cache.get<string>(testJob.id);
            const initialParsed = JSON.parse(initialCacheValue!);
            expect(initialParsed.status).toBe('processing');
        });

        it('should send email and update status to sent', async () => {
            // Setup
            jest.spyOn(emailService, 'sendEmail').mockResolvedValueOnce();

            // Execute
            await emailService.processEmailJob(testJob);

            // Verify
            const cacheValue = await cache.get<string>(testJob.id);
            const parsedValue = JSON.parse(cacheValue!);
            expect(parsedValue.status).toBe('sent');
        });

        it('should preserve original data when updating status', async () => {
            // Setup
            jest.spyOn(emailService, 'sendEmail').mockResolvedValueOnce();

            // Execute
            await emailService.processEmailJob(testJob);

            // Verify
            const cacheValue = await cache.get<string>(testJob.id);
            const parsedValue = JSON.parse(cacheValue!);

            // Original data should be preserved
            expect(parsedValue.senderEmail).toBe(testJob.data.senderEmail);
            expect(parsedValue.requestHash).toBe(testJob.testHash);
           /// expect(parsedValue.createdAt).toBe(testJob.data.createdAt);
        });

        it('should handle send failures', async () => {
            // Setup
            const error = new Error('Send failed');
            jest.spyOn(emailService, 'sendEmail').mockRejectedValueOnce(error);

            // Execute & Verify
            await expect(emailService.processEmailJob(testJob))
                .rejects.toThrow('All providers failed');

            const cacheValue = await cache.get<string>(testJob.id);
            const parsedValue = JSON.parse(cacheValue!);
            expect(parsedValue.status).toBe('failed');
        });
    });

    describe('cache lifecycle', () => {
        const testKey = 'cache-test-key';
        const testEmail = {
            senderEmail: 'user@test.com',
            requestHash: 'hash123',
            createdAt: new Date().toISOString()
        };

        it('should expire after TTL', async () => {
            // Setup with short TTL
            await cache.set(testKey, JSON.stringify({
                ...testEmail,
                status: "queued"
            }), 1); // 1 second TTL

            // Wait for expiration
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Verify
            const value = await cache.get<string>(testKey);
            expect(value).toBeNull();
        });
    });

    describe('sendEmail', () => {
        const testEmail = {
            id:'xyz123',
            body: 'hello world123',
            subject: 'test email',
            senderName: 'test123',
            senderEmail: 'abc@test.com',
            recipientEmail: 'test@test.com',
            requestHash: 'hash123',
            createdAt: new Date().toISOString()
        } as Email;

        it('should succeed with first provider', async () => {
            // Execute
            await emailService.sendEmail(testEmail);

            // Verify
            expect(mockProvider1.sendEmail).toHaveBeenCalledWith(testEmail);
            expect(mockProvider2.sendEmail).not.toHaveBeenCalled();
        });

        it('should retry failed providers', async () => {
            // Setup
            mockProvider1.sendEmail
                .mockRejectedValueOnce(new Error('Fail 1'))
                .mockRejectedValueOnce(new Error('Fail 2'))
                .mockResolvedValueOnce(undefined);

            // Execute
            await emailService.sendEmail(testEmail);

            // Verify
            expect(mockProvider1.sendEmail).toHaveBeenCalledTimes(3);
        });

        it('should failover to next provider', async () => {
            // Setup
            mockProvider1.sendEmail.mockRejectedValue(new Error('Provider1 down'));
            mockProvider2.sendEmail.mockResolvedValue(undefined);

            // Execute
            await emailService.sendEmail(testEmail);

            // Verify
            expect(mockProvider1.sendEmail).toHaveBeenCalledTimes(3);
            expect(mockProvider2.sendEmail).toHaveBeenCalled();
        });

        it('should throw after all providers fail', async () => {
            // Setup
            mockProvider1.sendEmail.mockRejectedValue(new Error('Fail 1'));
            mockProvider2.sendEmail.mockRejectedValue(new Error('Fail 2'));

            // Execute & Verify
            await expect(emailService.sendEmail(testEmail))
                .rejects.toThrow('All providers failed');
        });
    });

    describe('getEmailStatus', () => {
        const testKey = 'test-key';
        const testData = {
            status: 'sent',
            senderEmail: 'user@test.com',
            requestHash: 'hash123',
            createdAt: new Date().toISOString()
        };

        it('should return email status', async () => {
            // Setup
            await cache.set(testKey, JSON.stringify(testData));

            // Execute
            const result = await emailService.getEmailStatus(testKey, 'user@test.com');

            // Verify
            expect(JSON.parse(result!)).toEqual(testData);
        });

        it('should return null when not found', async () => {
            // Execute
            const result = await emailService.getEmailStatus('invalid-key', 'user@test.com');

            // Verify
            expect(result).toBeNull();
        });

    });

    describe('updateStatus', () => {
        const testKey = 'test-key';
        const testEmailData = {
            senderEmail: 'user@test.com',
            requestHash: 'hash123',
            createdAt: new Date().toISOString()
        };

        beforeEach(async () => {
            await cache.set(testKey, JSON.stringify(testEmailData));
        });

        it('should set processing status', async () => {
            // Execute
            await (emailService as any).updateStatus(testKey, 'processing', 'Processing...');

            // Verify
            const cacheValue = await cache.get<string>(testKey);
            const parsedValue = JSON.parse(cacheValue!);
            expect(parsedValue.status).toBe('processing');
            expect(parsedValue.message).toBe('Processing...');
        });

        it('should set sent status', async () => {
            // Execute
            await (emailService as any).updateStatus(testKey, 'sent', 'Sent!');

            // Verify
            const cacheValue = await cache.get<string>(testKey);
            const parsedValue = JSON.parse(cacheValue!);
            expect(parsedValue.status).toBe('sent');
            expect(parsedValue.statusCode).toBe(201);
        });

        it('should set failed status', async () => {
            // Execute
            await (emailService as any).updateStatus(testKey, 'failed', 'Failed!');

            // Verify
            const cacheValue = await cache.get<string>(testKey);
            const parsedValue = JSON.parse(cacheValue!);
            expect(parsedValue.status).toBe('failed');
            expect(parsedValue.statusCode).toBe(503);
        });
    });
});