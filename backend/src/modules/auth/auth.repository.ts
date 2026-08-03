import { eq } from "drizzle-orm";
import { db, schema } from "../../db";

export const authRepo = {
  async findByEmail(email: string) {
    return db.query.users.findFirst({
      where: eq(schema.users.email, email),
    });
  },

  async findById(id: string) {
    return db.query.users.findFirst({
      where: eq(schema.users.id, id),
    });
  },

  async findByGoogleId(googleId: string) {
    return db.query.users.findFirst({
      where: eq(schema.users.googleId, googleId),
    });
  },

  async insertUser(data: { name: string; email: string; passwordHash: string }) {
    const [user] = await db.insert(schema.users).values(data).returning();
    return user;
  },

  /**
   * Cria usuário via Google, ou atualiza o existente (por google_id).
   * Chamado só depois de checar email — a busca por google_id é o caminho novo.
   */
  async upsertGoogleUser(data: {
    googleId: string;
    email: string;
    name: string;
    avatarUrl: string | null;
  }) {
    const [user] = await db
      .insert(schema.users)
      .values({ ...data, passwordHash: null })
      .onConflictDoUpdate({
        target: schema.users.googleId,
        set: { name: data.name, avatarUrl: data.avatarUrl, updatedAt: new Date() },
      })
      .returning();
    return user;
  },

  /** Vincula google_id/avatar a uma conta email/senha existente (mesmo email) */
  async linkGoogle(userId: string, data: { googleId: string; avatarUrl: string | null }) {
    const [user] = await db
      .update(schema.users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.users.id, userId))
      .returning();
    return user;
  },
};
