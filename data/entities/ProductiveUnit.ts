import "reflect-metadata";
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, OneToMany } from 'typeorm';
import { Producer } from './Producer';

@Entity('productive_units')
export class ProductiveUnit {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column('varchar', { length: 255 })
    name!: string;

    @Column('varchar', { length: 500, nullable: true })
    location?: string;

    @OneToMany(() => Producer, (producer) => producer.productiveUnit)
    producers?: Producer[];

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @DeleteDateColumn()
    deletedAt?: Date;
}
