const { sql } = require('../config/db');


const getAllUsers = async (req, res) => {
    try {
        const pool = await sql.connect();
        
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


const toggleAccountStatus = async (req, res) => {
    const { userId } = req.params;
    const { currentStatus } = req.body;

    try {
        const pool = await sql.connect();
        
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


const getAllTransactions = async (req, res) => {
    try {
        const pool = await sql.connect();
        
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


const getAuditLogs = async (req, res) => {
    try {
        const pool = await sql.connect();
        
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

const approveLoan = async (req, res) => {
    const { loanId } = req.params;

    try {
        const pool = await sql.connect();
        
        const checkReq = await pool.request()
            .input('LoanID', sql.VarChar(20), loanId)
            .query(`SELECT * FROM dbo.LoanApplications WHERE LoanID = @LoanID AND Status = 'Pending'`);
            
        if (checkReq.recordset.length === 0) return res.status(404).json({ success: false, message: 'Not found.' });
        const app = checkReq.recordset[0];
        
        const totalAmountToRepay = app.Amount * 1.05;
        const monthlyInstallment = totalAmountToRepay / app.RepaymentDuration;
        
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        
        try {
            await transaction.request().input('LoanID', sql.VarChar(20), app.LoanID)
                .query(`UPDATE dbo.LoanApplications SET Status = 'Approved' WHERE LoanID = @LoanID`);
                
            await transaction.request()
                .input('LoanID', sql.VarChar(20), app.LoanID)
                .input('AccountNumber', sql.VarChar(20), app.AccountNumber)
                .input('TotalAmount', sql.Decimal(15,2), totalAmountToRepay)
                .input('RemainingBalance', sql.Decimal(15,2), totalAmountToRepay)
                .input('MonthlyInstallment', sql.Decimal(15,2), monthlyInstallment)
                .query(`
                    INSERT INTO dbo.ActiveLoans (LoanID, AccountNumber, TotalAmount, RemainingBalance, MonthlyInstallment, NextDueDate)
                    VALUES (@LoanID, @AccountNumber, @TotalAmount, @RemainingBalance, @MonthlyInstallment, DATEADD(month, 1, GETDATE()))
                `);
                
            await transaction.request()
                .input('AccountNumber', sql.VarChar(20), app.AccountNumber)
                .input('Amount', sql.Decimal(15,2), app.Amount)
                .query(`UPDATE dbo.Accounts SET Balance = Balance + @Amount WHERE AccountNumber = @AccountNumber`);
                
            await transaction.commit();
            res.status(200).json({ success: true, message: 'Loan approved and funded!' });
        } catch (txError) {
            await transaction.rollback();
            throw txError;
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};


const getPendingApplications = async (req, res) => {
    try {
        const pool = await sql.connect();
        
        const pendingLoans = await pool.request()
            .query(`SELECT * FROM dbo.LoanApplications WHERE Status = 'Pending' ORDER BY LoanID DESC`);
            
        const pendingCards = await pool.request()
            .query(`SELECT * FROM dbo.CreditCardApplications WHERE Status = 'Pending'`);

        res.status(200).json({ 
            success: true, 
            pendingLoans: pendingLoans.recordset,
            pendingCards: pendingCards.recordset
        });
    } catch (err) {
        console.error('Admin Fetch Error:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch pending applications.' });
    }
};

const rejectLoan = async (req, res) => {
    const { loanId } = req.params;
    
    try {
        const pool = await sql.connect();
        // Just update the status to Rejected
        await pool.request()
            .input('LoanID', sql.VarChar(20), loanId)
            .query(`UPDATE dbo.LoanApplications SET Status = 'Rejected' WHERE LoanID = @LoanID`);
            
        res.status(200).json({ success: true, message: 'Loan application rejected.' });
    } catch (err) {
        console.error('Reject Loan Error:', err);
        res.status(500).json({ success: false, message: 'Server error while rejecting loan.' });
    }
};
const getAdminDashboardStats = async (req, res) => {
    try {
        const pool = await sql.connect();
        
        // Count total users
        const users = await pool.request().query(`SELECT COUNT(*) as count FROM dbo.Users WHERE Role = 'Customer'`);
        
        // Count total transactions
        const transactions = await pool.request().query(`SELECT COUNT(*) as count FROM dbo.Transactions`);

        res.status(200).json({
            success: true,
            totalUsers: users.recordset[0].count,
            totalTransactions: transactions.recordset[0].count
        });
    } catch (err) {
        console.error('Error fetching admin stats:', err);
        res.status(500).json({ success: false, message: 'Server error while fetching stats.' });
    }
};
module.exports = { getAllUsers, toggleAccountStatus, getAllTransactions, getAuditLogs, getPendingApplications, approveLoan,rejectLoan, getAdminDashboardStats };