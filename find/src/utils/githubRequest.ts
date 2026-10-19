export type GitHubResponseType = 'json' | 'text';

export type GitHubQueryValue =
    | string
    | number
    | boolean
    | null
    | undefined
    | readonly (string | number | boolean)[];

export type GitHubQuery = URLSearchParams | Record<string, GitHubQueryValue>;

export interface GitHubRequestConfig {
    baseUrl?: string;
    token?: string;
    headers?: HeadersInit;
    timeoutMs?: number;
    maxRetries?: number;
    retryBaseDelayMs?: number;
    retryMaxDelayMs?: number;
    concurrency?: number;
    fetch?: typeof globalThis.fetch;
    now?: () => number;
    random?: () => number;
    sleep?: (delayMs: number, signal?: AbortSignal) => Promise<void>;
}

export interface GitHubRequestOptions {
    query?: GitHubQuery;
    headers?: HeadersInit;
    signal?: AbortSignal;
    responseType?: GitHubResponseType;
    timeoutMs?: number;
}

export interface GitHubResponse<T> {
    data: T;
    status: number;
    headers: Headers;
    url: string;
}

type RateLimitBucket = 'core' | 'search';

interface QueuedRequest {
    bucket: RateLimitBucket;
    signal?: AbortSignal;
    run: () => Promise<unknown>;
    resolve: (value: unknown) => void;
    reject: (reason: unknown) => void;
    onAbort?: () => void;
}

interface AttemptResult {
    response?: GitHubResponse<unknown>;
    error?: GitHubRequestError;
    rateLimitDelayMs?: number;
}

class TransientAttemptError extends Error {
    constructor(
        message: string,
        readonly url: string,
        readonly timedOut: boolean,
        options?: ErrorOptions,
    ) {
        super(message, options);
        this.name = 'TransientAttemptError';
    }
}

export class GitHubRequestError extends Error {
    constructor(
        message: string,
        readonly status: number,
        readonly data: unknown,
        readonly headers: Headers,
        readonly url: string,
    ) {
        super(message);
        this.name = 'GitHubRequestError';
    }
}

export class GitHubNetworkError extends Error {
    constructor(
        readonly url: string,
        readonly attempts: number,
        options?: ErrorOptions,
    ) {
        super(
            `GitHub request to ${url} failed after ${attempts} attempts`,
            options,
        );
        this.name = 'GitHubNetworkError';
    }
}

export class GitHubTimeoutError extends GitHubNetworkError {
    constructor(
        url: string,
        attempts: number,
        readonly timeoutMs: number,
        options?: ErrorOptions,
    ) {
        super(url, attempts, options);
        this.message = `GitHub request to ${url} timed out after ${timeoutMs} ms (${attempts} attempts)`;
        this.name = 'GitHubTimeoutError';
    }
}

export class GitHubResponseParseError extends Error {
    constructor(
        readonly status: number,
        readonly url: string,
        options?: ErrorOptions,
    ) {
        super(
            `GitHub returned invalid JSON for ${url} (status ${status})`,
            options,
        );
        this.name = 'GitHubResponseParseError';
    }
}

const DEFAULT_BASE_URL = 'https://api.github.com';
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_BASE_DELAY_MS = 250;
const DEFAULT_RETRY_MAX_DELAY_MS = 8_000;
const DEFAULT_CONCURRENCY = 1;
const RATE_LIMIT_FALLBACK_DELAY_MS = 60_000;
const RETRYABLE_STATUSES = new Set([409, 412, 502, 503, 504]);

class GitHubRequestQueue {
    private readonly pending: QueuedRequest[] = [];
    private readonly cooldownUntil = new Map<RateLimitBucket, number>();
    private active = 0;
    private cooldownTimer: ReturnType<typeof setTimeout> | undefined;

    constructor(
        private readonly concurrency: number,
        private readonly now: () => number,
    ) {}

    dispatch<T>(
        bucket: RateLimitBucket,
        signal: AbortSignal | undefined,
        run: () => Promise<T>,
    ): Promise<T> {
        if (signal?.aborted) {
            return Promise.reject(createAbortError(signal));
        }

        return new Promise<T>((resolve, reject) => {
            const request: QueuedRequest = {
                bucket,
                signal,
                run,
                resolve: (value) => resolve(value as T),
                reject,
            };

            if (signal) {
                request.onAbort = () => {
                    const index = this.pending.indexOf(request);
                    if (index === -1) {
                        return;
                    }

                    this.pending.splice(index, 1);
                    this.removeAbortListener(request);
                    reject(createAbortError(signal));
                    this.drain();
                };
                signal.addEventListener('abort', request.onAbort, {
                    once: true,
                });
            }

            this.pending.push(request);
            this.drain();
        });
    }

    pause(bucket: RateLimitBucket | 'all', delayMs: number): void {
        if (delayMs <= 0) {
            return;
        }

        const until = this.now() + delayMs;
        const buckets: RateLimitBucket[] =
            bucket === 'all' ? ['core', 'search'] : [bucket];
        for (const target of buckets) {
            this.cooldownUntil.set(
                target,
                Math.max(this.cooldownUntil.get(target) ?? 0, until),
            );
        }
        this.drain();
    }

    private drain(): void {
        if (this.cooldownTimer) {
            clearTimeout(this.cooldownTimer);
            this.cooldownTimer = undefined;
        }

        for (let index = this.pending.length - 1; index >= 0; index -= 1) {
            const request = this.pending[index];
            if (request.signal?.aborted) {
                this.pending.splice(index, 1);
                this.removeAbortListener(request);
                request.reject(createAbortError(request.signal));
            }
        }

        while (this.active < this.concurrency) {
            const now = this.now();
            const readyIndex = this.pending.findIndex(
                (request) =>
                    (this.cooldownUntil.get(request.bucket) ?? 0) <= now,
            );
            if (readyIndex === -1) {
                break;
            }

            const [request] = this.pending.splice(readyIndex, 1);
            this.removeAbortListener(request);
            this.active += 1;
            void request
                .run()
                .then(request.resolve, request.reject)
                .finally(() => {
                    this.active -= 1;
                    this.drain();
                });
        }

        const nextCooldown = this.pending.reduce((earliest, request) => {
            const cooldown = this.cooldownUntil.get(request.bucket) ?? 0;
            return cooldown > this.now()
                ? Math.min(earliest, cooldown)
                : earliest;
        }, Number.POSITIVE_INFINITY);

        if (Number.isFinite(nextCooldown)) {
            const delay = Math.max(0, nextCooldown - this.now());
            this.cooldownTimer = setTimeout(() => {
                this.cooldownTimer = undefined;
                this.drain();
            }, delay);
        }
    }

    private removeAbortListener(request: QueuedRequest): void {
        if (request.signal && request.onAbort) {
            request.signal.removeEventListener('abort', request.onAbort);
            request.onAbort = undefined;
        }
    }
}

export class GitHubRequestClient {
    private readonly baseUrl: string;
    private readonly defaultHeaders: Headers;
    private readonly timeoutMs: number;
    private readonly maxRetries: number;
    private readonly retryBaseDelayMs: number;
    private readonly retryMaxDelayMs: number;
    private readonly fetchImplementation: typeof globalThis.fetch;
    private readonly now: () => number;
    private readonly random: () => number;
    private readonly sleep: (
        delayMs: number,
        signal?: AbortSignal,
    ) => Promise<void>;
    private readonly queue: GitHubRequestQueue;

    constructor(config: GitHubRequestConfig = {}) {
        this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
        this.timeoutMs = validatePositiveInteger(
            config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
            'timeoutMs',
        );
        this.maxRetries = validateNonNegativeInteger(
            config.maxRetries ?? DEFAULT_MAX_RETRIES,
            'maxRetries',
        );
        this.retryBaseDelayMs = validateNonNegativeInteger(
            config.retryBaseDelayMs ?? DEFAULT_RETRY_BASE_DELAY_MS,
            'retryBaseDelayMs',
        );
        this.retryMaxDelayMs = validateNonNegativeInteger(
            config.retryMaxDelayMs ?? DEFAULT_RETRY_MAX_DELAY_MS,
            'retryMaxDelayMs',
        );
        const concurrency = validatePositiveInteger(
            config.concurrency ?? DEFAULT_CONCURRENCY,
            'concurrency',
        );
        this.fetchImplementation = config.fetch ?? globalThis.fetch;
        this.now = config.now ?? Date.now;
        this.random = config.random ?? Math.random;
        this.sleep = config.sleep ?? abortableSleep;
        this.queue = new GitHubRequestQueue(concurrency, this.now);

        this.defaultHeaders = new Headers({
            Accept: 'application/vnd.github+json',
        });
        mergeHeaders(this.defaultHeaders, config.headers);
        if (config.token && !this.defaultHeaders.has('Authorization')) {
            this.defaultHeaders.set('Authorization', `Bearer ${config.token}`);
        }
    }

    request<T = unknown>(
        endpoint: string,
        options?: Omit<GitHubRequestOptions, 'responseType'> & {
            responseType?: 'json';
        },
    ): Promise<GitHubResponse<T>>;
    request(
        endpoint: string,
        options: Omit<GitHubRequestOptions, 'responseType'> & {
            responseType: 'text';
        },
    ): Promise<GitHubResponse<string>>;
    async request<T = unknown>(
        endpoint: string,
        options: GitHubRequestOptions = {},
    ): Promise<GitHubResponse<T | string>> {
        const url = createRequestUrl(this.baseUrl, endpoint, options.query);
        const bucket = getBucketFromPath(url.pathname);
        const requestHeaders = new Headers(this.defaultHeaders);
        mergeHeaders(requestHeaders, options.headers);
        const timeoutMs = validatePositiveInteger(
            options.timeoutMs ?? this.timeoutMs,
            'timeoutMs',
        );
        const responseType = options.responseType ?? 'json';
        let lastTransient: TransientAttemptError | undefined;

        for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
            if (options.signal?.aborted) {
                throw createAbortError(options.signal);
            }

            try {
                const result = await this.queue.dispatch(
                    bucket,
                    options.signal,
                    () =>
                        this.executeAttempt(
                            url,
                            requestHeaders,
                            responseType,
                            timeoutMs,
                            options.signal,
                            bucket,
                            attempt,
                        ),
                );

                if (result.response) {
                    return result.response as GitHubResponse<T | string>;
                }

                const error = result.error;
                if (!error) {
                    throw new Error(
                        'GitHub request completed without a response or an error',
                    );
                }

                const shouldRetry =
                    result.rateLimitDelayMs !== undefined ||
                    RETRYABLE_STATUSES.has(error.status);
                if (!shouldRetry || attempt >= this.maxRetries) {
                    throw error;
                }

                if (result.rateLimitDelayMs === undefined) {
                    await this.sleep(this.retryDelay(attempt), options.signal);
                }
            } catch (error) {
                if (options.signal?.aborted) {
                    throw createAbortError(options.signal);
                }

                if (!(error instanceof TransientAttemptError)) {
                    throw error;
                }

                lastTransient = error;
                if (attempt >= this.maxRetries) {
                    if (error.timedOut) {
                        throw new GitHubTimeoutError(
                            url.toString(),
                            attempt + 1,
                            timeoutMs,
                            {
                                cause: error,
                            },
                        );
                    }
                    throw new GitHubNetworkError(url.toString(), attempt + 1, {
                        cause: error,
                    });
                }

                await this.sleep(this.retryDelay(attempt), options.signal);
            }
        }

        if (lastTransient?.timedOut) {
            throw new GitHubTimeoutError(
                url.toString(),
                this.maxRetries + 1,
                timeoutMs,
                {
                    cause: lastTransient,
                },
            );
        }
        throw new GitHubNetworkError(url.toString(), this.maxRetries + 1, {
            cause: lastTransient,
        });
    }

    private async executeAttempt(
        url: URL,
        headers: Headers,
        responseType: GitHubResponseType,
        timeoutMs: number,
        callerSignal: AbortSignal | undefined,
        requestBucket: RateLimitBucket,
        attempt: number,
    ): Promise<AttemptResult> {
        const controller = new AbortController();
        let timedOut = false;
        const onCallerAbort = () => controller.abort(callerSignal?.reason);

        if (callerSignal?.aborted) {
            throw createAbortError(callerSignal);
        }
        callerSignal?.addEventListener('abort', onCallerAbort, { once: true });

        const timeout = setTimeout(() => {
            timedOut = true;
            controller.abort();
        }, timeoutMs);

        try {
            let response: Response;
            let rawBody: string;
            try {
                response = await this.fetchImplementation(url, {
                    method: 'GET',
                    headers,
                    signal: controller.signal,
                });
                rawBody = await response.text();
            } catch (cause) {
                if (callerSignal?.aborted) {
                    throw createAbortError(callerSignal);
                }
                throw new TransientAttemptError(
                    timedOut
                        ? `GitHub request timed out after ${timeoutMs} ms`
                        : 'GitHub network request failed',
                    url.toString(),
                    timedOut,
                    { cause },
                );
            }

            if (callerSignal?.aborted) {
                throw createAbortError(callerSignal);
            }

            let data: unknown;
            try {
                data = parseResponseBody(
                    rawBody,
                    responseType,
                    response.status,
                    url.toString(),
                );
            } catch (error) {
                // HTTP status and headers still govern retries for HTML or text errors.
                if (
                    response.ok ||
                    !(error instanceof GitHubResponseParseError)
                ) {
                    throw error;
                }
                data = rawBody;
            }
            const githubResponse: GitHubResponse<unknown> = {
                data,
                status: response.status,
                headers: response.headers,
                url: url.toString(),
            };

            if (response.ok) {
                return { response: githubResponse };
            }

            const error = new GitHubRequestError(
                describeHttpError(response.status, data),
                response.status,
                data,
                response.headers,
                url.toString(),
            );
            const rateLimitDelayMs = getRateLimitDelay(
                response.status,
                response.headers,
                data,
                this.now(),
            );

            if (rateLimitDelayMs !== undefined) {
                const responseBucket = getBucketFromResource(
                    response.headers,
                    requestBucket,
                );
                const message = getErrorMessage(data);
                const primaryLimit =
                    !message.includes('secondary rate limit') &&
                    !message.includes('abuse detection') &&
                    (response.headers.get('x-ratelimit-remaining') === '0' ||
                        message.includes('api rate limit exceeded'));
                const delayMs = Math.max(
                    rateLimitDelayMs,
                    this.retryDelay(attempt),
                );
                // Primary quotas are per resource; secondary limits pause the entire client.
                if (primaryLimit) {
                    this.queue.pause(responseBucket, delayMs);
                } else {
                    this.queue.pause('all', delayMs);
                }
            }

            return { error, rateLimitDelayMs };
        } finally {
            clearTimeout(timeout);
            callerSignal?.removeEventListener('abort', onCallerAbort);
        }
    }

    private retryDelay(attempt: number): number {
        const exponential = Math.min(
            this.retryMaxDelayMs,
            this.retryBaseDelayMs * 2 ** Math.min(attempt, 30),
        );
        const randomValue = Math.min(0.999_999_999, Math.max(0, this.random()));
        return Math.floor(exponential * randomValue);
    }
}

function validatePositiveInteger(value: number, name: string): number {
    if (!Number.isInteger(value) || value <= 0) {
        throw new RangeError(`${name} must be a positive integer`);
    }
    return value;
}

function validateNonNegativeInteger(value: number, name: string): number {
    if (!Number.isInteger(value) || value < 0) {
        throw new RangeError(`${name} must be a non-negative integer`);
    }
    return value;
}

function mergeHeaders(target: Headers, source?: HeadersInit): void {
    if (!source) {
        return;
    }
    new Headers(source).forEach((value, name) => target.set(name, value));
}

function createRequestUrl(
    baseUrl: string,
    endpoint: string,
    query?: GitHubQuery,
): URL {
    const parsedBaseUrl = new URL(baseUrl);
    const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    const url = /^https?:\/\//i.test(endpoint)
        ? new URL(endpoint)
        : new URL(endpoint.replace(/^\/+/, ''), normalizedBaseUrl);

    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        throw new TypeError(
            `Unsupported GitHub API URL protocol: ${url.protocol}`,
        );
    }
    if (url.origin !== parsedBaseUrl.origin) {
        throw new TypeError(
            'GitHub API endpoints must use the configured base URL origin',
        );
    }

    if (query instanceof URLSearchParams) {
        query.forEach((value, key) => url.searchParams.append(key, value));
    } else if (query) {
        for (const [key, value] of Object.entries(query)) {
            if (Array.isArray(value)) {
                url.searchParams.delete(key);
                for (const item of value) {
                    url.searchParams.append(key, String(item));
                }
            } else if (value === null || value === undefined) {
                url.searchParams.delete(key);
            } else {
                url.searchParams.set(key, String(value));
            }
        }
    }

    return url;
}

function getBucketFromPath(pathname: string): RateLimitBucket {
    return /(?:^|\/)search(?:\/|$)/i.test(pathname) ? 'search' : 'core';
}

function getBucketFromResource(
    headers: Headers,
    fallback: RateLimitBucket,
): RateLimitBucket {
    const resource = headers.get('x-ratelimit-resource')?.toLowerCase();
    if (resource === 'search') {
        return 'search';
    }
    return resource ? 'core' : fallback;
}

function parseResponseBody(
    rawBody: string,
    responseType: GitHubResponseType,
    status: number,
    url: string,
): unknown {
    if (responseType === 'text') {
        return rawBody;
    }
    if (rawBody.trim() === '') {
        return null;
    }
    try {
        return JSON.parse(rawBody) as unknown;
    } catch (cause) {
        throw new GitHubResponseParseError(status, url, { cause });
    }
}

function describeHttpError(status: number, data: unknown): string {
    if (data && typeof data === 'object' && 'message' in data) {
        const message = (data as { message?: unknown }).message;
        if (typeof message === 'string' && message.length > 0) {
            return `GitHub API error (${status}): ${message}`;
        }
    }
    return `GitHub API request failed with status ${status}`;
}

function getRateLimitDelay(
    status: number,
    headers: Headers,
    data: unknown,
    now: number,
): number | undefined {
    const retryAfter = parseRetryAfter(headers.get('retry-after'), now);
    const resetDelay = parseRateLimitReset(
        headers.get('x-ratelimit-reset'),
        now,
    );
    const remaining = headers.get('x-ratelimit-remaining');
    const message = getErrorMessage(data);
    const primaryLimit =
        remaining === '0' || message.includes('api rate limit exceeded');
    const secondaryLimit =
        retryAfter !== undefined ||
        message.includes('secondary rate limit') ||
        message.includes('abuse detection');

    if (status === 429) {
        return (
            maxDefinedDelay(retryAfter, resetDelay) ??
            RATE_LIMIT_FALLBACK_DELAY_MS
        );
    }
    if (status !== 403 || (!primaryLimit && !secondaryLimit)) {
        return undefined;
    }

    if (primaryLimit) {
        return (
            maxDefinedDelay(resetDelay, retryAfter) ??
            RATE_LIMIT_FALLBACK_DELAY_MS
        );
    }
    return retryAfter ?? resetDelay ?? RATE_LIMIT_FALLBACK_DELAY_MS;
}

function maxDefinedDelay(
    ...delays: Array<number | undefined>
): number | undefined {
    const availableDelays = delays.filter(
        (delay): delay is number => delay !== undefined,
    );
    return availableDelays.length > 0
        ? Math.max(...availableDelays)
        : undefined;
}

function getErrorMessage(data: unknown): string {
    let errorData = data;
    if (typeof errorData === 'string') {
        try {
            errorData = JSON.parse(errorData) as unknown;
        } catch {
            return String(errorData).toLowerCase();
        }
    }
    if (errorData && typeof errorData === 'object' && 'message' in errorData) {
        return String(
            (errorData as { message?: unknown }).message ?? '',
        ).toLowerCase();
    }
    return '';
}

function parseRetryAfter(
    value: string | null,
    now: number,
): number | undefined {
    if (value === null || value.trim() === '') {
        return undefined;
    }
    const seconds = Number(value);
    if (Number.isFinite(seconds)) {
        return Math.max(0, seconds * 1_000);
    }
    const date = Date.parse(value);
    return Number.isFinite(date) ? Math.max(0, date - now) : undefined;
}

function parseRateLimitReset(
    value: string | null,
    now: number,
): number | undefined {
    if (value === null || value.trim() === '') {
        return undefined;
    }
    const resetAt = Number(value) * 1_000;
    return Number.isFinite(resetAt) ? Math.max(0, resetAt - now) : undefined;
}

function createAbortError(signal: AbortSignal): unknown {
    if (signal.reason !== undefined) {
        return signal.reason;
    }
    return new DOMException('The operation was aborted', 'AbortError');
}

function abortableSleep(delayMs: number, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) {
        return Promise.reject(createAbortError(signal));
    }

    return new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
            signal?.removeEventListener('abort', onAbort);
            resolve();
        }, delayMs);
        const onAbort = () => {
            clearTimeout(timer);
            signal?.removeEventListener('abort', onAbort);
            if (signal) {
                reject(createAbortError(signal));
            }
        };
        signal?.addEventListener('abort', onAbort, { once: true });
    });
}
