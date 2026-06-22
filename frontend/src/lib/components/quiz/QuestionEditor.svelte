<script lang="ts">
  import { quizEditor } from "$lib/stores/quiz-editor.store";
  import AlternativeInput from "./AlternativeInput.svelte";
  import type { Question } from "$lib/types/quiz";

  let { question, index }: {
    question: Question;
    index: number;
  } = $props();

  function handleTextInput(e: Event) {
    const value = (e.target as HTMLTextAreaElement).value;
    quizEditor.updateQuestionText(question.id, value);
  }

  function handleAddAlternative() {
    quizEditor.addAlternative(question.id);
  }

  function handleRemoveQuestion() {
    quizEditor.removeQuestion(question.id);
  }
</script>

<div class="question-editor">
  <header>
    <span class="question-number">Pergunta {index + 1}</span>
    <span class="question-type">{question.questionType === "true_false" ? "V ou F" : "Multipla escolha"}</span>
    <span class="base-points">Pontuacao base: {question.basePoints}</span>
  </header>

  <textarea
    value={question.text}
    oninput={handleTextInput}
    placeholder="Digite a pergunta..."
    rows="3"
  ></textarea>

  <h4>Alternativas</h4>

  <div class="alternatives">
    {#each question.alternatives as alt, i (alt.id)}
      <AlternativeInput {alt} questionId={question.id} letter={String.fromCharCode(65 + i)} />
    {/each}
  </div>

  <div class="actions">
    {#if question.alternatives.length < 4 && question.questionType === "multiple_choice"}
      <button onclick={handleAddAlternative}>+ Alternativa</button>
    {/if}
    <button class="danger" onclick={handleRemoveQuestion}>Remover pergunta</button>
  </div>
</div>

<style>
  .question-editor {
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1rem;
    background: #fff;
  }

  header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 0.75rem;
    flex-wrap: wrap;
  }

  .question-number {
    font-weight: 700;
    font-size: 1rem;
  }

  .question-type {
    font-size: 0.8rem;
    color: #888;
    background: #f0f0f0;
    padding: 0.15rem 0.5rem;
    border-radius: 4px;
  }

  .base-points {
    font-size: 0.85rem;
    color: #888;
    margin-left: auto;
  }

  textarea {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 0.95rem;
    font-family: inherit;
    resize: vertical;
    box-sizing: border-box;
    margin-bottom: 0.75rem;
  }

  h4 {
    margin: 0 0 0.5rem;
    font-size: 0.95rem;
    color: #555;
  }

  .alternatives {
    margin-bottom: 0.75rem;
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
    font-size: 0.85rem;
  }

  .actions button.danger {
    border-color: #e74c3c;
    color: #e74c3c;
    background: #fff;
  }
</style>
