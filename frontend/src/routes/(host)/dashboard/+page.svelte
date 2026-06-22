<script lang="ts">
  import { onMount } from "svelte";
  import { get } from "svelte/store";
  import { goto } from "$app/navigation";
  import { quizEditor } from "$lib/stores/quiz-editor.store";
  import type { QuizListItem } from "$lib/types/quiz";

  let quizzes = $state<QuizListItem[]>(get(quizEditor.quizList));
  let isLoading = $state(get(quizEditor.isLoadingList));
  let listError = $state<string | null>(get(quizEditor.listError));

  onMount(() => {
    quizEditor.loadList();
    const unsub1 = quizEditor.quizList.subscribe((v) => quizzes = v);
    const unsub2 = quizEditor.isLoadingList.subscribe((v) => isLoading = v);
    const unsub3 = quizEditor.listError.subscribe((v) => listError = v);
    return () => { unsub1(); unsub2(); unsub3(); };
  });

  function handleEdit(id: string) {
    goto(`/quiz/${id}`);
  }

  function handleDelete(id: string) {
    if (confirm("Tem certeza que deseja excluir este quiz?")) {
      quizEditor.deleteQuiz(id);
    }
  }

  function handleStartSession(id: string) {
    goto(`/session/new?quizId=${id}`);
  }
</script>

<h1>Meus Quizzes</h1>

{#if isLoading}
  <p class="status">Carregando...</p>
{:else if listError}
  <p class="status error">{listError}</p>
{:else if quizzes.length === 0}
  <p class="status">
    Nenhum quiz ainda.
    <a href="/quiz/new">Crie um novo quiz!</a>
  </p>
{:else}
  <div class="grid">
    {#each quizzes as quiz (quiz.id)}
      <div class="card">
        <h2>{quiz.title}</h2>
        {#if quiz.description}
          <p class="desc">{quiz.description}</p>
        {/if}
        <p class="meta">{quiz.questionCount} pergunta(s)</p>
        <div class="actions">
          <button onclick={() => handleEdit(quiz.id)}>Editar</button>
          <button onclick={() => handleStartSession(quiz.id)}>Iniciar Sessão</button>
          <button class="danger" onclick={() => handleDelete(quiz.id)}>Excluir</button>
        </div>
      </div>
    {/each}
  </div>
{/if}

<style>
  .grid {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }

  .card {
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 1rem;
    background: #fff;
  }

  .card h2 {
    margin: 0 0 0.5rem;
    font-size: 1.25rem;
  }

  .desc {
    color: #555;
    margin: 0 0 0.5rem;
  }

  .meta {
    color: #888;
    font-size: 0.875rem;
    margin: 0 0 1rem;
  }

  .actions {
    display: flex;
    gap: 0.5rem;
  }

  .actions button {
    padding: 0.4rem 0.8rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    background: #f5f5f5;
    cursor: pointer;
  }

  .actions button.danger {
    border-color: #e74c3c;
    color: #e74c3c;
    background: #fff;
  }

  .status {
    color: #666;
  }

  .status.error {
    color: #e74c3c;
  }
</style>
