import "reflect-metadata";
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, DeleteDateColumn, CreateDateColumn, UpdateDateColumn, JoinColumn } from "typeorm";
import { Person } from "./Person";

@Entity("producers")
export class Producer {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column("varchar")
    name!: string;

    @Column("varchar")
    dni!: string;

    @Column("varchar", { nullable: true })
    phone!: string | null;

    @Column("varchar", { nullable: true })
    mail!: string | null;

    @Column("varchar", { nullable: true })
    address!: string | null;

    @Column({ type: 'varchar', length: 36, nullable: true })
    personId?: string;

    @ManyToOne(() => Person, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'personId' })
    person?: Person;

    @Column({ type: 'varchar', length: 36, nullable: true })
    productiveUnitId?: string;

    // Relación lazy para evitar dependencia circular
    @ManyToOne('ProductiveUnit', 'producers', { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'productiveUnitId' })
    productiveUnit?: any;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @DeleteDateColumn()
    deletedAt?: Date;
}