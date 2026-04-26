// server/config/db.js
const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER, 
    database: process.env.DB_NAME,
    options: {
        encrypt: false, // Set to true if deploying to Azure
        trustServerCertificate: true // Required for local development
    }
};

const connectDB = async () => {
    try {
        const pool = await sql.connect(config);
        console.log('✅ Microsoft SQL Server Connected Successfully');
        return pool;
    } catch (err) {
        console.error('❌ Database Connection Failed: ', err);
        process.exit(1); // Exit process with failure
    }
};

module.exports = { sql, connectDB };