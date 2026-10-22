import type { FastifyInstance } from 'fastify';

export type LiveEvent =
  | { type: 'call.started'; callId: string }
  | { type: 'call.updated'; callId: string }
  | { type: 'call.ended'; callId: string }
  | { type: 'transcript'; callId: string; speaker: string; text: string; interrupted?: boolean }
  | { type: 'agent.token'; callId: string; token: string }
  | { type: 'intelligence'; callId: string; operator: string; result: unknown; trigger: string }
  | { type: 'profile'; callId: string; traits: Record<string, unknown> }
  | { type: 'tool'; callId: string; name: string; args: unknown };

type Listener = (event: LiveEvent) => void;

const listeners = new Set<Listener>();

/** Broadcasts an event to every connected browser. */
export function publish(event: LiveEvent): void {
  for (const listener of listeners) listener(event);
}

/** Registers GET /api/events, a server-sent-events stream of LiveEvent. */
export function registerEventStream(app: FastifyInstance): void {
  app.get('/api/events', (request, reply) => {
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    reply.raw.write(': connected\n\n');
    const listener: Listener = event => reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
    const heartbeat = setInterval(() => reply.raw.write(': ping\n\n'), 15000);
    listeners.add(listener);
    request.raw.on('close', () => {
      clearInterval(heartbeat);
      listeners.delete(listener);
    });
  });
}
