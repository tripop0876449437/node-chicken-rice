const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../Middleware/auth');
const { addOrderProduct, addOrderTotal, getOrderTotal, getOrderProduct, deleteOrderProduct, getOrderTotalPagination, updateOrderTotal, deleteOrderTotal } = require('../Controller/order');

router.post("/order/add/:id", addOrderProduct)
router.post("/order-total/add", addOrderTotal)
router.post("/order-product/:tablename", getOrderProduct)
router.delete("/order-product/delete/:id", deleteOrderProduct)
router.post("/order-total/:tablename", getOrderTotal)
router.post("/order-total-paginate", getOrderTotalPagination)
router.put("/order-total/update/:tablename", updateOrderTotal)
router.delete("/order-total/delete/:tablename", deleteOrderTotal)

module.exports = router