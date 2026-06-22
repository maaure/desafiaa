<script lang="ts">
  import { quizEditor } from "$lib/stores/quiz-editor.store";
  import { goto } from "$app/navigation";

  let title = $state("");
  let error = $state<string | null>(null);

  function handleCreate() {
    if (!title.trim()) {
      error = "O titulo e obrigatorio";
      return;
    }
    error = null;
    quizEditor.initNew(title.trim());
    goto("/quiz/new/edit");
  }
</script>

<h1>Novo Questionario</h1>

<form onsubmit={handleCreate}>
  <div class="field">
    <label for="title">Titulo</label>
    <input
      id="title"
      type="text"
      bind:value={title}
      placeholder="Titulo do quiz"
      autofocus
    />
  </div>

  {#if error}
    <p class="error">{error}</p>
  {/if}

  <button type="submit" disabled={!title.trim()}>Criar e editar</button>
</form>

<style>
  form {
    max-width: 480px;
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

  input[type="text"] {
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: 1px solid #ccc;
    border-radius: 6px;
    font-size: 1rem;
    box-sizing: border-box;
  }

  button {
    padding: 0.6rem 1.2rem;
    border: 1px solid #3498db;
    border-radius: 6px;
    background: #3498db;
    color: #fff;
    font-size: 0.95rem;
    cursor: pointer;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .error {
    color: #e74c3c;
    font-size: 0.9rem;
    margin: 0 0 0.75rem;
  }
</style>
