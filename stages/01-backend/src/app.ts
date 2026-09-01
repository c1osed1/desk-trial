import Fastify from 'fastify';
import type { TicketService } from './service.ts';
import { registerTicketHandlers } from './handlers.ts';

export async function buildTicketApp(service: TicketService) {
  const app = Fastify({ logger: false });
  await registerTicketHandlers(app, service);
  await app.ready();
  return app;
}
