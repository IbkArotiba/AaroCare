const { Client } = require('pg');
require('dotenv').config();

// Log the variables to be absolutely sure what's being used by this script
console.log('--- Using Environment Variables for pg.Client ---');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASS is set:', !!process.env.DB_PASS); // Don't log the actual password
console.log('---------------------------------------------');

const client = new Client({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10), // Ensure port is an integer
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  ssl: { rejectUnauthorized: false }, // Common setting for Supabase
});

async function testConnection() {
  console.log('Attempting to connect with the following parameters:');
  console.log(`Host: ${client.connectionParameters.host}`);
  console.log(`Port: ${client.connectionParameters.port}`);
  console.log(`Database: ${client.connectionParameters.database}`);
  console.log(`User: ${client.connectionParameters.user}`);

  try {
    await client.connect();
    console.log('✅ Connected to Supabase successfully!');

    console.log('Testing schema queries...');
    const users = await client.query('SELECT COUNT(*) FROM users');
    const patients = await client.query('SELECT COUNT(*) FROM patients');

    console.log(`📊 Users in database: ${users.rows[0].count}`);
    console.log(`🏥 Patients in database: ${patients.rows[0].count}`);

    const doctors = await client.query("SELECT first_name, last_name FROM users WHERE role = 'doctor'");
    console.log('👨‍⚕️ Doctors:', doctors.rows);

  } catch (error) {
    console.error('❌ Connection failed:');
    console.error('Error message:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    // Log client configuration for debugging, omitting password
    const clientConfigForLog = { ...client.connectionParameters };
    delete clientConfigForLog.password;
    console.error('Client configuration used (password omitted):', clientConfigForLog);
    console.error('Full error object:', error);

  } finally {
    if (client && typeof client.end === 'function') {
        try {
            console.log('Attempting to disconnect client...');
            await client.end();
            console.log('Client disconnected.');
        } catch (endError) {
            console.error('Error during client disconnection:', endError.message);
        }
    }
  }
}

testConnection();