import { EmailService } from './email.service';
import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals';
import { CustomLogger } from "../logger.service";
import { CacheProvider } from "../../providers/cache.provider";
import { QueueService } from "../QueueService/queue.service";
import { createMailProvider, MailProvider } from "./providers/mailSender.factory";
import { Job } from "bullmq";
import { Email } from "../../types/email";
import {MailSenderA} from "./providers/MailSender/mailSenderA.provider";
import {MailSenderB} from "./providers/MailSender/mailSenderB.provider";

// Mock all dependencies
jest.mock("../logger.service");
jest.mock("../../providers/cache.provider");
jest.mock("../QueueService/queue.service");
jest.mock("./providers/mailSender.factory");
jest.mock("./circuit-breaker");
jest.mock("./rate-limiter");

describe('EmailService', () => {
    let emailService: EmailService;
    let mockLogger: jest.Mocked<CustomLogger>;
    let mockCache: jest.Mocked<CacheProvider>;
    let mockQueueService: jest.Mocked<QueueService>;
    let mockProvider1: jest.Mocked<MailSenderA>;
    let mockProvider2: jest.Mocked<MailSenderB>;

    beforeEach(() => {
        // Setup mock implementations
        mockLogger = { log: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() } as any;
        mockCache = { get: jest.fn(), set: jest.fn() } as any;
        mockQueueService = { addEmailJob: jest.fn() } as any;

        // Mock email providers
        mockProvider1 = {
            name: 'Provider1',
            sendEmail: jest.fn()
        };
        mockProvider2 = {
            name: 'Provider2',
            sendEmail: jest.fn()
        };

        // Initialize service with test providers
        emailService = new EmailService(
            mockLogger,
            mockCache,
            mockQueueService,
            [mockProvider1, mockProvider2] // Inject test providers
        );
    });

    describe('initSendEmail', () => {
        const testEmail = {senderEmail: 'abc@test.com', recipientEmail: 'test@test.com' } as Email;
        const testKey = 'test-key';

        it('should add email to queue and return status', async () => {
            mockQueueService.addEmailJob.mockResolvedValueOnce();
            mockCache.get.mockResolvedValueOnce(JSON.stringify({ status: 'pending' }));

            const result = await emailService.initSendEmail(testEmail, testKey);
            expect(mockQueueService.addEmailJob).toHaveBeenCalledWith(testEmail, testKey);
            expect(result.status).toBe('pending');
        });

        it('should handle queue errors', async () => {
            const error = new Error('Queue failed');
            mockQueueService.addEmailJob.mockRejectedValueOnce(error);

            const result = await emailService.initSendEmail(testEmail, testKey);
            expect(mockCache.set).toHaveBeenCalledWith(
                testKey,
                expect.stringContaining('"status":"failed"'),
                86400
            );
            expect(result.status).toBe('failed');
        });
    });
    describe('processEmailJob', () => {
        const testJob = {
            id: 'job-123',
            data: { senderEmail: 'abc@gmail.com', recipientEmail: 'test@test.com' } as Email,
            attemptsMade: 1
        };

        it('should send email and update status to sent', async () => {
            jest.spyOn(emailService, 'sendEmail').mockResolvedValueOnce();
            await emailService.processEmailJob(testJob);

            expect(emailService.sendEmail).toHaveBeenCalledWith(testJob.data);
            expect(mockCache.set).toHaveBeenCalledWith(
                testJob.id,
                expect.stringContaining('"status":"sent"'),
                86400
            );
        });

        it('should handle send failures', async () => {
            const error = new Error('Send failed');
            jest.spyOn(emailService, 'sendEmail').mockRejectedValueOnce(error);

            await expect(emailService.processEmailJob(testJob)).rejects.toThrow(error);
            expect(mockCache.set).toHaveBeenCalledWith(
                testJob.id,
                expect.stringContaining('"status":"failed"'),
                86400
            );
        });
    });

    describe('sendEmail', () => {
        const testEmail = { recipientEmail: 'test@test.com' } as Email;

        it('should succeed with first provider', async () => {
            await emailService.sendEmail(testEmail);
            expect(mockProvider1.sendEmail).toHaveBeenCalledWith(testEmail);
        });

        it('should retry failed providers', async () => {
            mockProvider1.sendEmail
                .mockRejectedValueOnce(new Error('Fail 1'))
                .mockRejectedValueOnce(new Error('Fail 2'))
                .mockResolvedValueOnce(undefined); // Third attempt succeeds

            await emailService.sendEmail(testEmail);
            expect(mockProvider1.sendEmail).toHaveBeenCalledTimes(3);
        });

        it('should throw after all providers fail', async () => {
            mockProvider1.sendEmail.mockRejectedValue(new Error('Fail 1'));
            mockProvider2.sendEmail.mockRejectedValue(new Error('Fail 2'));

            await expect(emailService.sendEmail(testEmail)).rejects.toThrow(
                'All providers failed'
            );
        });
    });
    describe('getEmailStatus', () => {
        const testKey = 'test-key';
        const testData = { status: 'sent' };

        it('should return email status', async () => {
            mockCache.get.mockResolvedValueOnce(JSON.stringify(testData));
            const result = await emailService.getEmailStatus(testKey, 'user@test.com');
            expect(JSON.parse(result ?? '')).toEqual(testData);
        });

        it('should return null when not found', async () => {
            mockCache.get.mockResolvedValueOnce(null);
            const result = await emailService.getEmailStatus(testKey, 'user@test.com');
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

        beforeEach(() => {
            mockCache.get.mockResolvedValue(JSON.stringify(testEmailData));
        });

        it('should set processing status', async () => {
            await (emailService as any).updateStatus(testKey, 'processing', 'Processing...');
            expect(mockCache.set).toHaveBeenCalledWith(
                testKey,
                expect.stringContaining('"status":"processing"'),
                86400
            );
        });

        it('should set sent status', async () => {
            await (emailService as any).updateStatus(testKey, 'sent', 'Sent!');
            expect(mockCache.set).toHaveBeenCalledWith(
                testKey,
                expect.stringContaining('"status":"sent"'),
                86400
            );
        });

        it('should set failed status', async () => {
            await (emailService as any).updateStatus(testKey, 'failed', 'Failed!');
            expect(mockCache.set).toHaveBeenCalledWith(
                testKey,
                expect.stringContaining('"status":"failed"'),
                86400
            );
        });
    });
});
