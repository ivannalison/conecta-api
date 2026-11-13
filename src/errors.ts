/**
 * Erro "esperado" da API, com status HTTP e código próprio.
 * Vira a resposta padronizada: { "error": { "code": "...", "message": "..." } }
 */
export class ApiError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function errorBody(code: string, message: string) {
  return { error: { code, message } };
}
