import { ApiError } from "$lib/api/client";

/**
 * Traduz erros de API em mensagem amigável + se vale mostrar "Tentar novamente".
 * Erros 401/403/404 têm orientação própria; o resto sugere retry.
 */
export function friendlyError(
  error: unknown,
  fallback: string,
): { message: string; retry: boolean } {
  if (error instanceof ApiError) {
    switch (error.statusCode) {
      case 401:
        return {
          message: "Sua sessão expirou. Faça login novamente para continuar.",
          retry: false,
        };
      case 403:
        return { message: "Você não tem permissão para acessar este conteúdo.", retry: false };
      case 404:
        return { message: "Conteúdo não encontrado. Ele pode ter sido removido.", retry: false };
      case 0:
        return { message: "Sem conexão com o servidor. Verifique sua internet.", retry: true };
      default:
        return { message: error.message || fallback, retry: true };
    }
  }
  return { message: fallback, retry: true };
}
