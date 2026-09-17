import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  assertEventBusFitsDeployment,
  createEventBusFacade,
  createInProcessEventBus,
  getEventBus,
  MULTI_INSTANCE_BUS_MESSAGE,
  resetEventBus,
  setEventBus,
} from '../src/lib/eventBus.js';
import { instanceCount } from '../src/lib/runtime.js';
import { appointmentEvents } from '../src/services/appointmentOps.js';

function fakeSharedBus() {
  const received = [];
  return {
    received,
    bus: {
      kind: 'fake-redis',
      shared: true,
      emit: (event, payload) => received.push({ event, payload }),
      on: () => () => {},
      off: () => {},
    },
  };
}

describe('pluggable real-time event bus', () => {
  afterEach(() => {
    resetEventBus();
  });

  it('defaults to a process-local emitter', () => {
    const bus = getEventBus();
    assert.equal(bus.kind, 'in-process');
    assert.equal(bus.shared, false);
  });

  it('delivers events to subscribers of the in-process bus', () => {
    const bus = createInProcessEventBus();
    const seen = [];
    const unsubscribe = bus.on('slotReleased', (payload) => seen.push(payload));

    bus.emit('slotReleased', { slotId: 'a' });
    unsubscribe();
    bus.emit('slotReleased', { slotId: 'b' });

    assert.deepEqual(seen, [{ slotId: 'a' }]);
  });

  it('routes existing publishers to a bus installed later, with no call-site change', () => {
    const { bus, received } = fakeSharedBus();
    setEventBus(bus);

    // `appointmentEvents` was imported long before the swap.
    appointmentEvents.emit('slotBooked', { slotId: 'xyz' });

    assert.equal(appointmentEvents.kind, 'fake-redis');
    assert.equal(appointmentEvents.shared, true);
    assert.deepEqual(received, [{ event: 'slotBooked', payload: { slotId: 'xyz' } }]);
  });

  it('rejects a bus that does not implement the contract', () => {
    assert.throws(() => setEventBus({ kind: 'broken' }), /must implement emit/);
    assert.throws(() => setEventBus({ emit() {}, on() {} }), /must implement off/);
  });

  it('reads the instance count from INSTANCE_COUNT or WEB_CONCURRENCY', () => {
    assert.equal(instanceCount({}), 1);
    assert.equal(instanceCount({ WEB_CONCURRENCY: '4' }), 4);
    assert.equal(instanceCount({ INSTANCE_COUNT: '3', WEB_CONCURRENCY: '9' }), 3);
    assert.equal(instanceCount({ WEB_CONCURRENCY: 'not-a-number' }), 1);
  });

  it('refuses to start in production when several instances share a process-local bus', () => {
    assert.throws(
      () =>
        assertEventBusFitsDeployment({
          env: { NODE_ENV: 'production', WEB_CONCURRENCY: '3' },
          log: { warn: () => {} },
        }),
      { message: MULTI_INSTANCE_BUS_MESSAGE },
    );
  });

  it('only warns outside production so local multi-instance work still runs', () => {
    const warnings = [];
    const result = assertEventBusFitsDeployment({
      env: { WEB_CONCURRENCY: '3' },
      log: { warn: (message, context) => warnings.push({ message, context }) },
    });

    assert.equal(result.ok, false);
    assert.equal(result.instances, 3);
    assert.equal(warnings.length, 1);
    assert.equal(warnings[0].message, MULTI_INSTANCE_BUS_MESSAGE);
  });

  it('is satisfied by a single instance or by a shared bus', () => {
    const quiet = { warn: () => assert.fail('should not warn') };

    assert.equal(
      assertEventBusFitsDeployment({ env: { NODE_ENV: 'production' }, log: quiet }).ok,
      true,
    );

    const { bus } = fakeSharedBus();
    setEventBus(bus);
    assert.equal(
      assertEventBusFitsDeployment({
        env: { NODE_ENV: 'production', WEB_CONCURRENCY: '8' },
        log: quiet,
      }).ok,
      true,
    );
  });

  it('facade resolves the bus lazily on every call', () => {
    const first = createInProcessEventBus();
    let current = first;
    const facade = createEventBusFacade(() => current);
    const seen = [];

    facade.on('slotBooked', (payload) => seen.push(payload));
    facade.emit('slotBooked', { n: 1 });

    current = createInProcessEventBus();
    facade.emit('slotBooked', { n: 2 });

    assert.deepEqual(seen, [{ n: 1 }]);
  });
});
