import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'expense_tracker' })
export class ExpenseTracker {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'date', nullable: true })
  date?: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  item?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  amount?: number;

  @Column({ type: 'varchar', length: 10, nullable: true })
  payment_mode?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  bank?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  ledger?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  invoice_no?: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  receipt?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  user?: string;
}
