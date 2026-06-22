<script lang="ts">
  import { quizEditor } from "$lib/stores/quiz-editor.store";
  import type { Alternative } from "$lib/types/quiz";

  let { alt, questionId, letter }: {
    alt: Alternative;
    questionId: string;
    letter: string;
  } = $props();

  function handleTextInput(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    quizEditor.updateAlternativeText(questionId, alt.id, value);
  }

  function handleCorrect() {
    quizEditor.markCorrect(questionId, alt.id);
  }
</script>

<div class={"alternative" + (alt.isCorrect ? " correct" : "")}>
  <span class="letter">{letter}</span>
  <input
    type="text"
    value={alt.text}
    placeholder={`Alternativa ${letter}`}
    oninput={handleTextInput}
  />
  <input
    type="radio"
    name={`correct_${questionId}`}
    checked={alt.isCorrect}
    onchange={handleCorrect}
    title="Marcar como correta"
  />
</div>

<style>
  .alternative {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 6px;
    margin-bottom: 0.5rem;
    background: #fafafa;
  }

  .alternative.correct {
    border-color: #27ae60;
    background: #eafaf1;
  }

  .letter {
    font-weight: 700;
    font-size: 0.9rem;
    color: #555;
    min-width: 1.5rem;
    text-align: center;
  }

  .alternative input[type="text"] {
    flex: 1;
    padding: 0.4rem 0.6rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 0.9rem;
  }

  .alternative input[type="radio"] {
    cursor: pointer;
    accent-color: #27ae60;
  }
</style>
