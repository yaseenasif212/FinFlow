const { sql } = require('../config/db');


const applyForCard = async (req, res) => {
    const { accountNumber, requestedLimit } = req.body; 

    if (!accountNumber || !requestedLimit || requestedLimit < 1000 || requestedLimit > 500000) {
        return res.status(400).json({ success: false, message: 'Limit must be between Rs. 1,000 and Rs. 500,000.' });
    }
    try {
        const pool = await sql.connect();

        const checkResult = await pool.request()
            .input('AccountNumber', sql.VarChar, accountNumber)
            .query(`
                DECLARE @PendingCount INT = (SELECT COUNT(*) FROM dbo.CreditCardApplications WHERE AccountNumber = @AccountNumber AND Status = 'Pending');
                DECLARE @ActiveCount INT = (SELECT COUNT(*) FROM dbo.ActiveCreditCards WHERE AccountNumber = @AccountNumber);
                SELECT @PendingCount AS PendingCount, @ActiveCount AS ActiveCount;
            `);

        const status = checkResult.recordset[0];

        if (status.PendingCount > 0) return res.status(400).json({ success: false, message: 'You already have a pending application under review.' });
        if (status.ActiveCount >= 1) return res.status(400).json({ success: false, message: 'You already have an active Platinum card.' });

        const appId = `CCA-${Math.floor(100000 + Math.random() * 900000)}`;

        await pool.request()
            .input('AppID', sql.VarChar, appId)
            .input('AccountNumber', sql.VarChar, accountNumber)
            .input('DesiredTier', sql.VarChar, 'Platinum') 
            .input('CreditLimit', sql.Decimal(15, 2), requestedLimit)
            .query(`
                INSERT INTO dbo.CreditCardApplications (ApplicationID, AccountNumber, DesiredTier, CreditLimit, Status)
                VALUES (@AppID, @AccountNumber, @DesiredTier, @CreditLimit, 'Pending');
            `);

        res.status(200).json({ success: true, message: 'Credit Card application submitted!' });
    } catch (err) {
        console.error('Card App Error:', err);
        res.status(500).json({ success: false, message: 'Failed to submit application.' });
    }
};


const getActiveCards = async (req, res) => {
    const { accountNumber } = req.params; 

    try {
        const pool = await sql.connect();
        const result = await pool.request()
            .input('AccountNumber', sql.VarChar, accountNumber)
            .query(`
                SELECT 
                    CardNumber AS CardID, 
                    CardNumber, 
                    NextDueDate AS ExpiryDate, 
                    CreditLimit, 
                    (CreditLimit - OutstandingBalance) AS AvailableCredit 
                FROM dbo.ActiveCreditCards 
                WHERE AccountNumber = @AccountNumber;
            `);

        res.status(200).json({ success: true, cards: result.recordset });
    } catch (err) {
        console.error('Fetch Cards Error:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch cards.' });
    }
};


const approveCard = async (req, res) => {
    const { applicationId, accountNumber, approvedLimit } = req.body;

    if (!applicationId || !accountNumber || !approvedLimit || approvedLimit < 1000 || approvedLimit > 500000) {
        return res.status(400).json({ success: false, message: 'Approved limit must be between Rs. 1,000 and Rs. 500,000.' });
    }
    try {
        const pool = await sql.connect();
        const cardNumber = `4111${Math.floor(100000000000 + Math.random() * 900000000000)}`;

        await pool.request()
            .input('AppID', sql.VarChar, applicationId)
            .input('AccountNumber', sql.VarChar, accountNumber)
            .input('CardNumber', sql.VarChar, cardNumber)
            .input('ApprovedLimit', sql.Decimal(15, 2), approvedLimit)
            .query(`
                BEGIN TRANSACTION;

                UPDATE dbo.CreditCardApplications 
                SET Status = 'Approved' 
                WHERE ApplicationID = @AppID;

                INSERT INTO dbo.ActiveCreditCards (CardNumber, AccountNumber, CreditLimit, OutstandingBalance, NextDueDate)
                VALUES (@CardNumber, @AccountNumber, @ApprovedLimit, 0.00, DATEADD(MONTH, 1, GETDATE()));

                COMMIT TRANSACTION;
            `);

        res.status(200).json({ success: true, message: 'Virtual Credit Card Issued!' });
    } catch (err) {
        console.error('Card Approval Error:', err);
        res.status(500).json({ success: false, message: 'Failed to approve card.' });
    }
};


const getPendingCardApps = async (req, res) => {
    try {
        const pool = await sql.connect();
        const result = await pool.request().query(`
            SELECT ApplicationID, AccountNumber, DesiredTier, CreditLimit, Status 
            FROM dbo.CreditCardApplications 
            WHERE Status = 'Pending';
        `);

        res.status(200).json({ success: true, applications: result.recordset });
    } catch (err) {
        console.error('Fetch Pending Cards Error:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch pending applications.' });
    }
};


const rejectCard = async (req, res) => {
    const { applicationId } = req.body;

    if (!applicationId) return res.status(400).json({ success: false, message: 'Application ID required.' });

    try {
        const pool = await sql.connect();
        await pool.request()
            .input('AppID', sql.VarChar, applicationId)
            .query(`
                UPDATE dbo.CreditCardApplications 
                SET Status = 'Rejected' 
                WHERE ApplicationID = @AppID;
            `);

        res.status(200).json({ success: true, message: 'Application rejected.' });
    } catch (err) {
        console.error('Card Rejection Error:', err);
        res.status(500).json({ success: false, message: 'Failed to reject card.' });
    }
};

const getMyApplications = async (req, res) => {
    const { accountNumber } = req.params;
    try {
        const pool = await sql.connect();
        const result = await pool.request()
            .input('AccountNumber', sql.VarChar, accountNumber)
            .query(`
                SELECT ApplicationID, DesiredTier, CreditLimit, Status 
                FROM dbo.CreditCardApplications 
                WHERE AccountNumber = @AccountNumber;
            `);
        res.status(200).json({ success: true, applications: result.recordset });
    } catch (err) {
        console.error('Fetch Apps Error:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch applications.' });
    }
};

const deleteCard = async (req, res) => {
    const { cardNumber } = req.params;
    try {
        const pool = await sql.connect();
        await pool.request()
            .input('CardNumber', sql.VarChar, cardNumber)
            .query(`DELETE FROM dbo.ActiveCreditCards WHERE CardNumber = @CardNumber`);
        res.status(200).json({ success: true, message: 'Card deleted successfully' });
    } catch (err) {
        console.error('Delete Card Error:', err);
        res.status(500).json({ success: false, message: 'Failed to delete card' });
    }
};

module.exports = { applyForCard, getActiveCards, approveCard, getPendingCardApps, rejectCard, getMyApplications, deleteCard };