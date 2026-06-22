const { EventEmitter } = require('events');
const { randomUUID } = require('crypto');

const enterpriseBus = new EventEmitter();
enterpriseBus.setMaxListeners(0);

function clonePlain(value) {
  if (value == null) return value;

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

function toIso(value) {
  if (!value) {
    return new Date().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }

  return parsed.toISOString();
}

function publish(channel, payload = {}) {
  const event = {
    id: randomUUID(),
    channel,
    payload: clonePlain(payload),
    createdAt: toIso(),
  };

  enterpriseBus.emit(channel, event);
  return event;
}

function subscribe(channel, listener) {
  enterpriseBus.on(channel, listener);
  return () => enterpriseBus.off(channel, listener);
}

function once(channel, listener) {
  enterpriseBus.once(channel, listener);
  return () => enterpriseBus.off(channel, listener);
}

function clearListeners(channel) {
  if (channel) {
    enterpriseBus.removeAllListeners(channel);
    return;
  }

  enterpriseBus.removeAllListeners();
}

module.exports = {
  enterpriseBus,
  publish,
  subscribe,
  once,
  clearListeners,
};
