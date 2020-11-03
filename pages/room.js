import { Component } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { withRouter } from 'next/router'
import Layout from '../components/layout'
import TransportTime from '../components/transportTime'
import UserList from '../components/userList'
import utilStyles from '../styles/utils.module.css'

// Material UI imports
import Grid from '@material-ui/core/Grid'
import TextField from '@material-ui/core/TextField'
import Button from '@material-ui/core/Button'
import Divider from '@material-ui/core/Divider'
import Typography from '@material-ui/core/Typography'
import Card from '@material-ui/core/Card'
import CardContent from '@material-ui/core/CardContent'
import FormControlLabel from '@material-ui/core/FormControlLabel'
import Checkbox from '@material-ui/core/Checkbox'
import InputLabel from '@material-ui/core/InputLabel'
import MenuItem from '@material-ui/core/MenuItem'
import FormControl from '@material-ui/core/FormControl'
import Select from '@material-ui/core/Select'

import AppGameEngine from '../engine/AppGameEngine'
import AppClientEngine from '../engine/AppClientEngine'
import { Lib } from 'lance-gg'
import normalizePort from 'normalize-port'
import { State, SUPPORTED_OBJECTS, CONNECTION_STATES } from 'xebra.js'

let WebMidi = null

const defaultRoomName = 'Default'
const defaultUserNames = ['User']
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
            xebraReady: false,
            midiInputSelect: -1,
            midiOutputSelect: -1,
            ping: '',
            resetTime: 0
        }

        this.gameEngine = null
        this.clientEngine = null
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

        if (typeof window !== 'undefined') {
            WebMidi = require('webmidi')

            console.log(navigator)

            //https://editor.p5js.org/dbarrett/sketches/HJhBG-LI7
            WebMidi.enable((err) => {
                //check if WebMidi.js is enabled
                if (err) {
                    console.log('WebMidi could not be enabled.', err)
                } else {
                    console.log('WebMidi enabled!')

                    //name our visible MIDI input and output ports
                    console.log('---')
                    console.log('Inputs Ports: ')
                    for (let i = 0; i < WebMidi.inputs.length; i++) {
                        console.log(i + ': ' + WebMidi.inputs[i].name)
                    }

                    console.log('---')
                    console.log('Output Ports: ')
                    for (let i = 0; i < WebMidi.outputs.length; i++) {
                        console.log(i + ': ' + WebMidi.outputs[i].name)
                    }

                    // Reacting when a new device becomes available
                    WebMidi.addListener('connected', (e) => {
                        this.setState({})
                    })

                    // Reacting when a device becomes unavailable
                    WebMidi.addListener('disconnected', (e) => {
                        let input = this.state.midiInputSelect
                        if (WebMidi.inputs[this.state.midiInputSelect] == null) {
                            input = -1
                        }
                        let output = this.state.midiOutputSelect
                        if (WebMidi.outputs[this.state.midiOutputSelect] == null) {
                            output = -1
                        }
                        this.setState({ midiInputSelect: input, midiOutputSelect: output })
                    })
                }
            })
        }
    }

    componentWillUnmount() {
        console.log('Room will unmount')
        this.clientEngine.disconnect()
        if (this.xebraState != null) {
            this.xebraState.close()
            this.xebraReady = false
        }
        if (WebMidi != null && WebMidi.enabled) {
            WebMidi.disable()
        }
    }

    handleChange = (e) => {
        if (e.target.id === 'sendClockMessages') {
            this.state[e.target.id] = e.target.checked
        } else if (e.target.name === 'midiInputSelect' && WebMidi != null) {
            // Remove all listeners for old input
            if (this.state.midiInputSelect >= 0) {
                if (WebMidi.inputs[this.state.midiInputSelect] != null)
                    WebMidi.inputs[this.state.midiInputSelect].removeListener()
            }

            // Set the new input and add listeners
            this.setState({ midiInputSelect: e.target.value })

            // Based on https://editor.p5js.org/dbarrett/sketches/HJhBG-LI7
            console.log(e.target.value)
            if (e.target.value >= 0) {
                const input = WebMidi.inputs[e.target.value]

                input.addListener('midimessage', 'all', (message) => {
                    //Show what we are receiving
                    console.log(message)
                    this.clientEngine.socket.emit(
                        'midiMessageToServer',
                        this.state.id,
                        this.state.username,
                        this.state.userFilters,
                        Object.values(message.data),
                        message.timestamp
                    )
                })
            }
        } else if (e.target.name === 'midiOutputSelect' && WebMidi != null) {
            this.setState({ midiOutputSelect: e.target.value })
        } else {
            // if (e.target.value.includes(/[^\x00-\xFF]/g, '')) console.log('OSC only supports ASCII characters.')
            this.state[e.target.id] = e.target.value.trim() //.replace(/[^\x00-\xFF]/g, '')
        }
    }

    handleKeyPress = (e) => {
        console.log(`Pressed keyCode ${e.key}`)

        if (e.key === 'Enter') {
            const whichTextField = e.target.id

            // ================================================================
            // Handling for message text field
            if (whichTextField === 'message' || whichTextField === 'channel') {
                this.sendMessageToServer(this.state.message)
            }

            // ================================================================
            // Handling for address and port text fields
            else if (whichTextField === 'address' || whichTextField === 'port') {
                this.attemptConnection()
            }

            e.preventDefault()
        }
    }

    sendMessageToServer = (message) => {
        console.log(`Sending message ${message}`)
        // if (message.startsWith('/') || !this.state.enforceOSC) {
        if (this.clientEngine.socket) {
            // Send the room name, the sender name, filters and the message
            this.clientEngine.socket.emit(
                'messageToServer',
                this.state.id,
                this.state.username,
                this.state.userFilters,
                message
            )
        }
    }

    sendMidiMessageOut = (data, timestamp) => {
        if (WebMidi == null) return
        if (WebMidi.outputs[this.state.midiOutputSelect] == null) return
        const status = data.splice(0, 1)
        WebMidi.outputs[this.state.midiOutputSelect].send(status, data, timestamp)
    }

    attemptConnection = () => {
        this.state.xebraReady = false
        const address = this.state.address
        const port = this.state.port

        this.createXebraClient(address, normalizePort(port))
    }

    resetClock = () => {
        if (this.clientEngine == null) return
        if (this.clientEngine.syncClient == null) return
        this.clientEngine.socket.emit(
            'resetClockRequest',
            this.state.id,
            this.clientEngine.syncClient.getSyncTime()
        )
    }

    createXebraClient(address, port) {
        if (this.xebraState !== null) this.xebraState.close()

        var url
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
                this.setState({
                    localSocketMessage: `${message.join(' ')} (from ${channel})`
                })
                this.sendMessageToServer(message)
            } else {
                this.setState({
                    localSocketMessage: `Null message (from ${channel})`
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

    render() {
        const { router } = this.props

        const midiInputs = [
            <MenuItem key={-1} value={-1}>
                No device
            </MenuItem>
        ]
        const midiOutputs = [
            <MenuItem key={-1} value={-1}>
                No device
            </MenuItem>
        ]
        if (WebMidi != null) {
            for (let i = 0; i < WebMidi.inputs.length; ++i) {
                midiInputs.push(
                    <MenuItem key={i} value={i}>
                        {WebMidi.inputs[i].name}
                    </MenuItem>
                )
            }
            for (let i = 0; i < WebMidi.outputs.length; ++i) {
                midiOutputs.push(
                    <MenuItem key={i} value={i}>
                        {WebMidi.outputs[i].name}
                    </MenuItem>
                )
            }
        }
        return (
            <Layout>
                <Head>
                    <title>Max Room {this.state.id}</title>
                </Head>
                <h1>
                    {this.state.id} : {this.state.username}
                </h1>
                <Grid container spacing={1} alignItems="center">
                    <Grid item xs={7}>
                        <p>
                            Enter a message to send to everyone in this room and to a mira.channel
                            object you're connected to. <br></br>For the purpose of parsing numbers,
                            elements of messages are separated with spaces. Message format is
                            otherwise arbitrary, however it is recommended to use OSC formatting
                            (first element is an address starting with '/' and following elements
                            are arguments). <br></br>Ex. /hello 1 2 text 34 → [/hello, 1, 2, text,
                            34]<br></br>Messages from others in the room will also be sent to the
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
                        <p></p>
                        <Divider></Divider>
                        <Typography>Ping: {this.state.ping}</Typography>
                    </Grid>
                </Grid>
                <p>Received: {this.state.remoteMessage}</p>
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
                            onClick={() => {
                                this.sendMessageToServer(this.state.message)
                            }}
                        >
                            Send
                        </Button>
                    </Grid>
                </Grid>
                <p></p>
                <Divider />
                <p>
                    {/* Enter a WebSocket server to connect to. <br></br>Try
                        wss://echo.websocket.org and no port for testing. Any message you or others
                        in the room send should be sent to the server, echoed back, and shown below. */}
                    Connect to mira in Max/MSP. Use mira.channel to send and receive arbitrary
                    messages. <br></br>A mira.frame must exist in the patch to establish a
                    connection.
                </p>
                <p>Connection: {this.state.localSocketState}</p>
                <p>Received: {this.state.localSocketMessage}</p>
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
                <p></p>
                <Divider />
                {/* Don't run any MIDI stuff server side */}
                {typeof window !== 'undefined' &&
                // Client-side, check if WebMidi is working and render as appropriate
                    (WebMidi != null && WebMidi.enabled ? ( 
                        <div>
                            <p>
                                Set MIDI input and output devices. MIDI from your input device will
                                be sent to users in the room. MIDI from other users will be sent to
                                your output device. The send and receive settings in the user list
                                at the top of the page also apply here.
                            </p>
                            <Grid container spacing={1} alignItems="center">
                                <Grid item xs={4}>
                                    <div>
                                        <FormControl fullWidth variant="outlined">
                                            <InputLabel id="midi-input-select-label">
                                                MIDI Input
                                            </InputLabel>
                                            <Select
                                                labelId="midi-input-select-label"
                                                name="midiInputSelect"
                                                value={this.state.midiInputSelect}
                                                onChange={this.handleChange}
                                                label="MIDI Input"
                                            >
                                                {midiInputs}
                                            </Select>
                                        </FormControl>
                                    </div>
                                </Grid>
                                <Grid item xs={4}>
                                    <FormControl fullWidth variant="outlined">
                                        <InputLabel id="midi-output-select-label">
                                            MIDI Output
                                        </InputLabel>
                                        <Select
                                            labelId="midi-output-select-label"
                                            name="midiOutputSelect"
                                            value={this.state.midiOutputSelect}
                                            onChange={this.handleChange}
                                            label="MIDI Output"
                                        >
                                            {midiOutputs}
                                        </Select>
                                    </FormControl>
                                </Grid>
                            </Grid>
                            <p></p>
                        </div>
                    ) : (
                        <p>
                            Error: MIDI not available. You may need to use{' '}
                            <a href={window.location.href.replace('http://', 'https://')}>https</a>{' '}
                            or your browser may not be compatible. Web MIDI is not supported in
                            Firefox or Internet Explorer.
                        </p>
                    ))}
                <Divider></Divider>
                <p>
                    A clock synchronized for everyone in the room. It takes a moment to synchronize
                    upon entering the room. Check the box to send messages to Max with the time.
                    Click the reset button to reset the clock to 0 for everyone in the room.
                </p>
                <Grid container spacing={1} alignItems="center">
                    <Grid item xs="auto">
                        <Button
                            id="resetClockButton"
                            variant="outlined"
                            color="primary"
                            size="large"
                            onClick={this.resetClock}
                        >
                            Reset
                        </Button>
                    </Grid>
                    <Grid item xs="auto">
                        <TransportTime room={this} updateInterval={30} />
                    </Grid>
                </Grid>
                <p></p>
                <Grid container spacing={1} alignItems="center">
                    <Grid item xs="auto">
                        <TextField
                            id="clockMessage"
                            label="Message prefix"
                            variant="outlined"
                            fullWidth={true}
                            defaultValue={defaultClockMessage}
                            onChange={this.handleChange}
                            onKeyPress={this.handleKeyPress}
                        />
                    </Grid>
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
                </Grid>
            </Layout>
        )
    }
}

export default withRouter(Room)
