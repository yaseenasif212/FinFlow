const express = require('express');
const router = express.Router();
const { 
    getDashboardData, 
    transferMoney, 
    depositMoney, 
    withdrawMoney, 
    updatePin 
} = require('../controller/customerController');
const { verifyToken } = require('../middleware/authMiddleware');




const { applyForCard, getActiveCards, getMyApplications, deleteCard } = require('../controller/cardController');


const { getSpendingAnalytics } = require('../controller/customerController');
const { downloadStatement } = require('../controller/customerController');  
const { applyForLoan, getCustomerLoans } = require('../controller/customerController');
const { getBeneficiaries, addBeneficiary, removeBeneficiary } = require('../controller/customerController');

// Get Dashboard Data
router.get('/dashboard', verifyToken, getDashboardData);

// Financial Transactions
router.post('/transfer', verifyToken, transferMoney);
router.post('/deposit', verifyToken, depositMoney);
router.post('/withdraw', verifyToken, withdrawMoney);

// Account Settings
router.put('/update-pin', verifyToken, updatePin);
router.post('/card/apply', verifyToken, applyForCard);
router.get('/cards/:accountNumber', verifyToken, getActiveCards);
router.get('/cards/applications/:accountNumber', verifyToken, getMyApplications);

router.delete('/cards/:cardNumber', verifyToken, deleteCard);

router.get('/analytics/:accountNumber', verifyToken, getSpendingAnalytics);
router.get('/statement/:accountNumber', verifyToken, downloadStatement);

router.post('/loan/apply', verifyToken, applyForLoan);
router.get('/loans/:accountNumber', verifyToken, getCustomerLoans);





router.get('/beneficiaries/:accountNumber', verifyToken, getBeneficiaries);
router.post('/beneficiaries/add', verifyToken, addBeneficiary);
router.delete('/beneficiaries/:beneficiaryId', verifyToken, removeBeneficiary);
module.exports = router;


