const db = require('../config/database');

const getAllUsers = async (req, res) => {
    try {
      const users = await db.query(
        `SELECT id, first_name, last_name, role, department 
         FROM users 
         WHERE is_active = true 
         ORDER BY first_name, last_name`
      );
      
      return res.status(200).json(users.rows);
    } catch (error) {
      console.error('Error fetching users:', error);
      return res.status(500).json({ message: 'Failed to fetch users' });
    }
  };

  module.exports = {
    getAllUsers
  };