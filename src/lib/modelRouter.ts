/**
 * Model Router for BrainBolt
 * 
 * Provides smart model routing based on task type.
 * Each feature gets the optimal model for its specific use case.
 */

export type TaskType = "formatter" | "flashcards" | "mcqs" | "concept_booster";

export interface ModelConfig {
  model: string;
  temperature?: number;
  description: string;
}

/**
 * Get the optimal model configuration for a specific task
 * 
 * @param task - The task type (formatter, flashcards, mcqs, concept_booster)
 * @returns Model configuration with model name and temperature
 */
export function getModel(task: TaskType): ModelConfig {
  // Allow override via environment variable (for all tasks)
  const globalModel = process.env.BRAINBOLT_MODEL;

  // Task-specific model overrides (optional)
  const taskModels: Record<TaskType, string | undefined> = {
    formatter: process.env.BRAINBOLT_MODEL_FORMATTER,
    flashcards: process.env.BRAINBOLT_MODEL_FLASHCARDS,
    mcqs: process.env.BRAINBOLT_MODEL_MCQS,
    concept_booster: process.env.BRAINBOLT_MODEL_CONCEPT_BOOSTER,
  };

  // Default models for each task
  const defaultModels: Record<TaskType, string> = {
    formatter: "x-ai/grok-4.1-fast",
    flashcards: "x-ai/grok-4.1-fast",
    mcqs: "x-ai/grok-4.1-fast",
    concept_booster: "meta-llama/llama-3.1-70b-instruct", // Fast, reliable, and high quality
  };

  // Task-specific temperature settings
  const temperatures: Record<TaskType, number> = {
    formatter: 0.2, // Low temperature for consistent formatting
    flashcards: 0.2, // Low temperature for structured output
    mcqs: 0.2, // Low temperature for consistent question generation
    concept_booster: 0.3, // Slightly higher for more creative explanations
  };

  // Priority: task-specific override > global override > default
  const model = taskModels[task] || globalModel || defaultModels[task];

  return {
    model,
    temperature: temperatures[task],
    description: `Model for ${task}: ${model} (temperature: ${temperatures[task]})`,
  };
}

/**
 * Get all available model configurations
 * Useful for debugging or admin interfaces
 */
export function getAllModelConfigs(): Record<TaskType, ModelConfig> {
  return {
    formatter: getModel("formatter"),
    flashcards: getModel("flashcards"),
    mcqs: getModel("mcqs"),
    concept_booster: getModel("concept_booster"),
  };
}

/**
 * Validate that a model string is in the expected format
 * (Basic validation - can be extended)
 */
export function isValidModel(model: string): boolean {
  if (!model || typeof model !== "string") {
    return false;
  }
  // Basic validation: should contain a slash (provider/model format)
  return model.includes("/") && model.length > 3;
}

