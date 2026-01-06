import { AppDataSource } from './src/config/database';

async function markMigrationComplete() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected');
    
    // Mark migration as complete
    await AppDataSource.query(
      "INSERT IGNORE INTO migrations (name) VALUES ('002_add_covering_indexes.sql')"
    );
    
    console.log('✅ Migration 002 marked as complete');
    
    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

markMigrationComplete();
