import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type ProcessoStatus =
  | 'DRAFT'
  | 'PUBLISHED'
  | 'READING'
  | 'READING_PAUSED'
  | 'SENT_TO_ORDEN_DO_DIA'
  | 'REMOVED_FROM_ORDEN_DO_DIA'
  | 'ARCHIVED';

@Entity('processos_legislativos')
export class ProcessoLegislativo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  tipo: string; // enum

  @Column({ type: 'varchar' })
  titulo: string;

  @Column({ type: 'varchar', nullable: true })
  descricao: string;

  @Column({ type: 'text' })
  texto_completo: string;

  @Column({ type: 'timestamp' })
  data_sessao: Date;

  @Column({ type: 'jsonb', nullable: true })
  proponentes: string[];

  @Column({ type: 'jsonb', nullable: true })
  anexos: any[];

  @Column({ type: 'integer', nullable: true })
  prioridade: number;

  @Column({ type: 'varchar', default: 'DRAFT' })
  status: ProcessoStatus;

  @Column({ type: 'varchar', nullable: true })
  protocolo_num: string;

  @Column({ type: 'varchar', nullable: true })
  orgao_origem: string;

  @Column({ type: 'jsonb', nullable: true })
  tags: string[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  leitura_started_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  leitura_stopped_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  sent_to_ordem_at: Date;

  @Column({ type: 'jsonb', nullable: true })
  audit_log: any[];

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;
}
