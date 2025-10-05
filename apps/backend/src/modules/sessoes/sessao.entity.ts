export class Sessao {
  id: number;
  tipo: string;
  data_hora_inicio: Date;
  data_hora_fim?: Date;
  status: string;
  quorums_config?: string;
}
