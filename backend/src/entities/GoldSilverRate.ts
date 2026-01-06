import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * Gold and Silver Rates Entity
 * Stores daily spot and GST rates for gold and silver from Nagpur market
 * Plus COMEX international prices and USD/INR exchange rate
 */
@Entity('gold_silver_rates')
export class GoldSilverRate {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'date', unique: true })
  @Index()
  rate_date!: string;

  @Column({ type: 'time' })
  rate_time!: string;

  // Nagpur Market Rates (INR)
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, comment: 'Nagpur spot gold rate per 10g in INR' })
  @Index()
  ngp_hazir_gold!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, comment: 'Nagpur spot silver rate per kg in INR' })
  @Index()
  ngp_hazir_silver!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, comment: 'Nagpur gold rate with GST per 10g in INR' })
  ngp_gst_gold!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, comment: 'Nagpur silver rate with GST per kg in INR' })
  ngp_gst_silver!: number;

  // International Rates
  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true, comment: 'USD to INR exchange rate' })
  usd_inr!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, comment: 'COMEX gold price per oz in USD' })
  cmx_gold_usd!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, comment: 'COMEX silver price per oz in USD' })
  cmx_silver_usd!: number;

  // Metadata
  @CreateDateColumn()
  created_at!: Date;
}
