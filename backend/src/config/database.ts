import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Loan } from '../entities/Loan';
import { ExpenseTracker } from '../entities/ExpenseTracker';

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  username: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASS || '',
  database: process.env.MYSQL_DB || 'loan_dash',
  synchronize: false, // Don't auto-create schema
  logging: process.env.NODE_ENV === 'development',
  entities: [Loan, ExpenseTracker],
  subscribers: [],
  migrations: [],
  // Connection pooling configuration for better performance
  extra: {
    connectionLimit: 10, // Maximum number of connections in pool
    waitForConnections: true,
    queueLimit: 0,
  },
  // Connection pool settings
  poolSize: 10,
});

export const initializeDatabase = async () => {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connection established');
    console.log(`📊 Connection pool size: ${AppDataSource.options.poolSize || 10}`);
    return AppDataSource;
  } catch (error) {
    console.error('❌ Error connecting to database:', error);
    throw error;
  }
};
