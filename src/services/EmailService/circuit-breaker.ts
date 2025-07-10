export class CircuitBreaker {
    private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
    private failureCount = 0;
    private lastFailure = 0;
    private readonly threshold = 3;
    private readonly resetTimeout = 10000; // 10 seconds

    isAvailable(): boolean {
        if (this.state === 'OPEN') {
            console.log('provider is not available, waiting for reset');
            const now = Date.now();
            if (now - this.lastFailure > this.resetTimeout) {
                this.state = 'HALF_OPEN';
                console.log('provider is half open, trying again');
                return true;
            }
            return false;
        }
        return true;
    }

    recordSuccess() {
        this.state = 'CLOSED';
        this.failureCount = 0;
    }

    recordFailure() {
        this.failureCount++;
        if (this.failureCount >= this.threshold) {
            console.log('Circuit breaker is open');
            this.state = 'OPEN';
            this.lastFailure = Date.now();
        }
    }
}
