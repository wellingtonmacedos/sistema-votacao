export class CreateEventoAuditoriaDto {
  tipo: string;
  payload_json: string;
  hash_anterior?: string;
  hash_atual: string;
}
