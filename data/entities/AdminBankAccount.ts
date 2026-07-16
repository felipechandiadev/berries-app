import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, DeleteDateColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Person } from "./Person";

export enum AccountTypeName {
    CUENTA_CORRIENTE = "Cuenta Corriente",
    CUENTA_AHORRO = "Cuenta de Ahorro",
    CUENTA_VISTA = "Cuenta Vista",
    CUENTA_RUT = "Cuenta RUT",
    CUENTA_CHEQUERA = "Cuenta Chequera Electrónica",
    OTRO_TIPO = "Otro",
}

export enum BankName {
    BANCO_CHILE = "Banco de Chile",
    BANCO_ESTADO = "Banco del Estado de Chile",
    BANCO_SANTANDER = "Banco Santander Chile",
    BANCO_BCI = "Banco de Crédito e Inversiones",
    BANCO_FALABELLA = "Banco Falabella",
    BANCO_SECURITY = "Banco Security",
    BANCO_CREDICHILE = "Banco CrediChile",
    BANCO_ITAU = "Banco Itaú Corpbanca",
    BANCO_SCOTIABANK = "Scotiabank Chile",
    BANCO_CONSORCIO = "Banco Consorcio",
    BANCO_RIPLEY = "Banco Ripley",
    BANCO_INTERNACIONAL = "Banco Internacional",
    BANCO_BICE = "Banco BICE",
    BANCO_PARIS = "Banco Paris",
    BANCO_MERCADO_PAGO = "Banco Mercado Pago",
    OTRO = "Otro",
}

export interface AdminBankAccountData {
    accountType: AccountTypeName;
    bank: BankName;
    accountNumber: string;
    alias?: string;
    isActive: boolean;
}

@Entity("admin_bank_accounts")
export class AdminBankAccount {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({
        type: "enum",
        enum: AccountTypeName
    })
    accountType!: AccountTypeName;

    @Column({
        type: "enum",
        enum: BankName
    })
    bank!: BankName;

    @Column("varchar")
    accountNumber!: string;

    @Column("varchar", { nullable: true })
    alias?: string;

    @Column("boolean", { default: true })
    isActive!: boolean;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @DeleteDateColumn()
    deletedAt?: Date;

    @ManyToOne(() => Person, { nullable: true, onDelete: 'SET NULL' })
    person?: Person;
}