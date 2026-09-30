import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
const WINDOW_MS = 10000;
const MAX_REQUESTS_PER_WINDOW = 30;
const MAX_TRACKED_KEYS = 5000;
interface HitEntry {
  count: number;
  resetAt: number;
}
@Injectable()
export class SearchRateLimitGuard implements CanActivate {
  private readonly hits = new Map<string, HitEntry>();
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const key = String(req.user?.userId ?? req.ip ?? 'anonymous');
    const now = Date.now();
    if (this.hits.size > MAX_TRACKED_KEYS) this.prune(now);
    const entry = this.hits.get(key);
    if (!entry || entry.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
      return true;
    }
    if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
      throw new HttpException('Too many search requests. Please slow down and try again shortly.', HttpStatus.TOO_MANY_REQUESTS);
    }
    entry.count += 1;
    return true;
  }
  private prune(now: number) {
    for (const [key, entry] of this.hits) {
      if (entry.resetAt <= now) this.hits.delete(key);
    }
  }
}