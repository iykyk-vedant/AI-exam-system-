/**
 * Lightweight Redis-backed event bus wrapper with safe fallback.
 */
let Redis;
try {
  Redis = require('ioredis');
} catch (e) {
  Redis = null;
}

let publisher = null;
let subscriber = null;

function init(redisUrl) {
  if (!Redis) return false;
  try {
    publisher = new Redis(redisUrl);
    subscriber = new Redis(redisUrl);
    return true;
  } catch (err) {
    console.error('eventBus init failed', err);
    return false;
  }
}

async function publish(channel, message) {
  try {
    if (!publisher) return false;
    const payload = typeof message === 'string' ? message : JSON.stringify(message);
    await publisher.publish(channel, payload);
    return true;
  } catch (err) {
    console.error('eventBus publish error', err);
    return false;
  }
}

function subscribe(channel, handler) {
  if (!subscriber) return false;
  subscriber.subscribe(channel, (err) => {
    if (err) console.error('eventBus subscribe error', err);
  });
  subscriber.on('message', (ch, message) => {
    if (ch === channel) {
      try {
        const payload = JSON.parse(message);
        handler(payload);
      } catch (e) {
        handler(message);
      }
    }
  });
  return true;
}

module.exports = { init, publish, subscribe };
