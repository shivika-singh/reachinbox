import IORedis from 'ioredis';
import { config } from './config';

export const redis = new IORedis(config.redisUrl);
redis.on('error', (e) => console.error('[redis]', e.message));

/**
 * Atomic fixed-window counter. Runs inside Redis as one Lua script, so it is safe
 * across any number of workers / server instances.
 * Returns 1 if a slot was taken, 0 if the limit for this window is already reached.
 */
const TAKE_SLOT = `
local c = redis.call('INCR', KEYS[1])
if c == 1 then redis.call('EXPIRE', KEYS[1], 7200) end
if c > tonumber(ARGV[1]) then
  redis.call('DECR', KEYS[1])
  return 0
end
return 1
`;

export const slotKey = (senderId: string, win: number) => `rl:${senderId}:${win}`;

export async function takeSlot(senderId: string, win: number, limit: number) {
  const r = await redis.eval(TAKE_SLOT, 1, slotKey(senderId, win), String(limit));
  return Number(r) === 1;
}

export async function releaseSlot(senderId: string, win: number) {
  await redis.decr(slotKey(senderId, win));
}

/** true only for the FIRST caller per sender per window -> one Slack alert per hit, not one per job */
export async function firstLimitHit(senderId: string, win: number) {
  const r = await redis.set(`rl:notified:${senderId}:${win}`, '1', 'EX', 7200, 'NX');
  return r === 'OK';
}
