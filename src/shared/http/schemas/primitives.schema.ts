import { z } from 'zod';

export const uuidSchema = z.string().trim().toLowerCase().uuid();
export const requiredTextSchema = z.string().trim().min(1);
