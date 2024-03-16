const { pool } = require('../Model/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  try {
    if (Object.keys(req.body).length === 7) {
      // Registering an employee
      const { username, password, name, surname, rolename, email, phonenumber } = req.body;

      // Hash the user's password before storing it in the database
      const hashedPassword = await bcrypt.hash(password, 10);

      // Check if the specified role exists
      const roleId = await getRoleId(rolename);

      // Insert the user into the baseusers table with the retrieved or created role ID
      const baseuserId = await createBaseUser(username, hashedPassword, roleId);

      // Insert the employee into the employees table
      const employeeId = await createEmployee(name, surname, phonenumber, email, baseuserId);

      res.status(200).json({ employeeId, message: 'User registered successfully!' });
    } else {
      // Registering something related to a table
      const { username, password, tablename, rolename } = req.body;

      // Handle the second scenario
      // ...

      res.status(200).json({ message: 'Table registered successfully!' });
    }
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check if the user exists in the baseusers table
    const userQuery = 'SELECT * FROM baseusers WHERE username = $1';
    const userResult = await pool.query(userQuery, [username]);

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = userResult.rows[0];

    // Compare the provided password with the hashed password from the database
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create a JWT token with user information
    const accessToken = generateAccessToken({ username, role: user.role_id });
    const refreshToken = generateRefreshToken({ username, role: user.role_id });

    res.status(200).json({ accessToken, refreshToken, message: 'Login successful!' , status: 200});
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token is required' });
    }

    // Verify the refresh token
    jwt.verify(refreshToken, 'jwtrefreshsecret', (err, user) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid refresh token' });
      }

      // Generate a new access token
      const accessToken = generateAccessToken({ username: user.username, role: user.role });

      res.json({ accessToken, message: 'Token refreshed successfully!' });
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

function generateRefreshToken(payload) {
  const refreshSecretKey = 'jwtrefreshsecret';
  return jwt.sign(payload, refreshSecretKey, { expiresIn: '7d' });
}

function generateAccessToken(payload) {
  const secretKey = 'jwtsecret';
  return jwt.sign(payload, secretKey, { expiresIn: '1h' });
}

async function getRoleId(rolename) {
  const findRoleQuery = 'SELECT id FROM roles WHERE roleName = $1';
  const roleResult = await pool.query(findRoleQuery, [rolename]);

  if (roleResult.rows.length > 0) {
    return roleResult.rows[0].id;
  } else {
    const createRoleQuery = 'INSERT INTO roles (roleName) VALUES ($1) RETURNING id';
    const createRoleResult = await pool.query(createRoleQuery, [rolename]);
    return createRoleResult.rows[0].id;
  }
}

async function createBaseUser(username, hashedPassword, roleId) {
  const createBaseUserQuery = `
    INSERT INTO baseusers (username, password, role_id)
    VALUES ($1, $2, $3)
    RETURNING id
  `;
  const createBaseUserResult = await pool.query(createBaseUserQuery, [
    username, hashedPassword, roleId
  ]);

  return createBaseUserResult.rows[0].id;
}

async function createEmployee(name, surname, phonenumber, email, baseuserId) {
  const createEmployeeQuery = `
    INSERT INTO employees (name, surname, phoneNumber, email, baseuser_id)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
  `;

  const result = await pool.query(createEmployeeQuery, [
    name, surname, phonenumber, email, baseuserId,
  ]);

  return result.rows[0].id;
}