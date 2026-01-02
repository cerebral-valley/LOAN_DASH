import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { ExpenseTracker } from '../entities/ExpenseTracker';
import { stringify } from 'csv-stringify/sync';

export class ExpenseController {
  private expenseRepository = AppDataSource.getRepository(ExpenseTracker);

  getAllExpenses = async (req: Request, res: Response) => {
    try {
      const expenses = await this.expenseRepository.find({
        order: { date: 'DESC' },
      });
      res.json(expenses);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      res.status(500).json({ error: 'Failed to fetch expenses' });
    }
  };

  getExpenseById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const expense = await this.expenseRepository.findOne({
        where: { id: parseInt(id) },
      });

      if (!expense) {
        return res.status(404).json({ error: 'Expense not found' });
      }

      res.json(expense);
    } catch (error) {
      console.error('Error fetching expense:', error);
      res.status(500).json({ error: 'Failed to fetch expense' });
    }
  };

  downloadExpensesCSV = async (req: Request, res: Response) => {
    try {
      const expenses = await this.expenseRepository.find({
        order: { date: 'DESC' },
      });

      const csvData = stringify(expenses, {
        header: true,
        columns: Object.keys(expenses[0] || {}),
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=expenses.csv');
      res.send(csvData);
    } catch (error) {
      console.error('Error downloading expenses CSV:', error);
      res.status(500).json({ error: 'Failed to download CSV' });
    }
  };

  getExpenseStats = async (req: Request, res: Response) => {
    try {
      const totalExpenses = await this.expenseRepository.count();

      const totalAmount = await this.expenseRepository
        .createQueryBuilder('expense')
        .select('SUM(expense.amount)', 'total')
        .getRawOne();

      const cashExpenses = await this.expenseRepository
        .createQueryBuilder('expense')
        .select('SUM(expense.amount)', 'total')
        .where("expense.payment_mode = 'cash'")
        .getRawOne();

      const bankExpenses = await this.expenseRepository
        .createQueryBuilder('expense')
        .select('SUM(expense.amount)', 'total')
        .where("expense.payment_mode = 'bank'")
        .getRawOne();

      res.json({
        totalExpenses,
        totalAmount: parseFloat(totalAmount.total) || 0,
        cashExpenses: parseFloat(cashExpenses.total) || 0,
        bankExpenses: parseFloat(bankExpenses.total) || 0,
      });
    } catch (error) {
      console.error('Error fetching expense stats:', error);
      res.status(500).json({ error: 'Failed to fetch expense stats' });
    }
  };
}
