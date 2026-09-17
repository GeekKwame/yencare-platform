import { EventEmitter } from 'node:events';

import { logger } from './logger.js';
import { instanceCount, isProduction } from './runtime.js';

/**
 * Pluggable event bus behind the real-time (SSE) layer.
 *
 * The default implementation is a process-local EventEmitter, which is only
 * correct for a single API instance. A shared implementation (Redis pub/sub,
 * NATS, Postgres LISTEN/NOTIFY) can be installed with `setEventBus()` at boot
 * without touching any publisher or subscriber: it only has to satisfy
 * `{ kind, shared, emit, on, off }`.
 */

/**
 * @typedef {object} EventBus
 * @property {string} kind Human-readable implementation name, used in logs.
 * @property {boolean} shared True when every API instance sees every event.
 * @property {(event: string, payload: unknown) => void} emit
 * @property {(event: string, listener: (payload: any) => void) => () => void} on Returns an unsubscribe function.
 * @property {(event: string, listener: (payload: any) => void) => void} off
 */

/** @returns {EventBus} */
export function createInProcessEventBus() {
  const emitter = new EventEmitter();
  // Every open SSE client registers listeners; the default limit of 10 would
  // print spurious leak warnings under normal load.
  emitter.setMaxListeners(0);

  return {
    kind: 'in-process',
    shared: false,
    emit(event, payload) {
      emitter.emit(event, payload);
    },
    on(event, listener) {
      emitter.on(event, listener);
      return () => emitter.off(event, listener);
    },
    off(event, listener) {
      emitter.off(event, listener);
    },
  };
}

let activeBus = createInProcessEventBus();

/**
 * @param {EventBus} bus
 * @returns {EventBus}
 */
export function setEventBus(bus) {
  for (const method of ['emit', 'on', 'off']) {
    if (typeof bus?.[method] !== 'function') {
      throw new Error(`Event bus must implement ${method}()`);
    }
  }

  activeBus = {
    kind: bus.kind || 'custom',
    shared: Boolean(bus.shared),
    emit: bus.emit.bind(bus),
    on: bus.on.bind(bus),
    off: bus.off.bind(bus),
  };

  return activeBus;
}

/** @returns {EventBus} */
export function getEventBus() {
  return activeBus;
}

/** Restores the built-in process-local bus. Used by tests. */
export function resetEventBus() {
  activeBus = createInProcessEventBus();
  return activeBus;
}

/**
 * EventEmitter-shaped facade that always talks to the currently installed bus,
 * so publishers/subscribers can be imported once at module load and still pick
 * up a bus swapped in later during boot.
 *
 * @param {() => EventBus} [resolve]
 */
export function createEventBusFacade(resolve = getEventBus) {
  return {
    get kind() {
      return resolve().kind;
    },
    get shared() {
      return resolve().shared;
    },
    emit(event, payload) {
      resolve().emit(event, payload);
    },
    on(event, listener) {
      return resolve().on(event, listener);
    },
    off(event, listener) {
      resolve().off(event, listener);
    },
  };
}

export const MULTI_INSTANCE_BUS_MESSAGE =
  'Real-time updates are broadcast on a process-local event bus, but this deployment is configured for more than one instance. ' +
  'SSE clients on other instances will silently miss slotBooked/slotReleased events. ' +
  'Install a shared bus with setEventBus(), or run a single instance (INSTANCE_COUNT/WEB_CONCURRENCY=1).';

/**
 * Boot guard for Task 9.
 *
 * Deliberately asymmetric: in production a multi-instance deployment on the
 * in-process bus is a correctness bug users would experience as a frozen queue,
 * so we refuse to start. Outside production we only warn loudly, because
 * developers legitimately set WEB_CONCURRENCY while experimenting locally and
 * a hard failure there would be hostile.
 *
 * @param {{ env?: NodeJS.ProcessEnv, bus?: EventBus, log?: { warn: Function } }} [options]
 */
export function assertEventBusFitsDeployment({
  env = process.env,
  bus = getEventBus(),
  log = logger,
} = {}) {
  const instances = instanceCount(env);
  const result = { ok: true, instances, busKind: bus.kind, shared: Boolean(bus.shared) };

  if (instances <= 1 || bus.shared) {
    return result;
  }

  if (isProduction(env)) {
    throw new Error(MULTI_INSTANCE_BUS_MESSAGE);
  }

  log.warn(MULTI_INSTANCE_BUS_MESSAGE, {
    subsystem: 'event-bus',
    busKind: bus.kind,
    instances,
  });

  return { ...result, ok: false };
}
