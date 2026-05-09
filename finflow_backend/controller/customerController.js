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

        const senderCheck = await pool.request()
            .input('SenderAccount', sql.VarChar, senderAccount)
            .input('UserID', sql.VarChar, userId)
            .query(`SELECT Balance, TransactionPin, AccountStatus FROM Accounts WHERE AccountNumber = @SenderAccount AND UserID = @UserID`);

        if (senderCheck.recordset.length === 0) return res.status(404).json({ success: false, message: 'Sender account not found.' });
        if (senderCheck.recordset[0].AccountStatus !== 'Active') return res.status(403).json({ success: false, message: 'Your account is frozen.' });
        if (senderCheck.recordset[0].TransactionPin !== pin) return res.status(401).json({ success: false, message: 'Incorrect 4-Digit PIN.' });
        if (senderCheck.recordset[0].Balance < amount) return res.status(400).json({ success: false, message: 'Insufficient balance.' });

        const receiverCheck = await pool.request()
            .input('ReceiverAccount', sql.VarChar, receiverAccount)
            .query(`SELECT AccountStatus FROM Accounts WHERE AccountNumber = @ReceiverAccount`);

        if (receiverCheck.recordset.length === 0) return res.status(404).json({ success: false, message: 'Recipient account does not exist.' });
        if (receiverCheck.recordset[0].AccountStatus !== 'Active') return res.status(403).json({ success: false, message: 'Recipient account is frozen.' });

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
        
        const spendingResult = await pool.request()
            .input('AccountNumber', sql.VarChar, accountNumber)
            .query(`
                SELECT TransactionType AS name, SUM(Amount) AS value
                FROM dbo.Transactions
                WHERE SenderAccount = @AccountNumber
                GROUP BY TransactionType
            `);

        const cashFlowResult = await pool.request()
            .input('AccountNumber', sql.VarChar, accountNumber)
            .query(`
                SELECT 
                    ISNULL(SUM(CASE WHEN ReceiverAccount = @AccountNumber THEN Amount ELSE 0 END), 0) AS MoneyIn,
                    ISNULL(SUM(CASE WHEN SenderAccount = @AccountNumber THEN Amount ELSE 0 END), 0) AS MoneyOut
                FROM dbo.Transactions
                WHERE ReceiverAccount = @AccountNumber OR SenderAccount = @AccountNumber
            `);

        const scoreDataResult = await pool.request()
            .input('AccountNumber', sql.VarChar, accountNumber)
            .query(`
                SELECT Balance FROM dbo.Accounts WHERE AccountNumber = @AccountNumber;
                
                SELECT COUNT(*) AS TxCount FROM dbo.Transactions 
                WHERE SenderAccount = @AccountNumber OR ReceiverAccount = @AccountNumber;
                
                SELECT ISNULL(SUM(CreditLimit), 0) AS TotalLimit
                FROM dbo.ActiveCreditCards WHERE AccountNumber = @AccountNumber;
            `);

        const balance = scoreDataResult.recordsets[0][0]?.Balance || 0;
        const txCount = scoreDataResult.recordsets[1][0]?.TxCount || 0;
        const totalLimit = scoreDataResult.recordsets[2][0]?.TotalLimit || 0;
        
        const totalSpent = 0; 

        let calculatedScore = 600; 

        if (balance >= 50000) calculatedScore += 50;
        else if (balance >= 20000) calculatedScore += 30;
        else if (balance >= 5000) calculatedScore += 15;

        calculatedScore += Math.min(txCount * 2, 100);

        if (totalLimit > 0) {
            const utilizationRatio = totalSpent / totalLimit;
            
            if (utilizationRatio <= 0.30) {
                calculatedScore += 50;  
            } else if (utilizationRatio <= 0.70) {
                calculatedScore += 20;  
            } else if (utilizationRatio > 0.90) {
                calculatedScore -= 30;  
            }
        } else {
            calculatedScore += 20; 
        }

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

        const txResult = await pool.request()
            .input('AccountNumber', sql.VarChar, accountNumber)
            .query(`
                SELECT TransactionID, SenderAccount, ReceiverAccount, Amount, TransactionType, TransactionDate 
                FROM dbo.Transactions 
                WHERE SenderAccount = @AccountNumber OR ReceiverAccount = @AccountNumber
                ORDER BY TransactionDate DESC
            `);
        const transactions = txResult.recordset;

        const PDFDocument = require('pdfkit');
        const doc = new PDFDocument({ margin: 50 });

        res.setHeader('Content-disposition', `attachment; filename=FinFlow_Statement_${accountNumber}.pdf`);
        res.setHeader('Content-type', 'application/pdf');

        doc.pipe(res);

        doc.fontSize(24).font('Times-BoldItalic').text('FinFlow.', { align: 'right' });
        doc.fontSize(10).font('Helvetica').fillColor('gray').text('Official Account Statement', { align: 'right' });
        doc.moveDown(2);

        doc.fillColor('black').fontSize(14).font('Helvetica-Bold').text('Account Details');
        doc.fontSize(10).font('Helvetica').text(`Customer Name: ${accountInfo.Name}`);
        doc.text(`Email: ${accountInfo.Email}`);
        doc.text(`Account Number: ${accountInfo.AccountNumber} (${accountInfo.AccountType})`);
        doc.text(`Statement Date: ${new Date().toLocaleDateString()}`);
        doc.moveDown();
        
        doc.fontSize(14).font('Helvetica-Bold').text('Financial Summary');
        doc.fontSize(12).font('Helvetica').text(`Closing Balance: Rs. ${accountInfo.Balance.toLocaleString()}`);
        doc.moveDown(2);

        doc.fontSize(12).font('Helvetica-Bold').text('Recent Transactions');
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke(); 
        doc.moveDown(0.5);

        doc.font('Helvetica').fontSize(10);
        if (transactions.length === 0) {
            doc.text('No transactions found for this account.', { align: 'center' });
        } else {
            transactions.forEach(tx => {
                const isMoneyOut = tx.SenderAccount === accountNumber;
                const sign = isMoneyOut ? '-' : '+';
                const counterparty = isMoneyOut ? `To: ${tx.ReceiverAccount}` : `From: ${tx.SenderAccount}`;
                
                const displayDate = new Date(tx.TransactionDate).toLocaleDateString();
                
                const y = doc.y;
                doc.text(displayDate, 50, y);
                doc.text(counterparty, 150, y);
                doc.text(tx.TransactionType || 'Transfer', 350, y);
                
                doc.fillColor(isMoneyOut ? 'red' : 'green');
                doc.text(`${sign} Rs.${tx.Amount}`, 450, y, { align: 'right' });
                
                doc.fillColor('black'); 
                doc.moveDown(0.5);
            });
        }

        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown();
        doc.fontSize(8).fillColor('gray').text('This is a system-generated document. FinFlow Digital Vault securely protects your assets.', { align: 'center' });

        doc.end();

    } catch (err) {
        console.error('PDF Generation Error:', err);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Failed to generate statement' });
        }
    }
};

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

// ==========================================
// CUSTOMER: Smart Bill Splitter
// ==========================================
const splitBill = async (req, res) => {
    const { payerAccount, totalAmount, participants } = req.body;
    
    const numberOfPeople = participants.length + 1;
    const splitAmount = parseFloat((totalAmount / numberOfPeople).toFixed(2));

    try {
        const pool = await sql.connect();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            for (const friendAcc of participants) {
                
                await transaction.request()
                    .input('FriendAcc', sql.VarChar(20), friendAcc)
                    .input('Amount', sql.Decimal(15,2), splitAmount)
                    .query(`UPDATE dbo.Accounts SET Balance = Balance - @Amount WHERE AccountNumber = @FriendAcc`);

                await transaction.request()
                    .input('PayerAcc', sql.VarChar(20), payerAccount)
                    .input('Amount', sql.Decimal(15,2), splitAmount)
                    .query(`UPDATE dbo.Accounts SET Balance = Balance + @Amount WHERE AccountNumber = @PayerAcc`);

                const uniqueTrxId = `TRX-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;

                await transaction.request()
                    .input('TransactionID', sql.VarChar(50), uniqueTrxId)
                    .input('FriendAcc', sql.VarChar(20), friendAcc)
                    .input('PayerAcc', sql.VarChar(20), payerAccount)
                    .input('Amount', sql.Decimal(15,2), splitAmount)
                    .query(`
                        INSERT INTO dbo.Transactions 
                        (TransactionID, SenderAccount, ReceiverAccount, Amount, TransactionType, TransactionDate, TransactionTime)
                        VALUES 
                        (@TransactionID, @FriendAcc, @PayerAcc, @Amount, 'Split Bill Settlement', GETDATE(), CONVERT(time, GETDATE()))
                    `);
            }
            
            await transaction.commit();
            res.status(200).json({ 
                success: true, 
                message: `Bill split! Collected Rs. ${splitAmount} from each friend.`,
                splitAmount: splitAmount
            });

        } catch (txError) {
            await transaction.rollback();
            throw txError; 
        }
    } catch (err) {
        console.error('Split Bill Error:', err);
        res.status(500).json({ success: false, message: 'Failed to process batch split. Funds rolled back.' });
    }
};




const getActiveLoans = async (req, res) => {
    const { accountNumber } = req.params;
    try {
        const pool = await sql.connect();
        const result = await pool.request()
            .input('AccNum', sql.VarChar(20), accountNumber)
            .query(`SELECT * FROM dbo.ActiveLoans WHERE AccountNumber = @AccNum AND RemainingBalance > 0`);
            
        res.status(200).json({ success: true, loans: result.recordset });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to fetch loans.' });
    }
};


const payLoanInstallment = async (req, res) => {
    const { accountNumber, loanId, paymentAmount } = req.body;

    try {
        const pool = await sql.connect();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
          
            await transaction.request()
                .input('AccNum', sql.VarChar(20), accountNumber)
                .input('Amount', sql.Decimal(15,2), paymentAmount)
                .query(`UPDATE dbo.Accounts SET Balance = Balance - @Amount WHERE AccountNumber = @AccNum`);

            
            await transaction.request()
                .input('LoanID', sql.VarChar(20), loanId) 
                .input('Amount', sql.Decimal(15,2), paymentAmount)
                .query(`UPDATE dbo.ActiveLoans SET RemainingBalance = RemainingBalance - @Amount WHERE LoanID = @LoanID`);

           
            
            const receiptId = `REP-${Date.now().toString().slice(-8)}`;
            await transaction.request()
                .input('RepaymentID', sql.VarChar(20), receiptId)
                .input('LoanID', sql.VarChar(20), loanId)
                .input('Amount', sql.Decimal(15,2), paymentAmount)
                .query(`
                    INSERT INTO dbo.LoanRepayments (RepaymentID, LoanID, AmountPaid, PaymentDate, PaymentStatus)
                    VALUES (@RepaymentID, @LoanID, @Amount, GETDATE(), 'On-Time')
                `);
           
            const uniqueTrxId = `TRX-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 100)}`;
            await transaction.request()
                .input('TransactionID', sql.VarChar(50), uniqueTrxId)
                .input('Sender', sql.VarChar(20), accountNumber)
                .input('Amount', sql.Decimal(15,2), paymentAmount)
               .query(`INSERT INTO dbo.Transactions (TransactionID, SenderAccount, ReceiverAccount, Amount, TransactionType, TransactionDate, TransactionTime)
        VALUES (@TransactionID, @Sender, 'PK-FIN-1002', @Amount, 'Loan Installment Payment', GETDATE(), CONVERT(time, GETDATE()))`);

            await transaction.commit();
            res.status(200).json({ success: true, message: `Installment of Rs. ${paymentAmount} paid successfully!` });

        } catch (txError) {
            await transaction.rollback();
            throw txError;
        }
    } catch (err) {
        console.error('Loan Repayment Error:', err);
        res.status(500).json({ success: false, message: 'Failed to process payment.' });
    }
};



module.exports = { getDashboardData, transferMoney, depositMoney, withdrawMoney, updatePin, getSpendingAnalytics, downloadStatement, applyForLoan, getCustomerLoans, getBeneficiaries, addBeneficiary, removeBeneficiary, splitBill,getActiveLoans, payLoanInstallment  };