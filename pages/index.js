import { Component } from 'react'
import Head from 'next/head'
import { withRouter } from 'next/router'

import Layout, { siteTitle } from '../components/layout'
import utilStyles from '../styles/utils.module.css'
import TextField from '@material-ui/core/TextField'
import FormControlLabel from '@material-ui/core/FormControlLabel'
import Checkbox from '@material-ui/core/Checkbox'

class Index extends Component {
    constructor(props) {
        super(props)

        this.state = {
            roomField: '',
            autoconnect: true
        }
    }

    handleChange = (e) => {
        if (e.target.id === 'roomField') this.state[e.target.id] = e.target.value
        else if (e.target.id === 'autoconnect') this.state[e.target.id] = e.target.checked
    }

    handleKeyPress = (e) => {
        console.log(`Pressed keyCode ${e.key}`)

        const { router } = this.props

        if (e.key === 'Enter' && this.state.roomField) {
            // Go to the room page
            router.push({
                pathname: '/room',
                query: {
                    id: this.state.roomField,
                    autoconnect: this.state.autoconnect
                }
            })

            e.preventDefault()
        }
    }

    render() {
        return (
            <Layout home>
                <Head>
                    <title>{siteTitle}</title>
                </Head>
                <section className={utilStyles.headingMd}>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <TextField
                            id="roomField"
                            label="Room"
                            variant="outlined"
                            onChange={this.handleChange}
                            onKeyPress={this.handleKeyPress}
                        />
                    </div>
                    <p></p>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <FormControlLabel
                            label="Automatically attempt to local server"
                            labelPlacement="end"
                            control={
                                <Checkbox
                                    id="autoconnect"
                                    checked={this.state.autoconnect}
                                    color="primary"
                                    onChange={this.handleChange}
                                />
                            }
                        />
                    </div>
                </section>
            </Layout>
        )
    }
}

export default withRouter(Index)
