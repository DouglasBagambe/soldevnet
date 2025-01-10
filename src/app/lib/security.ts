import { RateLimiter } from "limiter";

export class SecurityUtils {
  private static ipLimiters: Map<string, RateLimiter> = new Map();
  private static CAPTCHA_SITE_KEY = process.env.RECAPTCHA_SITE_KEY || ""; // Default to empty if undefined
  private static CAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY || "";

  static createIpLimiter(ip: string): RateLimiter {
    const limiter = new RateLimiter({
      tokensPerInterval: 2,
      interval: "hour",
      fireImmediately: true,
    });
    this.ipLimiters.set(ip, limiter);
    return limiter;
  }

  static async verifyIpLimit(ip: string): Promise<boolean> {
    let limiter = this.ipLimiters.get(ip);
    if (!limiter) {
      limiter = this.createIpLimiter(ip);
    }
    return await limiter.tryRemoveTokens(1);
  }

  static async verifyCaptcha(token: string): Promise<boolean> {
    try {
      const response = await fetch(
        "https://www.google.com/recaptcha/api/siteverify",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `secret=${this.CAPTCHA_SECRET_KEY}&response=${token}`,
        }
      );
      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error("Captcha verification failed:", error);
      return false;
    }
  }
}
