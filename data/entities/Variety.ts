import { Entity, PrimaryGeneratedColumn, Column, DeleteDateColumn } from "typeorm";

export enum Currency {
    CLP = 'CLP',
    USD = 'USD'
}

@Entity("varieties")
export class Variety {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column("varchar", { unique: true })
    name!: string;

    @Column("text", { nullable: true })
    description!: string | null;

    @DeleteDateColumn()
    deletedAt?: Date;
}