import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { GoldSilverRate } from '../entities/GoldSilverRate';
import { Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';

export class RatesController {
  private ratesRepository = AppDataSource.getRepository(GoldSilverRate);

  /**
   * Get all gold and silver rates, ordered by date descending
   * GET /api/rates
   */
  async getAllRates(req: Request, res: Response): Promise<void> {
    try {
      const rates = await this.ratesRepository.find({
        order: {
          rate_date: 'DESC',
        },
      });

      res.json(rates);
    } catch (error) {
      console.error('Error fetching all rates:', error);
      res.status(500).json({ error: 'Failed to fetch rates' });
    }
  }

  /**
   * Get latest N rates
   * GET /api/rates/latest?limit=30
   */
  async getLatestRates(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 30;

      const rates = await this.ratesRepository.find({
        order: {
          rate_date: 'DESC',
        },
        take: limit,
      });

      res.json(rates);
    } catch (error) {
      console.error('Error fetching latest rates:', error);
      res.status(500).json({ error: 'Failed to fetch latest rates' });
    }
  }

  /**
   * Get rate for a specific date
   * GET /api/rates/date/:date (format: YYYY-MM-DD)
   */
  async getRateByDate(req: Request, res: Response): Promise<void> {
    try {
      const { date } = req.params;

      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
        return;
      }

      const rate = await this.ratesRepository.findOne({
        where: { rate_date: date },
      });

      if (!rate) {
        res.status(404).json({ error: 'No rate found for the specified date' });
        return;
      }

      res.json(rate);
    } catch (error) {
      console.error('Error fetching rate by date:', error);
      res.status(500).json({ error: 'Failed to fetch rate' });
    }
  }

  /**
   * Get rates within a date range
   * GET /api/rates/range?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
   */
  async getRatesInRange(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({ error: 'Both startDate and endDate are required' });
        return;
      }

      // Validate date formats
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(startDate as string) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(endDate as string)
      ) {
        res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
        return;
      }

      const rates = await this.ratesRepository.find({
        where: {
          rate_date: Between(startDate as string, endDate as string),
        },
        order: {
          rate_date: 'DESC',
        },
      });

      res.json(rates);
    } catch (error) {
      console.error('Error fetching rates in range:', error);
      res.status(500).json({ error: 'Failed to fetch rates' });
    }
  }

  /**
   * Get the most recent rate
   * GET /api/rates/current
   */
  async getCurrentRate(req: Request, res: Response): Promise<void> {
    try {
      const rate = await this.ratesRepository.findOne({
        order: {
          rate_date: 'DESC',
        },
      });

      if (!rate) {
        res.status(404).json({ error: 'No rates found in database' });
        return;
      }

      res.json(rate);
    } catch (error) {
      console.error('Error fetching current rate:', error);
      res.status(500).json({ error: 'Failed to fetch current rate' });
    }
  }

  /**
   * Get rates for calculating moving averages
   * GET /api/rates/moving-average?days=90
   */
  async getMovingAverageData(req: Request, res: Response): Promise<void> {
    try {
      const days = parseInt(req.query.days as string) || 90;

      const rates = await this.ratesRepository.find({
        order: {
          rate_date: 'DESC',
        },
        take: days,
      });

      // Calculate moving averages
      const goldSum = rates.reduce((sum, rate) => sum + rate.ngp_hazir_gold, 0);
      const silverSum = rates.reduce((sum, rate) => sum + rate.ngp_hazir_silver, 0);

      const goldAvg = goldSum / rates.length;
      const silverAvg = silverSum / rates.length;

      const currentRate = rates[0];
      const goldDiff = currentRate.ngp_hazir_gold - goldAvg;
      const silverDiff = currentRate.ngp_hazir_silver - silverAvg;
      const goldPctChange = (goldDiff / goldAvg) * 100;
      const silverPctChange = (silverDiff / silverAvg) * 100;

      res.json({
        days,
        current: {
          gold: currentRate.ngp_hazir_gold,
          silver: currentRate.ngp_hazir_silver,
        },
        average: {
          gold: Math.round(goldAvg),
          silver: Math.round(silverAvg),
        },
        difference: {
          gold: Math.round(goldDiff),
          silver: Math.round(silverDiff),
        },
        percentChange: {
          gold: goldPctChange.toFixed(2),
          silver: silverPctChange.toFixed(2),
        },
        rates,
      });
    } catch (error) {
      console.error('Error calculating moving average:', error);
      res.status(500).json({ error: 'Failed to calculate moving average' });
    }
  }
}
