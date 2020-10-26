import { Component } from 'react'
import Head from 'next/head'
import { withRouter } from 'next/router'

import Layout, { siteTitle } from '../components/layout'
import utilStyles from '../styles/utils.module.css'
import { TextField } from '@material-ui/core'

const defaultAddress = 'localhost'
const defaultPort = ''

class Index extends Component {
    constructor(props) {
        super(props)

        this.state = {
            room: '',
            address: defaultAddress,
            port: defaultPort
        }
    }

    handleRoomChange = (e) => {
        const {
            target: { value }
        } = e
        this.state.room = value
    }

    handleAddressChange = (e) => {
        const {
            target: { value }
        } = e
        this.state.address = value
    }

    handlePortChange = (e) => {
        const {
            target: { value }
        } = e
        this.state.port = value
    }

    catchReturn = (e) => {
        console.log(`Pressed keyCode ${e.key}`)

        const { router } = this.props

        if (e.key === 'Enter') {
            // Go to the room page
            router.push({
                pathname: '/room',
                query: {
                    name: this.state.room,
                    address: this.state.address,
                    port: this.state.port
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
                            id="room-field"
                            label="Room name"
                            variant="outlined"
                            onChange={this.handleRoomChange}
                            onKeyPress={this.catchReturn}
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
                        <TextField
                            id="ip-field"
                            label="IP address"
                            variant="outlined"
                            defaultValue={defaultAddress}
                            onChange={this.handleAddressChange}
                            onKeyPress={this.catchReturn}
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
                        <TextField
                            id="port-field"
                            label="Port (optional)"
                            variant="outlined"
                            defaultValue={defaultPort}
                            onChange={this.handlePortChange}
                            onKeyPress={this.catchReturn}
                        />
                    </div>
                </section>
            </Layout>
        )
    }
}

export default withRouter(Index)
