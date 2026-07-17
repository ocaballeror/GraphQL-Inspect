import { Button, Dropdown, Switch } from 'antd'
import { DeleteFilled, SettingFilled } from '@ant-design/icons'
import './PanelBar.scss'
import { useAppState } from '../util'

export const PanelBar = (props: { onClear: () => void }) => {

    const {
        clearOnNav,
        setClearOnNav
    } = useAppState()

    return <div className="panel-bar">
        <Button onClick={props.onClear} icon={<DeleteFilled />}>
        </Button>
        <Dropdown
            className='settings-btn'
            trigger={['click']}
            menu={{
                className: 'settings',
                items: [
                    {
                        key: 'clear-on-nav',
                        label: (
                            <div className='clear-on-nav'>
                                <Switch checked={clearOnNav} onChange={() => setClearOnNav(!clearOnNav)} />
                                <label>Clear on Navigation</label>
                            </div>
                        ),
                        onClick: () => setClearOnNav(!clearOnNav)
                    }
                ]
            }}
        >
            <Button icon={<SettingFilled />}>
            </Button>
        </Dropdown>
    </div>
}