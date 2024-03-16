const { pool } = require('../Model/db');
const multer = require('multer');
const upload = multer();
const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');
require('dotenv').config();

const accessKeyIds = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKeys = process.env.AWS_SECRET_ACCESS_KEY;
const bucketNames = process.env.BUCKET_NAME;
const regions = process.env.AWS_REGION;

// Configure AWS SDK with your credentials and S3 region
const s3 = new AWS.S3({
  accessKeyId: accessKeyIds,
  secretAccessKey: secretAccessKeys,
  region: regions, // Replace 'your-s3-region' with your actual S3 region
});

// Function to upload file to Amazon S3
async function uploadFile(filename, data) {
  try {
    const bucketName = bucketNames;
    const path = `uploads/${filename}`;
    console.log('bucketNames:', bucketNames);
    const params = {
      Bucket: bucketName,
      Key: path,
      Body: data,
    };

    const response = await s3.upload(params).promise();
    console.log('File uploaded successfully:', response);
    return response;
  } catch (error) {
    console.error('Error uploading file to S3:', error);
    throw error;
  }
}


exports.getProducts = async (req, res) => {
  try {
    // Extract the page parameter from the request query or default to 1 if not provided
    let { page } = req.body;
    page = page || 1;
    const pageSize = 8; // Default page size to 10 if not provided

    // Get the total number of products
    const getTotalProductsQuery = `
      SELECT COUNT(*) AS total FROM products
    `;
    const { rows: totalRows } = await pool.query(getTotalProductsQuery);
    const totalProducts = parseInt(totalRows[0].total);

    // Calculate total pages
    const totalPages = Math.ceil(totalProducts / pageSize);

    // Calculate offset based on page and page size
    const offset = (page - 1) * pageSize;

    // Fetch products and associated images
    const getProductsQuery = `
      SELECT
        products.id AS product_id,
        products.productName,
        products.price,
        products.description,
        imageProducts.id AS image_id,
        imageProducts.imageName,
        imageProducts.imageData
      FROM
        products
      LEFT JOIN
        imageProducts ON products.id = imageProducts.product_id
      ORDER BY products.id
      LIMIT $1 OFFSET $2
    `;
    const { rows } = await pool.query(getProductsQuery, [pageSize, offset]);

    // Map product data
    const products = rows.map(row => ({
      id: row.product_id, // Adjust property names as nfeeded
      productName: row.productname,
      price: row.price,
      description: row.description,
      imageUrl: `https://chicken-rice-store.s3.ap-southeast-1.amazonaws.com/uploads/${row.imagename}`
      // imageUrl: `/api/product/image-gp/${row.image_id}`
      // imageData: row.imageData, // Depending on your needs, you might not want to include imageData here
    }));

    // Send the paginated product data as a JSON response along with pagination metadata
    res.status(200).json({
      products: products,
      total: totalProducts,
      page_size: pageSize,
      total_page: totalPages,
      current_page: page
    });
  } catch (error) {
    console.error('Error getting products with images:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const productId = req.params.id;

    // Query to retrieve product information by ID
    const getProductQuery = `
      SELECT
        products.id AS product_id,
        products.productName,
        products.price,
        products.description,
        imageProducts.id AS image_id,
        imageProducts.imageName,
        imageProducts.imageData
      FROM
        products
      LEFT JOIN
        imageProducts ON products.id = imageProducts.product_id
      WHERE
        products.id = $1;
    `;

    // Execute the query
    const { rows } = await pool.query(getProductQuery, [productId]);

    // Check if product exists
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    console.log("rows: ", rows[0].image_id);

    // Extract product data
    const product = {
      id: rows[0].product_id,
      productName: rows[0].productname,
      price: rows[0].price,
      description: rows[0].description,
      imageUrl: `https://chicken-rice-store.s3.ap-southeast-1.amazonaws.com/uploads/${row[0].imagename}`
      // imageUrl: `/api/product/image-gpbid/${rows[0].image_id}`
    };

    // Send product information as JSON response
    res.status(200).json({ product: product });
  } catch (error) {
    console.error('Error getting product by ID:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};

// Controller method for adding a new product with image
exports.addProduct = [
  upload.single('image'),
  async (req, res) => {
    try {
      const { productName, price, description, category_id } = req.body;
      // const imageNameOld = req.file.originalname;
      // const imageName = Buffer.from(imageNameOld, 'latin1').toString('utf-8');
      const imageName = req.file.originalname;
      const imageData = req.file.buffer;
      // console.log("Decoded Image Name (Old):", imageNameOld);
      console.log("Decoded Image Name:", imageName);

      // // Specify the path for the 'uploads' folder
      // const uploadsFolderPath = path.join(__dirname, '..', 'uploads');

      // // Check if the 'uploads' folder exists, create it if not
      // if (!fs.existsSync(uploadsFolderPath)) {
      //   fs.mkdirSync(uploadsFolderPath);
      // }

      // // Specify the path for the uploaded file
      // const filePath = path.join(uploadsFolderPath, imageName);

      // Write the file data to the specified path
      // fs.writeFileSync(filePath, imageData);

      // Write the file data to the specified path To S3
      const imageUrl = await uploadFile(imageName, imageData);

      // Use a database transaction for atomicity
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Insert the product into the products table
        const createProductQuery = `
          INSERT INTO products (productName, price, description, category_id)
          VALUES ($1, $2, $3, $4)
          RETURNING id
        `;
        const createProductResult = await client.query(createProductQuery, [
          productName, price, description, category_id
        ]);

        const productId = createProductResult.rows[0].id;

        // Insert the image data into the imageProducts table
        const createImageQuery = `
          INSERT INTO imageProducts (imageName, imageData, product_id)
          VALUES ($1, $2, $3)
          RETURNING id
        `;
        const createImageResult = await client.query(createImageQuery, [
          imageName, imageData ,productId
        ]);

        const imageId = createImageResult.rows[0].id;

        await client.query('COMMIT');
        res.status(200).json({ productId, imageId, message: 'Product added successfully!' });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error adding product:', error);
      res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
  }
];


exports.searchProducts = async (req, res) => {
  try {
    const { searchTerm, categoryName, page = 1, pageSize = 8 } = req.query;

    // Get the total number of products
    const getTotalProductsQuery = `
      SELECT COUNT(*) AS total 
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE LOWER(p.productName) LIKE LOWER($1)
      AND LOWER(c.categoryName) LIKE LOWER($2)
    `;
    const { rows: totalRows } = await pool.query(getTotalProductsQuery, [`%${searchTerm}%`, `%${categoryName}%`]);
    const totalProducts = parseInt(totalRows[0].total);

    // Calculate total pages
    const totalPages = Math.ceil(totalProducts / pageSize);

    // Calculate offset based on pagination parameters
    const offset = (page - 1) * pageSize;

    // Query to search products with image data
    const searchQuery = `
      SELECT
        p.id AS product_id,
        p.productName AS product_name,
        p.price,
        p.description,
        c.id AS category_id,
        c.categoryName AS category_name, -- Rename categoryName to category_name
        ip.id AS image_id,
        ip.imageName,
        ip.imageData
      FROM
        products p
      LEFT JOIN
        imageProducts ip ON p.id = ip.product_id
      JOIN
        categories c ON p.category_id = c.id
      WHERE
        LOWER(p.productName) LIKE LOWER($1)
      AND
        LOWER(c.categoryName) LIKE LOWER($2)
      ORDER BY
        p.id
      OFFSET $3
      LIMIT $4
    `;

    // Execute the query
    const { rows } = await pool.query(searchQuery, [`%${searchTerm}%`, `%${categoryName}%`, offset, pageSize]);

    // Map product data
    const products = rows.map(row => ({
      id: row.product_id,
      productName: row.product_name,
      price: row.price,
      description: row.description,
      imageUrl: `/api/product/image-sp/${row.image_id}`,
      category: { id: row.category_id, name: row.category_name } // Use category_name
    }));

    // Send the paginated product data as a JSON response along with pagination metadata
    res.status(200).json({
      products: products,
      total: totalProducts,
      page_size: pageSize,
      total_page: totalPages,
      current_page: page
    });
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ error: 'Internal Server Error', message: 'Product is not found.' });
  }
};




exports.deleteProduct = async (req, res) => {
  try {
    const productId = req.params.id;

    // Check if the product exists
    const productExistQuery = 'SELECT * FROM products WHERE id = $1';
    const productExistResult = await pool.query(productExistQuery, [productId]);

    if (productExistResult.rows.length === 0) {
      // Product not found
      return res.status(400).json({ error: 'Product not found.' });
    }

    // Delete the product
    const deleteProductQuery = 'DELETE FROM products WHERE id = $1 RETURNING *';
    const deletedProductResult = await pool.query(deleteProductQuery, [productId]);

    // Assuming you want to delete the associated image as well
    const deleteImageQuery = 'DELETE FROM imageProducts WHERE product_id = $1';
    await pool.query(deleteImageQuery, [productId]);

    res.status(200).json({ message: 'Product deleted successfully.' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};





exports.getImageByIdGetProducts = async (req, res) => {
  try {
    const imageId = req.params.id;

    // Query to retrieve image information by ID
    const getImageQuery = `
      SELECT imageName, imageData
      FROM imageProducts
      WHERE id = $1;
    `;

    // Execute the query
    const { rows } = await pool.query(getImageQuery, [imageId]);

    // Check if image exists
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Image not found.' });
    }

    // Extract image data
    const imageName = rows[0].imagename;
    const imageData = rows[0].imagedata;

    // Check if imageName is available
    if (!imageName) {
      return res.status(404).json({ error: 'Image file name not found.' });
    }

    // Determine the file path
    const imagePath = path.join(__dirname, '..', 'uploads', imageName);

    // Check if the file exists
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ error: 'Image file not found.' });
    }

    // Read the image file and send it as a response
    const imageStream = fs.createReadStream(imagePath);
    imageStream.pipe(res);
  } catch (error) {
    console.error('Error getting image by ID:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};

exports.getImageByIdGetProductById = async (req, res) => {
  try {
    const imageId = req.params.id;

    // Query to retrieve image information by ID
    const getImageQuery = `
      SELECT imageName, imageData
      FROM imageProducts
      WHERE id = $1;
    `;

    // Execute the query
    const { rows } = await pool.query(getImageQuery, [imageId]);

    // Check if image exists
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Image not found.' });
    }

    // Extract image data
    const imageName = rows[0].imagename;
    const imageData = rows[0].imagedata;

    // Check if imageName is available
    if (!imageName) {
      return res.status(404).json({ error: 'Image file name not found.' });
    }

    // Determine the file path
    const imagePath = path.join(__dirname, '..', 'uploads', imageName);

    // Check if the file exists
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ error: 'Image file not found.' });
    }

    // Read the image file and send it as a response
    const imageStream = fs.createReadStream(imagePath);
    imageStream.pipe(res);
  } catch (error) {
    console.error('Error getting image by ID:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};

exports.getImageByIdSearchProducts = async (req, res) => {
  try {
    const imageId = req.params.id;

    // Query to retrieve image information by ID
    const getImageQuery = `
      SELECT imageName, imageData
      FROM imageProducts
      WHERE id = $1;
    `;

    // Execute the query
    const { rows } = await pool.query(getImageQuery, [imageId]);

    // Check if image exists
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Image not found.' });
    }

    // Extract image data
    const imageName = rows[0].imagename;
    const imageData = rows[0].imagedata;

    // Check if imageName is available
    if (!imageName) {
      return res.status(404).json({ error: 'Image file name not found.' });
    }

    // Determine the file path
    const imagePath = path.join(__dirname, '..', 'uploads', imageName);

    // Check if the file exists
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ error: 'Image file not found.' });
    }

    // Read the image file and send it as a response
    const imageStream = fs.createReadStream(imagePath);
    imageStream.pipe(res);
  } catch (error) {
    console.error('Error getting image by ID:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};