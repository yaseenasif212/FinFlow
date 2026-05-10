const express = require('express');
const router = express.Router();

const { getAllUsers, toggleAccountStatus, getAllTransactions, getAuditLogs } = require('../controller/adminController');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

const { approveCard, getPendingCardApps, rejectCard } = require('../controller/cardController');



const { getPendingApplications, approveLoan,rejectLoan } = require('../controller/adminController');
const { getAdminDashboardStats } = require('../controller/adminController');
router.get('/all-users', verifyToken, verifyAdmin, getAllUsers);
router.put('/toggle-status/:userId', verifyToken, verifyAdmin, toggleAccountStatus);
router.get('/all-transactions', verifyToken, verifyAdmin, getAllTransactions);

router.get('/audit-logs', verifyToken, verifyAdmin, getAuditLogs);
router.post('/card/approve', verifyToken, approveCard);


router.get('/cards/pending', verifyToken, getPendingCardApps); 
router.post('/card/approve', verifyToken, approveCard);
router.post('/card/reject', verifyToken, rejectCard);

router.put('/loans/approve/:loanId', approveLoan); 
router.put('/loans/reject/:loanId', rejectLoan);
router.get('/applications/pending', getPendingApplications);
router.get('/dashboard', getAdminDashboardStats);

module.exports = router;











