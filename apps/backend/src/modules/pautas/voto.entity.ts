import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('votos')
export class Voto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  ata_id: string;

  @Column({ type: 'uuid' })
  vereador_id: string;

  @Column({ type: 'varchar' })
  escolha: string; // SIM, NÃO, ABSTENÇÃO

  @CreateDateColumn()
  timestamp: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any; // ip, device, etc
}
