const { sql } = require('../config/db');
const PDFDocument = require('pdfkit');
// 1. Fetch Dashboard Data
const getDashboardData = async (req, res) => {
    try {
        const pool = await sql.connect();
        const userId = req.user.id || req.user.UserID;

        const accountResult = await pool.request()
            .input('UserID', sql.VarChar, userId)
            .query(`SELECT AccountNumber, Balance, AccountStatus, AccountType FROM Accounts WHERE UserID = @UserID`);

        if (accountResult.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Bank accounts not found.' });
        }

        const primaryAccount = accountResult.recordset[0].AccountNumber;

        const txResult = await pool.request()
            .input('AccNum', sql.VarChar, primaryAccount)
            .query(`
                SELECT TransactionID, SenderAccount, ReceiverAccount, Amount, TransactionType,
                    FORMAT(TransactionDate, 'yyyy-MM-dd') AS FormattedDate, 
                    CONVERT(varchar(8), TransactionTime) AS FormattedTime
                FROM Transactions 
                WHERE SenderAccount = @AccNum OR ReceiverAccount = @AccNum
                ORDER BY TransactionDate DESC, TransactionTime DESC
            `);

        res.status(200).json({ success: true, accounts: accountResult.recordset, transactions: txResult.recordset });
    } catch (err) {
        console.error('Error fetching dashboard:', err);
        res.status(500).json({ success: false, message: 'Server error while fetching dashboard.' });
    }
};

// 2. Peer-to-Peer Transfer Engine
const transferMoney = async (req, res) => {
    const { senderAccount, receiverAccount, amount, pin } = req.body;
    const userId = req.user.id || req.user.UserID;

    if (!senderAccount || !receiverAccount || !amount || !pin) return res.status(400).json({ success: false, message: 'All fields are required.' });
    if (amount <= 0) return res.status(400).json({ success: false, message: 'Amount must be greater than zero.' });
    if (senderAccount === receiverAccount) return res.status(400).json({ success: false, message: 'Cannot send money to the same account.' });

    try {
        const pool = await sql.connect();

        // Verify Sender
        const senderCheck = await pool.request()
            .input('SenderAccount', sql.VarChar, senderAccount)
            .input('UserID', sql.VarChar, userId)
            .query(`SELECT Balance, TransactionPin, AccountStatus FROM Accounts WHERE AccountNumber = @SenderAccount AND UserID = @UserID`);

        if (senderCheck.recordset.length === 0) return res.status(404).json({ success: false, message: 'Sender account not found.' });
        if (senderCheck.recordset[0].AccountStatus !== 'Active') return res.status(403).json({ success: false, message: 'Your account is frozen.' });
        if (senderCheck.recordset[0].TransactionPin !== pin) return res.status(401).json({ success: false, message: 'Incorrect 4-Digit PIN.' });
        if (senderCheck.recordset[0].Balance < amount) return res.status(400).json({ success: false, message: 'Insufficient balance.' });

        // Verify Receiver
        const receiverCheck = await pool.request()
            .input('ReceiverAccount', sql.VarChar, receiverAccount)
            .query(`SELECT AccountStatus FROM Accounts WHERE AccountNumber = @ReceiverAccount`);

        if (receiverCheck.recordset.length === 0) return res.status(404).json({ success: false, message: 'Recipient account does not exist.' });
        if (receiverCheck.recordset[0].AccountStatus !== 'Active') return res.status(403).json({ success: false, message: 'Recipient account is frozen.' });

        // The Transaction
        const txId = `TRX-${Math.floor(10000000 + Math.random() * 90000000)}`;
        const logId = `LOG-${Date.now().toString().slice(-10)}`;

        await pool.request()
            .input('SenderAccount', sql.VarChar, senderAccount)
            .input('ReceiverAccount', sql.VarChar, receiverAccount)
            .input('Amount', sql.Decimal(18, 2), amount)
            .input('TxID', sql.VarChar, txId)
            .input('LogID', sql.VarChar, logId)
            .input('UserID', sql.VarChar, userId)
            .query(`
                BEGIN TRY
                    BEGIN TRANSACTION;
                    UPDATE Accounts SET Balance = Balance - @Amount WHERE AccountNumber = @SenderAccount;
                    UPDATE Accounts SET Balance = Balance + @Amount WHERE AccountNumber = @ReceiverAccount;
                    INSERT INTO Transactions (TransactionID, SenderAccount, ReceiverAccount, Amount, TransactionType, TransactionDate, TransactionTime)
                    VALUES (@TxID, @SenderAccount, @ReceiverAccount, @Amount, 'Transfer', CAST(GETDATE() AS DATE), CAST(GETDATE() AS TIME));
                    INSERT INTO AuditLogs (LogID, UserID, ActionID, TargetID, LogDate, LogTime, Description)
                    VALUES (@LogID, @UserID, 'ACT-04', @ReceiverAccount, CAST(GETDATE() AS DATE), CAST(GETDATE() AS TIME), 'Successful Fund Transfer');
                    COMMIT TRANSACTION;
                END TRY
                BEGIN CATCH
                    ROLLBACK TRANSACTION;
                    THROW;
                END CATCH
            `);

        res.status(200).json({ success: true, message: 'Transfer successful!', transactionId: txId });
    } catch (err) {
        console.error('Transfer Error:', err);
        res.status(500).json({ success: false, message: 'Transfer failed due to a system error.' });
    }
};

// 3. ATM Deposit (Add Money)
const depositMoney = async (req, res) => {
    const { accountNumber, amount } = req.body;
    const userId = req.user.id || req.user.UserID;

    if (!accountNumber || !amount || amount <= 0) return res.status(400).json({ success: false, message: 'Invalid deposit details.' });

    try {
        const pool = await sql.connect();
        
        // Ensure the account belongs to the user
        const accCheck = await pool.request()
            .input('AccountNumber', sql.VarChar, accountNumber)
            .input('UserID', sql.VarChar, userId)
            .query(`SELECT AccountStatus FROM Accounts WHERE AccountNumber = @AccountNumber AND UserID = @UserID`);
            
        if (accCheck.recordset.length === 0) return res.status(404).json({ success: false, message: 'Account not found.' });
        if (accCheck.recordset[0].AccountStatus !== 'Active') return res.status(403).json({ success: false, message: 'Account is frozen.' });

        const txId = `DEP-${Math.floor(10000000 + Math.random() * 90000000)}`;

        await pool.request()
            .input('AccountNumber', sql.VarChar, accountNumber)
            .input('Amount', sql.Decimal(18, 2), amount)
            .input('TxID', sql.VarChar, txId)
            .query(`
                BEGIN TRY
                    BEGIN TRANSACTION;
                    UPDATE Accounts SET Balance = Balance + @Amount WHERE AccountNumber = @AccountNumber;
                    INSERT INTO Transactions (TransactionID, ReceiverAccount, Amount, TransactionType, TransactionDate, TransactionTime)
                    VALUES (@TxID, @AccountNumber, @Amount, 'Deposit', CAST(GETDATE() AS DATE), CAST(GETDATE() AS TIME));
                    COMMIT TRANSACTION;
                END TRY
                BEGIN CATCH
                    ROLLBACK TRANSACTION;
                    THROW;
                END CATCH
            `);

        res.status(200).json({ success: true, message: `Successfully deposited Rs. ${amount}` });
    } catch (err) {
        console.error('Deposit Error:', err);
        res.status(500).json({ success: false, message: 'Deposit failed.' });
    }
};

// 4. ATM Withdraw (Take Money Out)
const withdrawMoney = async (req, res) => {
    const { accountNumber, amount, pin } = req.body;
    const userId = req.user.id || req.user.UserID;

    if (!accountNumber || !amount || amount <= 0 || !pin) return res.status(400).json({ success: false, message: 'All fields are required.' });

    try {
        const pool = await sql.connect();
        
        const accCheck = await pool.request()
            .input('AccountNumber', sql.VarChar, accountNumber)
            .input('UserID', sql.VarChar, userId)
            .query(`SELECT Balance, TransactionPin, AccountStatus FROM Accounts WHERE AccountNumber = @AccountNumber AND UserID = @UserID`);
            
        if (accCheck.recordset.length === 0) return res.status(404).json({ success: false, message: 'Account not found.' });
        if (accCheck.recordset[0].AccountStatus !== 'Active') return res.status(403).json({ success: false, message: 'Account is frozen.' });
        if (accCheck.recordset[0].TransactionPin !== pin) return res.status(401).json({ success: false, message: 'Incorrect PIN.' });
        if (accCheck.recordset[0].Balance < amount) return res.status(400).json({ success: false, message: 'Insufficient balance.' });

        const txId = `WDL-${Math.floor(10000000 + Math.random() * 90000000)}`;

        await pool.request()
            .input('AccountNumber', sql.VarChar, accountNumber)
            .input('Amount', sql.Decimal(18, 2), amount)
            .input('TxID', sql.VarChar, txId)
            .query(`
                BEGIN TRY
                    BEGIN TRANSACTION;
                    UPDATE Accounts SET Balance = Balance - @Amount WHERE AccountNumber = @AccountNumber;
                    INSERT INTO Transactions (TransactionID, SenderAccount, Amount, TransactionType, TransactionDate, TransactionTime)
                    VALUES (@TxID, @AccountNumber, @Amount, 'Withdrawal', CAST(GETDATE() AS DATE), CAST(GETDATE() AS TIME));
                    COMMIT TRANSACTION;
                END TRY
                BEGIN CATCH
                    ROLLBACK TRANSACTION;
                    THROW;
                END CATCH
            `);

        res.status(200).json({ success: true, message: `Successfully withdrew Rs. ${amount}` });
    } catch (err) {
        console.error('Withdrawal Error:', err);
        res.status(500).json({ success: false, message: 'Withdrawal failed.' });
    }
};

// 5. Update Security PIN
const updatePin = async (req, res) => {
    const { accountNumber, oldPin, newPin } = req.body;
    const userId = req.user.id || req.user.UserID;

    if (!accountNumber || !oldPin || !newPin || newPin.length !== 4) {
        return res.status(400).json({ success: false, message: 'Valid 4-digit PINs are required.' });
    }

    try {
        const pool = await sql.connect();
        
        const accCheck = await pool.request()
            .input('AccountNumber', sql.VarChar, accountNumber)
            .input('UserID', sql.VarChar, userId)
            .query(`SELECT TransactionPin FROM Accounts WHERE AccountNumber = @AccountNumber AND UserID = @UserID`);

        if (accCheck.recordset.length === 0) return res.status(404).json({ success: false, message: 'Account not found.' });
        if (accCheck.recordset[0].TransactionPin !== oldPin) return res.status(401).json({ success: false, message: 'Incorrect Current PIN.' });

        await pool.request()
            .input('NewPin', sql.VarChar, newPin)
            .input('AccountNumber', sql.VarChar, accountNumber)
            .query(`UPDATE Accounts SET TransactionPin = @NewPin WHERE AccountNumber = @AccountNumber`);

        res.status(200).json({ success: true, message: 'Security PIN updated successfully.' });
    } catch (err) {
        console.error('Update PIN Error:', err);
        res.status(500).json({ success: false, message: 'Failed to update PIN.' });
    }
};

// ==========================================
// CUSTOMER: Get Spending Analytics & REAL Credit Score
// ==========================================
const getSpendingAnalytics = async (req, res) => {
    const { accountNumber } = req.params;

    try {
        const pool = await sql.connect();
        
        // 1. Outgoing Breakdown (For the Pie/Bar Chart)
        const spendingResult = await pool.request()
            .input('AccountNumber', sql.VarChar, accountNumber)
            .query(`
                SELECT TransactionType AS name, SUM(Amount) AS value
                FROM dbo.Transactions
                WHERE SenderAccount = @AccountNumber
                GROUP BY TransactionType
            `);

        // 2. Cash Flow (Money In vs Money Out)
        const cashFlowResult = await pool.request()
            .input('AccountNumber', sql.VarChar, accountNumber)
            .query(`
                SELECT 
                    ISNULL(SUM(CASE WHEN ReceiverAccount = @AccountNumber THEN Amount ELSE 0 END), 0) AS MoneyIn,
                    ISNULL(SUM(CASE WHEN SenderAccount = @AccountNumber THEN Amount ELSE 0 END), 0) AS MoneyOut
                FROM dbo.Transactions
                WHERE ReceiverAccount = @AccountNumber OR SenderAccount = @AccountNumber
            `);

        // 3. CREDIT SCORE ALGORITHM: Fetch raw data needed for calculation
        const scoreDataResult = await pool.request()
            .input('AccountNumber', sql.VarChar, accountNumber)
            .query(`
                -- Get Current Balance
                SELECT Balance FROM dbo.Accounts WHERE AccountNumber = @AccountNumber;
                
                -- Get Transaction Count
                SELECT COUNT(*) AS TxCount FROM dbo.Transactions 
                WHERE SenderAccount = @AccountNumber OR ReceiverAccount = @AccountNumber;
                
                -- Get Virtual Card Limit (Removed the missing AvailableCredit column to fix crash)
                SELECT ISNULL(SUM(CreditLimit), 0) AS TotalLimit
                FROM dbo.ActiveCreditCards WHERE AccountNumber = @AccountNumber;
            `);

        // Extract the data from the 3 queries above
        const balance = scoreDataResult.recordsets[0][0]?.Balance || 0;
        const txCount = scoreDataResult.recordsets[1][0]?.TxCount || 0;
        const totalLimit = scoreDataResult.recordsets[2][0]?.TotalLimit || 0;
        
        // Temporarily defaulting spent to 0 to prevent crashes
        const totalSpent = 0; 

        // --- CALCULATE THE SCORE ---
        let calculatedScore = 600; // Base starting score

        // Factor A: Liquidity (Max +50)
        if (balance >= 50000) calculatedScore += 50;
        else if (balance >= 20000) calculatedScore += 30;
        else if (balance >= 5000) calculatedScore += 15;

        // Factor B: Transaction History (+2 per tx, max +100 points)
        calculatedScore += Math.min(txCount * 2, 100);

        // Factor C: Credit Utilization
        if (totalLimit > 0) {
            const utilizationRatio = totalSpent / totalLimit;
            
            if (utilizationRatio <= 0.30) {
                calculatedScore += 50;  // Excellent credit management
            } else if (utilizationRatio <= 0.70) {
                calculatedScore += 20;  // Average management
            } else if (utilizationRatio > 0.90) {
                calculatedScore -= 30;  // High risk, maxing out limits
            }
        } else {
            calculatedScore += 20; // Neutral bonus for having zero debt
        }

        // Ensure score stays within the realistic 300 - 850 range
        calculatedScore = Math.max(300, Math.min(calculatedScore, 850));

        res.status(200).json({ 
            success: true, 
            data: {
                spending: spendingResult.recordset,
                cashFlow: cashFlowResult.recordset[0],
                creditScore: calculatedScore
            }
        });
    } catch (err) {
        console.error('Analytics Error:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch analytics.' });
    }
};

// ==========================================
// CUSTOMER: Generate PDF Bank Statement
// ==========================================
const downloadStatement = async (req, res) => {
    const { accountNumber } = req.params;

    try {
        const pool = await sql.connect();

        // 1. Fetch Account & User details
        const accResult = await pool.request()
            .input('AccountNumber', sql.VarChar, accountNumber)
            .query(`
                SELECT a.AccountNumber, a.Balance, a.AccountType, u.Name, u.Email 
                FROM dbo.Accounts a
                JOIN dbo.Users u ON a.UserID = u.UserID
                WHERE a.AccountNumber = @AccountNumber
            `);

        if (accResult.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Account not found' });
        }
        const accountInfo = accResult.recordset[0];

        // 2. Fetch Transaction History (FIXED: Asking for TransactionDate instead of FormattedDate)
        const txResult = await pool.request()
            .input('AccountNumber', sql.VarChar, accountNumber)
            .query(`
                SELECT TransactionID, SenderAccount, ReceiverAccount, Amount, TransactionType, TransactionDate 
                FROM dbo.Transactions 
                WHERE SenderAccount = @AccountNumber OR ReceiverAccount = @AccountNumber
                ORDER BY TransactionDate DESC
            `);
        const transactions = txResult.recordset;

        // 3. Initialize PDF Document
        const PDFDocument = require('pdfkit');
        const doc = new PDFDocument({ margin: 50 });

        // Set response headers so the browser knows it's a downloadable PDF file
        res.setHeader('Content-disposition', `attachment; filename=FinFlow_Statement_${accountNumber}.pdf`);
        res.setHeader('Content-type', 'application/pdf');

        // Pipe the PDF directly to the HTTP response
        doc.pipe(res);

        // --- DRAW THE PDF ---
        // Header
        doc.fontSize(24).font('Times-BoldItalic').text('FinFlow.', { align: 'right' });
        doc.fontSize(10).font('Helvetica').fillColor('gray').text('Official Account Statement', { align: 'right' });
        doc.moveDown(2);

        // Customer Info
        doc.fillColor('black').fontSize(14).font('Helvetica-Bold').text('Account Details');
        doc.fontSize(10).font('Helvetica').text(`Customer Name: ${accountInfo.Name}`);
        doc.text(`Email: ${accountInfo.Email}`);
        doc.text(`Account Number: ${accountInfo.AccountNumber} (${accountInfo.AccountType})`);
        doc.text(`Statement Date: ${new Date().toLocaleDateString()}`);
        doc.moveDown();
        
        // Balance Summary
        doc.fontSize(14).font('Helvetica-Bold').text('Financial Summary');
        doc.fontSize(12).font('Helvetica').text(`Closing Balance: Rs. ${accountInfo.Balance.toLocaleString()}`);
        doc.moveDown(2);

        // Transaction Table Header
        doc.fontSize(12).font('Helvetica-Bold').text('Recent Transactions');
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke(); // Draw a line
        doc.moveDown(0.5);

        // Print Transactions
        doc.font('Helvetica').fontSize(10);
        if (transactions.length === 0) {
            doc.text('No transactions found for this account.', { align: 'center' });
        } else {
            transactions.forEach(tx => {
                const isMoneyOut = tx.SenderAccount === accountNumber;
                const sign = isMoneyOut ? '-' : '+';
                const counterparty = isMoneyOut ? `To: ${tx.ReceiverAccount}` : `From: ${tx.SenderAccount}`;
                
                // NEW: Use JavaScript to safely format the SQL Date
                const displayDate = new Date(tx.TransactionDate).toLocaleDateString();
                
                // Keep it on one line using specific X coordinates
                const y = doc.y;
                doc.text(displayDate, 50, y);
                doc.text(counterparty, 150, y);
                doc.text(tx.TransactionType || 'Transfer', 350, y);
                
                // Color code the amounts
                doc.fillColor(isMoneyOut ? 'red' : 'green');
                doc.text(`${sign} Rs.${tx.Amount}`, 450, y, { align: 'right' });
                
                doc.fillColor('black'); // Reset color
                doc.moveDown(0.5);
            });
        }

        // Footer
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown();
        doc.fontSize(8).fillColor('gray').text('This is a system-generated document. FinFlow Digital Vault securely protects your assets.', { align: 'center' });

        // Finalize the PDF and end the stream
        doc.end();

    } catch (err) {
        console.error('PDF Generation Error:', err);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Failed to generate statement' });
        }
    }
};

// Add these to your existing customerController.js
const applyForLoan = async (req, res) => {
    const { accountNumber, loanType, amount, repaymentDuration } = req.body;
    const loanId = `LN-${Date.now().toString().slice(-10)}`; 

    try {
        const pool = await sql.connect();
        await pool.request()
            .input('LoanID', sql.VarChar(20), loanId)
            .input('AccountNumber', sql.VarChar(20), accountNumber)
            .input('LoanType', sql.VarChar(50), loanType)
            .input('Amount', sql.Decimal(15,2), amount)
            .input('RepaymentDuration', sql.Int, repaymentDuration)
            .input('Status', sql.VarChar(20), 'Pending')
            .query(`
                INSERT INTO dbo.LoanApplications (LoanID, AccountNumber, LoanType, Amount, RepaymentDuration, Status)
                VALUES (@LoanID, @AccountNumber, @LoanType, @Amount, @RepaymentDuration, @Status)
            `);
            
        res.status(200).json({ success: true, message: 'Loan application submitted.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to apply.' });
    }
};

const getCustomerLoans = async (req, res) => {
    const { accountNumber } = req.params;
    try {
        const pool = await sql.connect();
        const appsResult = await pool.request()
            .input('AccountNumber', sql.VarChar(20), accountNumber)
            .query(`SELECT * FROM dbo.LoanApplications WHERE AccountNumber = @AccountNumber`);
            
        const activeResult = await pool.request()
            .input('AccountNumber', sql.VarChar(20), accountNumber)
            .query(`SELECT * FROM dbo.ActiveLoans WHERE AccountNumber = @AccountNumber`);
            
        res.status(200).json({ success: true, applications: appsResult.recordset, activeLoans: activeResult.recordset });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch loans.' });
    }
};

// ==========================================
// CUSTOMER: Beneficiaries (Quick Contacts)
// ==========================================
const getBeneficiaries = async (req, res) => {
    const { accountNumber } = req.params;
    try {
        const pool = await sql.connect();
        const result = await pool.request()
            .input('OwnerAccountNumber', sql.VarChar(20), accountNumber)
            .query(`SELECT * FROM dbo.Beneficiaries WHERE OwnerAccountNumber = @OwnerAccountNumber ORDER BY DateAdded DESC`);
            
        res.status(200).json({ success: true, beneficiaries: result.recordset });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to fetch contacts.' });
    }
};

const addBeneficiary = async (req, res) => {
    const { ownerAccount, beneficiaryAccount, nickname } = req.body;
    const beneficiaryId = `BEN-${Date.now().toString().slice(-10)}`; 

    try {
        const pool = await sql.connect();
        
        // Optional but recommended: Check if the target account actually exists first!
        const checkAcc = await pool.request()
            .input('AccountNumber', sql.VarChar(20), beneficiaryAccount)
            .query(`SELECT * FROM dbo.Accounts WHERE AccountNumber = @AccountNumber`);
            
        if (checkAcc.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'The account number you entered does not exist.' });
        }

        await pool.request()
            .input('BeneficiaryID', sql.VarChar(20), beneficiaryId)
            .input('OwnerAccountNumber', sql.VarChar(20), ownerAccount)
            .input('BeneficiaryAccountNumber', sql.VarChar(20), beneficiaryAccount)
            .input('Nickname', sql.VarChar(50), nickname)
            .query(`
                INSERT INTO dbo.Beneficiaries (BeneficiaryID, OwnerAccountNumber, BeneficiaryAccountNumber, Nickname, DateAdded)
                VALUES (@BeneficiaryID, @OwnerAccountNumber, @BeneficiaryAccountNumber, @Nickname, GETDATE())
            `);
            
        res.status(200).json({ success: true, message: 'Contact saved successfully!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to add contact.' });
    }
};

const removeBeneficiary = async (req, res) => {
    const { beneficiaryId } = req.params;
    try {
        const pool = await sql.connect();
        await pool.request()
            .input('BeneficiaryID', sql.VarChar(20), beneficiaryId)
            .query(`DELETE FROM dbo.Beneficiaries WHERE BeneficiaryID = @BeneficiaryID`);
            
        res.status(200).json({ success: true, message: 'Contact removed.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to remove contact.' });
    }
};





module.exports = { getDashboardData, transferMoney, depositMoney, withdrawMoney, updatePin,getSpendingAnalytics ,downloadStatement,applyForLoan, getCustomerLoans,getBeneficiaries, addBeneficiary, removeBeneficiary  };