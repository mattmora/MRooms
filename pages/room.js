import { Component } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { withRouter } from 'next/router'
import Layout from '../components/layout'
import TransportTime from '../components/transportTime'
import utilStyles from '../styles/utils.module.css'
import Grid from '@material-ui/core/Grid'
import TextField from '@material-ui/core/TextField'
import Button from '@material-ui/core/Button'
import Divider from '@material-ui/core/Divider'
import Card from '@material-ui/core/Card'

import AppGameEngine from '../engine/AppGameEngine'
import AppClientEngine from '../engine/AppClientEngine'
import { Lib } from 'lance-gg'
import osc from 'osc/dist/osc-browser'
import normalizePort from 'normalize-port'
import { State, SUPPORTED_OBJECTS, CONNECTION_STATES } from 'xebra.js'

const defaultChannel = 'channel1'
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
            message: '',
            channel: defaultChannel,
            enforceOSC: true,
            remoteMessage: '',
            address: defaultAddress,
            port: defaultPort,
            localSocketMessage: '',
            localSocketState: '',
            autoconnect: false
        }

        this.gameEngine = null
        this.clientEngine = null
        this.localSocket = null
        this.xebraState = null
    }

    componentDidMount() {
        console.log('Room mounted')

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

        const { router } = this.props

        // ClientEngine options.autoConnect is true by default, so this calls connect()
        this.clientEngine.start()

        Object.assign(this.state, router.query)

        console.log(this.state)
        if (this.state.autoconnect === 'true') {
            console.log(router.query)
            this.createXebraClient(this.state.address, normalizePort(this.state.port))
        }
    }

    componentWillUnmount() {
        console.log('Room will unmount')
        this.clientEngine.disconnect()
        if (this.localSocket != null) this.localSocket.close()
        if (this.xebraState != null) this.xebraState.close()
    }

    handleChange = (e) => {
        this.state[e.target.id] = e.target.value.trim()
    }

    handleKeyPress = (e) => {
        console.log(`Pressed keyCode ${e.key}`)

        if (e.key === 'Enter') {
            const whichTextField = e.target.id

            // ================================================================
            // Handling for message text field
            if (whichTextField === 'message' || whichTextField === 'channel') {
                this.sendMessage()
            }

            // ================================================================
            // Handling for address and port text fields
            else if (whichTextField === 'address' || whichTextField === 'port') {
                this.attemptConnection()
            }

            e.preventDefault()
        }
    }

    sendMessage = () => {
        const message = this.state.message
        console.log(`Sending message ${message}`)
        if (message.startsWith('/') || !this.state.enforceOSC) {
            const split = message.split(/ (.+)/)
            const address = split[0]
            let values = []
            if (split[1] !== undefined) values = split[1].split(',')
            let args = []
            for (let v of values) {
                // Send anything that's not a number as a string
                if (isNaN(v)) {
                    args.push({
                        type: 's',
                        value: v.trim()
                    })
                }
                // Send numbers as floats
                else {
                    args.push({
                        type: 'f',
                        value: Number(v)
                    })
                }
            }
            const packet = osc.writePacket({
                address: address,
                args: args
            })
            this.clientEngine.sendOSCToServer(packet)
        }
    }

    attemptConnection = () => {
        const address = this.state.address
        const port = this.state.port

        // this.createWebSocketClient(address, normalizePort(port))
        this.createXebraClient(address, normalizePort(port))
    }

    createXebraClient(address, port) {
        if (this.xebraState !== null) this.xebraState.close()

        let url
        if (address.startsWith('ws://')) address = address.slice(5)
        const secure = address.startsWith('wss://')
        if (secure) address = address.slice(6)
        if (port) url = `${address}:${port}`
        else url = address

        this.xebraState = new State({
            hostname: address,
            port: port,
            secure: secure,
            supported_objects: SUPPORTED_OBJECTS
        })
        this.xebraState.connect()

        this.xebraState.on('channel_message_received', (channel, message) => {
            console.log(channel)
            console.log(message)
            if (message != null) {
                if (osc.isValidMessage(message)) {
                    this.setState({
                        localSocketMessage: `OSC message: ${message.address} ${message.args} (from ${channel})`
                    })
                    const packet = osc.writePacket(message)
                    this.clientEngine.sendOSCToServer(packet)
                } else {
                    this.setState({
                        localSocketMessage: `Non-OSC message: ${message} (from ${channel})`
                    })
                }
            } else {
                this.setState({
                    localSocketMessage: `Non-OSC message: ${channel}`
                })
            }
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
                        Enter an message to send to everyone in this room and to a mira.channel
                        object you're connected to. <br></br>The format of a message is an address
                        starting with '/', followed by a space, followed by argument values
                        separated by commas. <br></br>Ex.{' '}
                        <i>/hello 1,2, spaces and strings are okay!, 3,4</i>
                        <br></br>Messages from others in the room will also be sent to the
                        mira.channel object.
                    </p>
                    <Grid container spacing={1} alignItems="center">
                        <Grid item xs={6}>
                            <TextField
                                id="message"
                                label="Message"
                                variant="outlined"
                                fullWidth={true}
                                onChange={this.handleChange}
                                onKeyPress={this.handleKeyPress}
                            />
                        </Grid>
                        <Grid item xs={3}>
                            <TextField
                                id="channel"
                                label="Mira Channel"
                                variant="outlined"
                                fullWidth={true}
                                defaultValue={defaultChannel}
                                onChange={this.handleChange}
                                onKeyPress={this.handleKeyPress}
                            />
                        </Grid>
                        <Grid item xs={2}>
                            <Button
                                id="sendButton"
                                variant="outlined"
                                color="primary"
                                size="large"
                                onClick={this.sendMessage}
                            >
                                Send
                            </Button>
                        </Grid>
                    </Grid>
                    <p>Received: {this.state.remoteMessage}</p>
                    <Divider />
                    <p>
                        {/* Enter a WebSocket server to connect to. <br></br>Try
                        wss://echo.websocket.org and no port for testing. Any message you or others
                        in the room send should be sent to the server, echoed back, and shown below. */}
                        Connect to mira in Max/MSP. Use mira.channel to send and receive arbitrary
                        messages. <br></br>A mira.frame must exist in the packet to establish a
                        connection.
                    </p>
                    <Grid container spacing={1} alignItems="center">
                        <Grid item xs={4}>
                            <TextField
                                id="address"
                                label="Address"
                                variant="outlined"
                                fullWidth={true}
                                defaultValue={defaultAddress}
                                onChange={this.handleChange}
                                onKeyPress={this.handleKeyPress}
                            />
                        </Grid>
                        <Grid item xs={4}>
                            <TextField
                                id="port"
                                label="Port (optional)"
                                variant="outlined"
                                fullWidth={true}
                                defaultValue={defaultPort}
                                onChange={this.handleChange}
                                onKeyPress={this.handleKeyPress}
                            />
                        </Grid>
                        <Grid item xs={2}>
                            <Button
                                id="connectButton"
                                variant="outlined"
                                color="primary"
                                size="large"
                                onClick={this.attemptConnection}
                            >
                                Connect
                            </Button>
                        </Grid>
                    </Grid>
                    <p>Connection: {this.state.localSocketState}</p>
                    <p>Received: {this.state.localSocketMessage}</p>
                    <Divider />
                    <TransportTime room={this} updateInterval={30} />
                </section>
            </Layout>
        )
    }
}

export default withRouter(Room)
