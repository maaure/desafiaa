<script lang="ts">
  import { onMount } from "svelte";
  import { get } from "svelte/store";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { quizEditor } from "$lib/stores/quiz-editor.store";
  import QuestionEditor from "$lib/components/quiz/QuestionEditor.svelte";
  import type { Quiz } from "$lib/types/quiz";

  let quizId = $page.params.id;
  let quiz = $state<Quiz | null>(get(quizEditor));
  let errors = $state<Record<string, string>>({});
  let isSaving = $state(false);
  let isLoading = $state(true);
  let saveSuccess = $state(false);

  onMount(() => {
    const unsub1 = quizEditor.subscribe((v) => quiz = v);
    const unsub2 = quizEditor.errors.subscribe((v) => errors = v);
    const unsub3 = quizEditor.isSaving.subscribe((v) => isSaving = v);

    if (quizId === "new") {
      if (!get(quizEditor)) {
        goto("/quiz/new");
        return;
      }
      isLoading = false;
    } else {
      quizEditor.load(quizId!).then(() => {
        isLoading = false;
      });
    }

    return () => { unsub1(); unsub2(); unsub3(); };
  });

  async function handleSave() {
    saveSuccess = false;
    const ok = await quizEditor.save();
    if (ok) {
      saveSuccess = true;
      if (quizId === "new") {
        const saved = get(quizEditor);
        if (saved && saved.id) {
          goto(`/quiz/${saved.id}/edit`);
        }
      }
    }
  }

  function handleAddQuestion(type: "multiple_choice" | "true_false") {
    quizEditor.addQuestion(type);
  }
</script>

<h1>Editar Questionario</h1>

{#if isLoading}
  <p class="status">Carregando...</p>
{:else if !quiz}
  <p class="status error">Questionario nao encontrado</p>
{:else}
  <div class="editor">
    <div class="meta">
      <div class="field">
        <label for="title">Titulo</label>
        <input
          id="title"
          type="text"
          bind:value={quiz.title}
          placeholder="Titulo do quiz"
        />
      </div>

      <div class="field">
        <label for="desc">Descricao (opcional)</label>
        <textarea
          id="desc"
          value={quiz.description ?? ""}
          oninput={(e) => { quiz!.description = (e.target as HTMLTextAreaElement).value || null; }}
          placeholder="Descricao do quiz"
          rows="2"
        ></textarea>
      </div>
    </div>

    {#if Object.keys(errors).length > 0}
      <div class="errors">
        {#each Object.entries(errors) as [, msg]}
          <p class="error">{msg}</p>
        {/each}
      </div>
    {/if}

    {#if saveSuccess}
      <p class="success">Questionario salvo com sucesso!</p>
    {/if}

    <h2>Perguntas ({quiz.questions.length})</h2>

    {#if quiz.questions.length === 0}
      <p class="status">Nenhuma pergunta ainda. Adicione abaixo.</p>
    {:else}
      <div class="questions">
        {#each quiz.questions as question, i (question.id)}
          <QuestionEditor {question} index={i} />
        {/each}
      </div>
    {/if}

    <div class="add-actions">
      <span class="add-label">Adicionar pergunta:</span>
      <button onclick={() => handleAddQuestion("multiple_choice")}>Multipla escolha</button>
      <button onclick={() => handleAddQuestion("true_false")}>V ou F</button>
    </div>

    <div class="save-bar">
      <button class="save-btn" onclick={handleSave} disabled={isSaving}>
        {isSaving ? "Salvando..." : "Salvar questionario"}
      </button>
    </div>
  </div>
{/if}

<style>
  .editor {
    max-width: 720px;
  }

  .meta {
    margin-bottom: 1.5rem;
  }

  .field {
    margin-bottom: 1rem;
  }

  label {
    display: block;
    font-weight: 600;
    margin-bottom: 0.3rem;
    font-size: 0.9rem;
  }

  input[type="text"],
  textarea {
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: 1px solid #ccc;
    border-radius: 6px;
    font-size: 1rem;
    font-family: inherit;
    box-sizing: border-box;
  }

  textarea {
    resize: vertical;
  }

  .errors {
    background: #fdedec;
    border: 1px solid #e74c3c;
    border-radius: 6px;
    padding: 0.5rem 0.75rem;
    margin-bottom: 1rem;
  }

  .error {
    color: #e74c3c;
    font-size: 0.9rem;
    margin: 0.25rem 0;
  }

  .success {
    color: #27ae60;
    background: #eafaf1;
    border: 1px solid #27ae60;
    border-radius: 6px;
    padding: 0.5rem 0.75rem;
    margin-bottom: 1rem;
    font-size: 0.9rem;
  }

  h2 {
    font-size: 1.15rem;
    margin: 0 0 0.75rem;
  }

  .questions {
    margin-bottom: 1rem;
  }

  .add-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }

  .add-label {
    font-size: 0.9rem;
    color: #555;
  }

  .add-actions button {
    padding: 0.4rem 0.8rem;
    border: 1px solid #3498db;
    border-radius: 4px;
    background: #fff;
    color: #3498db;
    cursor: pointer;
    font-size: 0.85rem;
  }

  .save-bar {
    padding-top: 1rem;
    border-top: 1px solid #eee;
  }

  .save-btn {
    padding: 0.6rem 1.2rem;
    border: 1px solid #27ae60;
    border-radius: 6px;
    background: #27ae60;
    color: #fff;
    font-size: 0.95rem;
    cursor: pointer;
  }

  .save-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .status {
    color: #666;
  }

  .status.error {
    color: #e74c3c;
  }
</style>
