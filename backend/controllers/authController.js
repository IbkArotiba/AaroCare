const AWS = require('aws-sdk');
const db = require('../config/database'); // Your database connection

const cognito = new AWS.CognitoIdentityServiceProvider({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

// Step 117-118: refreshToken Function
const refreshToken = async (req, res) => {
  try {
    // Validate refresh token exists
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token required' });
    }

    // Call Cognito to refresh token
    const params = {
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      ClientId: process.env.COGNITO_CLIENT_ID,
      AuthParameters: {
        REFRESH_TOKEN: refreshToken
      }
    };

    const result = await cognito.initiateAuth(params).promise();
    
    const accessToken = result.AuthenticationResult.AccessToken;
    const newRefreshToken = result.AuthenticationResult.RefreshToken || refreshToken;

    return res.status(200).json({
      accessToken,
      refreshToken: newRefreshToken
    });

  } catch (error) {
    console.error('Error refreshing token:', error);
    
    // Handle specific Cognito errors
    if (error.code === 'NotAuthorizedException') {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
    if (error.code === 'InvalidParameterException') {
      return res.status(400).json({ message: 'Invalid token format' });
    }
    
    return res.status(500).json({ message: 'Failed to refresh token' });
  }
};

// Step 119-120: updateProfile Function
const updateProfile = async (req, res) => {
  try {
    // Get user ID from auth middleware
    const userId = req.user.id;
    
    // Get update data from request body
    const { first_name, last_name, phone, department } = req.body;
    
    // Validate at least one field is being updated
    if (!first_name && !last_name && !phone && !department) {
      return res.status(400).json({ message: 'At least one field required for update' });
    }

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (first_name) {
      updates.push(`first_name = $${paramCount}`);
      values.push(first_name.trim());
      paramCount++;
    }

    if (last_name) {
      updates.push(`last_name = $${paramCount}`);
      values.push(last_name.trim());
      paramCount++;
    }

    if (phone) {
      // Basic phone validation
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      if (!phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))) {
        return res.status(400).json({ message: 'Invalid phone number format' });
      }
      updates.push(`phone = $${paramCount}`);
      values.push(phone.trim());
      paramCount++;
    }

    if (department) {
      // Validate department (optional - adjust based on your departments)
      const validDepartments = ['emergency', 'cardiology', 'pediatrics', 'surgery', 'general'];
      if (!validDepartments.includes(department.toLowerCase())) {
        return res.status(400).json({ message: 'Invalid department' });
      }
      updates.push(`department = $${paramCount}`);
      values.push(department.trim());
      paramCount++;
    }

    // Add updated_at timestamp
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    
    // Add user ID for WHERE clause
    values.push(userId);
    
    const query = `
      UPDATE users 
      SET ${updates.join(', ')} 
      WHERE id = $${paramCount}
      RETURNING id, email, first_name, last_name, role, employee_id, department, phone, is_active, created_at, updated_at
    `;

    const result = await db.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
      message: 'Profile updated successfully',
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    
    // Handle specific database errors
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({ message: 'Phone number already in use' });
    }
    
    return res.status(500).json({ message: 'Failed to update profile' });
  }
};

module.exports = {
  refreshToken,
  updateProfile
};