// db.js

const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config(); // Load environment variables from .env file

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: false, // Disable SSL
//   sslmode: 'disable', // Explicitly disable SSL
// });

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL ,
})

async function createTables() {
  try {
    const createRolesTableQuery = `
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        roleName VARCHAR(50) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await pool.query(createRolesTableQuery);
    console.log('Roles table created successfully.');

    // Adding a unique constraint to roleName in roles table
    const addRoleNameUniqueConstraintQuery = `
      ALTER TABLE roles ADD CONSTRAINT roles_roleName_unique UNIQUE (roleName);
    `;
    await pool.query(addRoleNameUniqueConstraintQuery);
    console.log('Unique constraint added to roleName in roles table.');

    const createBaseUsersTableQuery = `
      CREATE TABLE IF NOT EXISTS baseusers (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(100) NOT NULL,
        role_id INT REFERENCES roles(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await pool.query(createBaseUsersTableQuery);
    console.log('Users table created successfully.');

    const createEmployeeTableQuery = `
      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50),
        surname VARCHAR(50),
        phoneNumber VARCHAR(50),
        email TEXT,
        baseuser_id INT REFERENCES baseusers(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await pool.query(createEmployeeTableQuery);
    console.log('Employees table created successfully.');

    const createRolesCustomerTableQuery = `
      CREATE TABLE IF NOT EXISTS rolecustomers (
        id SERIAL PRIMARY KEY,
        roleCustomerName VARCHAR(50) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await pool.query(createRolesCustomerTableQuery);
    console.log('Roles table created successfully.');

    const createCustomerTableQuery = `
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        tablename VARCHAR(50),
        status VARCHAR(50),
        employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
        rolecustomer_id INT REFERENCES rolecustomers(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await pool.query(createCustomerTableQuery);
    console.log('Customers table created successfully.');

    const createCategoryTableQuery = `
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        categoryName VARCHAR(50) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await pool.query(createCategoryTableQuery);
    console.log('Category table created successfully.');

    const createProductsTableQuery = `
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      productName VARCHAR(50) NOT NULL,
      price NUMERIC(10, 2) NOT NULL,
      description TEXT,
      category_id INT REFERENCES categories(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await pool.query(createProductsTableQuery);
    console.log('Products table created successfully.');

    const createImageProductsTableQuery = `
      CREATE TABLE IF NOT EXISTS imageProducts (
        id SERIAL PRIMARY KEY,
        imageName TEXT NOT NULL,
        imageData BYTEA NOT NULL, -- Assuming imageData is binary data (BYTEA)
        product_id INT REFERENCES products(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await pool.query(createImageProductsTableQuery);
    console.log('ImageProducts table created successfully.');

    const createOrderListTableQuery = `
      CREATE TABLE IF NOT EXISTS orderLists (
        id SERIAL PRIMARY KEY,
        imageProduct_id INT REFERENCES imageProducts(id) ON DELETE CASCADE,
        customer_id INT REFERENCES customers(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await pool.query(createOrderListTableQuery);
    console.log('OrderLists table created successfully.');

    const createOrderProductsTableQuery = `
      CREATE TABLE IF NOT EXISTS orderProducts (
        id SERIAL PRIMARY KEY,
        orderProductQuantity INT NOT NULL,
        orderProductPrice DOUBLE PRECISION NOT NULL,
        status VARCHAR(50) NOT NULL,
        orderLists_id INT REFERENCES orderLists(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await pool.query(createOrderProductsTableQuery);
    console.log('OrderProducts table created successfully.');

    const createOrderTotalTableQuery = `
      CREATE TABLE IF NOT EXISTS orderTotals (
        id SERIAL PRIMARY KEY,
        orderTotalQuantity INT NOT NULL,
        orderTotalPrice DOUBLE PRECISION NOT NULL,
        status VARCHAR(50) NOT NULL,
        customer_id INT REFERENCES customers(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await pool.query(createOrderTotalTableQuery);
    console.log('OrderTotal table created successfully.');

    const createOrderProductAndTotalQuery = `
      CREATE TABLE IF NOT EXISTS orderProductAndTotals (
        id SERIAL PRIMARY KEY,
        orderProduct_id INT REFERENCES orderProducts(id) ON DELETE CASCADE,
        orderTotal_id INT REFERENCES orderTotals(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await pool.query(createOrderProductAndTotalQuery);
    console.log('OrderProductAndTotal table created seccessfully.');

    const createStoreSalseTableQuery = `
      CREATE TABLE IF NOT EXISTS storeSales (
        id SERIAL PRIMARY KEY,
        storeSalesQuantity INT NOT NULL,
        storeSalesPrice DOUBLE PRECISION NOT NULL,
        roleStoreSales VARCHAR(100) NOT NULL,
        orderProductAndTotal_id INT REFERENCES orderProductAndTotals(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await pool.query(createStoreSalseTableQuery);
    console.log('StoreSales table created successfully.');


    // Adding a unique constraint to categoryName in categories table
    const addCategoryNameUniqueConstraintQuery = `
      ALTER TABLE categories ADD CONSTRAINT categories_categoryName_unique UNIQUE (categoryName);
    `;
    await pool.query(addCategoryNameUniqueConstraintQuery);
    console.log('Unique constraint added to categoryName in categories table.');

    // Insert default role "admin" into roles table
    const insertDefaultRoleQuery = 'INSERT INTO roles (roleName) VALUES ($1) ON CONFLICT (roleName) DO NOTHING';
    await pool.query(insertDefaultRoleQuery, ['admin']);
    await pool.query(insertDefaultRoleQuery, ['customer']);
    console.log('Default role "admin, table" inserted successfully.');

    // Insert default Category "water" into Category table
    const insertDefaultRoleCustomerQuery = 'INSERT INTO rolecustomers (roleCustomerName) VALUES ($1) ON CONFLICT (roleCustomerName) DO NOTHING';
    await pool.query(insertDefaultRoleCustomerQuery, ['inStore']);
    await pool.query(insertDefaultRoleCustomerQuery, ['outStore']);
    console.log('Default rolecustomers inserted successfully.');

    // // Insert default Category "water" into Category table
    // const insertDefaultCategoryQuery = 'INSERT INTO categories (categoryName) VALUES ($1) ON CONFLICT (categoryName) DO NOTHING';
    // await pool.query(insertDefaultCategoryQuery, ['rice']);
    // await pool.query(insertDefaultCategoryQuery, ['water']);
    // console.log('Default category inserted successfully.');

  } catch (error) {
    console.error('Error creating tables:', error);
  }
}

module.exports = { pool, createTables };
