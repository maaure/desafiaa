import { createMutation, useQueryClient } from "@tanstack/svelte-query";
import { sessionRequests } from "./sessions.requests";
import { sessionKeys } from "./sessions.queries";

export function useCreateSession() {
  const qc = useQueryClient();

  return createMutation(() => ({
    mutationFn: (quizId: string) => sessionRequests.create(quizId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sessionKeys.all });
    },
  }));
}
