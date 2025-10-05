export class CreatePautaDto {
  sessao_id: number;
  ordem: number;
  tipo_materia: string;
  titulo: string;
  descricao: string;
  documentos?: string[];
}
