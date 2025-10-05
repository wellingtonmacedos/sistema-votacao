export class CreateSessaoDto {
  tipo: string;
  data_hora_inicio: Date;
  status: string;
  quorums_config?: string;
}
