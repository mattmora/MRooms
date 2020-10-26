import { Component } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { withRouter } from 'next/router'
import Layout from '../components/layout'
import utilStyles from '../styles/utils.module.css'
import TextField from '@material-ui/core/TextField'

import AppGameEngine from '../engine/AppGameEngine'
import AppClientEngine from '../engine/AppClientEngine'
import { Lib } from 'lance-gg'
import osc from 'osc/dist/osc-browser'
import querystring from 'query-string'

class Room extends Component {
    constructor(props) {
        super(props)

        console.log('Room constructor')

        this.state = {
            router: this.props.router,
            messageInput: '',
            message: '',
            stateText: ''
        }
    }

    componentDidMount() {
        console.log('Room mounted')

        const { router } = this.props

        const defaults = {
            verbose: true,
            traceLevel: Lib.Trace.TRACE_NONE,
            delayInputCount: 3,
            scheduler: 'render-schedule',
            syncOptions: {
                sync: 'extrapolate',
                localObjBending: 1.0,
                remoteObjBending: 1.0,
                bendingIncrements: 1
            },
            // Not necessary since lance should use this as default anyway
            // but want to expose it here for clarity
            serverURL: window.location.origin
        }
        const qsOptions = querystring.parse(window.location.search)

        let options = Object.assign(defaults, qsOptions)
        console.log(options)

        this.gameEngine = new AppGameEngine(options)
        this.clientEngine = new AppClientEngine(this, this.gameEngine, options)

        // ClientEngine options.autoConnect is true by default, so this calls connect()
        this.clientEngine.start()
    }

    componentWillUnmount() {
        console.log('Room will unmount')
        this.clientEngine.disconnect()
    }

    handleChange = (e) => {
        const value = e.target.value
        this.state.messageInput = value
    }

    catchReturn = (e) => {
        console.log(`Pressed keyCode ${e.key}`)

        if (e.key === 'Enter') {
            if (this.state.messageInput.startsWith('/')) {
                const packet = osc.writePacket({
                    address: this.state.messageInput,
                    args: [
                        {
                            type: 'f',
                            value: 440
                        }
                    ]
                })

                // Make sure the client socket exists
                if (this.clientEngine.socket)
                    this.clientEngine.socket.emit('oscMessage', packet.buffer)
            }

            e.preventDefault()
        }
    }

    render() {
        const { router } = this.props

        return (
            <Layout>
                <Head>
                    <title>Room</title>
                </Head>
                <h1>{router.query.name}</h1>
                <section className={utilStyles.headingMd}>
                    <p>
                        Enter a message to send to everyone in{' '}
                        {router.query.name}.
                    </p>
                    <p>{this.state.stateText}</p>
                    <TextField
                        id="message-input"
                        label="Message"
                        variant="outlined"
                        onChange={this.handleChange}
                        onKeyPress={this.catchReturn}
                    />
                </section>
                <h2>{this.state.message}</h2>
            </Layout>
        )
    }
}

export default withRouter(Room)
