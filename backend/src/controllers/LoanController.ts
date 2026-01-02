import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Loan } from '../entities/Loan';
import { stringify } from 'csv-stringify/sync';

export class LoanController {
  private loanRepository = AppDataSource.getRepository(Loan);

  getAllLoans = async (req: Request, res: Response) => {
    try {
      const loans = await this.loanRepository.find();
      res.json(loans);
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
      const loans = await this.loanRepository
        .createQueryBuilder('loan')
        .where("loan.released != 'TRUE'")
        .orWhere('loan.released IS NULL')
        .getMany();

      res.json(loans);
    } catch (error) {
      console.error('Error fetching active loans:', error);
      res.status(500).json({ error: 'Failed to fetch active loans' });
    }
  };

  getReleasedLoans = async (req: Request, res: Response) => {
    try {
      const loans = await this.loanRepository
        .createQueryBuilder('loan')
        .where("loan.released = 'TRUE'")
        .getMany();

      res.json(loans);
    } catch (error) {
      console.error('Error fetching released loans:', error);
      res.status(500).json({ error: 'Failed to fetch released loans' });
    }
  };

  getLoansByCustomerType = async (req: Request, res: Response) => {
    try {
      const { type } = req.params;
      const loans = await this.loanRepository.find({
        where: { customer_type: type },
      });

      res.json(loans);
    } catch (error) {
      console.error('Error fetching loans by customer type:', error);
      res.status(500).json({ error: 'Failed to fetch loans by customer type' });
    }
  };

  downloadLoansCSV = async (req: Request, res: Response) => {
    try {
      const loans = await this.loanRepository.find();

      const csvData = stringify(loans, {
        header: true,
        columns: Object.keys(loans[0] || {}),
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=loans.csv');
      res.send(csvData);
    } catch (error) {
      console.error('Error downloading loans CSV:', error);
      res.status(500).json({ error: 'Failed to download CSV' });
    }
  };

  getLoanStats = async (req: Request, res: Response) => {
    try {
      const totalLoans = await this.loanRepository.count();
      const activeLoans = await this.loanRepository
        .createQueryBuilder('loan')
        .where("loan.released != 'TRUE'")
        .orWhere('loan.released IS NULL')
        .getCount();

      const totalDisbursed = await this.loanRepository
        .createQueryBuilder('loan')
        .select('SUM(loan.loan_amount)', 'total')
        .getRawOne();

      const totalOutstanding = await this.loanRepository
        .createQueryBuilder('loan')
        .select('SUM(loan.pending_loan_amount)', 'total')
        .getRawOne();

      const totalInterestReceived = await this.loanRepository
        .createQueryBuilder('loan')
        .select('SUM(loan.interest_deposited_till_date)', 'total')
        .getRawOne();

      res.json({
        totalLoans,
        activeLoans,
        releasedLoans: totalLoans - activeLoans,
        totalDisbursed: parseFloat(totalDisbursed.total) || 0,
        totalOutstanding: parseFloat(totalOutstanding.total) || 0,
        totalInterestReceived: parseFloat(totalInterestReceived.total) || 0,
      });
    } catch (error) {
      console.error('Error fetching loan stats:', error);
      res.status(500).json({ error: 'Failed to fetch loan stats' });
    }
  };
}
