export const CATEGORY_EMBEDDING_MODEL_ID = 'Xenova/bge-small-en-v1.5';

export interface EmbeddingProgress {
  status?: string;
  file?: string;
  progress?: number;
}

interface EmbeddingTensorLike {
  tolist(): number[] | number[][];
}

type EmbeddingExtractor = (
  texts: string | string[],
  options?: {
    pooling?: 'mean' | 'none';
    normalize?: boolean;
  }
) => Promise<EmbeddingTensorLike>;

let extractorPromise: Promise<EmbeddingExtractor> | null = null;

export function formatEmbeddingProgress(progress: EmbeddingProgress): string {
  if (!progress) {
    return 'Loading embedding model…';
  }

  const base = progress.file || progress.status || 'Loading embedding model';
  if (typeof progress.progress === 'number' && Number.isFinite(progress.progress)) {
    return `${base} (${Math.round(progress.progress)}%)`;
  }
  return base;
}

async function createExtractor(
  onProgress?: (progress: EmbeddingProgress) => void
): Promise<EmbeddingExtractor> {
  const transformers = await import('@huggingface/transformers');
  const createPipeline = transformers.pipeline as unknown as (
    task: string,
    model: string,
    options?: Record<string, unknown>
  ) => Promise<EmbeddingExtractor>;

  return createPipeline('feature-extraction', CATEGORY_EMBEDDING_MODEL_ID, {
    dtype: 'q8',
    progress_callback: (progress: EmbeddingProgress) => {
      if (onProgress) {
        onProgress(progress);
      }
    },
  }) as Promise<EmbeddingExtractor>;
}

export async function getEmbeddingExtractor(
  onProgress?: (progress: EmbeddingProgress) => void
): Promise<EmbeddingExtractor> {
  if (!extractorPromise) {
    extractorPromise = createExtractor(onProgress).catch(error => {
      extractorPromise = null;
      throw error;
    });
  }
  return extractorPromise;
}

export async function embedTexts(
  texts: string[],
  onProgress?: (progress: EmbeddingProgress) => void
): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const extractor = await getEmbeddingExtractor(onProgress);
  const tensor = await extractor(texts, { pooling: 'mean', normalize: true });
  const rows = tensor.tolist();

  if (!Array.isArray(rows)) {
    return [];
  }

  if (Array.isArray(rows[0])) {
    return rows as number[][];
  }

  return [rows as number[]];
}
