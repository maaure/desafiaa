import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { authService } from "@/modules/auth/auth.service";

describe("authService.register", () => {
  it("deve criar usuário e retornar tokens", async () => {
    const result = await authService.register({
      name: "Teste",
      email: "teste@exemplo.com",
      password: "senha1234",
    });
    expect(result.user.name).toBe("Teste");
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
  });

  it("deve rejeitar email duplicado", async () => {
    await expect(
      authService.register({
        name: "Teste 2",
        email: "teste@exemplo.com",
        password: "outrasenha123",
      }),
    ).rejects.toThrow("Email já cadastrado");
  });
});
