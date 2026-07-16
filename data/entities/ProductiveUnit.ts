import "reflect-metadata";
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, OneToMany } from 'typeorm';

@Entity('productive_units')
export class ProductiveUnit {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column('varchar', { length: 255 })
    name!: string;

    @Column('varchar', { length: 500, nullable: true })
    location?: string;

    // Relación lazy para evitar dependencia circular
    @OneToMany('Producer', 'productiveUnit')
    producers?: any[];

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @DeleteDateColumn()
    deletedAt?: Date;
}