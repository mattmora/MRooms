'use strict'

const { ClientEngine } = require('lance-gg/dist/client-module/lance-gg')
const AppRenderer = require('./AppRenderer')
const SyncClient = require('@ircam/sync/client')
const { Transport, isNumber } = require('tone')
const osc = require('osc/dist/osc-browser')

class AppClientEngine extends ClientEngine {
    ///////////////////////////////////////////////////////////////////////////////////////////
    /// INITIALIZATION AND CONNECTION
    constructor(app, gameEngine, options) {
        super(gameEngine, options, AppRenderer)

        this.syncClient = null
        this.transportSyncCount = 0
        this.transport = Transport
        this.room = null
        this.player = null
        this.players = []
        this.playersChanged = false
        this.fullscreen = false

        this.gameEngine.on('client__preStep', this.preStepLogic.bind(this))
        this.gameEngine.on('client__postStep', this.postStepLogic.bind(this))

        this.app = app
        this.localSocket = null
    }

    start() {
        super.start()

        const address = this.app.state.router.query.address
        const port = this.app.state.router.query.port

        let url
        if (isNumber(port)) url = `${address}:${port}`
        //wss://
        else url = address

        // Can't get socket.io to work for me here for unknown reasons
        // so just gonna use WebSocket. 
        this.localSocket = new WebSocket(url)

        this.localSocket.onopen = (event) => {
            console.log('Local socket open')
            this.app.setState({
                stateText: `Connected to ${url}.`
            })
        }

        this.localSocket.onclose = (event) => {
            console.log('Local socket close')
            this.app.setState({
                stateText: `Failed to connect to ${url}.`
            })
        }

        // Receive message from server entered by the user on 
        this.localSocket.onmessage = (event) => {
            this.app.setState({
                message: `${event.data} received from ${url}`
            })
        }

        // if (this.localSocket.connected) {
        //     this.app.setState({
        //         stateText: `Connected to ws://${address}:${port}.`
        //     })
        // } else {
        //     this.app.setState({
        //         stateText: `Failed to connect to ws://${address}:${port}.`
        //     })
        // }
        // this.localSocket.on('connect', () => {
        //     this.app.setState({
        //         stateText: `Connected to ws://${address}:${port}.`
        //     })
        // })

        // this.localSocket.on('connect_error', () => {
        //     this.app.setState({
        //         stateText: `Failed to connect to ws://${address}:${port}.`
        //     })
        // })

        // this.localSocket.on('reconnect', () => {
        //     this.app.setState({
        //         stateText: `Connected to ws://${address}:${port}.`
        //     })
        // })

        // this.localSocket.on('disconnect', (reason) => {
        //     if (reason === 'io server disconnect') {
        //         this.app.setState({
        //             stateText: `Disconnected from ws://${address}:${port}.`
        //         })
        //     } else {
        //         this.app.setState({
        //             stateText: `Disconnected from ws://${address}:${port}. Attempting to reconnect.`
        //         })
        //     }
        // })

        // this.localSocket.on('message', (data) => {
        //     console.log(data)
        // })
    }

    connect(options = {}) {
        return super.connect().then(() => {
            return new Promise((resolve, reject) => {
                this.socket.on('now', (data) => {
                    this.app.setState({
                        message: data.message
                    })
                })

                // Receiving an osc message from the remote server
                this.socket.on('oscResponse', (packet) => {
                    // Read the packet and do whatever with it
                    let message = osc.readPacket(packet, {})
                    if (this.localSocket.readyState === WebSocket.OPEN) {
                        // Send the received packet to localhost
                        this.localSocket.send(message.address)
                    }
                    console.log(message.address)
                })
            })
        })
    }

    disconnect() {
        super.disconnect()
        this.localSocket.close()
    }

    startSyncClient(socket) {
        const startTime = performance.now()
        this.syncClient = new SyncClient(() => {
            return (performance.now() - startTime) / 1000
        })
        this.syncClient.start(
            // send function
            (pingId, clientPingTime) => {
                var request = []
                request[0] = 0 // we send a ping
                request[1] = pingId
                request[2] = clientPingTime

                //console.log('[ping] - id: %s, pingTime: %s', request[1], request[2])

                this.socket.emit('syncClientData', request)
            },
            // receive function
            (callback) => {
                // unpack args before executing the callback
                this.socket.on('syncServerData', function (data) {
                    var response = data

                    if (response[0] === 1) {
                        // this is a pong
                        var pingId = response[1]
                        var clientPingTime = response[2]
                        var serverPingTime = response[3]
                        var serverPongTime = response[4]

                        //console.log('[pong] - id: %s, clientPingTime: %s, serverPingTime: %s, serverPongTime: %s',
                        //pingId, clientPingTime, serverPingTime, serverPongTime)

                        callback(
                            pingId,
                            clientPingTime,
                            serverPingTime,
                            serverPongTime
                        )
                    }
                })
            },
            // status report function
            (status) => {} //console.log(status) }
        )
    }

    assignToRoom(roomName) {
        if (this.socket) {
            this.gameEngine.setRoomParamsToDefault(roomName)
            if (this.params.spectator != null)
                this.isSpectator = this.params.spectator
            if (this.params.ringView != null)
                this.ringView = this.params.ringView
            if (this.params.numRows != null) this.numRows = this.params.numRows
            if (this.params.isLeader != null)
                this.isLeader = this.params.isLeader
            this.socket.emit('assignToRoom', roomName, this.params)
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////////
    /// SOUND HANDLING AND CLIENT LOGIC

    /// STEP
    preStepLogic() {}

    postStepLogic() {}
}

module.exports = AppClientEngine
