import { z } from 'zod';
import { requiredTextSchema } from '../../../shared/http/schemas/primitives.schema';

export const createCustomerSchema = z.strictObject({
  name: requiredTextSchema.max(150),
  cpf: z.string().overwrite((value) => value.replace(/\D/g, '')).min(1)
    .describe('Documento normalizado para dígitos, sem limite de tamanho ou checksum.'),
  email: z.string().trim().toLowerCase().email().max(254),
});
