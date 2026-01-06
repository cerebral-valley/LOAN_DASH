import { Router } from 'express';
import { RatesController } from '../controllers/RatesController';

const router = Router();
const ratesController = new RatesController();

/**
 * Gold & Silver Rates Routes
 * All rates are ordered by date descending (newest first)
 */

// Get current/latest rate
router.get('/current', (req, res) => ratesController.getCurrentRate(req, res));

// Get latest N rates with optional limit
router.get('/latest', (req, res) => ratesController.getLatestRates(req, res));

// Get moving average data for specified number of days
router.get('/moving-average', (req, res) => ratesController.getMovingAverageData(req, res));

// Get rates within a date range
router.get('/range', (req, res) => ratesController.getRatesInRange(req, res));

// Get rate for a specific date
router.get('/date/:date', (req, res) => ratesController.getRateByDate(req, res));

// Get all rates
router.get('/', (req, res) => ratesController.getAllRates(req, res));

export default router;
