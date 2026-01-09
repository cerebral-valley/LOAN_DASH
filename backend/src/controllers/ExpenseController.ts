import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { ExpenseTracker } from '../entities/ExpenseTracker';
import { stringify } from 'csv-stringify/sync';
import { cache } from '../utils/redisCache';

export class ExpenseController {
  private expenseRepository = AppDataSource.getRepository(ExpenseTracker);

  getAllExpenses = async (req: Request, res: Response) => {
    try {
      // Add pagination support with validation
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.max(1, parseInt(req.query.limit as string) || 100);
      const skip = (page - 1) * limit;

      const [expenses, total] = await this.expenseRepository.findAndCount({
        order: { date: 'DESC' },
        skip,
        take: limit,
      });

      res.json({
        data: expenses,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
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
      // Use streaming to avoid loading all data into memory
      const stream = await this.expenseRepository
        .createQueryBuilder('expense')
        .orderBy('expense.date', 'DESC')
        .stream();

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=expenses.csv');
      res.setHeader('Transfer-Encoding', 'chunked');

      let headerWritten = false;

      stream.on('data', (expense) => {
        try {
          // Write CSV header on first row
          if (!headerWritten) {
            const headers = Object.keys(expense).join(',');
            res.write(headers + '\n');
            headerWritten = true;
          }

          // Write data row
          const values = Object.values(expense).map((value) => {
            // Escape values that contain commas, quotes, or newlines
            if (value === null || value === undefined) return '';
            const str = String(value);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          });
          res.write(values.join(',') + '\n');
        } catch (error) {
          console.error('Error writing CSV row:', error);
        }
      });

      stream.on('end', () => {
        res.end();
      });

      stream.on('error', (error) => {
        console.error('Stream error:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to download CSV' });
        }
      });
    } catch (error) {
      console.error('Error downloading expenses CSV:', error);
      res.status(500).json({ error: 'Failed to download CSV' });
    }
  };

  getExpenseStats = async (req: Request, res: Response) => {
    try {
      // Check cache first
      const cacheKey = 'expense_stats';
      const cachedStats = await cache.get(cacheKey);
      if (cachedStats) {
        return res.json(cachedStats);
      }

      // Use single aggregated query instead of multiple queries
      const stats = await this.expenseRepository
        .createQueryBuilder('expense')
        .select('COUNT(*)', 'totalExpenses')
        .addSelect('SUM(expense.amount)', 'totalAmount')
        .addSelect("SUM(CASE WHEN expense.payment_mode = 'cash' THEN expense.amount ELSE 0 END)", 'cashExpenses')
        .addSelect("SUM(CASE WHEN expense.payment_mode = 'bank' THEN expense.amount ELSE 0 END)", 'bankExpenses')
        .getRawOne();

      const result = {
        totalExpenses: parseInt(stats.totalExpenses) || 0,
        totalAmount: parseFloat(stats.totalAmount) || 0,
        cashExpenses: parseFloat(stats.cashExpenses) || 0,
        bankExpenses: parseFloat(stats.bankExpenses) || 0,
      };

      // Store in cache
      await cache.set(cacheKey, result);

      res.json(result);
    } catch (error) {
      console.error('Error fetching expense stats:', error);
      res.status(500).json({ error: 'Failed to fetch expense stats' });
    }
  };
}
