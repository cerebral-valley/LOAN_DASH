import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Loan } from '../entities/Loan';
import { stringify } from 'csv-stringify/sync';
import { cache } from '../utils/redisCache';

export class LoanController {
  private loanRepository = AppDataSource.getRepository(Loan);

  // Helper to check if loan is released
  private isLoanReleased(released: string | null | undefined): boolean {
    if (!released) return false;
    return released.toUpperCase() === 'TRUE';
  }

  getAllLoans = async (req: Request, res: Response) => {
    try {
      // Check if requesting all loans without pagination
      const all = req.query.all === 'true';
      
      if (all) {
        // Return all loans without pagination for analysis pages
        const loans = await this.loanRepository.find({
          order: {
            loan_number: 'DESC',
          },
        });
        return res.json({ data: loans, pagination: null });
      }

      // Add pagination support with validation
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.max(1, parseInt(req.query.limit as string) || 100);
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
      const limit = Math.max(1, parseInt(req.query.limit as string) || 100);
      const skip = (page - 1) * limit;

      const queryBuilder = this.loanRepository
        .createQueryBuilder('loan')
        .where("UPPER(loan.released) != 'TRUE'")
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
      const limit = Math.max(1, parseInt(req.query.limit as string) || 100);
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
      const limit = Math.max(1, parseInt(req.query.limit as string) || 100);
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
          "COALESCE(SUM(loan.interest_amount), 0)",
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
      const limit = Math.max(1, parseInt(req.query.limit as string) || 100);
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
          "COALESCE(SUM(loan.interest_amount), 0)",
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

  getYieldStats = async (req: Request, res: Response) => {
    try {
      const cacheKey = 'yield_stats';
      const cachedStats = await cache.get(cacheKey);
      if (cachedStats) return res.json(cachedStats);

      const stats = await this.loanRepository
        .createQueryBuilder('loan')
        .select('SUM(loan.loan_amount)', 'totalCapital')
        .addSelect("COALESCE(SUM(loan.interest_amount), 0)", 'totalInterest')
        .addSelect("AVG(DATEDIFF(COALESCE(loan.date_of_release, NOW()), loan.date_of_disbursement))", 'avgDays')
        .where("loan.date_of_disbursement IS NOT NULL")
        .getRawOne();

      const result = {
        totalCapital: parseFloat(stats.totalCapital) || 0,
        totalInterest: parseFloat(stats.totalInterest) || 0,
        avgDays: Math.round(parseFloat(stats.avgDays)) || 0,
        portfolioYield: stats.totalCapital > 0 ? (stats.totalInterest / stats.totalCapital) * (365 / stats.avgDays) * 100 : 0
      };
      await cache.set(cacheKey, result);
      res.json(result);
    } catch (error) {
      console.error('Error fetching yield stats:', error);
      res.status(500).json({ error: 'Failed to fetch yield stats' });
    }
  };

  getYearlyBreakdown = async (req: Request, res: Response) => {
    try {
      const cacheKey = 'yearly_breakdown';
      const cachedStats = await cache.get(cacheKey);
      if (cachedStats) return res.json(cachedStats);

      // Get disbursement data grouped by disbursement date
      const breakdown = await this.loanRepository
        .createQueryBuilder('loan')
        .select("YEAR(loan.date_of_disbursement)", "year")
        .addSelect("MONTH(loan.date_of_disbursement)", "month")
        .addSelect("SUM(loan.loan_amount)", "disbursedAmount")
        .addSelect("COUNT(*)", "disbursedCount")
        .where("loan.date_of_disbursement >= '2020-01-01'")
        .groupBy("YEAR(loan.date_of_disbursement), MONTH(loan.date_of_disbursement)")
        .orderBy("year", "DESC")
        .addOrderBy("month", "DESC")
        .getRawMany();

      // Get release data grouped by RELEASE date (when loans were actually released)
      const releasesByReleaseDate = await this.loanRepository
        .createQueryBuilder('loan')
        .select("YEAR(loan.date_of_release)", "year")
        .addSelect("MONTH(loan.date_of_release)", "month")
        .addSelect("COALESCE(SUM(loan.loan_amount), 0)", "releasedAmount")
        .addSelect("COUNT(*)", "releasedCount")
        .addSelect("COALESCE(SUM(loan.interest_amount), 0)", "interestReceived")
        .where("UPPER(loan.released) = 'TRUE'")
        .andWhere("loan.date_of_release >= '2020-01-01'")
        .groupBy("YEAR(loan.date_of_release), MONTH(loan.date_of_release)")
        .getRawMany();

      // Create maps for release data by year-month
      const releaseMap = new Map<string, { releasedAmount: number; releasedCount: number; interestReceived: number }>();
      releasesByReleaseDate.forEach(row => {
        const key = `${row.year}-${row.month}`;
        releaseMap.set(key, {
          releasedAmount: parseFloat(row.releasedAmount) || 0,
          releasedCount: parseInt(row.releasedCount) || 0,
          interestReceived: parseFloat(row.interestReceived) || 0
        });
      });

      // Merge release data with breakdown data (by disbursement date)
      const result = breakdown.map(row => {
        const key = `${row.year}-${row.month}`;
        const releaseData = releaseMap.get(key) || { releasedAmount: 0, releasedCount: 0, interestReceived: 0 };
        return {
          ...row,
          releasedAmount: releaseData.releasedAmount,
          releasedCount: releaseData.releasedCount,
          interestReceived: releaseData.interestReceived
        };
      });

      await cache.set(cacheKey, result);
      res.json(result);
    } catch (error) {
      console.error('Error fetching yearly breakdown:', error);
      res.status(500).json({ error: 'Failed to fetch yearly breakdown' });
    }
  };

  // Performance Analytics Endpoint
  getPerformanceStats = async (req: Request, res: Response) => {
    try {
      const cacheKey = 'performance_stats';
      const cached = await cache.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      // Get all loans for performance calculation
      const loans = await this.loanRepository.find();

      // Calculate overall metrics
      const totalDisbursed = loans.reduce((sum, loan) => sum + (loan.loan_amount || 0), 0);
      const releasedLoans = loans.filter(loan => this.isLoanReleased(loan.released));
      const activeLoans = loans.filter(loan => !this.isLoanReleased(loan.released));

      const totalInterestReceived = releasedLoans.reduce(
        (sum, loan) => sum + (loan.interest_amount || 0),
        0
      );

      const totalCollected = releasedLoans.reduce(
        (sum, loan) => sum + (loan.loan_amount || 0),
        0
      );

      const collectionRate = totalDisbursed > 0
        ? (totalCollected / totalDisbursed) * 100
        : 0;

      const interestYield = totalDisbursed > 0
        ? (totalInterestReceived / totalDisbursed) * 100
        : 0;

      const activeRate = loans.length > 0
        ? (activeLoans.length / loans.length) * 100
        : 0;

      // Performance by customer type
      const performanceByType: Record<string, any> = {};
      
      loans.forEach(loan => {
        const type = loan.customer_type || 'Unknown';
        if (!performanceByType[type]) {
          performanceByType[type] = {
            type,
            count: 0,
            disbursed: 0,
            collected: 0,
            outstanding: 0,
            interestReceived: 0,
            collectionRate: 0,
            yieldRate: 0,
          };
        }

        const loanAmount = loan.loan_amount || 0;
        const isReleased = this.isLoanReleased(loan.released);

        performanceByType[type].count++;
        performanceByType[type].disbursed += loanAmount;

        if (isReleased) {
          performanceByType[type].collected += loanAmount;
          performanceByType[type].interestReceived += (loan.interest_amount || 0);
        } else {
          performanceByType[type].outstanding += (loan.pending_loan_amount || loanAmount);
        }
      });

      // Calculate rates for each type
      const performanceData = Object.values(performanceByType).map((perf: any) => {
        perf.collectionRate = perf.disbursed > 0
          ? (perf.collected / perf.disbursed) * 100
          : 0;
        perf.yieldRate = perf.disbursed > 0
          ? (perf.interestReceived / perf.disbursed) * 100
          : 0;
        return perf;
      }).sort((a: any, b: any) => b.disbursed - a.disbursed);

      const result = {
        totalDisbursed,
        totalInterestReceived,
        collectionRate,
        interestYield,
        activeRate,
        activeLoansCount: activeLoans.length,
        releasedLoansCount: releasedLoans.length,
        performanceData,
      };

      await cache.set(cacheKey, result, 600); // 10 min cache
      res.json(result);
    } catch (error) {
      console.error('Error fetching performance stats:', error);
      res.status(500).json({ error: 'Failed to fetch performance stats' });
    }
  };

  // Portfolio Analytics Endpoint
  getPortfolioStats = async (req: Request, res: Response) => {
    try {
      const cacheKey = 'portfolio_stats';
      const cached = await cache.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const loans = await this.loanRepository.find();

      // Portfolio by customer type
      const portfolioByType: Record<string, any> = {};
      
      loans.forEach(loan => {
        const type = loan.customer_type || 'Unknown';
        const isActive = !this.isLoanReleased(loan.released);

        if (!portfolioByType[type]) {
          portfolioByType[type] = {
            type,
            count: 0,
            totalAmount: 0,
            totalOutstanding: 0,
            activeLoans: 0,
            releasedLoans: 0,
            avgLoanSize: 0,
          };
        }

        portfolioByType[type].count++;
        portfolioByType[type].totalAmount += (loan.loan_amount || 0);

        if (isActive) {
          portfolioByType[type].activeLoans++;
          portfolioByType[type].totalOutstanding += (loan.pending_loan_amount || loan.loan_amount || 0);
        } else {
          portfolioByType[type].releasedLoans++;
        }
      });

      // Calculate averages
      const portfolioData = Object.values(portfolioByType).map((item: any) => {
        item.avgLoanSize = item.count > 0 ? item.totalAmount / item.count : 0;
        return item;
      }).sort((a: any, b: any) => b.totalAmount - a.totalAmount);

      // LTV Distribution
      const ltvDistribution: Record<string, any> = {
        '0-50%': { range: '0-50%', count: 0, totalValue: 0 },
        '51-70%': { range: '51-70%', count: 0, totalValue: 0 },
        '71-80%': { range: '71-80%', count: 0, totalValue: 0 },
        '81-90%': { range: '81-90%', count: 0, totalValue: 0 },
        '91-100%': { range: '91-100%', count: 0, totalValue: 0 },
      };

      loans.forEach(loan => {
        const ltv = loan.ltv_given || 0;
        const loanAmount = loan.loan_amount || 0;

        if (ltv <= 50) {
          ltvDistribution['0-50%'].count++;
          ltvDistribution['0-50%'].totalValue += loanAmount;
        } else if (ltv <= 70) {
          ltvDistribution['51-70%'].count++;
          ltvDistribution['51-70%'].totalValue += loanAmount;
        } else if (ltv <= 80) {
          ltvDistribution['71-80%'].count++;
          ltvDistribution['71-80%'].totalValue += loanAmount;
        } else if (ltv <= 90) {
          ltvDistribution['81-90%'].count++;
          ltvDistribution['81-90%'].totalValue += loanAmount;
        } else {
          ltvDistribution['91-100%'].count++;
          ltvDistribution['91-100%'].totalValue += loanAmount;
        }
      });

      const result = {
        portfolioByType: portfolioData,
        ltvDistribution: Object.values(ltvDistribution),
        totalLoans: loans.length,
        activeLoans: loans.filter(l => !this.isLoanReleased(l.released)).length,
      };

      await cache.set(cacheKey, result, 600); // 10 min cache
      res.json(result);
    } catch (error) {
      console.error('Error fetching portfolio stats:', error);
      res.status(500).json({ error: 'Failed to fetch portfolio stats' });
    }
  };

  // Customer Analytics Endpoint
  getCustomerAnalytics = async (req: Request, res: Response) => {
    try {
      const cacheKey = 'customer_analytics';
      const cached = await cache.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const loans = await this.loanRepository.find();

      // Group by customer
      const customerMap: Record<string, any> = {};

      loans.forEach(loan => {
        const name = loan.customer_name || 'Unknown';
        const type = loan.customer_type || 'Unknown';

        if (!customerMap[name]) {
          customerMap[name] = {
            name,
            type,
            totalLoans: 0,
            totalDisbursed: 0,
            totalOutstanding: 0,
            interestReceived: 0,
            activeLoans: 0,
            releasedLoans: 0,
          };
        }

        const isReleased = this.isLoanReleased(loan.released);
        customerMap[name].totalLoans++;
        customerMap[name].totalDisbursed += (loan.loan_amount || 0);

        if (isReleased) {
          customerMap[name].releasedLoans++;
          customerMap[name].interestReceived += (loan.interest_amount || 0);
        } else {
          customerMap[name].activeLoans++;
          customerMap[name].totalOutstanding += (loan.pending_loan_amount || loan.loan_amount || 0);
        }
      });

      // Top customers by total disbursed
      const topCustomers = Object.values(customerMap)
        .sort((a: any, b: any) => b.totalDisbursed - a.totalDisbursed)
        .slice(0, 20)
        .map((c: any) => ({
          ...c,
          avgLoanSize: c.totalLoans > 0 ? c.totalDisbursed / c.totalLoans : 0,
        }));

      // Analytics by customer type
      const byCustomerType: Record<string, any> = {};
      
      loans.forEach(loan => {
        const type = loan.customer_type || 'Unknown';
        if (!byCustomerType[type]) {
          byCustomerType[type] = {
            type,
            uniqueCustomers: new Set(),
            count: 0,
            totalDisbursed: 0,
          };
        }

        byCustomerType[type].uniqueCustomers.add(loan.customer_name);
        byCustomerType[type].count++;
        byCustomerType[type].totalDisbursed += (loan.loan_amount || 0);
      });

      const customerTypeData = Object.values(byCustomerType).map((item: any) => ({
        type: item.type,
        uniqueCustomers: item.uniqueCustomers.size,
        totalLoans: item.count,
        totalDisbursed: item.totalDisbursed,
        avgLoansPerCustomer: item.uniqueCustomers.size > 0
          ? item.count / item.uniqueCustomers.size
          : 0,
        avgDisbursement: item.count > 0
          ? item.totalDisbursed / item.count
          : 0,
      }));

      const result = {
        topCustomers,
        byCustomerType: customerTypeData,
        totalUniqueCustomers: Object.keys(customerMap).length,
        totalLoans: loans.length,
      };

      await cache.set(cacheKey, result, 600); // 10 min cache
      res.json(result);
    } catch (error) {
      console.error('Error fetching customer analytics:', error);
      res.status(500).json({ error: 'Failed to fetch customer analytics' });
    }
  };

  // Profitability Analytics Endpoint
  getProfitabilityStats = async (req: Request, res: Response) => {
    try {
      const cacheKey = 'profitability_stats';
      const cached = await cache.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const loans = await this.loanRepository.find();
      const releasedLoans = loans.filter(loan => this.isLoanReleased(loan.released));

      // Overall profitability
      const totalRevenue = releasedLoans.reduce(
        (sum, loan) => sum + (loan.interest_amount || 0),
        0
      );

      const totalDisbursed = releasedLoans.reduce(
        (sum, loan) => sum + (loan.loan_amount || 0),
        0
      );

      const avgYield = totalDisbursed > 0
        ? (totalRevenue / totalDisbursed) * 100
        : 0;

      // Profitability by customer type
      const profitByType: Record<string, any> = {};

      releasedLoans.forEach(loan => {
        const type = loan.customer_type || 'Unknown';

        if (!profitByType[type]) {
          profitByType[type] = {
            type,
            count: 0,
            revenue: 0,
            disbursed: 0,
            avgYield: 0,
          };
        }

        profitByType[type].count++;
        profitByType[type].revenue += (loan.interest_amount || 0);
        profitByType[type].disbursed += (loan.loan_amount || 0);
      });

      const profitabilityData = Object.values(profitByType).map((item: any) => {
        item.avgYield = item.disbursed > 0
          ? (item.revenue / item.disbursed) * 100
          : 0;
        return item;
      }).sort((a: any, b: any) => b.revenue - a.revenue);

      const result = {
        overall: {
          totalRevenue,
          totalDisbursed,
          avgYield,
          releasedLoans: releasedLoans.length,
        },
        byProductType: profitabilityData,
      };

      await cache.set(cacheKey, result, 600); // 10 min cache
      res.json(result);
    } catch (error) {
      console.error('Error fetching profitability stats:', error);
      res.status(500).json({ error: 'Failed to fetch profitability stats' });
    }
  };
}
