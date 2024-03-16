const express = require('express');
const router = express.Router()
const {register, login, refreshToken} = require('../Controller/auth')

router.post('/register', register);
router.post('/login', login);
router.post('/refreshToken', refreshToken);

module.exports = router