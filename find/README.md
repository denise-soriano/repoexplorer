# Repository finder GitHub client

The `find` package includes a reusable GitHub REST client and a pagination helper. Create one `GitHubRequestClient` for each scraping run and pass that instance to every request in the run. Its queue coordinates concurrency and rate-limit cooldowns across all callers that share it.

## Configuration

Pass configuration when constructing the client. The utility does not load `.env` files, so callers can provide a token or other settings from their own configuration layer.

```ts
import { GitHubRequestClient } from './src/scraping';

const github = new GitHubRequestClient({
    token: process.env.GITHUB_TOKEN,
    timeoutMs: 15_000,
    maxRetries: 3,
    retryBaseDelayMs: 250,
    retryMaxDelayMs: 8_000,
    concurrency: 1,
});
```

The client defaults to `https://api.github.com`, serial dispatch, a 15 second request timeout, and three retries. `baseUrl`, `headers`, `fetch`, `now`, `random`, and `sleep` can be injected for GitHub Enterprise deployments and deterministic tests. Primary rate limits track search paths separately from ordinary REST paths. Secondary rate limits pause all queued requests on the client. Rate limited `403` and `429` responses use `Retry-After` or rate-limit reset headers to determine the cooldown.

## Requests and response contracts

`request<T>()` accepts an API path or an absolute URL on the configured API origin, optional query parameters, headers, an `AbortSignal`, and a response type. JSON is the default. Each successful call returns `{ data, status, headers, url }`.

```ts
const repo = await github.request<{ full_name: string }>(
    '/repos/octo-org/octo-repo',
);
console.log(
    repo.data.full_name,
    repo.status,
    repo.headers.get('x-ratelimit-remaining'),
);
```

For raw repository content, select text mode and the raw media type:

```ts
const readme = await github.request<string>(
    '/repos/octo-org/octo-repo/contents/README.md',
    {
        responseType: 'text',
        headers: { Accept: 'application/vnd.github.raw+json' },
    },
);
```

HTTP failures reject with `GitHubRequestError`, which includes the status, response data, headers, and URL. Authentication, permission, validation, and missing-resource errors are surfaced immediately. Conflicts (`409`, `412`), gateway errors (`502`, `503`, `504`), rate limits, transient network failures, and timeouts use bounded retries with exponential backoff and jitter. Exhausted HTTP retries still throw the final HTTP error; exhausted network or timeout retries throw `GitHubNetworkError` or `GitHubTimeoutError`. Invalid JSON on successful responses throws `GitHubResponseParseError`. Non-JSON HTTP error bodies are preserved as text, so gateway errors and rate limits still receive the appropriate retries. Caller cancellation rejects with the abort reason and is not retried.

## Pagination

`paginateGitHub<T>()` follows `Link` headers through the same client queue. It accepts list endpoints that return arrays and search endpoints that return an `{ items: [...] }` object. The result contains all items, the final page's status and headers, and `pageCount`.

```ts
const searchResults = await paginateGitHub<{ full_name: string }>(
    github,
    '/search/repositories',
    { query: { q: 'language:typescript', per_page: 100 } },
);

const organizationRepos = await paginateGitHub<{ name: string }>(
    github,
    '/orgs/octo-org/repos',
    { query: { type: 'public', per_page: 100 } },
);
```

If a page fails, pagination rejects with that page's error rather than returning partial data. Pass an `AbortSignal` in the options to cancel a request while it is active, queued, or waiting for a rate-limit cooldown.

## Checks

From this directory, run `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build`.
