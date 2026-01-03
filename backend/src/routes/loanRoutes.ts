import { Router } from 'express';
import { LoanController } from '../controllers/LoanController';

const router = Router();
const loanController = new LoanController();

// Get all loans
router.get('/', loanController.getAllLoans);

// Get loan statistics
router.get('/stats', loanController.getLoanStats);

// Get overview statistics
router.get('/overview/stats', loanController.getOverviewStats);

// Get vyapari customers
router.get('/vyapari/customers', loanController.getVyapariCustomers);

// Get loans by customer name
router.get('/customer/:customerName', loanController.getLoansByCustomer);

// Get active loans
router.get('/active', loanController.getActiveLoans);

// Get released loans
router.get('/released', loanController.getReleasedLoans);

// Download loans as CSV
router.get('/download/csv', loanController.downloadLoansCSV);

// Get loans by customer type
router.get('/customer-type/:type', loanController.getLoansByCustomerType);

// Get loan by ID
router.get('/:id', loanController.getLoanById);

export default router;
