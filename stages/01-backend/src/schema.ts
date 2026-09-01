import { z } from 'zod';
import { TICKET_STATUSES, TICKET_TYPES } from './types.ts';

export const uuidSchema = z.string().uuid();

export const createTicketSchema = z.object({
  clubId: uuidSchema,
  type: z.enum(TICKET_TYPES),
  priority: z.number().int().min(1).max(3).optional(),
  comment: z.string().max(500).optional(),
});

export const staffIdBodySchema = z.object({
  staffId: uuidSchema,
});

export const ticketStatusQuerySchema = z.enum(TICKET_STATUSES);

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
