'use strict';

const { z } = require('zod');

const transferSchema = z.object({
  receiverAccountId: z
    .string({ required_error: 'Receiver account ID is required' })
    .min(1, 'Receiver account ID cannot be empty'),

  // amountPaise must be a positive integer (paise, not rupees)
  // The frontend should convert ₹ to paise before sending
  amountPaise: z
    .number({ required_error: 'Amount is required', invalid_type_error: 'Amount must be a number' })
    .int('Amount must be a whole number (paise)')
    .positive('Amount must be greater than zero')
    .max(10_000_000_00, 'Amount exceeds maximum transfer limit'), // ₹1,00,00,000 = 10000000 rupees

  note: z
    .string()
    .max(200, 'Note must not exceed 200 characters')
    .trim()
    .optional(),
});

module.exports = { transferSchema };
