/**
 * Zod validation middleware factory.
 * Usage: router.post('/path', validate(schema), handler)
 *
 * Validates req.body against the provided Zod schema.
 * Returns 400 with field-level error details on failure.
 * On success, replaces req.body with the parsed (cleaned) data.
 */

'use strict';

const { ValidationError } = require('../utils/errors');

/**
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @param {'body' | 'query' | 'params'} source - Which part of req to validate
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const details = result.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      return next(new ValidationError('Validation failed', details));
    }

    // Replace with parsed data (strips extra fields, coerces types)
    req[source] = result.data;
    next();
  };
}

module.exports = validate;
