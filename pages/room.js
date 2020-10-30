import { Component } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { withRouter } from 'next/router'
import Layout from '../components/layout'
import TransportTime from '../components/transportTime'
import UserList from '../components/userList'
import utilStyles from '../styles/utils.module.css'

import Grid from '@material-ui/core/Grid'
import TextField from '@material-ui/core/TextField'
import Button from '@material-ui/core/Button'
import Divider from '@material-ui/core/Divider'
import Typography from '@material-ui/core/Typography'
import Card from '@material-ui/core/Card'
import CardContent from '@material-ui/core/CardContent'
import FormControlLabel from '@material-ui/core/FormControlLabel'
import Checkbox from '@material-ui/core/Checkbox'

import AppGameEngine from '../engine/AppGameEngine'
import AppClientEngine from '../engine/AppClientEngine'
import { Lib } from 'lance-gg'
import osc from 'osc/dist/osc-browser'
import normalizePort from 'normalize-port'
import { State, SUPPORTED_OBJECTS, CONNECTION_STATES } from 'xebra.js'

const defaultRoomName = 'Default'
const defaultUserNames = [
    'Jeff',
    'Mike',
    'Matt',
    'Josh',
    'Jason',
    'Abbie',
    'Emily',
    'Yue',
    'Gulli',
    'Liam',
    'Nick',
    'Nikitas',
    'Theo',
    'Claire'
]
const defaultChannel = 'channel1'
const defaultAddress = 'localhost' //'ws://localhost'
const defaultPort = '8086'
const defaultClockMessage = '/clock'

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
            id: '',
            username: '',
            autoconnect: true,
            message: '',
            channel: defaultChannel,
            enforceOSC: true,
            remoteMessage: '',
            address: defaultAddress,
            port: defaultPort,
            localSocketMessage: '',
            localSocketState: '',
            autoconnect: false,
            users: [],
            userFilters: {}, // Keys are the elements of users array, values are { send: bool, receive: bool }
            clockMessage: defaultClockMessage,
            sendClockMessages: false,
            xebraReady: false
        }

        this.gameEngine = null
        this.clientEngine = null
        this.localSocket = null
        this.xebraState = null
    }

    componentDidMount() {
        console.log('Room mounted')

        const options = {
            verbose: process.env.NODE_ENV !== 'production',
            traceLevel: Lib.Trace.TRACE_NONE,
            delayInputCount: 3,
            scheduler: 'fixed',
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
        this.state.id = defaultRoomName
        this.state.username = defaultUserNames[Math.floor(Math.random() * defaultUserNames.length)]
        Object.assign(this.state, router.query)
        this.state.xebraReady = false

        console.log(this.state)
        if (this.state.autoconnect === 'true') {
            console.log(router.query)
            this.createXebraClient(this.state.address, normalizePort(this.state.port))
        }
    }

    componentWillUnmount() {
        console.log('Room will unmount')
        this.clientEngine.disconnect()
        if (this.localSocket != null) {
            this.localSocket.close()
            this.localSocket = null
        }
        if (this.xebraState != null) {
            this.xebraState.close()
            this.xebraReady = false
        }
        
    }

    handleChange = (e) => {
        if (e.target.id === 'sendClockMessages') {
            this.state[e.target.id] = e.target.checked
        } else this.state[e.target.id] = e.target.value.trim()
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
                // if (isNaN(v)) {
                //     const s = v.trim()//.replace(/[^\x00-\xFF]/g, '')
                //     if (s === '') continue
                //     args.push({
                //         type: 's',
                //         // Trim whitespace on either end and don't accept non-ASCII characters
                //         value: s
                //     })
                // }
                // // Send numbers as floats
                // else {
                //     args.push({
                //         type: 'f',
                //         value: Number(v)
                //     })
                // }
                args.push(v)
            }
            const oscMessage = {
                address: address,
                args: args
            }
            this.clientEngine.sendOSCToServer(oscMessage)
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
                // Check that there is an address and that it starts with '/'
                if (osc.isValidMessage(message)) {
                    this.setState({
                        localSocketMessage: `OSC message: ${message.address} ${message.args} (from ${channel})`
                    })
                    this.clientEngine.sendOSCToServer(message)
                } else {
                    let address = message.address
                    let args = messages.args
                    if (address == null) {
                        address = '[Missing address]'
                    }
                    if (args == null) {
                        args = '[Missing args]'
                    }
                    this.setState({
                        localSocketMessage: `Non-OSC message: ${address} ${message.args} (from ${channel})`
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
                this.setState({ localSocketState: ``, xebraReady: false })
            else if (this.xebraState.connectionState === CONNECTION_STATES.CONNECTING)
                this.setState({ localSocketState: `Connecting to ${url}.`, xebraReady: false })
            else if (this.xebraState.connectionState === CONNECTION_STATES.CONNECTED)
                this.setState({ localSocketState: `Connected to ${url}.`, xebraReady: true })
            else if (this.xebraState.connectionState === CONNECTION_STATES.CONNECTION_FAIL)
                this.setState({
                    localSocketState: `Failed to connect to ${url}.`,
                    xebraReady: false
                })
            else if (this.xebraState.connectionState === CONNECTION_STATES.RECONNECTING)
                this.setState({
                    localSocketState: `Attempting to reconnect to ${url}.`,
                    xebraReady: false
                })
            else if (this.xebraState.connectionState === CONNECTION_STATES.DISCONNECTED)
                this.setState({ localSocketState: `Disconnected from ${url}.`, xebraReady: false })
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
        return (
            <Layout>
                <Grid container spacing={1} alignItems="center">
                    <Grid item xs={7}>
                        <Head>
                            <title>UtilOSC Room {this.state.id}</title>
                        </Head>
                        <h1>
                            {this.state.id} : {this.state.username}
                        </h1>
                        <p>
                            Enter a message to send to everyone in this room and to a mira.channel
                            object you're connected to. <br></br>The format of a message is an
                            address starting with '/', followed by a space, followed by argument
                            values separated by commas. <br></br>Ex.{' '}
                            <i>/hello 1,2, spaces and strings are okay!, 3,4</i>
                            <br></br>Messages from others in the room will also be sent to the
                            mira.channel object.
                        </p>
                    </Grid>
                    <Grid item xs={5}>
                        <Typography>Users (Toggle sends and receives)</Typography>
                        <Card variant="outlined">
                            <CardContent>
                                <UserList room={this} />
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
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
                    messages. <br></br>A mira.frame must exist in the patch to establish a
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
                <p></p>
                <Grid container spacing={1} alignItems="center">
                    <Grid item xs="auto">
                        <FormControlLabel
                            label="Send regular clock messages (60 times per second)"
                            labelPlacement="end"
                            control={
                                <Checkbox
                                    id="sendClockMessages"
                                    color="primary"
                                    onChange={this.handleChange}
                                />
                            }
                        />
                    </Grid>
                    <Grid item xs="auto">
                        <TextField
                            id="clockMessage"
                            label="Clock message"
                            variant="outlined"
                            fullWidth={true}
                            defaultValue={defaultClockMessage}
                            onChange={this.handleChange}
                            onKeyPress={this.handleKeyPress}
                        />
                    </Grid>
                    <Grid item xs="auto">
                        <TransportTime room={this} updateInterval={30} />
                    </Grid>
                </Grid>
            </Layout>
        )
    }
}

export default withRouter(Room)
