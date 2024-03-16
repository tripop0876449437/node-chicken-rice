const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../Middleware/auth')
const { addCustomer, updateCustomer, deleteCustomer, getAllCustomersInStore, getAllCustomersOutStore, addCustomer2 } = require('../Controller/customer')

// Secure API endpoint (example)
router.post('/customer/add', authenticateToken, addCustomer);
router.post('/customer-outstore/add', authenticateToken, addCustomer2);
router.put('/customer/update/:customerId', authenticateToken, updateCustomer);
router.delete('/customer/delete/:customerId', authenticateToken, deleteCustomer);
router.post('/customer', authenticateToken, getAllCustomersInStore);
router.post('/customer-outstore', authenticateToken, getAllCustomersOutStore);

module.exports = router