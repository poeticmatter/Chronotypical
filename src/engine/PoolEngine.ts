import seedrandom from 'seedrandom';
import type { FragmentMetadata } from '../types';

/**
 * Deterministically picks the next fragment ID based on the current pool state and seed.
 *
 * @param manifest The full list of all available fragment metadata.
 * @param readFragments Array of already read fragment IDs.
 * @param baseSeed The initial global seed of the user.
 * @returns The next fragment ID to read, or null if no fragments are eligible.
 */
export function getNextDeterministicFragment(
  manifest: FragmentMetadata[],
  readFragments: string[],
  baseSeed: string
): string | null {
  // Filter 1: Exclude already read fragments
  const unreadPool = manifest.filter((frag) => !readFragments.includes(frag.id));

  // If we read everything, we are done
  if (unreadPool.length === 0) return null;

  // Filter 2: Threshold - Must have read at least `required_pool_count`
  const thresholdPool = unreadPool.filter(
    (frag) => readFragments.length >= frag.required_pool_count
  );

  const eligiblePool = thresholdPool;

  // Handle Deadlocks
  if (eligiblePool.length === 0) {
    console.warn("Deadlock detected! No fragments are eligible to be drawn.");
    return null;
  }

  // Draw deterministically
  // We use the baseSeed + readFragments.length so the PRNG state effectively steps forward predictably.
  // This means the Nth draw ALWAYS uses the same seed string, giving the exact same choice.
  const deterministicSeedString = `${baseSeed}-${readFragments.length}`;
  const prng = seedrandom(deterministicSeedString);

  // Pick an index from 0 to eligiblePool.length - 1
  const index = Math.floor(prng() * eligiblePool.length);

  // For consistency, sort the eligible pool first so that the order is strictly predictable
  // regardless of original manifest order.
  const sortedEligiblePool = [...eligiblePool].sort((a, b) => a.id.localeCompare(b.id));

  return sortedEligiblePool[index].id;
}
