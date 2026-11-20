// Identidade institucional da instalação.
//
// O sistema é entregue como deploy dedicado por Câmara (single-tenant): cada
// instalação tem o próprio banco e a própria configuração. O nome da instituição
// é parametrizado por ambiente, então a mesma base de código atende a qualquer
// Câmara sem fork. Sem os valores definidos, usa-se o padrão genérico.

export const APP_NAME =
  process.env.NEXT_PUBLIC_APP_NAME?.trim() || "Sistema de Votação Eletrônica";

export const ORG_NAME =
  process.env.NEXT_PUBLIC_ORG_NAME?.trim() || "Câmara de Vereadores";
