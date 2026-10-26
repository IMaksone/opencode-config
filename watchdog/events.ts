/**
 * Pure mapping from opencode server events to watchdog events.
 *
 * No opencode imports on purpose: the plugin only fans the mapped events out to
 * the registry, so the payload shape is unit-testable in isolation.
 */

import type { SessionActivityStatus, SessionInfo } from './state';

export type WatchdogEvent =
  | { info: SessionInfo; type: 'child-created' }
  | { sessionID: string; type: 'activity' }
  | { sessionID: string; type: 'deleted' }
  | { sessionID: string; status: SessionActivityStatus; type: 'status' }
  | { sessionID: string; type: 'idle' };

type Payload = Record<string, unknown>;

const STATUSES: readonly string[] = ['busy', 'idle', 'retry'];

function asRecord(value: unknown): Payload | undefined {
  return typeof value === 'object' && value !== null ? value as Payload : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}

/**
 * V2 payloads carry their fields under `data`, the V1-compatible shape under
 * `properties`. Both are read so a server format change cannot blind the
 * watchdog.
 */
function payloadOf(event: Payload): Payload {
  return asRecord(event.data) ?? asRecord(event.properties) ?? event;
}

function sessionInfoOf(payload: Payload): SessionInfo | undefined {
  const info = asRecord(payload.info);
  const id = asString(info?.id) ?? asString(payload.sessionID);

  if (!id) {
    return undefined;
  }

  return { id, parentID: asString(info?.parentID) };
}

function sessionIDOf(payload: Payload): string | undefined {
  return asString(payload.sessionID)
    ?? asString(asRecord(payload.info)?.sessionID)
    ?? asString(asRecord(payload.part)?.sessionID);
}

function statusOf(payload: Payload): SessionActivityStatus | undefined {
  const raw = asString(asRecord(payload.status)?.type);

  return raw && STATUSES.includes(raw) ? raw as SessionActivityStatus : undefined;
}

/** `true` when the event names a session or message the watchdog tracks. */
export function isSessionEvent(type: string): boolean {
  return type.startsWith('session.') || type.startsWith('message.');
}

/**
 * Map one server event to a watchdog event, or `undefined` when the event is
 * irrelevant. Unknown session and message events are reported by the caller.
 */
export function mapEvent(event: unknown): WatchdogEvent | undefined {
  const record = asRecord(event);
  const type = asString(record?.type);

  if (!record || !type) {
    return undefined;
  }

  const payload = payloadOf(record);

  switch (type) {
    case 'session.created': {
      const info = sessionInfoOf(payload);

      return info ? { info, type: 'child-created' } : undefined;
    }

    case 'session.updated':
    case 'session.diff':
    case 'message.updated':
    case 'message.part.updated': {
      const sessionID = sessionIDOf(payload) ?? asString(asRecord(record.properties)?.sessionID);

      return sessionID ? { sessionID, type: 'activity' } : undefined;
    }

    case 'session.deleted': {
      const sessionID = sessionIDOf(payload);

      return sessionID ? { sessionID, type: 'deleted' } : undefined;
    }

    case 'session.status': {
      const sessionID = sessionIDOf(payload);
      const status = statusOf(payload);

      return sessionID && status ? { sessionID, status, type: 'status' } : undefined;
    }

    case 'session.idle': {
      const sessionID = sessionIDOf(payload);

      return sessionID ? { sessionID, type: 'idle' } : undefined;
    }

    default: {
      return undefined;
    }
  }
}
