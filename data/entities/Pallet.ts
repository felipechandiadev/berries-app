import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Storage } from './Storage';
import { Tray } from './Tray';
import { Transaction } from './Transaction';
import { Variety } from './Variety';
import { Format } from './Format';

export interface PalletTrayAssignment {
    receptionPackId: string;
    trayId: string;
    quantity: number;
    receptionId?: string;
    receptionNote?: string;
}

export type PalletMetadata = PalletTrayAssignment[] | null;

export enum PalletStatus {
    AVAILABLE = 'AVAILABLE',
    CLOSED = 'CLOSED',
    FULL = 'FULL',
    DISPATCHED = 'DISPATCHED'
}

@Entity('pallets')
export class Pallet {
    @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
    id!: number;

    @Column({ type: 'varchar', length: 255, nullable: true })
    storageId?: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    trayId?: string;

    @Column({ type: 'int', default: 0 })
    traysQuantity!: number;

    @Column({ type: 'int' })
    capacity!: number;

    @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
    weight!: number;

    @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
    dispatchWeight!: number;

    /** Suma de netos de packs prorrateados por bandejas en este pallet */
    @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
    packsNetWeight!: number;

    @Column({ type: 'json', nullable: true })
    metadata?: PalletMetadata;

    @Column({
        type: 'enum',
        enum: PalletStatus,
        default: PalletStatus.AVAILABLE
    })
    status!: PalletStatus;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @DeleteDateColumn()
    deletedAt?: Date;

    @ManyToOne(() => Storage, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'storageId' })
    storage?: Storage;

    @ManyToOne(() => Tray, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'trayId' })
    tray?: Tray;

    @ManyToOne(() => Transaction, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'transactionId' })
    transaction?: Transaction;

    @ManyToOne(() => Variety, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'varietyId' })
    variety?: Variety;

    @ManyToOne(() => Format, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'formatId' })
    format?: Format;
}