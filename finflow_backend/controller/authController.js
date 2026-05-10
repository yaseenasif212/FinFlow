const { sql } = require('../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const pool = await sql.connect();

        
        const userResult = await pool.request()
            .input('Email', sql.VarChar, email)
            .query(`SELECT UserID, Name, Role, Password FROM Users WHERE Email = @Email`);

        if (userResult.recordset.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        const user = userResult.recordset[0];

        

        const bruteForceCheck = await pool.request()
            .input('UserID', sql.VarChar, user.UserID)
            .query(`
                SELECT COUNT(*) AS FailedAttempts
                FROM AuditLogs
                WHERE UserID = @UserID 
                  AND ActionID = 'ACT-02' 
                  AND LogDate = CAST(GETDATE() AS DATE)
                  AND LogTime > DATEADD(MINUTE, -30, CAST(GETDATE() AS TIME))
            `);

        if (bruteForceCheck.recordset[0].FailedAttempts >= 5) {
            return res.status(429).json({ success: false, message: 'Account locked due to multiple failed attempts.' });
        }

        const isMatch = await bcrypt.compare(password, user.Password);

        if (!isMatch) { 
            const failedLogId = `LOG-${Date.now().toString().slice(-10)}`;
            await pool.request()
                .input('LogID', sql.VarChar, failedLogId) 
                .input('UserID', sql.VarChar, user.UserID)
                .query(`INSERT INTO AuditLogs (LogID, UserID, ActionID, LogDate, LogTime) 
                        VALUES (@LogID, @UserID, 'ACT-02', CAST(GETDATE() AS DATE), CAST(GETDATE() AS TIME))`);
                
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        
        const accountSummary = await pool.request()
            .input('UserID', sql.VarChar, user.UserID)
            .query(`
                SELECT AccountNumber, Balance, AccountStatus
                FROM Accounts
                WHERE UserID = @UserID
            `);

       
        const successLogId = `LOG-${Date.now().toString().slice(-10)}`;
        await pool.request()
            .input('LogID', sql.VarChar, successLogId)
            .input('UserID', sql.VarChar, user.UserID)
            .query(`INSERT INTO AuditLogs (LogID, UserID, ActionID, LogDate, LogTime) 
                    VALUES (@LogID, @UserID, 'ACT-01', CAST(GETDATE() AS DATE), CAST(GETDATE() AS TIME))`);

        
        const token = jwt.sign(
            { id: user.UserID, role: user.Role, UserID: user.UserID }, 
            process.env.JWT_SECRET || 'fallback_secret', 
            { expiresIn: '1h' }
        );

        res.status(200).json({
            success: true,
            token,
            user: {
                id: user.UserID,
                name: user.Name,
                role: user.Role,
                accounts: accountSummary.recordset
            }
        });

    } catch (err) {
        console.error('Login Error Details:', err);
        res.status(500).json({ success: false, message: 'Server error during authentication.' });
    }
};

const registerUser = async (req, res) => {
    const { name, cnic, email, password, phone, address, transactionPin, accountType } = req.body;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, message: 'Please provide a valid email address format.' });
    }

    try {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const pool = await sql.connect();

       
        const existingUser = await pool.request()
            .input('Email', sql.VarChar, email)
            .input('CNIC', sql.VarChar, cnic)
            .query(`SELECT UserID FROM Users WHERE Email = @Email OR CNIC = @CNIC`);

        if (existingUser.recordset.length > 0) {
            return res.status(400).json({ success: false, message: 'An account with this Email or CNIC already exists.' });
        }

        
        
        let isUserUnique = false;
        let newUserId = '';
        
       
        while (!isUserUnique) {
            newUserId = `U-${Math.floor(10000 + Math.random() * 90000)}`;
            const checkRes = await pool.request()
                .input('CheckUID', sql.VarChar, newUserId)
                .query(`SELECT COUNT(*) as count FROM Users WHERE UserID = @CheckUID`);
                
            if (checkRes.recordset[0].count === 0) {
                isUserUnique = true;
            }
        }

        let isAccUnique = false;
        let newAccountNumber = '';
        
      
        while (!isAccUnique) {
            newAccountNumber = `PK-FIN-${Math.floor(1000 + Math.random() * 9000)}`;
            const checkAccRes = await pool.request()
                .input('CheckAcc', sql.VarChar, newAccountNumber)
                .query(`SELECT COUNT(*) as count FROM Accounts WHERE AccountNumber = @CheckAcc`);
                
            if (checkAccRes.recordset[0].count === 0) {
                isAccUnique = true;
            }
        }
     
        await pool.request()
            .input('UserID', sql.VarChar, newUserId)
            .input('Name', sql.VarChar, name)
            .input('CNIC', sql.VarChar, cnic)
            .input('Email', sql.VarChar, email)
            .input('Password', sql.VarChar, hashedPassword)
            .input('Phone', sql.VarChar, phone || '')
            .input('Address', sql.Text, address || '')
            .input('Role', sql.VarChar, 'Customer')
            .query(`
                INSERT INTO Users (UserID, Name, CNIC, Email, Password, Phone, Address, Role) 
                VALUES (@UserID, @Name, @CNIC, @Email, @Password, @Phone, @Address, @Role)
            `);

    
        await pool.request()
            .input('NewAccNumber', sql.VarChar, newAccountNumber)
            .input('NewUserID', sql.VarChar, newUserId) 
            .input('Pin', sql.VarChar, transactionPin)
            .input('AccType', sql.VarChar, accountType || 'Current') 
            .query(`
                INSERT INTO Accounts (AccountNumber, UserID, Balance, AccountStatus, TransactionPin, AccountType)
                VALUES (@NewAccNumber, @NewUserID, 5000.00, 'Active', @Pin, @AccType)`);
        
       
        res.status(201).json({ 
            success: true, 
            message: 'Registration successful! You can now log in.' 
        });

    } catch (err) {
        console.error('Registration Error Details:', err);
        res.status(500).json({ success: false, message: 'Server error during registration.' });
    }
};

module.exports = { loginUser, registerUser };