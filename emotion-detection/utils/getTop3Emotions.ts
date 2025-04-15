// utils/getTop3Emotions.ts

/**
 * Extracts the top N emotions from a Hume scores object.
 * Accepts a generic object type to be compatible with Hume's EmotionScores.
 * @param scores - The scores object (e.g., msg.models.prosody.scores). Should be object-like.
 * @param count - The number of top emotions to return.
 * @returns An array of { name: string, score: number } objects, sorted descending.
 */
export function getTopEmotions(
    // Accept a more general object type or unknown, then cast internally
    scores: object | undefined | null,
    count: number = 3
  ): { name: string; score: number }[] {

  if (!scores) {
    return [];
  }

  try {
    // Cast the input 'scores' object to Record<string, number>
    // This assumes the structure is compatible with Object.entries
    const scoresRecord = scores as Record<string, number>;

    return Object.entries(scoresRecord) // Use the casted record
      .sort(([, scoreA], [, scoreB]) => {
          // Add type checks for scores just in case
          const numScoreA = typeof scoreA === 'number' ? scoreA : 0;
          const numScoreB = typeof scoreB === 'number' ? scoreB : 0;
          return numScoreB - numScoreA; // Sort descending by score
      })
      .slice(0, count) // Take the top 'count'
      .map(([name, score]) => ({
          name,
          score: parseFloat(typeof score === 'number' ? score.toFixed(4) : '0') // Format and ensure number
      }));
  } catch (error) {
    console.error("Error processing emotions:", error, "Scores received:", scores);
    return []; // Return empty array on error
  }
}