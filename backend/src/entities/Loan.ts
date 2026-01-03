import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity({ name: 'loan_table' })
export class Loan {
  @PrimaryColumn({ type: 'int' })
  loan_number!: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  customer_type?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  customer_name?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  customer_id?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  item_list?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  gross_wt?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  net_wt?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  gold_rate?: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  purity?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  valuation?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  loan_amount?: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  ltv_given?: number;

  @Column({ type: 'datetime', nullable: true })
  date_of_disbursement?: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  mode_of_disbursement?: string;

  @Column({ type: 'date', nullable: true })
  date_of_release?: Date;

  @Column({ type: 'varchar', length: 10, nullable: true })
  released?: string;

  @Column({ type: 'date', nullable: true })
  expiry?: Date;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  interest_rate?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  interest_amount?: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  transfer_mode?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  scheme?: string;

  @Column({ type: 'date', nullable: true })
  last_intr_pay?: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  data_entry?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  pending_loan_amount?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  interest_deposited_till_date?: number;

  @Column({ type: 'date', nullable: true })
  last_date_of_interest_deposit?: Date;

  @Column({ type: 'varchar', length: 500, nullable: true })
  comments?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  last_partial_principal_pay?: number;

  @Column({ type: 'varchar', length: 10, nullable: true })
  receipt_pending?: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  form_printing?: string;
}
