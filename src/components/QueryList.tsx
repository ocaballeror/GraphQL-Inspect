import { Table } from "antd"
import { ColumnsType } from "antd/lib/table"
import { ReactNode, useEffect, useRef } from "react"
import { GQLRequest } from "../gql"
import { findOperation, fmtTime, getSizeStr } from "../util"
import './QueryList.scss'

// Thresholds (ms) separating quick/mid/slow queries for the speed indicator.
const SLOW_MS = 1000
const MID_MS = 300

const speedClass = (time: number) => {
    if (time >= SLOW_MS) return 'speed-slow'
    if (time >= MID_MS) return 'speed-mid'
    return 'speed-quick'
}



export const QueryList = (props: {
    queries: GQLRequest[],
    onSelect: (selection: GQLRequest | undefined) => any,
    selectedQuery?: GQLRequest,
    headerExtra?: ReactNode
}) => {
    const containerRef = useRef<HTMLDivElement>(null)
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
                    className: classes.join(' ')
                }
            }}
        />
    </div>
}
