import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, DeleteDateColumn } from 'typeorm';
import { Transaction } from './Transaction';
import { Currency } from './Variety';

export interface ReceptionPackPalletAssignment {
    palletId: number;
    traysAssigned: number;
}

export type ReceptionPackAssignments = ReceptionPackPalletAssignment[];

@Entity('reception_packs')
export class ReceptionPack {
    @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
    id!: number;

    @Column({ type: 'bigint', nullable: true })
    receptionTransactionId?: string;

    @ManyToOne(() => Transaction, { onDelete: 'SET NULL', onUpdate: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'receptionTransactionId' })
    receptionTransaction?: Transaction;

    @Column({ type: 'int' })
    varietyId!: number;

    @Column({ type: 'varchar', length: 255 })
    varietyName!: string;

    @Column({ type: 'int' })
    formatId!: number;

    @Column({ type: 'varchar', length: 255 })
    formatName!: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    trayId!: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    trayLabel!: string | null;

    @Column({ type: 'int', default: 0 })
    traysQuantity!: number;

    @Column({ type: 'decimal', precision: 12, scale: 3, default: 0 })
    unitTrayWeight!: number;

    @Column({ type: 'decimal', precision: 12, scale: 3, default: 0 })
    traysTotalWeight!: number;

    @Column({ type: 'decimal', precision: 12, scale: 3, default: 0 })
    grossWeight!: number;

    @Column({ type: 'decimal', precision: 12, scale: 3, default: 0 })
    netWeightBeforeImpurities!: number;

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
    impurityPercent!: number;

    @Column({ type: 'decimal', precision: 12, scale: 3, default: 0 })
    netWeight!: number;

    @Column({ type: 'decimal', precision: 12, scale: 3, default: 0 })
    pricePerKg!: number;

    @Column({ type: 'enum', enum: Currency, default: Currency.CLP })
    currency!: Currency;

    @Column({ type: 'decimal', precision: 14, scale: 3, default: 0 })
    totalToPay!: number;

    @Column({ type: 'json', nullable: true })
    palletAssignments?: ReceptionPackAssignments | null;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @DeleteDateColumn()
    deletedAt?: Date;
}
