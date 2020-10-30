'use strict'

const { ClientEngine } = require('lance-gg/dist/client-module/lance-gg')
const AppRenderer = require('./AppRenderer')
const { SyncClient } = require('@ircam/sync')
const { Transport } = require('tone')
const osc = require('osc/dist/osc-browser')

class AppClientEngine extends ClientEngine {
    ///////////////////////////////////////////////////////////////////////////////////////////
    /// INITIALIZATION AND CONNECTION
    constructor(app, gameEngine, options) {
        super(gameEngine, options, AppRenderer)

        this.syncClient = null
        this.transportSyncInterval = 120
        this.transportSyncCount = 0
        this.transport = Transport
        this.player = null
        this.players = []
        this.playersChanged = false
        this.fullscreen = false

        this.gameEngine.on('client__preStep', this.preStepLogic.bind(this))
        this.gameEngine.on('client__postStep', this.postStepLogic.bind(this))

        this.app = app

        console.log('Client engine constructor')
    }

    start() {
        super.start()
    }

    connect(options = {}) {
        return super.connect().then(() => {
            return new Promise((resolve, reject) => {
                // Receiving an osc message from the remote server
                this.socket.on('oscResponse', (senderName, packet) => {
                    if (!this.app.state.userFilters[senderName].receive) return

                    // Read the packet and do whatever with it
                    let message = osc.readPacket(packet, {})

                    // Generic WebSocket
                    // if (this.app.localSocket != null) {
                    //     if (this.app.localSocket.readyState === WebSocket.OPEN) {
                    //         // Send the received packet to localhost
                    //         this.app.localSocket.send(message.address)
                    //     }
                    // }

                    // Xebra
                    // Send the osc message as a json object, which will become a dict in max
                    if (this.app.state.xebraReady) {
                        this.app.xebraState.sendMessageToChannel(this.app.state.channel, message)
                    }

                    this.app.setState({
                        remoteMessage: `${message.address} ${message.args} (from ${senderName})`
                    })

                    console.log(message)
                })

                this.socket.on('roomRequestResponse', (state, userName) => {
                    if (state === 'success') {
                        console.log(`Connected to room ${this.app.state.id}`)
                        this.startSyncClient()
                        this.transport.start()
                        this.app.setState({
                            username: userName
                        })
                    } else if (state === 'closed') {
                        // this.app.setState({
                        // })
                    }
                })

                this.socket.on('usersChanged', (userList) => {
                    this.app.setState({
                        users: userList
                    })
                    // Remove any old user filters
                    // for (const key of Object.keys(this.app.state.userFilters)) {
                    //     if (!userList.includes(key)) delete this.app.state.userFilters[key]
                    // }
                    // Add filter objects for any new users
                    for (const userName of userList) {
                        if (!Object.keys(this.app.state.userFilters).includes(userName)) {
                            this.app.state.userFilters[userName] = { send: 'true', receive: 'true' }
                        }
                    }
                })

                this.requestRoomFromServer(this.app.state.id, this.app.state.username)
            })
        })
    }

    disconnect() {
        super.disconnect()
    }

    requestRoomFromServer(roomName, userName) {
        if (this.socket) {
            console.log(`Requesting room ${roomName} from server`)
            this.socket.emit('roomRequest', roomName, userName)
        }
    }

    startSyncClient() {
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

                        callback(pingId, clientPingTime, serverPingTime, serverPongTime)
                    }
                })
            },
            // status report function
            (status) => {} //console.log(status) }
        )
    }

    sendOSCToServer(packet) {
        // Make sure the socket exists
        if (this.socket) {
            // Send the room name, the sender name, filters and the packet
            this.socket.emit(
                'oscMessage',
                this.app.state.id,
                this.app.state.username,
                this.app.state.userFilters,
                packet.buffer
            )
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////////
    /// SOUND HANDLING AND CLIENT LOGIC

    /// STEP
    preStepLogic() {
        // Sync the transport every so often
        if (this.transport.state === 'started') {
            if (this.transportSyncCount >= this.transportSyncInterval) {
                this.transport.seconds = this.syncClient.getSyncTime()
                this.transportSyncCount = 0
                //console.log(client.transport.state);
            }
            this.transportSyncCount++
            if (this.app.state.xebraReady) {
                this.app.xebraState.sendMessageToChannel(this.app.state.channel, {
                    address: this.app.state.clockMessage,
                    args: [
                        {
                            type: 'f',
                            value: this.transport.seconds
                        }
                    ]
                })
            }
        }
    }

    postStepLogic() {
        if (this.syncClient !== null) {
            if (this.transport.state !== 'started') {
                this.transport.start()
                this.transport.seconds = this.syncClient.getSyncTime()
            }
        }
    }
}

module.exports = AppClientEngine
