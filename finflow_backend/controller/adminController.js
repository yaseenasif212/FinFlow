const { sql } = require('../config/db');

// 1. Fetch Users + their Account Status
const getAllUsers = async (req, res) => {
    try {
        const pool = await sql.connect();
        
        // We use a LEFT JOIN so we still get the Admin even if they don't have a checking account
        const result = await pool.request().query(`
            SELECT u.UserID, u.Name, u.Email, u.CNIC, u.Role, 
                   a.AccountNumber, a.AccountStatus
            FROM Users u
            LEFT JOIN Accounts a ON u.UserID = a.UserID
        `);

        res.status(200).json({ success: true, users: result.recordset });
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ success: false, message: 'Server error while fetching users.' });
    }
};

// 2. The Power to Freeze/Unfreeze
const toggleAccountStatus = async (req, res) => {
    const { userId } = req.params;
    const { currentStatus } = req.body;

    try {
        const pool = await sql.connect();
        
        // If it's active, freeze it. If it's frozen, make it active.
        const newStatus = currentStatus === 'Active' ? 'Frozen' : 'Active';

        await pool.request()
            .input('UserID', sql.VarChar, userId)
            .input('Status', sql.VarChar, newStatus)
            .query(`
                UPDATE Accounts 
                SET AccountStatus = @Status 
                WHERE UserID = @UserID
            `);

        res.status(200).json({ 
            success: true, 
            message: `Account has been marked as ${newStatus}`, 
            newStatus 
        });

    } catch (err) {
        console.error('Error toggling status:', err);
        res.status(500).json({ success: false, message: 'Server error while updating status.' });
    }
};

// ... existing getAllUsers and toggleAccountStatus functions ...

// 3. Fetch the Global Ledger (All Transactions)
const getAllTransactions = async (req, res) => {
    try {
        const pool = await sql.connect();
        
        // Fetch all transactions, newest first. 
        // (Assuming your table is named Transactions)
        const result = await pool.request().query(`
            SELECT * FROM Transactions 
            ORDER BY TransactionDate DESC, TransactionTime DESC
        `);

        res.status(200).json({ success: true, transactions: result.recordset });
    } catch (err) {
        console.error('Error fetching transactions:', err);
        res.status(500).json({ success: false, message: 'Server error while fetching transactions.' });
    }
};

// 4. Fetch Security & Audit Logs
const getAuditLogs = async (req, res) => {
    try {
        const pool = await sql.connect();
        
        // Let SQL handle the formatting so JavaScript doesn't mess up the timezones!
        const result = await pool.request().query(`
            SELECT TOP 100 
                LogID, 
                UserID, 
                ActionID, 
                TargetID, 
                FORMAT(LogDate, 'yyyy-MM-dd') AS FormattedDate, 
                CONVERT(varchar(8), LogTime) AS FormattedTime, 
                Description 
            FROM AuditLogs 
            ORDER BY LogDate DESC, LogTime DESC
        `);

        res.status(200).json({ success: true, logs: result.recordset });
    } catch (err) {
        console.error('Error fetching audit logs:', err);
        res.status(500).json({ success: false, message: 'Server error while fetching logs.' });
    }
};
// Make sure ALL FOUR functions are now exported!
module.exports = { getAllUsers, toggleAccountStatus, getAllTransactions, getAuditLogs };