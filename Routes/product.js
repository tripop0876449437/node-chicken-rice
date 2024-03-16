const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../Middleware/auth')
const { getAllCategories, addCategory, deleteCategory } = require('../Controller/category');
const { getProducts, addProduct, searchProducts, deleteProduct, getProductById, getImageByIdGetProducts, getImageByIdGetProductById, getImageByIdSearchProducts } = require('../Controller/product');

// API Category
// router.get('/category', authenticateToken, category);
router.post('/category', getAllCategories);
router.post('/category/add', authenticateToken, addCategory);
router.delete('/category/delete/:id', authenticateToken, deleteCategory);

// API Product
router.post('/product', authenticateToken, getProducts);
router.post('/product/search', searchProducts);
router.post('/product/add', authenticateToken, addProduct);
router.delete('/product/delete/:id', authenticateToken, deleteProduct);

router.get('/product/image-gp/:id', getImageByIdGetProducts)
router.get('/product/image-gpbid/:id', getImageByIdGetProductById)
router.get('/product/image-sp/:id', getImageByIdSearchProducts)

// use customer
router.get('/product/:id', authenticateToken, getProductById)

module.exports = router