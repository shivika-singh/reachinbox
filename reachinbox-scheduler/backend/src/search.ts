import { Client } from '@elastic/elasticsearch';
import { config } from './config';
import { stripHtml, toDto } from './util';

const INDEX = 'emails';
const es = new Client({ node: config.esUrl });
let ready = false;

export async function initSearch() {
  try {
    const exists = await es.indices.exists({ index: INDEX });
    if (!exists) {
      await es.indices.create({
        index: INDEX,
        mappings: {
          properties: {
            id: { type: 'keyword' },
            userId: { type: 'keyword' },
            status: { type: 'keyword' },
            fromEmail: { type: 'keyword' },
            toEmail: { type: 'text' },
            subject: { type: 'text' },
            body: { type: 'text' },
            scheduledAt: { type: 'date' },
            sentAt: { type: 'date' },
          },
        },
      });
    }
    ready = true;
    console.log('[search] Elasticsearch ready');
  } catch (e: any) {
    ready = false;
    console.warn('[search] Elasticsearch unavailable, falling back to SQL search:', e.message);
  }
}

const toDoc = (row: any) => ({ ...toDto(row), body: stripHtml(row.body), userId: row.user_id });

export async function indexEmails(rows: any[]) {
  if (!ready || rows.length === 0) return;
  try {
    const operations = rows.flatMap((r) => [{ index: { _index: INDEX, _id: r.id } }, toDoc(r)]);
    await es.bulk({ operations });
  } catch (e: any) {
    console.error('[search] index failed', e.message);
  }
}

/** Returns null when ES is down so the caller can fall back to SQL. */
export async function searchEmails(opts: {
  userId: string; q: string; statuses: string[]; limit: number; offset: number; sent: boolean;
}) {
  if (!ready) return null;
  try {
    const res = await es.search<any>({
      index: INDEX,
      from: opts.offset,
      size: opts.limit,
      query: {
        bool: {
          filter: [{ term: { userId: opts.userId } }, { terms: { status: opts.statuses } }],
          should: [
            { multi_match: { query: opts.q, fields: ['toEmail^2', 'subject^2', 'body'], fuzziness: 'AUTO' } },
            { multi_match: { query: opts.q, type: 'phrase_prefix', fields: ['toEmail^2', 'subject^2', 'body'] } },
          ],
          minimum_should_match: 1,
        },
      },
      sort: opts.sent
        ? [{ sentAt: { order: 'desc', unmapped_type: 'date' } }]
        : [{ scheduledAt: { order: 'asc', unmapped_type: 'date' } }],
    });
    const total = typeof res.hits.total === 'number' ? res.hits.total : res.hits.total?.value ?? 0;
    return { items: res.hits.hits.map((h) => h._source), total };
  } catch (e: any) {
    console.error('[search] query failed, falling back to SQL:', e.message);
    return null;
  }
}
