const { pool } = require('../Model/db');

// Define the route and HTTP method for the endpoint
exports.addStoreSales = async (req, res) => {
  try {
    // Extract data from the request body
    const { storeSalesQuantity, storeSalesPrice, roleStoreSales, orderTotal_id } = req.body;
    console.log(storeSalesQuantity);

    // Validate the incoming data (optional)
    // Your validation logic goes here

    // Execute the database query to insert the store sales data
    const insertStoreSalesQuery = `
      INSERT INTO storeSales (storeSalesQuantity, storeSalesPrice, roleStoreSales, orderTotal_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id;
    `;
    const { rows } = await pool.query(insertStoreSalesQuery, [storeSalesQuantity, storeSalesPrice, roleStoreSales, orderTotal_id]);

    // Check if the store sales data was inserted successfully
    if (rows.length === 0) {
      return res.status(500).json({ error: 'Failed to insert store sales data.' });
    }

    // Send a success response with the ID of the inserted store sales record
    res.status(201).json({ id: rows[0].id, message: 'Store sales data inserted successfully.' });
  } catch (error) {
    console.error('Error inserting store sales data:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};

// Controller function to handle GET request for store sales data
exports.getStoreSales = async (req, res) => {
  try {
    // Execute the database query to retrieve store sales data
    const getStoreSalesQuery = `
      SELECT * FROM storeSales;
    `;
    const { rows } = await pool.query(getStoreSalesQuery);

    console.log(rows);

    // Send store sales data as a JSON response
    res.status(200).json({ storeSales: rows });
  } catch (error) {
    console.error('Error fetching store sales data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};