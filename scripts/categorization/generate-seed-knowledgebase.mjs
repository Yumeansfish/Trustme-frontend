import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const TAXONOMY_PATH = path.join(
  ROOT,
  'src/features/categorization/knowledgebase/taxonomy.v1.json'
);
const OUTPUT_DIR = path.join(ROOT, 'src/features/categorization/knowledgebase/generated');
const RAW_OUTPUT_DIR = path.join(OUTPUT_DIR, 'raw');

const DEFAULT_MODEL = process.env.OPENAI_MODEL || process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
const DEFAULT_ROUNDS = Number(process.env.OPENAI_KB_ROUNDS || 3);
const DEFAULT_PACK_SIZE = Number(process.env.OPENAI_KB_PACK_SIZE || 4);
const DEFAULT_MAX_OUTPUT_TOKENS = Number(process.env.OPENAI_KB_MAX_OUTPUT_TOKENS || 2500);

function parseDotenv(content) {
  const entries = {};

  content.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      return;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    entries[key] = value;
  });

  return entries;
}

async function loadEnvFile() {
  const envPath = path.join(ROOT, '.env');
  try {
    const envContent = await fs.readFile(envPath, 'utf8');
    const trimmed = envContent.trim();

    if (trimmed && !trimmed.includes('\n') && !trimmed.includes('=')) {
      if (!process.env.OPENROUTER_API_KEY) {
        process.env.OPENROUTER_API_KEY = trimmed;
      }
      return;
    }

    const parsed = parseDotenv(envContent);
    Object.entries(parsed).forEach(([key, value]) => {
      if (!process.env[key]) {
        process.env[key] = value;
      }
    });
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return;
    }
    throw error;
  }
}

function chunk(array, size) {
  const result = [];
  for (let index = 0; index < array.length; index += size) {
    result.push(array.slice(index, index + size));
  }
  return result;
}

function normalizeValue(value, kind) {
  if (typeof value !== 'string') {
    return '';
  }

  let normalized = value.trim().replace(/\s+/g, ' ');
  if (!normalized) {
    return '';
  }

  if (kind === 'domains') {
    normalized = normalized.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '');
    normalized = normalized.replace(/\/.*$/, '');
  }

  if (kind === 'exact_apps' || kind === 'aliases' || kind === 'title_keywords') {
    normalized = normalized.replace(/\s+\|\s+/g, ' | ');
  }

  return normalized;
}

function mergeValues(responses, categories, field) {
  const byCategory = new Map(
    categories.map(category => [
      category.name,
      {
        values: new Map(),
      },
    ])
  );

  responses.forEach(response => {
    response.categories.forEach(category => {
      const bucket = byCategory.get(category.name);
      if (!bucket) {
        return;
      }

      (category[field] || []).forEach(item => {
        const normalized = normalizeValue(item, field);
        if (!normalized) {
          return;
        }

        if (!bucket.values.has(normalized)) {
          bucket.values.set(normalized, {
            value: normalized,
            count: 0,
          });
        }

        bucket.values.get(normalized).count += 1;
      });
    });
  });

  return categories.map(category => {
    const bucket = byCategory.get(category.name);
    const merged = [...bucket.values.values()]
      .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value))
      .map(entry => entry.value);
    return [category.name, merged];
  });
}

function buildSchema(categoryNames) {
  return {
    name: 'categorization_seed_batch',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['categories'],
      properties: {
        categories: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: [
              'name',
              'exact_apps',
              'aliases',
              'domains',
              'title_keywords',
              'negative_indicators',
            ],
            properties: {
              name: {
                type: 'string',
                enum: categoryNames,
              },
              exact_apps: {
                type: 'array',
                items: { type: 'string' },
              },
              aliases: {
                type: 'array',
                items: { type: 'string' },
              },
              domains: {
                type: 'array',
                items: { type: 'string' },
              },
              title_keywords: {
                type: 'array',
                items: { type: 'string' },
              },
              negative_indicators: {
                type: 'array',
                items: { type: 'string' },
              },
            },
          },
        },
      },
    },
  };
}

function buildPrompt(categoryPack, round) {
  const categorySpec = categoryPack
    .map(
      category =>
        `- ${category.name}: ${category.description}`
    )
    .join('\n');

  return `
Generate JSON seed data for a desktop activity categorization knowledge base.

The taxonomy is single-dimension and activity-oriented.
Only return categories from this batch.
Avoid duplicates across fields.
Prefer exact app names that are likely to appear in window titles or app names on macOS/Windows/Linux.
Use domains for websites.
Use short title keywords or phrases for title matching.
Use negative indicators only when the category is commonly confused with another one.
Do not include explanations.
Do not include niche or obscure items unless they are broadly recognized.
Round ${round}: vary the examples somewhat while staying plausible and high-quality.

Batch categories:
${categorySpec}

Per category, provide:
- exact_apps: around 12 widely-used app names or launcher names
- aliases: around 8 common textual variants or abbreviations
- domains: around 8 domains strongly associated with the category
- title_keywords: around 8 short title phrases or keywords
- negative_indicators: up to 6 phrases that often signal the category should NOT be used
`.trim();
}

async function callOpenAI({ apiKey, model, categoryPack, round }) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://activitywatch.net',
      'X-Title': 'aw-webui categorization generator',
    },
    body: JSON.stringify({
      model,
      temperature: 0.9,
      max_tokens: DEFAULT_MAX_OUTPUT_TOKENS,
      plugins: [{ id: 'response-healing' }],
      response_format: {
        type: 'json_schema',
        json_schema: buildSchema(categoryPack.map(category => category.name)),
      },
      messages: [
        {
          role: 'system',
          content:
            'You create high-quality activity categorization seed libraries. Return only valid JSON that matches the provided schema.',
        },
        {
          role: 'user',
          content: buildPrompt(categoryPack, round),
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error ${response.status}: ${errorText}`);
  }

  return response.json();
}

function extractStructuredOutput(apiResponse) {
  const message = apiResponse.choices?.[0]?.message?.content;
  const parsed =
    typeof message === 'string'
      ? JSON.parse(message)
      : Array.isArray(message)
        ? JSON.parse(
            message
              .map(chunk => (typeof chunk === 'string' ? chunk : chunk?.text || ''))
              .join('')
          )
        : null;
  if (!parsed || !Array.isArray(parsed.categories)) {
    throw new Error('Response did not contain parsed category data');
  }
  return parsed;
}

async function main() {
  await loadEnvFile();

  const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is missing');
  }

  const taxonomy = JSON.parse(await fs.readFile(TAXONOMY_PATH, 'utf8'));
  const categories = taxonomy.categories.filter(category => category.name !== 'Miscellaneous');
  const categoryPacks = chunk(categories, DEFAULT_PACK_SIZE);

  await fs.mkdir(RAW_OUTPUT_DIR, { recursive: true });

  const allStructuredResponses = [];

  for (let round = 1; round <= DEFAULT_ROUNDS; round += 1) {
    for (let packIndex = 0; packIndex < categoryPacks.length; packIndex += 1) {
      const categoryPack = categoryPacks[packIndex];
      const names = categoryPack.map(category => category.name).join(', ');
      console.log(`Round ${round}/${DEFAULT_ROUNDS} · pack ${packIndex + 1}/${categoryPacks.length} · ${names}`);

      const apiResponse = await callOpenAI({
        apiKey,
        model: DEFAULT_MODEL,
        categoryPack,
        round,
      });
      const structured = extractStructuredOutput(apiResponse);
      allStructuredResponses.push(structured);

      const rawPath = path.join(
        RAW_OUTPUT_DIR,
        `seed-batch.round-${round}.pack-${packIndex + 1}.json`
      );
      await fs.writeFile(rawPath, JSON.stringify(apiResponse, null, 2));
    }
  }

  const mergedByCategory = new Map(categories.map(category => [category.name, category]));
  const exactApps = new Map(mergeValues(allStructuredResponses, categories, 'exact_apps'));
  const aliases = new Map(mergeValues(allStructuredResponses, categories, 'aliases'));
  const domains = new Map(mergeValues(allStructuredResponses, categories, 'domains'));
  const titleKeywords = new Map(mergeValues(allStructuredResponses, categories, 'title_keywords'));
  const negativeIndicators = new Map(
    mergeValues(allStructuredResponses, categories, 'negative_indicators')
  );

  const seedKnowledgebase = {
    version: 1,
    generated_at: new Date().toISOString(),
    generator: {
      model: DEFAULT_MODEL,
      rounds: DEFAULT_ROUNDS,
      pack_size: DEFAULT_PACK_SIZE,
    },
    taxonomy_version: taxonomy.version,
    strategy: taxonomy.strategy,
    categories: [...mergedByCategory.keys()].map(name => ({
      name,
      description: mergedByCategory.get(name).description,
      exact_apps: exactApps.get(name) || [],
      aliases: aliases.get(name) || [],
      domains: domains.get(name) || [],
      title_keywords: titleKeywords.get(name) || [],
      negative_indicators: negativeIndicators.get(name) || [],
    })),
  };

  const outputPath = path.join(OUTPUT_DIR, 'seed-knowledgebase.v1.json');
  await fs.writeFile(outputPath, JSON.stringify(seedKnowledgebase, null, 2));

  console.log(`Wrote taxonomy: ${path.relative(ROOT, TAXONOMY_PATH)}`);
  console.log(`Wrote seed knowledgebase: ${path.relative(ROOT, outputPath)}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
