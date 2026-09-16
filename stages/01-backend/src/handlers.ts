import type { FastifyInstance } from 'fastify';
import { createTicketSchema, staffIdBodySchema, ticketStatusQuerySchema } from './schema.ts';
import { AppError } from './errors.ts';
import type { TicketService } from './service.ts';

const STATUS_CODES: Record<string, number> = {
  validation: 400,
  not_found: 404,
  conflict: 409,
  forbidden: 403,
};

export async function registerTicketHandlers(app: FastifyInstance, service: TicketService): Promise<void> {
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.status(STATUS_CODES[error.code] ?? 500).send({ code: error.code, message: error.message });
    }
    return reply.status(500).send({ code: 'internal', message: 'Internal server error' });
  });

  app.post('/tickets', async (request, reply) => {
    const parsed = createTicketSchema.safeParse(request.body);
    if (!parsed.success) throw new AppError('validation', 'Invalid ticket data');
    const ticket = await service.create(parsed.data);
    return reply.status(201).send(ticket);
  });

  app.post('/tickets/:id/assign', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = staffIdBodySchema.safeParse(request.body);
    if (!parsed.success) throw new AppError('validation', 'Invalid staffId');
    const ticket = await service.assign(id, parsed.data.staffId);
    return reply.send(ticket);
  });

  app.post('/tickets/:id/complete', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = staffIdBodySchema.safeParse(request.body);
    if (!parsed.success) throw new AppError('validation', 'Invalid staffId');
    const ticket = await service.complete(id, parsed.data.staffId);
    return reply.send(ticket);
  });

  app.post('/tickets/:id/cancel', async (request, reply) => {
    const { id } = request.params as { id: string };
    const ticket = await service.cancel(id);
    return reply.send(ticket);
  });

  app.get('/tickets', async (request, reply) => {
    const { status } = request.query as { status?: string };
    let filter;
    if (status !== undefined) {
      const parsed = ticketStatusQuerySchema.safeParse(status);
      if (!parsed.success) throw new AppError('validation', 'Invalid status');
      filter = parsed.data;
    }
    const tickets = await service.list(filter);
    return reply.send(tickets);
  });
}