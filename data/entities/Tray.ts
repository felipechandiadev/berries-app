import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, ManyToOne } from "typeorm";
import { Transaction } from "./Transaction";
import { Storage } from "./Storage";
import { Variety } from "./Variety";
import { Format } from "./Format";

@Entity("trays")
export class Tray {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: 'varchar', length: 255, unique: true })
    name!: string;

    @Column({ type: 'decimal', precision: 10, scale: 3 })
    weight!: number;

    @Column({ type: 'int', default: 0 })
    stock!: number;

    @Column({ type: 'boolean', default: true })
    active!: boolean;

    @Column({ type: 'bigint', nullable: true })
    receptionId?: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    storageId?: string;

    @Column({ type: 'int', nullable: true })
    varietyId?: number;

    @Column({ type: 'int', nullable: true })
    formatId?: number;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @DeleteDateColumn()
    deletedAt?: Date;

    @ManyToOne(() => Transaction, { nullable: true, onDelete: 'SET NULL' })
    reception?: Transaction;

    @ManyToOne(() => Storage, { nullable: true, onDelete: 'SET NULL' })
    storage?: Storage;

    @ManyToOne(() => Variety, { nullable: true, onDelete: 'SET NULL' })
    variety?: Variety;

    @ManyToOne(() => Format, { nullable: true, onDelete: 'SET NULL' })
    format?: Format;
}