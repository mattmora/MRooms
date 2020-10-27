import { Component } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { withRouter } from 'next/router'
import Layout from '../components/layout'
import utilStyles from '../styles/utils.module.css'
import TextField from '@material-ui/core/TextField'
import Divider from '@material-ui/core/Divider'

import AppGameEngine from '../engine/AppGameEngine'
import AppClientEngine from '../engine/AppClientEngine'
import { Lib } from 'lance-gg'
import osc from 'osc/dist/osc-browser'
import normalizePort from 'normalize-port'
import { State, SUPPORTED_OBJECTS, CONNECTION_STATES } from 'xebra.js'

const defaultAddress = 'localhost' //'ws://localhost'
const defaultPort = '8086'

export async function getServerSideProps(context) {
    return {
        props: {
            router: {
                query: context.query
            }
        } // will be passed to the page component as props
    }
}

class Room extends Component {
    constructor(props) {
        super(props)

        console.log('Room constructor')

        this.state = {
            messageField: '',
            channelField: '',
            enforceOSC: true,
            remoteMessage: '',
            addressField: defaultAddress,
            portField: defaultPort,
            localSocketMessage: '',
            localSocketState: ''
        }

        this.localSocket = null
        this.xebraState = null
    }

    componentDidMount() {
        console.log('Room mounted')

        const { router } = this.props

        const options = {
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
        // const qsOptions = querystring.parse(window.location.search)
        // let options = Object.assign(defaults, qsOptions)
        // console.log(options)

        this.gameEngine = new AppGameEngine(options)
        this.clientEngine = new AppClientEngine(this, this.gameEngine, options)

        // ClientEngine options.autoConnect is true by default, so this calls connect()
        this.clientEngine.start()
    }

    componentWillUnmount() {
        console.log('Room will unmount')
        this.clientEngine.disconnect()
        if (this.localSocket != null) this.localSocket.close()
        if (this.xebraState != null) this.xebraState.close()
    }

    handleChange = (e) => {
        this.state[e.target.id] = e.target.value
    }

    handleKeyPress = (e) => {
        console.log(`Pressed keyCode ${e.key}`)

        if (e.key === 'Enter') {
            const whichTextField = e.target.id

            // ================================================================
            // Handling for message text field
            if (whichTextField === 'messageField' || whichTextField === 'channelField') {
                const message = this.state.messageField
                if (message.startsWith('/') || !this.state.enforceOSC) {
                    const packet = osc.writePacket({
                        address: message,
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
            }

            // ================================================================
            // Handling for address and port text fields
            else if (whichTextField === 'addressField' || whichTextField === 'portField') {
                const address = this.state.addressField
                const port = this.state.portField

                // this.createWebSocketClient(address, normalizePort(port))
                this.createXebraClient(address, normalizePort(8086))
            }

            e.preventDefault()
        }
    }

    createXebraClient(address, port) {
        if (this.xebraState !== null) this.xebraState.close()

        let url
        //wss://
        if (port) url = `${address}:${port}`
        else url = address

        this.xebraState = new State({
            hostname: address,
            port: port,
            supported_objects: SUPPORTED_OBJECTS
        })
        this.xebraState.connect()

        this.xebraState.on('channel_message_received', (channel, message) => {
            this.setState({ localSocketMessage: `${message} (from ${channel} channel)` })
        })

        this.xebraState.on('connection_changed', () => {
            if (this.xebraState.connectionState === CONNECTION_STATES.INIT)
                this.setState({ localSocketState: `` })
            else if (this.xebraState.connectionState === CONNECTION_STATES.CONNECTING)
                this.setState({ localSocketState: `Connecting to ${url}.` })
            else if (this.xebraState.connectionState === CONNECTION_STATES.CONNECTED)
                this.setState({ localSocketState: `Connected to ${url}.` })
            else if (this.xebraState.connectionState === CONNECTION_STATES.CONNECTION_FAIL)
                this.setState({ localSocketState: `Failed to connect to ${url}.` })
            else if (this.xebraState.connectionState === CONNECTION_STATES.RECONNECTING)
                this.setState({ localSocketState: `Attempting to reconnect to ${url}.` })
            else if (this.xebraState.connectionState === CONNECTION_STATES.DISCONNECTED)
                this.setState({ localSocketState: `Disconnected from ${url}.` })
        })
    }

    createWebSocketClient(address, port) {
        if (this.localSocket !== null) this.localSocket.close()

        let url
        //wss://
        if (port) url = `${address}:${port}`
        else url = address

        // Can't get socket.io to work for me here for unknown reasons
        // so just gonna use WebSocket.
        this.localSocket = new WebSocket(url)

        this.localSocket.onopen = (event) => {
            console.log('Local socket open')
            this.setState({ localSocketState: `Connected to ${url}.` })
        }

        this.localSocket.onclose = (event) => {
            console.log('Local socket close')
            if (event.code === 1000)
                // Normal closure
                this.setState({ localSocketState: `Disconnected from ${url}.` })
            else this.setState({ localSocketState: `Error connecting to ${url}.` })
        }

        // Receive message from server entered by the user on
        this.localSocket.onmessage = (event) => {
            this.setState({ localSocketMessage: event.data })
        }
    }

    render() {
        const { router } = this.props

        return (
            <Layout>
                <Head>
                    <title>Room {router.query.id}</title>
                </Head>
                <h1>{router.query.id}</h1>
                <section className={utilStyles.headingMd}>
                    <p>
                        Enter a message starting with '/' to send to everyone in this room and to a
                        mira.channel object you're connected to. Messages from others in the room
                        will also be sent to the mira.channel object.
                    </p>
                    <span>
                        <TextField
                            id="messageField"
                            label="Message"
                            variant="outlined"
                            onChange={this.handleChange}
                            onKeyPress={this.handleKeyPress}
                        />{' '}
                        <TextField
                            id="channelField"
                            label="Mira Channel"
                            variant="outlined"
                            defaultValue="fromBrowser"
                            onChange={this.handleChange}
                            onKeyPress={this.handleKeyPress}
                        />
                    </span>
                    <p>Received: {this.state.remoteMessage}</p>
                    <Divider />
                    <p>
                        {/* Enter a WebSocket server to connect to. <br></br>Try
                        wss://echo.websocket.org and no port for testing. Any message you or others
                        in the room send should be sent to the server, echoed back, and shown below. */}
                        Connect to mira in Max/MSP. Use mira.channel to send and receive arbitrary
                        messages. A mira.frame must exist in the packet to establish a connection.
                    </p>
                    <span>
                        {' '}
                        <TextField
                            id="addressField"
                            label="Address"
                            variant="outlined"
                            defaultValue={defaultAddress}
                            onChange={this.handleChange}
                            onKeyPress={this.handleKeyPress}
                        />{' '}
                        <TextField
                            id="portField"
                            label="Port (optional)"
                            variant="outlined"
                            defaultValue={defaultPort}
                            onChange={this.handleChange}
                            onKeyPress={this.handleKeyPress}
                        />{' '}
                    </span>
                    <p>Connection: {this.state.localSocketState}</p>
                    <p>Received: {this.state.localSocketMessage}</p>
                </section>
            </Layout>
        )
    }
}

export default withRouter(Room)
