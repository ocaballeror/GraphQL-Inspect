import { CloseOutlined } from "@ant-design/icons";
import { Button, Collapse, List } from "antd";
import { GQLRequest } from "../gql";
import cls from 'classnames';
import './QueryDetails.scss'
import { useWindowSize } from "react-use";
import ReactJson from '@microlink/react-json-view';
import { findOperation, fmtTime, getSizeStr } from "../util";
import { useEffect, useMemo, useRef, useState } from "react"
import {UnControlled as CodeMirror} from 'react-codemirror2'
import { EditorConfiguration } from 'codemirror'
import 'codemirror-graphql/mode';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/twilight.css';

// Keeps the query list from being fully covered when this panel is resized.
const MIN_SIDEBAR_SIZE = 300

export const QueryDetails = (props: { query: GQLRequest, onClose: () => void }) => {

    const { width, height } = useWindowSize()
    const onBottom = width < height

    const [size, setSize] = useState<number | undefined>(undefined)
    const cleanupDrag = useRef<(() => void) | undefined>(undefined)

    // A pixel size measured along one axis doesn't carry over when the panel
    // flips between docking on the side vs. the bottom.
    const prevOnBottom = useRef(onBottom)
    useEffect(() => {
        if (prevOnBottom.current !== onBottom) {
            prevOnBottom.current = onBottom
            setSize(undefined)
        }
    }, [onBottom])

    useEffect(() => {
        setSize(prev => {
            if (prev === undefined) return prev
            const max = (onBottom ? height : width) - MIN_SIDEBAR_SIZE
            return prev > max ? Math.max(MIN_SIDEBAR_SIZE, max) : prev
        })
    }, [width, height, onBottom])

    useEffect(() => () => cleanupDrag.current?.(), [])

    const startResize = (e: React.MouseEvent) => {
        e.preventDefault()

        const onMouseMove = (moveEvent: MouseEvent) => {
            const raw = onBottom
                ? window.innerHeight - moveEvent.clientY
                : window.innerWidth - moveEvent.clientX
            const max = (onBottom ? window.innerHeight : window.innerWidth) - MIN_SIDEBAR_SIZE
            setSize(Math.min(Math.max(raw, MIN_SIDEBAR_SIZE), max))
        }
        const onMouseUp = () => cleanupDrag.current?.()

        window.addEventListener('mousemove', onMouseMove)
        window.addEventListener('mouseup', onMouseUp)
        cleanupDrag.current = () => {
            window.removeEventListener('mousemove', onMouseMove)
            window.removeEventListener('mouseup', onMouseUp)
            cleanupDrag.current = undefined
        }
    }

    const title = useMemo(() => {
        const op = findOperation(props.query.data)
        if (!op) return 'no operation found'
        return `${op.operations[0].type} ${op.name}`
    }, [props.query.data])


    const infoData = [
        <span>Endpoint: <a>{props.query.url}</a></span>,
        <span>On {fmtTime(new Date(props.query.startedDateTime))} (Duration: {props.query.time.toFixed(0)}ms)</span>,
        <span>Size: {getSizeStr(props.query.response)}</span>
    ]

    const queryConf: EditorConfiguration = {
        readOnly: true,
        mode: 'graphql',
        theme: 'twilight'
    }

    return <aside
        className={cls('query-details', { vertical: !onBottom, horizontal: onBottom })}
        style={size === undefined ? undefined : (onBottom ? { height: size } : { width: size })}
    >
        <div className="query-details__resize-handle" onMouseDown={startResize} />
        <div className="query-details__controls">
            <h1>{ title }</h1>
            <Button onClick={props.onClose} icon={<CloseOutlined />} style={{ backgroundColor: '#111' }}>
            </Button>
        </div>
        <div className="query-details__main">
            <List
                size="small"
                dataSource={infoData}
                renderItem={item => <List.Item>{item}</List.Item>}
            />
            <div className="infos">
                
            </div>
            <Collapse>
                <Collapse.Panel header='Request' key='req'>
                    <Collapse>
                        <Collapse.Panel header='Query' key='query' className='query-panel'>
                            <CodeMirror
                                value={props.query.bareQuery}
                                options={queryConf}
                            />
                        </Collapse.Panel>
                        <Collapse.Panel header='Variables' key='variables'>
                            <ReactJson src={props.query.queryVariables} theme="twilight" />
                        </Collapse.Panel>
                    </Collapse>
                </Collapse.Panel>
                <Collapse.Panel header='Response' key='res'>
                    <ReactJson src={props.query.responseBody} theme="twilight" shouldCollapse={arg => {
                        if (arg.type === 'array') return (arg.src as any[]).length > 5;
                        return Object.keys(arg.src).length > 10;
                    }} />
                </Collapse.Panel>
            </Collapse>
        </div>
    </aside>
}