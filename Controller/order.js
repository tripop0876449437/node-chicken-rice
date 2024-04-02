const { pool } = require('../Model/db');

exports.addOrderProduct = async (req, res) => {
  try {
    // Extract data from the request
    const { customerName, orderProductQuantity, orderProductPrice } = req.body;
    const productId = req.params.id
    const customerQuery = "SELECT id FROM customers WHERE tableName = $1"
    const productQurey = "SELECT id FROM products WHERE id = $1"
    const productPriceQurey = "SELECT price FROM products WHERE id = $1"
    const existingCustomerQuery = await pool.query(customerQuery, [customerName]);
    const existingProductQuery = await pool.query(productQurey, [productId]);
    const existingProductPriceQuery = await pool.query(productPriceQurey, [productId]);
    const customerQuery_one = existingCustomerQuery.rows;
    const productQuery_one = existingProductQuery.rows;
    const productPriceQuery_one = existingProductPriceQuery.rows;
    const customer_id = existingCustomerQuery.rows[0].id;
    const product_id = existingProductQuery.rows[0].id;
    const product_price = productPriceQuery_one[0].price;
    const status = 'active';
    const iamgeQuery = "SELECT id FROM imageProducts WHERE product_id = $1"
    const existingImageProductQuery = await pool.query(iamgeQuery, [product_id]);
    const imageQuery_one = existingImageProductQuery.rows;
    const imageProduct_id = existingImageProductQuery.rows[0].id;

    if (customerQuery_one.length === 0) {
      return res.status(404).json({ error: 'Customer not found.' });
    }
    if (productQuery_one.length === 0) {
      return res.status(404).json({ error: 'Product not found. ' });
    }

    const createOrderListQuery = `
      INSERT INTO orderLists (imageProduct_id, customer_id)
      VALUES ($1, $2)
      RETURNING id
    `;
    const createOrderListResult = await pool.query(createOrderListQuery, [
      imageProduct_id, customer_id
    ])
    const orderListId = createOrderListResult.rows[0].id
    // console.log("orderListId: ", orderListId);

    // Insert the order product into the orderProducts table
    const createOrderProductQuery = `
      INSERT INTO orderProducts (orderProductQuantity, orderProductPrice, status, orderLists_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `;
    const createOrderProductResult = await pool.query(createOrderProductQuery, [
      orderProductQuantity, orderProductPrice, status, orderListId
    ]);

    const orderProductId = createOrderProductResult.rows[0].id;
    // console.log("orderProductId: ", orderProductId);

    res.status(201).json({status: 200, orderProductId, message: 'Order product added successfully!' });
  } catch (error) {
    console.error('Error adding order product:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};

exports.getOrderProduct = async (req, res) => {
  try {
    const tableName = req.params.tablename;
    // DataBase
    const getOrderProductQuery = `
      SELECT op.id AS orderproduct_id, op.orderProductQuantity, op.orderProductPrice, op.orderLists_id AS orderLists_id,
            ol.id AS orderList_id, ol.imageProduct_id AS ol_imageProduct_id, ol.customer_id AS ol_customer_id,
            ct.id AS ct_customer_id, ct.tablename AS ct_tablename,
            ip.id AS ip_imageProduct_id, ip.product_id AS ip_product_id,
            pd.id AS product_id, pd.productName AS productName,
            op.created_at AS orderproduct_created_at, op.updated_at AS orderproduct_updated_at
      FROM orderProducts op
      JOIN orderLists ol ON op.orderLists_id = ol.id
      JOIN customers ct ON ol.customer_id = ct.id
      JOIN imageProducts ip ON ol.imageProduct_id = ip.id
      JOIN products pd ON ip.product_id = pd.id
      WHERE LOWER(ct.tablename) = LOWER($1)
    `;
    const { rows } = await pool.query(getOrderProductQuery, [tableName]);

    // Only Use Valiable Letter:  FormResponse
    const orderProductMap = new Map();
    rows.forEach(row => {
      const orderProductId = row.orderproduct_id;
      if (!orderProductMap.has(orderProductId)) {
        orderProductMap.set(orderProductId, {
          id: orderProductId,
          productName: row.productname,
          orderProductQuantity: row.orderproductquantity,
          orderProductPrice: row.orderproductprice,
          created_at: row.orderproduct_created_at,
          updated_at: row.orderproduct_updated_at
        })
      } else {
        orderTotalMap.set({
          message: 'OrderTotal is Not Found.'
        })
      }
    })
    // Return Response
    const orderProducts = [...orderProductMap.values()]
    res.status(200).json({status: 200, orderProduct: orderProducts })
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error', details: error });
  }
}

exports.deleteOrderProduct = async (req, res) => {
  try {
    // Check if the orderProduct exists
    const orderProductId = req.params.id;
    const orderProductExistQuery = 'SELECT * FROM orderProducts WHERE id = $1';
    const orderProductExistResult = await pool.query(orderProductExistQuery, [orderProductId]);

    if (orderProductExistResult.rows.length === 0) {
      return res.status(400).json({ error: 'OrderProduct not found.' });
    }

    // Delete Database
    const deleteOrderProductQuery = 'DELETE FROM orderProducts WHERE id = $1 RETURNING *';
    await pool.query(deleteOrderProductQuery, [orderProductId]);

    // Respone
    res.status(200).json({ message: 'OrderProduct delete successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error', details: error });
  }
}

exports.addOrderTotal = async (req, res) => {
  try {
    // Extract data from the request body
    const { orderTotalQuantity, orderTotalPrice, tablename } = req.body;
    const status = "pending";
    const orderListsIdQuery = `
      SELECT 
            op.id AS orderproduct_id, op.orderProductQuantity, op.orderProductPrice, op.orderLists_id AS orderLists_id,
            ol.id AS orderList_id, ol.imageProduct_id AS ol_imageProduct_id, ol.customer_id AS ol_customer_id,
            ct.id AS ct_customer_id, ct.tablename AS ct_tablename,
            ip.id AS ip_imageProduct_id, ip.product_id AS ip_product_id,
            pd.id AS product_id, pd.productName AS productName,
            op.created_at AS orderproduct_created_at, op.updated_at AS orderproduct_updated_at
      FROM orderProducts op
      JOIN orderLists ol ON op.orderLists_id = ol.id
      JOIN customers ct ON ol.customer_id = ct.id
      JOIN imageProducts ip ON ol.imageProduct_id = ip.id
      JOIN products pd ON ip.product_id = pd.id
      WHERE LOWER(ct.tablename) = LOWER($1)
    `;

    // Execute the query to fetch the orderLists_id
    // console.log('tablename', tablename);
    const { rows: orderLists } = await pool.query(orderListsIdQuery, [tablename]);

    // console.log('rows: orderLists', orderLists);


    // Extract the customer_id from the query result
    const customerId = orderLists[0]?.ct_customer_id;

    // console.log('customerId', customerId);

    // Check if customerId is found
    if (!customerId) {
      return res.status(404).json({ error: 'Customer not found for the product.' });
    }
    // console.log(customerId);

    // Insert the order total data into the database
    const createOrderTotalQuery = `
      INSERT INTO orderTotals (orderTotalQuantity, orderTotalPrice, status, customer_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `;
    const createOrderTotalResult = await pool.query(createOrderTotalQuery, [
      orderTotalQuantity,
      orderTotalPrice,
      status,
      customerId
    ]);

    // Retrieve the ID of the newly inserted order total
    const orderTotalId = createOrderTotalResult.rows[0].id;



    const orderTotalQuery = `
      SELECT 
            ot.id AS orderTotal_id, ot.customer_id AS ot_customer_id,
            ct.id AS ct_customer_id, ct.tablename AS ct_tablename
      FROM orderTotals ot
      JOIN customers ct ON ot.customer_id = ct.id
      WHERE ct.id = $1
    `;

    // Execute the query to fetch the orderLists_id
    const { rows: orderTotal } = await pool.query(orderTotalQuery, [customerId]);

    // console.log('rows: orderTotal', orderTotal);


    const createOrderProductAndTotalQuery = `
      INSERT INTO orderProductAndTotals (orderProduct_id, orderTotal_id)
      VALUES ($1, $2)
      RETURNING id
    `;
    // Insert the relationship between each order product and the order total into the orderProductAndTotals table
    for (const orderProduct of orderLists) {
      await pool.query(createOrderProductAndTotalQuery, [
        orderProduct.orderproduct_id,
        orderTotalId
      ]);
    }

    // Send a success response
    res.status(200).json({status: 200, orderTotalId, customerId, message: 'Order total added successfully!' });
  } catch (error) {
    // Handle errors
    console.error('Error adding order total:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error });
  }
};



exports.getOrderTotal = async (req, res) => {
  try {
    const tableName = req.params.tablename;
    const getOrderTotalQuery = `
      SELECT ot.id AS ordertotal_id, ot.orderTotalQuantity, ot.orderTotalPrice, ot.status AS ordertotal_status, ot.customer_id AS ot_customer_id,
            ct.id AS ct_customer_id, ct.tablename AS ct_tablename, ct.status AS ct_status,
            ot.created_at AS ordertotal_created_at, ot.updated_at AS ordertotal_updated_at
      FROM orderTotals ot
      JOIN customers ct ON ot.customer_id = ct.id
      WHERE LOWER(ct.tablename) = LOWER($1)
    `;
    const { rows } = await pool.query(getOrderTotalQuery, [tableName]);
    // console.log('rows', rows);

    // Group orderTotal and orderProduct data by orderTotal_id 
    const orderTotalMap = new Map();
    rows.forEach(row => {
      const orderTotalId = row.ordertotal_id;
      if (!orderTotalMap.has(orderTotalId)) {
        orderTotalMap.set(orderTotalId, {
          orderTotal: {
            id: orderTotalId,
            ordertotalquantity: row.ordertotalquantity,
            ordertotalprice: row.ordertotalprice,
            status: row.ordertotal_status,
            customers: {
              id: row.ct_customer_id,
              tablename: row.ct_tablename,
              ct_status: row.ct_status,
            },
            created_at: row.ordertotal_created_at,
            updated_at: row.ordertotal_updated_at
          }
        });
      }
      else {
        orderTotalMap.set({
          message: 'OrderTotal is Not Found.'
        })
      }
    });

    // Convert map values to array for JSON response
    const orderTotals = [...orderTotalMap.values()];
    // console.log(orderTotals);
    res.status(200).json({status: 200,orderTotals});
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error', details: error });
  }
};


exports.getOrderTotalPagination = async (req, res) => {
  try {
    let { search, startDate, endDate } = req.body;
    search = search || '';
    const startDateCondition = startDate ? ' AND ot.created_at >= $2': '';
    const endDateCondition = endDate ? ' AND ot.created_at <= $3': '';
    const getOrderTotalQuery = `
    SELECT
        opat.id AS opat_id, opat.orderProduct_id AS opat_orderProduct_id, opat.orderTotal_id AS opat_orderTotal_id,
        ot.id AS ot_orderTotal_id, ot.orderTotalQuantity AS ot_orderTotalQuantity, ot.orderTotalPrice AS ot_orderTotalPrice, ot.status AS ot_status, ot.customer_id AS ot_customer_id,
        op.id AS op_orderProduct_id, op.orderProductQuantity AS op_orderProductQuantity, op.orderProductPrice AS op_orderProductPrice, op.status AS op_status, op.orderLists_id AS op_orderLists_id,
        ol.id AS ol_orderList_id, ol.imageProduct_id AS ol_imageProduct_id, ol.customer_id AS ol_customer_id,
        ct.id AS ct_customer_id, ct.tablename AS ct_tablename, ct.status AS ct_status, ct.employee_id AS ct_employee_id, ct.rolecustomer_id AS ct_rolecustomer_id,
        ip.id AS ip_imageProduct_id, ip.product_id AS ip_product_id,
        pd.id AS pd_product_id, pd.productName AS pd_productName, pd.price AS pd_price, pd.category_id AS pd_category_id,
        opat.created_at AS opat_created_at, opat.updated_at AS opat_updated_at
    FROM orderProductAndTotals opat
    JOIN orderTotals ot ON opat.orderTotal_id = ot.id
    JOIN orderProducts op ON opat.orderProduct_id = op.id
    JOIN orderLists ol ON op.orderLists_id = ol.id
    JOIN customers ct ON ol.customer_id = ct.id
    JOIN imageProducts ip ON ol.imageProduct_id = ip.id
    JOIN products pd ON ip.product_id = pd.id
    WHERE ct.tablename ILIKE $1
    ${startDateCondition}
    ${endDateCondition}
    ORDER BY opat.id
    `;

    const queryParams = [`%${search}%`]
    if (startDate) queryParams.push(startDate);
    if (endDate) queryParams.push(endDate)

    const { rows } = await pool.query(getOrderTotalQuery, queryParams);
    // console.log('rows: ', rows);

    // Constructing the response
    const orderTotal = [];
    let totalMoneyAll = 0;
    let currentOrderId = null;
    let currentOrder = null;

    rows.forEach(row => {
      if (row.opat_ordertotal_id !== currentOrderId) {
        // New order found, create a new order object
        if (currentOrder) {
          orderTotal.push(currentOrder);
        }
        currentOrderId = row.opat_ordertotal_id;
        currentOrder = {
          id: row.opat_ordertotal_id,
          tableName: row.ct_tablename,
          orderProducts: [],
          orderTotalQuantity: row.ot_ordertotalquantity,
          orderTotalPrice: row.ot_ordertotalprice,
          orderProductStatus: row.ot_status,
          created_at: row.opat_created_at,
          updated_at: row.opat_updated_at
        };
      }
      // Add order product to the current order
      currentOrder.orderProducts.push({
        id: row.op_orderproduct_id,
        productName: row.pd_productname,
        orderProductQuantity: row.op_orderproductquantity,
        orderProductPrice: row.op_orderproductprice
      });
      // Calculate totalMoneyAll
      totalMoneyAll += row.ot_ordertotalprice;
    });

    // Add the last order to the list
    if (currentOrder) {
      orderTotal.push(currentOrder);
    }

    // console.log('orderTotal', orderTotal);
    res.status(200).json({status: 200, orderTotals: orderTotal, totalMoneyAll: totalMoneyAll })
    // res.status(200).json({ message: "success" })
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Internal Server Error', details: error });
  }
}



exports.updateOrderTotal = async (req, res) => {
  try {
    const tablename = req.params.tablename;
    const { status } = req.body;
    // console.log("tablename: ", tablename);
    // console.log("status: ", status);

    const updateStatusQuery = `
      UPDATE orderTotals
      SET status = $1
      FROM customers
      WHERE orderTotals.customer_id = customers.id
        AND customers.tablename = $2
      RETURNING orderTotals.id
    `;

    // Update the orderTotal status
    if (status !== '') {
      await pool.query(updateStatusQuery, [status, tablename]);
    }

    // Check if the tablename exists in the database
    const checkTablenameQuery = `
      SELECT 1
      FROM customers
      WHERE tablename = $1
    `;
    const { rows } = await pool.query(checkTablenameQuery, [tablename]);

    if (rows.length > 0) {
      // Tablename exists, return status 200
      res.status(200).json({status: 200, tablename, message: 'OrderTotal status updated successfully!' });
    } else {
      // Tablename does not exist, return status 404
      res.status(404).json({ message: 'OrderTotal not found!' });
    }
  } catch (error) {
    console.error('Error updating orderTotal status:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error });
  }
};


exports.deleteOrderTotal = async (req, res) => {
  try {
    const tablename = req.params.tablename;

    // // Execute the SQL query to delete the order total
    // const deleteQuery = `
    //   DELETE FROM orderProductAndTotals
    //   WHERE orderTotal_id = (
    //     SELECT 
    //       ot.id
    //     FROM orderTotals ot
    //     JOIN customers ct ON ot.customer_id = ct.id
    //     WHERE ct.tablename = $1
    //   )
    // `;
    // await pool.query(deleteQuery, [tablename]);

    const deleteQuery = `
      DELETE FROM orderTotals
      WHERE customer_id = (
        SELECT id FROM customers WHERE tablename = $1
      )
    `;
    await pool.query(deleteQuery, [tablename]);

    const deleteOrderListsQuery = `
      DELETE FROM orderLists
      WHERE customer_id IN (
        SELECT ct.id
        FROM customers ct
        WHERE ct.tablename = $1
      )
    `;
    await pool.query(deleteOrderListsQuery, [tablename]);

    // If the deletion is successful, return a success message
    res.status(200).json({status: 200, message: 'Order total deleted successfully.' });
  } catch (error) {
    // If an error occurs during the deletion process, return an error response
    console.error('Error deleting order total:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error });
  }
};