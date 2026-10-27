// Общий лимит для одного администратора. Перезапуск API сбрасывает счётчик.
export class LoginLimit {
  private attempts = 0;
  private resetAt = 0;

  constructor(
    private readonly now: () => number = Date.now,
    private readonly maxAttempts = 10,
    private readonly windowMs = 15 * 60 * 1000,
  ) {}

  retryAfter(): number {
    const now = this.now();
    if (now >= this.resetAt) {
      this.attempts = 0;
      this.resetAt = now + this.windowMs;
    }
    if (this.attempts >= this.maxAttempts) return Math.ceil((this.resetAt - now) / 1000);
    this.attempts++;
    return 0;
  }
}
