import { Kind } from 'graphql'
import { useEffect, useState } from 'react'
import { App as AntApp, ConfigProvider, theme } from 'antd'
import 'antd/dist/reset.css'
import './App.scss'
import { PanelBar } from './components/PanelBar'
import { QueryDetails } from './components/QueryDetails'
import { QueryList } from './components/QueryList'
import { GQLRequest, GraphQLRequestStore } from './gql'

export default (props: { gqlStore: GraphQLRequestStore }) => {
    const [selectedQuery, setSelectedQuery] = useState<GQLRequest | undefined>()
    const [queries, setQueries] = useState<GQLRequest[]>([])

    useEffect(() => {
        props.gqlStore.events.on('requestsAdded', msg => setQueries(prevQueries => {
            const res = prevQueries.slice(0, msg.startIndex)
            res.push(...msg.data)
            return res
        }))

        props.gqlStore.events.on('updateAll', ({ data }) => {
            setQueries(data)
            setSelectedQuery(undefined)
        })

        return () => props.gqlStore.events.all.clear()
    }, [ props.gqlStore ])

    return (
        <ConfigProvider theme={{ algorithm: theme.darkAlgorithm, token: { borderRadius: 0 } }}>
            <AntApp>
                <main>
                    <QueryList
                        queries={queries}
                        onSelect={setSelectedQuery}
                        selectedQuery={selectedQuery}
                        headerExtra={<PanelBar onClear={() => props.gqlStore.clearAll()} />}
                    />
                    {
                        selectedQuery && <QueryDetails query={selectedQuery} onClose={() => setSelectedQuery(undefined)} />
                    }
                </main>
            </AntApp>
        </ConfigProvider>
    )
}