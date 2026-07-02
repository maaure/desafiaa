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

  async insertUser(data: { name: string; email: string; passwordHash: string }) {
    const [user] = await db
      .insert(schema.users)
      .values(data)
      .returning();
    return user;
  },
};
