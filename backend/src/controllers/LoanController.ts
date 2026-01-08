import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Loan } from '../entities/Loan';
import { stringify } from 'csv-stringify/sync';
import { cache } from '../utils/redisCache';

export class LoanController {
  private loanRepository = AppDataSource.getRepository(Loan);

  getAllLoans = async (req: Request, res: Response) => {
    try {
      // Add pagination support with validation
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit as string) || 100));
      const skip = (page - 1) * limit;

      // Get total count for pagination metadata
      const [loans, total] = await this.loanRepository.findAndCount({
        skip,
        take: limit,
        order: {
          loan_number: 'DESC',
        },
      });

      res.json({
        data: loans,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Error fetching loans:', error);
      res.status(500).json({ error: 'Failed to fetch loans' });
    }
  };

  getLoanById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const loan = await this.loanRepository.findOne({
        where: { loan_number: parseInt(id) },
      });

      if (!loan) {
        return res.status(404).json({ error: 'Loan not found' });
      }

      res.json(loan);
    } catch (error) {
      console.error('Error fetching loan:', error);
      res.status(500).json({ error: 'Failed to fetch loan' });
    }
  };

  getActiveLoans = async (req: Request, res: Response) => {
    try {
      // Add pagination support with validation
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit as string) || 100));
      const skip = (page - 1) * limit;

      const queryBuilder = this.loanRepository
        .createQueryBuilder('loan')
        .where("loan.released != 'TRUE'")
        .orWhere('loan.released IS NULL')
        .orderBy('loan.loan_number', 'DESC')
        .skip(skip)
        .take(limit);

      const [loans, total] = await queryBuilder.getManyAndCount();

      res.json({
        data: loans,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Error fetching active loans:', error);
      res.status(500).json({ error: 'Failed to fetch active loans' });
    }
  };

  getReleasedLoans = async (req: Request, res: Response) => {
    try {
      // Add pagination support with validation
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit as string) || 100));
      const skip = (page - 1) * limit;

      const queryBuilder = this.loanRepository
        .createQueryBuilder('loan')
        .where("loan.released = 'TRUE'")
        .orderBy('loan.loan_number', 'DESC')
        .skip(skip)
        .take(limit);

      const [loans, total] = await queryBuilder.getManyAndCount();

      res.json({
        data: loans,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Error fetching released loans:', error);
      res.status(500).json({ error: 'Failed to fetch released loans' });
    }
  };

  getLoansByCustomerType = async (req: Request, res: Response) => {
    try {
      const { type } = req.params;
      // Add pagination support with validation
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit as string) || 100));
      const skip = (page - 1) * limit;

      const [loans, total] = await this.loanRepository.findAndCount({
        where: { customer_type: type },
        skip,
        take: limit,
        order: {
          loan_number: 'DESC',
        },
      });

      res.json({
        data: loans,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Error fetching loans by customer type:', error);
      res.status(500).json({ error: 'Failed to fetch loans by customer type' });
    }
  };

  downloadLoansCSV = async (req: Request, res: Response) => {
    try {
      // Use streaming to avoid loading all data into memory
      const stream = await this.loanRepository.createQueryBuilder('loan').stream();

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=loans.csv');
      res.setHeader('Transfer-Encoding', 'chunked');

      let isFirstRow = true;
      let headerWritten = false;

      stream.on('data', (loan) => {
        try {
          // Write CSV header on first row
          if (!headerWritten) {
            const headers = Object.keys(loan).join(',');
            res.write(headers + '\n');
            headerWritten = true;
          }

          // Write data row
          const values = Object.values(loan).map((value) => {
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
      console.error('Error downloading loans CSV:', error);
      res.status(500).json({ error: 'Failed to download CSV' });
    }
  };

  getLoanStats = async (req: Request, res: Response) => {
    try {
      // Check cache first
      const cacheKey = 'loan_stats';
      const cachedStats = await cache.get(cacheKey);
      if (cachedStats) {
        return res.json(cachedStats);
      }

      // Use a single aggregated query instead of 5 separate queries
      const stats = await this.loanRepository
        .createQueryBuilder('loan')
        .select('COUNT(*)', 'totalLoans')
        .addSelect(
          "SUM(CASE WHEN loan.released != 'TRUE' OR loan.released IS NULL THEN 1 ELSE 0 END)",
          'activeLoans'
        )
        .addSelect('SUM(loan.loan_amount)', 'totalDisbursed')
        .addSelect('SUM(loan.pending_loan_amount)', 'totalOutstanding')
        .addSelect(
          "SUM(CASE WHEN UPPER(loan.released) = 'TRUE' THEN loan.interest_amount ELSE loan.interest_deposited_till_date END)",
          'totalInterestReceived'
        )
        .getRawOne();

      const result = {
        totalLoans: parseInt(stats.totalLoans) || 0,
        activeLoans: parseInt(stats.activeLoans) || 0,
        releasedLoans: (parseInt(stats.totalLoans) || 0) - (parseInt(stats.activeLoans) || 0),
        totalDisbursed: parseFloat(stats.totalDisbursed) || 0,
        totalOutstanding: parseFloat(stats.totalOutstanding) || 0,
        totalInterestReceived: parseFloat(stats.totalInterestReceived) || 0,
      };

      // Store in cache
      await cache.set(cacheKey, result);

      res.json(result);
    } catch (error) {
      console.error('Error fetching loan stats:', error);
      res.status(500).json({ error: 'Failed to fetch loan stats' });
    }
  };

  getVyapariCustomers = async (req: Request, res: Response) => {
    try {
      const customers = await this.loanRepository
        .createQueryBuilder('loan')
        .select('loan.customer_id', 'customer_id')
        .addSelect('loan.customer_name', 'customer_name')
        .addSelect('loan.customer_type', 'customer_type')
        .where("UPPER(loan.customer_type) = 'VYAPARI'")
        .distinct(true)
        .orderBy('loan.customer_name', 'ASC')
        .getRawMany();

      res.json(customers);
    } catch (error) {
      console.error('Error fetching vyapari customers:', error);
      res.status(500).json({ error: 'Failed to fetch vyapari customers' });
    }
  };

  getLoansByCustomer = async (req: Request, res: Response) => {
    try {
      const { customerName } = req.params;
      // Add pagination support with validation
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit as string) || 100));
      const skip = (page - 1) * limit;

      const queryBuilder = this.loanRepository
        .createQueryBuilder('loan')
        .where('loan.customer_name = :customerName', { customerName })
        .orderBy('loan.date_of_disbursement', 'DESC')
        .skip(skip)
        .take(limit);

      const [loans, total] = await queryBuilder.getManyAndCount();

      res.json({
        data: loans,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Error fetching loans by customer:', error);
      res.status(500).json({ error: 'Failed to fetch loans by customer' });
    }
  };

  getOverviewStats = async (req: Request, res: Response) => {
    try {
      // Check cache first
      const cacheKey = 'overview_stats';
      const cachedStats = await cache.get(cacheKey);
      if (cachedStats) {
        return res.json(cachedStats);
      }

      // Use database aggregation instead of loading all records into memory
      const stats = await this.loanRepository
        .createQueryBuilder('loan')
        .select('SUM(loan.loan_amount)', 'totalDisbursed')
        .addSelect(
          "SUM(CASE WHEN UPPER(loan.released) = 'TRUE' THEN loan.interest_amount ELSE loan.interest_deposited_till_date END)",
          'totalInterestReceived'
        )
        .addSelect('COUNT(*)', 'totalLoans')
        .addSelect(
          "SUM(CASE WHEN loan.released != 'TRUE' OR loan.released IS NULL THEN 1 ELSE 0 END)",
          'activeLoans'
        )
        .addSelect(
          "SUM(CASE WHEN loan.released != 'TRUE' OR loan.released IS NULL THEN loan.pending_loan_amount ELSE 0 END)",
          'totalOutstanding'
        )
        .getRawOne();

      // Get loans grouped by date for time series
      const loansByDate = await this.loanRepository
        .createQueryBuilder('loan')
        .select('DATE(loan.date_of_disbursement)', 'date')
        .addSelect('SUM(loan.loan_amount)', 'disbursed')
        .addSelect('COUNT(*)', 'count')
        .where('loan.date_of_disbursement IS NOT NULL')
        .groupBy('DATE(loan.date_of_disbursement)')
        .orderBy('DATE(loan.date_of_disbursement)', 'ASC')
        .getRawMany();

      // Transform to object format
      const loansByDateObj = loansByDate.reduce((acc: Record<string, { disbursed: number; count: number }>, row) => {
        acc[row.date] = {
          disbursed: parseFloat(row.disbursed) || 0,
          count: parseInt(row.count) || 0,
        };
        return acc;
      }, {});

      const result = {
        totalDisbursed: parseFloat(stats.totalDisbursed) || 0,
        totalOutstanding: parseFloat(stats.totalOutstanding) || 0,
        totalInterestReceived: parseFloat(stats.totalInterestReceived) || 0,
        totalLoans: parseInt(stats.totalLoans) || 0,
        activeLoans: parseInt(stats.activeLoans) || 0,
        loansByDate: loansByDateObj,
      };

      // Store in cache
      await cache.set(cacheKey, result);

      res.json(result);
    } catch (error) {
      console.error('Error fetching overview stats:', error);
      res.status(500).json({ error: 'Failed to fetch overview stats' });
    }
  };
}
