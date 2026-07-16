import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Variety } from './Variety';

@Entity('formats')
export class Format {
    @PrimaryGeneratedColumn()
    id!: number;

    // NOTE: name uniqueness will be enforced as (varietyId, name) at DB migration level
    @Column({ type: 'varchar', length: 100 })
    name!: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    description!: string | null;

    @Column({ type: 'int', default: 0 })
    priceCLP!: number;

    @Column({ type: 'float', default: 0 })
    priceUSD!: number;

    @Column({ type: 'boolean', default: true })
    active!: boolean;

    // Foreign key to Variety
    @Column({ type: 'int', nullable: true })
    varietyId?: number;

    @ManyToOne(() => Variety, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'varietyId' })
    variety?: Variety;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @DeleteDateColumn()
    deletedAt?: Date;
}