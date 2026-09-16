import type { FastifyInstance } from 'fastify';
import { AppError, isAppError } from './errors.ts';
import type { AppErrorCode } from './errors.ts';
import { staffIdBodySchema, ticketStatusQuerySchema } from './schema.ts';
import type { TicketService } from './service.ts';

const HTTP_STATUS: Record<AppErrorCode, number> = {
  validation: 400,
  not_found: 404,
  conflict: 409,
  forbidden: 403,
};

export async function registerTicketHandlers(
  app: FastifyInstance,
  service: TicketService,
): Promise<void> {
  app.post('/tickets', async (request, reply) => {
    const ticket = await service.create(request.body);
    return reply.status(201).send(ticket);
  });

  app.get<{ Querystring: { status?: string } }>('/tickets', async (request, reply) => {
    const raw = request.query?.status;
    if (raw === undefined) {
      return reply.send(await service.list());
    }

    const parsed = ticketStatusQuerySchema.safeParse(raw);
    if (!parsed.success) {
      throw new AppError('validation', 'unknown status filter');
    }

    return reply.send(await service.list(parsed.data));
  });

  app.post<{ Params: { id: string } }>('/tickets/:id/assign', async (request, reply) => {
    return reply.send(await service.assign(request.params.id, staffId(request.body)));
  });

  app.post<{ Params: { id: string } }>('/tickets/:id/complete', async (request, reply) => {
    return reply.send(await service.complete(request.params.id, staffId(request.body)));
  });

  app.post<{ Params: { id: string } }>('/tickets/:id/cancel', async (request, reply) => {
    return reply.send(await service.cancel(request.params.id));
  });

  app.setErrorHandler((error, _request, reply) => {
    if (isAppError(error)) {
      return reply.status(HTTP_STATUS[error.code]).send({
        error: error.code,
        message: error.message,
      });
    }

    return reply.status(500).send({ error: 'internal' });
  });
}

function staffId(body: unknown): string {
  const parsed = staffIdBodySchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError('validation', 'staffId must be a uuid');
  }
  return parsed.data.staffId;
}
