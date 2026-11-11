'use strict';

const { z } = require('zod');

const submitOnboardingSchema = z.object({
  phone: z
    .string({ required_error: 'Phone number is required' })
    .min(10, 'Phone number must be at least 10 digits')
    .max(15, 'Phone number must not exceed 15 digits')
    .regex(/^\+?[\d\s\-()]+$/, 'Phone number contains invalid characters')
    .trim(),
  address: z
    .string({ required_error: 'Address is required' })
    .min(10, 'Address must be at least 10 characters')
    .max(500, 'Address must not exceed 500 characters')
    .trim(),
  dateOfBirth: z
    .string({ required_error: 'Date of birth is required' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be in YYYY-MM-DD format')
    .refine((val) => {
      const date = new Date(val);
      if (isNaN(date.getTime())) return false;
      const today = new Date();
      const age = today.getFullYear() - date.getFullYear();
      return age >= 18 && age <= 120;
    }, 'You must be at least 18 years old'),
  occupation: z
    .string({ required_error: 'Occupation is required' })
    .min(2, 'Occupation must be at least 2 characters')
    .max(100, 'Occupation must not exceed 100 characters')
    .trim(),
});

const reviewOnboardingSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED'], {
    required_error: 'Status must be APPROVED or REJECTED',
  }),
  reviewNote: z
    .string()
    .max(500, 'Review note must not exceed 500 characters')
    .trim()
    .optional(),
});

module.exports = { submitOnboardingSchema, reviewOnboardingSchema };
