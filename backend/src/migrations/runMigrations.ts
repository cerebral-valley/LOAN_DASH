import { readFileSync } from 'fs';
import { join } from 'path';
import { AppDataSource } from '../config/database';

/**
 * Run database migrations
 * This function reads and executes SQL migration files
 * 
 * Security Note: Migration files are trusted application code.
 * They are not user-controlled and are executed as-is from the filesystem.
 */
export async function runMigrations() {
  try {
    console.log('📦 Running database migrations...');
    
    // Create migrations tracking table if it doesn't exist
    await AppDataSource.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Get list of already executed migrations
    const executedMigrations = await AppDataSource.query(
      'SELECT name FROM migrations'
    );
    const executedNames = new Set(
      executedMigrations.map((m: { name: string }) => m.name)
    );
    
    // List of migration files to run in order
    const migrations = [
      '001_add_performance_indexes.sql',
      '002_add_covering_indexes.sql'
    ];
    
    for (const migrationFile of migrations) {
      // Skip if already executed
      if (executedNames.has(migrationFile)) {
        console.log(`  ⏭️  Skipping (already executed): ${migrationFile}`);
        continue;
      }
      
      console.log(`  Running migration: ${migrationFile}`);
      const migrationPath = join(__dirname, migrationFile);
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
      
      // Record migration as executed
      await AppDataSource.query(
        'INSERT INTO migrations (name) VALUES (?)',
        [migrationFile]
      );
      
      console.log(`  ✅ Completed: ${migrationFile}`);
    }
    
    console.log('✅ Database migrations completed successfully');
  } catch (error) {
    console.error('❌ Error running migrations:', error);
    throw error;
  }
}
