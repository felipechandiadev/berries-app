import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';
import { Transaction } from './Transaction';
import { ReceptionPack } from './ReceptionPack';

export enum TransactionRelationType {
    RECEPTION_PACK = 'RECEPTION_PACK',
    TRAY_RECEPTION = 'TRAY_RECEPTION',
    TRAY_DEVOLUTION = 'TRAY_DEVOLUTION',
    PALLET_ASSIGNMENT = 'PALLET_ASSIGNMENT',
    TRAY_ADJUSTMENT = 'TRAY_ADJUSTMENT',
    PALLET_RELEASE = 'PALLET_RELEASE',
    ADVANCE_TO_SETTLEMENT = 'ADVANCE_TO_SETTLEMENT',
    RECEPTION_TO_SETTLEMENT = 'RECEPTION_TO_SETTLEMENT',
}

@Entity('transaction_relations')
export class TransactionRelation {
    @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
    id!: number;

    @Column({ type: 'bigint', nullable: true })
    parentTransactionId?: string;

    @Column({ type: 'bigint', nullable: true })
    childTransactionId?: string | null;

    @ManyToOne(() => Transaction, { onDelete: 'SET NULL', onUpdate: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'parentTransactionId' })
    parentTransaction?: Transaction;

    @ManyToOne(() => Transaction, { onDelete: 'SET NULL', onUpdate: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'childTransactionId' })
    childTransaction?: Transaction | null;

    @Column({ type: 'int', unsigned: true, nullable: true })
    childReceptionPackId?: number | null;

    @ManyToOne(() => ReceptionPack, { onDelete: 'CASCADE', onUpdate: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'childReceptionPackId' })
    childReceptionPack?: ReceptionPack | null;

    @Column({ type: 'enum', enum: TransactionRelationType })
    relationType!: TransactionRelationType;

    @Column({ type: 'varchar', length: 255, nullable: true })
    context?: string | null;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @DeleteDateColumn()
    deletedAt?: Date;
}
