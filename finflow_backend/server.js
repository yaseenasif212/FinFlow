// server/server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { connectDB } = require('./config/db');
const authRoutes = require('./routes/authroutes');
const adminRoutes = require('./routes/adminRoutes'); // <-- 1. Add this impor
const customerRoutes = require('./routes/customerRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Parses incoming JSON requests
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/customer', customerRoutes);


// Initialize Database Connection
connectDB();

// Health Check Route
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'success', message: 'SideQuest API is running' });
});

// Server Initialization
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

// server/server.js

// Database Test Route
app.get('/api/test-db', async (req, res) => {
    try {
        const { sql } = require('./config/db');
        // Execute a simple test query
        const result = await sql.query`SELECT @@VERSION AS SqlVersion`;
        
        res.status(200).json({ 
            success: true, 
            message: 'Query executed successfully!',
            data: result.recordset[0]
        });
    } catch (err) {
        console.error('Query Error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});