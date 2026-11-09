import { z } from 'zod';

export const passwordRules = [
  { key: 'length', label: 'Mínimo de 8 caracteres', test: (v: string) => v.length >= 8 },
  { key: 'max_length', label: 'Máximo de 128 caracteres', test: (v: string) => v.length <= 128 },
  { key: 'uppercase', label: 'Uma letra maiúscula', test: (v: string) => /[A-Z]/.test(v) },
  { key: 'lowercase', label: 'Uma letra minúscula', test: (v: string) => /[a-z]/.test(v) },
  { key: 'digit', label: 'Um número', test: (v: string) => /\d/.test(v) },
  { key: 'special', label: 'Um caractere especial', test: (v: string) => /[^A-Za-z0-9]/.test(v) },
] as const;

export const newPasswordSchema = z.string().superRefine((password, context) => {
  for (const rule of passwordRules) {
    if (!rule.test(password)) context.addIssue({ code: 'custom', message: rule.label });
  }
});
