import { Table } from "antd"
import { ColumnsType } from "antd/lib/table"
import { Kind } from "graphql"
import { useEffect, useRef } from "react"
import { GQLRequest } from "../gql"
import { findOperation, fmtTime, getSizeStr } from "../util"
import './QueryList.scss'



export const QueryList = (props: {
    queries: GQLRequest[],
    onSelect: (selection: GQLRequest | undefined) => any,
    selectedQuery?: GQLRequest
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

    const cols: ColumnsType<object> = [
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
        <Table
            dataSource={props.queries}
            columns={cols}
            rowKey="id"
            pagination={false}
            sticky={true}
            scroll={{ y: '100%'}}
            onRow={(record: any, idx) => {
                console.log(record.id, props.selectedQuery?.id)
                return {
                    onClick: () => props.onSelect(record),
                    className: record.id == props.selectedQuery?.id ? 'selected' : ''
                }
            }}
        />
    </div>
}