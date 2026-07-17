import { Kind } from "graphql";
import { Entry, PostData } from "har-format";
import { create } from "zustand";
import { GQLRequest } from "./gql";


export function isInWebExt(): boolean {
    return 'browser' in window || 'chrome' in window
}


export const fmtTime = (time: Date, opts?: { withMs?: boolean }) => {
    const base = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}:${time.getSeconds().toString().padStart(2, '0')}`
    return opts?.withMs === false ? base : `${base}:${time.getMilliseconds().toString().padStart(3, '0')}`
}

export const findOperation = (data: GQLRequest['data']) => data.find(def => def.kind === Kind.OPERATION_DEFINITION)

/**
 * @returns size in kb
 */
export const getSizeStr = (res: Entry['response']) => {
    return `${(res.content.size / 1024).toFixed(1)}kB`
}

// curl doesn't accept HTTP/2 pseudo-headers, and computes content-length/host itself.
// accept-encoding is also skipped since curl needs `--compressed` (not this header) to
// auto-decompress the response, otherwise it prints the raw gzip/br bytes.
const CURL_SKIP_HEADERS = new Set(['content-length', 'host', 'accept-encoding'])

const shellQuote = (value: string) => `'${value.replace(/'/g, `'\\''`)}'`

const requestBodyText = (postData?: PostData) => {
    if (!postData) return undefined
    if (postData.text !== undefined) return postData.text
    return postData.params
        ?.map(p => `${encodeURIComponent(p.name)}=${encodeURIComponent(p.value ?? '')}`)
        .join('&')
}

export const buildCurlCommand = (req: GQLRequest) => {
    const { request } = req
    const parts = [`curl ${shellQuote(request.url)}`, '--compressed']

    if (request.method && request.method.toUpperCase() !== 'GET') {
        parts.push(`-X ${request.method}`)
    }

    for (const header of request.headers) {
        if (CURL_SKIP_HEADERS.has(header.name.toLowerCase()) || header.name.startsWith(':')) continue
        parts.push(`-H ${shellQuote(`${header.name}: ${header.value}`)}`)
    }

    const body = requestBodyText(request.postData)
    if (body) parts.push(`--data-raw ${shellQuote(body)}`)

    return parts.join(' \\\n  ')
}

export type ExtMessage = ExtMessageBase & ExtMessageInstance

type ExtMessageInstance = ExtMessagePing | ExtMessageUpdatedRequests | ExtMessageClearAll | ExtMessageUpdateAll

interface ExtMessageBase {
    tabId: number;
    id: string;
}

interface ExtMessagePing {
    type: 'ping'
}

interface ExtMessageUpdatedRequests {
    type: 'requestsAdded',
    startIndex: number,
    data: GQLRequest[]
}

interface ExtMessageClearAll {
    type: 'clearAll'
}

interface ExtMessageUpdateAll {
    type: 'updateAll',
    data: GQLRequest[]
}

export function toExtMessage(inst: ExtMessageInstance, tabId: number): ExtMessage {
    const f = inst as ExtMessage
    f.id = Math.random().toFixed(10)
    f.tabId = tabId
    return f
}

export const CLEAR_ON_NAV_KEY = 'clear-on-nav'

async function getClearOnNavFromStore(): Promise<boolean> {
    if (isInWebExt()) {
        const browser = (await import('webextension-polyfill')).default
        return browser.storage.local.get(CLEAR_ON_NAV_KEY).then((st: Record<string, unknown>) => st[CLEAR_ON_NAV_KEY] ?? true)
    } else {
        return localStorage.getItem(CLEAR_ON_NAV_KEY) === 'true'
    }
}

interface AppState {
    clearOnNav: boolean,
    setClearOnNav(clear: boolean): Promise<void>
}

export const useAppState = create<AppState>((set) => ({
    clearOnNav: true,
    setClearOnNav: async (clear: boolean) => {
        if (isInWebExt()) {
            const browser = (await import('webextension-polyfill')).default
            await browser.storage.local.set({[CLEAR_ON_NAV_KEY]: clear})
        } else {
            await localStorage.setItem(CLEAR_ON_NAV_KEY, clear ? 'true' : 'false')
        }
        set({ clearOnNav: clear })
    }})
)

// initial read
getClearOnNavFromStore().then(clear => useAppState.setState({ clearOnNav: clear }))