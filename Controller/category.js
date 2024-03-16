const { pool } = require('../Model/db');

exports.getAllCategories = async (req, res) => {
  try {
    // Extract pagination parameters from query string
    let { page } = req.body;
    page = page || 1;
    const pageSize = 5
    const offset = (page - 1) * pageSize;

    // Query to fetch categories with pagination
    const getAllCategoriesQuery = `
      SELECT * FROM categories
      ORDER BY id
      LIMIT $1 OFFSET $2
    `;
    
    // Execute the query with pagination parameters
    const categories = await pool.query(getAllCategoriesQuery, [pageSize, offset]);

    // Fetch total number of categories (for calculating total pages)
    const getTotalCategoriesQuery = 'SELECT COUNT(*) AS total FROM categories';
    const { rows: totalRows } = await pool.query(getTotalCategoriesQuery);
    const totalCategories = parseInt(totalRows[0].total);

    // Calculate total pages
    const totalPages = Math.ceil(totalCategories / pageSize);

    // Send response with categories and pagination metadata
    res.status(200).json({
      categories: categories.rows,
      total: totalCategories,
      page_size: pageSize,
      total_page: totalPages,
      current_page: page
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.addCategory = async (req, res) => {
  try {
    const { categoryName } = req.body;
    console.log("categoryName: ", categoryName);

    // Check if the category already exists
    const checkCategoryQuery = 'SELECT * FROM categories WHERE categoryName = $1';
    const existingCategory = await pool.query(checkCategoryQuery, [categoryName]);

    if (existingCategory.rows.length > 0) {
      return res.status(400).json({ error: 'Category already exists' });
    }

    // Insert the new category
    const addCategoryQuery = 'INSERT INTO categories (categoryName) VALUES ($1) RETURNING id, categoryName';
    const newCategory = await pool.query(addCategoryQuery, [categoryName]);

    res.status(201).json({ category: newCategory.rows[0], message: 'Category added successfully!' });
  } catch (error) {
    console.error('Error adding category:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;

    // Check if the category exists
    const checkCategoryQuery = 'SELECT * FROM categories WHERE id = $1';
    const existingCategory = await pool.query(checkCategoryQuery, [categoryId]);

    if (existingCategory.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Delete the category
    const deleteCategoryQuery = 'DELETE FROM categories WHERE id = $1 RETURNING *';
    const deletedCategory = await pool.query(deleteCategoryQuery, [categoryId]);

    res.json({ category: deletedCategory.rows[0], message: 'Category deleted successfully!' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};