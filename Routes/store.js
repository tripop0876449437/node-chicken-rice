const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../Middleware/auth');
const { addStoreSales, getStoreSales } = require('../Controller/store');


router.post("/store_sales/add", addStoreSales)
router.get("/store_sales", getStoreSales)

module.exports = router