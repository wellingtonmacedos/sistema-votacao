import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type AtaStatus =
  | 'DRAFT'
  | 'PUBLISHED'
  | 'READING'
  | 'READING_PAUSED'
  | 'VOTING'
  | 'VOTING_CLOSED'
  | 'RESULT_PUBLISHED'
  | 'ARCHIVED';

@Entity('atas')
export class Ata {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  tipo: 'ATA' | 'DISPENSA';

  @Column({ type: 'varchar' })
  titulo: string;

  @Column({ type: 'varchar', nullable: true })
  descricao: string;

  @Column({ type: 'text' })
  texto_completo: string;

  @Column({ type: 'timestamp' })
  data_sessao: Date;

  @Column({ type: 'jsonb', nullable: true })
  anexos: string[];

  @Column({ type: 'jsonb', default: '["SIM","NÃO","ABSTENÇÃO"]' })
  votos_permitidos: string[];

  @Column({ type: 'boolean', default: false })
  voto_secreto: boolean;

  @Column({ type: 'integer', nullable: true })
  quorum_requerido: number;

  @Column({ type: 'integer', nullable: true })
  leitura_estimada: number;

  @Column({ type: 'varchar', default: 'DRAFT' })
  status: AtaStatus;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  reading_started_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  reading_stopped_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  voting_started_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  voting_ended_at: Date;

  @Column({ type: 'jsonb', nullable: true })
  resultado: any;

  @Column({ type: 'jsonb', nullable: true })
  allowed_voters: string[];

  @Column({ type: 'jsonb', nullable: true })
  audit_log: any[];
}
