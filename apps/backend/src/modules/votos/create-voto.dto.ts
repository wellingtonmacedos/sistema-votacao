export class CreateVotoDto {
  pauta_id: number;
  vereador_id: number;
  escolha: 'Sim' | 'Não' | 'Abstenção';
  justificativa?: string;
}
