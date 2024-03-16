const { pool } = require('../Model/db');
const jwt = require('jsonwebtoken');

exports.addCustomer = async (req, res) => {
  try {
    // Extract token from the request header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    // Verify token
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Token is valid, proceed with adding customer
    const { status, username } = req.body;
    const rolecustomername = "inStore";

    // Check if the specified role exists
    const rolecustomerId = await getRoleCustomerId(rolecustomername);
    const employeeId = await getEmployeeId(username);

    // Generate the next tablename in the sequence
    const tablename = await getNextTablename();

    // Insert the customer
    const customerId = await createCustomer(tablename, status, employeeId, rolecustomerId);

    console.log("Created Table Successfully!");
    res.status(200).json({ customerId: customerId, message: 'User registered successfully!', status: 200 });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.addCustomer2 = async (req, res) => {
  try {
    // Extract token from the request header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    // Verify token
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Token is valid, proceed with adding customer
    const { status, username } = req.body;
    const rolecustomername = "outStore";

    // Check if the specified role exists
    const rolecustomerId = await getRoleCustomerId(rolecustomername);
    const employeeId = await getEmployeeId(username);

    // Generate the next tablename in the sequence
    const tablename = await getNextOutStorename();

    // Insert the customer
    const customerId = await createCustomer(tablename, status, employeeId, rolecustomerId);

    console.log("Created Table Successfully!");
    res.status(200).json({ customerId: customerId, message: 'User registered successfully!', status: 200 });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};



async function getEmployeeId(username) {
  const findEmployeeIdQuery = `
    SELECT id FROM employees WHERE baseuser_id = (SELECT id FROM baseusers WHERE username = $1);
  `;

  try {
    const employeeIdResult = await pool.query(findEmployeeIdQuery, [username]);
    console.log("employeeIdResult: ", employeeIdResult.rows[0].id);

    return employeeIdResult.rows[0].id;
  } catch (error) {
    console.error('Error getting employee ID:', error);
    // Handle the error appropriately
    throw error; // Propagate the error to the calling function
  }
}

async function getRoleCustomerId(rolecustomername) {
  const findRoleQuery = 'SELECT id FROM rolecustomers WHERE roleCustomerName = $1';
  const roleCustomerResult = await pool.query(findRoleQuery, [rolecustomername]);

  if (roleCustomerResult.rows.length > 0) {
    return roleCustomerResult.rows[0].id;
  } else {
    const createRoleCustomerQuery = 'INSERT INTO rolecustomers (roleCustomerName) VALUES ($1) RETURNING id';
    const createRoleCustomerResult = await pool.query(createRoleCustomerQuery, [rolecustomername]);
    return createRoleCustomerResult.rows[0].id;
  }
}

async function createCustomer(tablename, status, employee_id, rolecustomer_id) {
  const createCustomerQuery = `
    INSERT INTO customers (tablename, status, employee_id, rolecustomer_id)
    VALUES ($1, $2, $3, $4)
    RETURNING id
  `;
  const createCustomerResult = await pool.query(createCustomerQuery, [
    tablename, status, employee_id, rolecustomer_id
  ]);

  return createCustomerResult.rows[0].id;
}

async function getNextTablename() {
  const getLastTablenameQuery = `SELECT tablename FROM customers WHERE tablename LIKE 'table%' ORDER BY id DESC`;

  try {
    const result = await pool.query(getLastTablenameQuery);

    if (result.rows.length > 0) {
      const lastTablename = result.rows[0].tablename;
      const lastNumber = parseInt(lastTablename.replace('table', ''), 10);
      const nextNumber = lastNumber + 1;
      return `table${nextNumber}`;
    } else {
      // If there are no existing records, start with table1
      return 'table1';
    }
  } catch (error) {
    console.error('Error getting last tablename:', error);
    throw error;
  }
}

async function getNextOutStorename() {
  const getLastTablenameQuery = `SELECT tablename FROM customers WHERE tablename LIKE 'กลับบ้าน%' ORDER BY id DESC`;

  try {
    const result = await pool.query(getLastTablenameQuery);

    // Check if there are any rows returned
    if (result.rows.length > 0) {
      const lastTablename = result.rows[0].tablename; // Access the first row
      const lastNumber = parseInt(lastTablename.replace('กลับบ้าน', ''), 10); // Extract numeric part
      if (!isNaN(lastNumber)) { // Check if lastNumber is a valid number
        const nextNumber = lastNumber + 1;
        return `กลับบ้าน${nextNumber}`;
      }
    }

    // If no rows returned or if lastNumber extraction failed, return 'กลับบ้าน1'
    return 'กลับบ้าน1';

  } catch (error) {
    console.error('Error getting last tablename:', error);
    throw error;
  }
}



async function updatedCustomer(status, customerId) {
  const updateStatusQuery = `
    UPDATE customers
    SET status = $1
    WHERE id = $2
    RETURNING id
  `;
  const updatedCustomerResult = await pool.query(updateStatusQuery, [status, customerId]);
  return updatedCustomerResult;
}

async function deletedCustomer(customerId) {
  const deletedCustomerQuery = `
      DELETE FROM customers
      WHERE id = $1
      RETURNING id
    `;

  const deletedCustomerResult = await pool.query(deletedCustomerQuery, [customerId]);
  return deletedCustomerResult;
}

exports.updateCustomer = async (req, res) => {
  try {
    const customerId = req.params.customerId;
    const { status } = req.body;
    console.log("customerId: ", customerId);
    console.log("status: ", status);

    // Update the customer status
    const customerUpdateId = await updatedCustomer(status, customerId);

    if (customerUpdateId.rows.length > 0) {
      const customerId = customerUpdateId.rows[0].id
      res.status(200).json({ customerId, message: 'Customer status updated successfully!' });
    } else {
      res.status(404).json({ message: 'Customer not found!' });
    }
  } catch (error) {
    console.error('Error updating customer status:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.deleteCustomer = async (req, res) => {
  try {
    const customerId = req.params.customerId;

    // Delete the customer and their status
    const customerDeleteId = await deletedCustomer(customerId);

    if (customerDeleteId.rows.length > 0) {
      const customerId = customerDeleteId.rows[0].id
      res.status(200).json({ customerId, message: 'Customer deleted successfully!' });
    } else {
      res.status(404).json({ message: 'Customer not found!' });
    }
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.getAllCustomersInStore = async (req, res) => {
  try {
    // Extract the page parameter from the request query or default to 1 if not provided
    let { page } = req.body;
    page = page || 1;
    const pageSize = 7; // Default page size to 10 if not provided

    // Get the total number of customers
    const getTotalCustomersQuery = `
      SELECT COUNT(*) AS total FROM customers WHERE tablename LIKE 'table%'
    `;
    const { rows: totalRows } = await pool.query(getTotalCustomersQuery);
    const totalCustomers = parseInt(totalRows[0].total);

    // Calculate total pages
    const totalPages = Math.ceil(totalCustomers / pageSize);

    // Calculate offset based on page and page size
    const offset = (page - 1) * pageSize;

    const getAllCustomersQuery = `
      SELECT * FROM customers
      WHERE tablename LIKE 'table%'
      ORDER BY id
      LIMIT $1 OFFSET $2
    `;

    // Execute the query with pagination parameters
    const { rows } = await pool.query(getAllCustomersQuery, [pageSize, offset]);

    // Map customer data to unique customer IDs
    const customers = rows.map(row => ({
      id: row.id,
      tablename: row.tablename,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));

    // Send the paginated customer data as a JSON response along with pagination metadata
    res.status(200).json({
      tables: customers,
      total: totalCustomers,
      page_size: pageSize,
      total_page: totalPages,
      current_page: page
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


exports.getAllCustomersOutStore = async (req, res) => {
  try {
    // Extract the page parameter from the request query or default to 1 if not provided
    let { page } = req.body;
    page = page || 1;
    const pageSize = 7; // Default page size to 10 if not provided

    // Get the total number of customers
    const getTotalCustomersQuery = `
      SELECT COUNT(*) AS total FROM customers WHERE tablename LIKE 'กลับบ้าน%'
    `;
    const { rows: totalRows } = await pool.query(getTotalCustomersQuery);
    const totalCustomers = parseInt(totalRows[0].total);

    // Calculate total pages
    const totalPages = Math.ceil(totalCustomers / pageSize);

    // Calculate offset based on page and page size
    const offset = (page - 1) * pageSize;

    const getAllCustomersQuery = `
      SELECT * FROM customers
      WHERE tablename LIKE 'กลับบ้าน%'
      ORDER BY id
      LIMIT $1 OFFSET $2
    `;

    // Execute the query with pagination parameters
    const { rows } = await pool.query(getAllCustomersQuery, [pageSize, offset]);

    // Map customer data to unique customer IDs
    const customers = rows.map(row => ({
      id: row.id,
      tablename: row.tablename,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));

    // Send the paginated customer data as a JSON response along with pagination metadata
    res.status(200).json({
      tables: customers,
      total: totalCustomers,
      page_size: pageSize,
      total_page: totalPages,
      current_page: page
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
