'use strict';

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const { loginRateLimiter, registerRateLimiter } = require('../middleware/rateLimiter');
const { registerSchema, loginSchema } = require('../validators/auth.validator');

router.post('/register', registerRateLimiter, validate(registerSchema), authController.register);
router.post('/login', loginRateLimiter, validate(loginSchema), authController.login);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);

module.exports = router;
