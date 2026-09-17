import type { FastifyInstance } from 'fastify';
import { AppError, isAppError, type AppErrorCode } from './errors.ts';
import { createTicketSchema, staffIdBodySchema, ticketStatusQuerySchema } from './schema.ts';
import type { TicketService } from './service.ts';

const STATUS_BY_CODE: Record<AppErrorCode, number> = {
  validation: 400,
  not_found: 404,
  conflict: 409,
  forbidden: 403,
};

function payload(statusCode: number, code: string, message: string) {
  return { statusCode, code, error: { code, message }, message };
}

function paramsId(params: unknown): string {
  return String((params as { id?: unknown })?.id ?? '');
}

export async function registerTicketHandlers(
  app: FastifyInstance,
  service: TicketService,
): Promise<void> {
  app.setErrorHandler((error, request, reply) => {
    if (isAppError(error)) {
      const statusCode = STATUS_BY_CODE[error.code];
      return reply.code(statusCode).send(payload(statusCode, error.code, error.message));
    }

    const reported = (error as { statusCode?: unknown }).statusCode;
    const statusCode = typeof reported === 'number' ? reported : 500;
    if (statusCode >= 400 && statusCode < 500) {
      return reply.code(statusCode).send(payload(statusCode, 'validation', 'Invalid request'));
    }

    // never leak internals of an unexpected failure
    request.log.error(error);
    return reply.code(500).send(payload(500, 'internal', 'Internal Server Error'));
  });

  app.setNotFoundHandler((_request, reply) =>
    reply.code(404).send(payload(404, 'not_found', 'Not Found')),
  );

  app.post('/tickets', async (request, reply) => {
    const body = createTicketSchema.safeParse(request.body);
    if (!body.success) {
      throw new AppError('validation', 'Invalid ticket payload');
    }
    return reply.code(201).send(await service.create(body.data));
  });

  app.get('/tickets', async (request) => {
    const query = (request.query ?? {}) as { status?: unknown };
    if (query.status === undefined) {
      return { tickets: await service.list() };
    }

    const status = ticketStatusQuerySchema.safeParse(query.status);
    if (!status.success) {
      throw new AppError('validation', 'Unknown ticket status');
    }
    return { tickets: await service.list(status.data) };
  });

  app.post('/tickets/:id/assign', async (request) => {
    const body = staffIdBodySchema.safeParse(request.body);
    if (!body.success) {
      throw new AppError('validation', 'staffId is required');
    }
    return service.assign(paramsId(request.params), body.data.staffId);
  });

  app.post('/tickets/:id/complete', async (request) => {
    const body = staffIdBodySchema.safeParse(request.body);
    if (!body.success) {
      throw new AppError('validation', 'staffId is required');
    }
    return service.complete(paramsId(request.params), body.data.staffId);
  });

  app.post('/tickets/:id/cancel', async (request) =>
    service.cancel(paramsId(request.params)),
  );
}
