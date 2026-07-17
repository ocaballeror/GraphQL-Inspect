import { App as AntApp, Dropdown, Table } from "antd"
import type { MenuProps } from "antd"
import { ColumnsType } from "antd/lib/table"
import { CopyOutlined } from "@ant-design/icons"
import { ReactNode, useEffect, useRef, useState } from "react"
import { GQLRequest } from "../gql"
import { buildCurlCommand, findOperation, fmtTime, getSizeStr } from "../util"
import './QueryList.scss'

// Thresholds (ms) separating quick/mid/slow queries for the speed indicator.
const SLOW_MS = 1000
const MID_MS = 300

const speedClass = (time: number) => {
    if (time >= SLOW_MS) return 'speed-slow'
    if (time >= MID_MS) return 'speed-mid'
    return 'speed-quick'
}



const CONTEXT_MENU_ITEMS: MenuProps['items'] = [
    { key: 'copy-query', label: 'Copy query', icon: <CopyOutlined /> },
    { key: 'copy-response', label: 'Copy response', icon: <CopyOutlined /> },
    { key: 'copy-curl', label: 'Copy as curl', icon: <CopyOutlined /> },
]

export const QueryList = (props: {
    queries: GQLRequest[],
    onSelect: (selection: GQLRequest | undefined) => any,
    selectedQuery?: GQLRequest,
    headerExtra?: ReactNode
}) => {
    const { message } = AntApp.useApp()
    const containerRef = useRef<HTMLDivElement>(null)
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, record: GQLRequest } | null>(null)
    // Only auto-follow new rows while the user is already near the bottom,
    // so scrolling up to inspect older entries isn't interrupted.
    const stickToBottom = useRef(true)

    useEffect(() => {
        const body = containerRef.current?.querySelector<HTMLDivElement>('.ant-table-body')
        if (!body) return

        const handleScroll = () => {
            stickToBottom.current = body.scrollHeight - body.scrollTop - body.clientHeight < 20
        }
        body.addEventListener('scroll', handleScroll)
        return () => body.removeEventListener('scroll', handleScroll)
    }, [])

    useEffect(() => {
        if (!stickToBottom.current) return
        const body = containerRef.current?.querySelector<HTMLDivElement>('.ant-table-body')
        if (body) body.scrollTop = body.scrollHeight
    }, [props.queries])

    // `trigger={[]}` (needed to open the dropdown at arbitrary cursor coords) skips
    // antd's own outside-click handling, so it's replicated manually here. Right-clicking
    // a different row re-opens the menu via onRow's onContextMenu instead, so this only
    // needs to handle plain left clicks outside the menu.
    useEffect(() => {
        if (!contextMenu) return
        const close = () => setContextMenu(null)
        document.addEventListener('click', close)
        return () => document.removeEventListener('click', close)
    }, [contextMenu])

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text)
            message.success('Copied to clipboard')
        } catch {
            message.error('Failed to copy to clipboard')
        }
    }

    const onMenuClick: MenuProps['onClick'] = ({ key }) => {
        const record = contextMenu?.record
        setContextMenu(null)
        if (!record) return

        if (key === 'copy-query') copyToClipboard(record.bareQuery)
        else if (key === 'copy-response') copyToClipboard(JSON.stringify(record.responseBody, null, 2))
        else if (key === 'copy-curl') copyToClipboard(buildCurlCommand(record))
    }

    const cols: ColumnsType<GQLRequest> = [
        {
            title: 'Query Name',
            dataIndex: ['data'],
            render: (data: GQLRequest['data']) => {
                const op = findOperation(data)
                return `${op?.operations[0].type} ${op?.name}`
            }
        },
        {
            title: 'Endpoint',
            dataIndex: 'url'
        },
        {
            title: 'Time',
            width: 100,
            render: (entry: GQLRequest) => (fmtTime(new Date(entry.startedDateTime), { withMs: false }))
        },
        {
            title: 'Sizes (kB)',
            width: 90,
            render: (entry: GQLRequest) => (<span className="response-size">{getSizeStr(entry.response)}</span>)
        }
    ]

    return <div className="query-list" ref={containerRef}>
        {props.headerExtra && <div className="query-list__toolbar">{props.headerExtra}</div>}
        <Table<GQLRequest>
            dataSource={props.queries}
            columns={cols}
            rowKey="id"
            pagination={false}
            sticky={true}
            scroll={{ y: '100%'}}
            onRow={(record: GQLRequest) => {
                const classes = [speedClass(record.time)]
                if (record.id == props.selectedQuery?.id) classes.push('selected')
                return {
                    onClick: () => props.onSelect(record),
                    onContextMenu: (e: React.MouseEvent) => {
                        e.preventDefault()
                        setContextMenu({ x: e.clientX, y: e.clientY, record })
                    },
                    className: classes.join(' ')
                }
            }}
        />
        {contextMenu && (
            <Dropdown
                open
                trigger={[]}
                transitionName=""
                menu={{ items: CONTEXT_MENU_ITEMS, onClick: onMenuClick }}
                classNames={{ item: 'query-list__context-menu-item', itemIcon: 'query-list__context-menu-icon' }}
            >
                <div style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y, width: 1, height: 1 }} />
            </Dropdown>
        )}
    </div>
}