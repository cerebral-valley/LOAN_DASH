import { Router } from 'express';
import { ExpenseController } from '../controllers/ExpenseController';

const router = Router();
const expenseController = new ExpenseController();

// Get all expenses
router.get('/', expenseController.getAllExpenses);

// Get expense statistics
router.get('/stats', expenseController.getExpenseStats);

// Download expenses as CSV
router.get('/download/csv', expenseController.downloadExpensesCSV);

// Get expense by ID
router.get('/:id', expenseController.getExpenseById);

export default router;
