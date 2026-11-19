import { describe, expect, it } from 'vitest';

import { isSessionEvent, mapEvent } from './events';

describe('mapEvent', () => {
  it('maps a V2 child session creation', () => {
    expect(mapEvent({
      data: { info: { id: 'child', parentID: 'root' }, sessionID: 'child' },
      type: 'session.created',
    })).toEqual({ info: { id: 'child', parentID: 'root' }, type: 'child-created' });
  });

  it('maps a V1-compatible child session creation', () => {
    expect(mapEvent({
      properties: { info: { id: 'child', parentID: 'root' }, sessionID: 'child' },
      type: 'session.created',
    })).toEqual({ info: { id: 'child', parentID: 'root' }, type: 'child-created' });
  });

  it('falls back to the payload session id when info is missing', () => {
    expect(mapEvent({ data: { sessionID: 'child' }, type: 'session.created' })).toEqual({
      info: { id: 'child', parentID: undefined },
      type: 'child-created',
    });
  });

  it('maps session updates and diffs to activity', () => {
    expect(mapEvent({ data: { info: { id: 'child' }, sessionID: 'child' }, type: 'session.updated' }))
      .toEqual({ sessionID: 'child', type: 'activity' });
    expect(mapEvent({ data: { diff: [], sessionID: 'child' }, type: 'session.diff' }))
      .toEqual({ sessionID: 'child', type: 'activity' });
  });

  it('maps message events to activity', () => {
    expect(mapEvent({ data: { info: { sessionID: 'child' }, sessionID: 'child' }, type: 'message.updated' }))
      .toEqual({ sessionID: 'child', type: 'activity' });
    expect(mapEvent({
      data: { part: { sessionID: 'child' }, sessionID: 'child', time: 1 },
      type: 'message.part.updated',
    })).toEqual({ sessionID: 'child', type: 'activity' });
  });

  it('reads the session id from the message part itself', () => {
    expect(mapEvent({ data: { part: { sessionID: 'child' } }, type: 'message.part.updated' }))
      .toEqual({ sessionID: 'child', type: 'activity' });
  });

  it('maps session status for every known status', () => {
    for (const status of ['busy', 'retry', 'idle']) {
      expect(mapEvent({ data: { sessionID: 'child', status: { type: status } }, type: 'session.status' }))
        .toEqual({ sessionID: 'child', status, type: 'status' });
    }
  });

  it('ignores an unknown session status', () => {
    expect(mapEvent({ data: { sessionID: 'child', status: { type: 'weird' } }, type: 'session.status' }))
      .toBeUndefined();
  });

  it('maps idle and deleted sessions', () => {
    expect(mapEvent({ data: { sessionID: 'child' }, type: 'session.idle' }))
      .toEqual({ sessionID: 'child', type: 'idle' });
    expect(mapEvent({ data: { sessionID: 'child' }, type: 'session.deleted' }))
      .toEqual({ sessionID: 'child', type: 'deleted' });
  });

  it('ignores unrelated, malformed and id-less events', () => {
    expect(mapEvent({ data: {}, type: 'installation.updated' })).toBeUndefined();
    expect(mapEvent({})).toBeUndefined();
    expect(mapEvent(undefined)).toBeUndefined();
    expect(mapEvent(null)).toBeUndefined();
    expect(mapEvent('session.idle')).toBeUndefined();
    expect(mapEvent({ data: { status: { type: 'busy' } }, type: 'session.status' })).toBeUndefined();
    expect(mapEvent({ data: {}, type: 'session.created' })).toBeUndefined();
  });
});

describe('isSessionEvent', () => {
  it('recognizes session and message events only', () => {
    expect(isSessionEvent('session.idle')).toBe(true);
    expect(isSessionEvent('message.part.updated')).toBe(true);
    expect(isSessionEvent('installation.updated')).toBe(false);
  });
});
