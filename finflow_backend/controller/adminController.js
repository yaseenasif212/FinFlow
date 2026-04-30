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

const approveLoan = async (req, res) => {
    const { loanId } = req.params;

    try {
        const pool = await sql.connect();
        
        // 1. Get the pending application
        const checkReq = await pool.request()
            .input('LoanID', sql.VarChar(20), loanId)
            .query(`SELECT * FROM dbo.LoanApplications WHERE LoanID = @LoanID AND Status = 'Pending'`);
            
        if (checkReq.recordset.length === 0) return res.status(404).json({ success: false, message: 'Not found.' });
        const app = checkReq.recordset[0];
        
        // 2. Math (5% interest)
        const totalAmountToRepay = app.Amount * 1.05;
        const monthlyInstallment = totalAmountToRepay / app.RepaymentDuration;
        
        // 3. The Secure Transaction
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        
        try {
            // A. Approve App
            await transaction.request().input('LoanID', sql.VarChar(20), app.LoanID)
                .query(`UPDATE dbo.LoanApplications SET Status = 'Approved' WHERE LoanID = @LoanID`);
                
            // B. Create Active Debt
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
                
            // C. Inject Money into Bank Account
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
// ==========================================
// ADMIN: Fetch Pending Queues
// ==========================================
const getPendingApplications = async (req, res) => {
    try {
        const pool = await sql.connect();
        
        // Fetch all pending loans from the specific table you showed me
        const pendingLoans = await pool.request()
            .query(`SELECT * FROM dbo.LoanApplications WHERE Status = 'Pending' ORDER BY LoanID DESC`);
            
        // Fetch all pending credit cards (I saw this table in your screenshot!)
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

module.exports = { getAllUsers, toggleAccountStatus, getAllTransactions, getAuditLogs, getPendingApplications,approveLoan };
