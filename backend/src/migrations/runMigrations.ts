import { readFileSync } from 'fs';
import { join } from 'path';
import { AppDataSource } from '../config/database';

/**
 * Run database migrations
 * This function reads and executes SQL migration files
 */
export async function runMigrations() {
  try {
    console.log('📦 Running database migrations...');
    
    const migrationPath = join(__dirname, '001_add_performance_indexes.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    // Split by semicolon and filter empty statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    // Execute each statement
    for (const statement of statements) {
      await AppDataSource.query(statement);
    }
    
    console.log('✅ Database migrations completed successfully');
  } catch (error) {
    console.error('❌ Error running migrations:', error);
    throw error;
  }
}
