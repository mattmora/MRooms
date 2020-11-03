'use strict'

const { ClientEngine } = require('lance-gg/dist/client-module/lance-gg')
const AppRenderer = require('./AppRenderer')
const { SyncClient } = require('@ircam/sync')

class AppClientEngine extends ClientEngine {
    ///////////////////////////////////////////////////////////////////////////////////////////
    /// INITIALIZATION AND CONNECTION
    constructor(app, gameEngine, options) {
        super(gameEngine, options, AppRenderer)

        this.syncClient = null
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
                // Receiving a message from the remote server
                this.socket.on('messageFromServer', (senderName, message) => {
                    if (!this.app.state.userFilters[senderName].receive) return

                    // Xebra
                    let messageArray
                    // Message might already be an array if it came from Max
                    if (Array.isArray(message)) {
                        messageArray = message
                    }
                    // Otherwise split the message into an array
                    else {
                        messageArray = message.split(' ').map((v) => {
                            if (isNaN(v)) return v
                            else return Number(v)
                        })
                    }

                    // Then send it to max where it will become a list
                    if (this.app.state.xebraReady) {
                        this.app.xebraState.sendMessageToChannel(
                            this.app.state.channel,
                            messageArray
                        )
                    }

                    this.app.setState({
                        remoteMessage: `${messageArray} (from ${senderName})`
                    })
                })

                this.socket.on('midiMessageFromServer', (senderName, data, timestamp) => {
                    if (!this.app.state.userFilters[senderName].receive) return
                    console.log(data)
                    this.app.sendMidiMessageOut(data, timestamp)
                })

                this.socket.on('roomRequestResponse', (state, userName, roomInfo) => {
                    if (state === 'success') {
                        console.log(`Connected to room ${this.app.state.id}`)
                        this.startSyncClient()
                        this.app.setState({
                            username: userName,
                            resetTime: roomInfo.resetTime
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

                this.socket.on('resetClock', (time) => {
                    this.app.setState({ resetTime: time })
                })

                this.requestRoomFromServer(this.app.state.id, this.app.state.username)
            })
        })
    }

    disconnect() {
        super.disconnect()
        delete this.syncClient
    }

    requestRoomFromServer(roomName, userName) {
        if (this.socket) {
            console.log(`Requesting room ${roomName} from server`)
            this.socket.emit('roomRequest', roomName, userName)
        }
    }

    startSyncClient() {
        const startTime = performance.now()
        this.syncClient = new SyncClient(
            () => {
                return (performance.now() - startTime) / 1000
            },
            {
                pingSeriesDelay: {
                    min: 3,
                    max: 5
                }
            }
        )
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
            (status) => {
                console.log(status)
                this.app.setState({
                    ping: Number.parseFloat(status.travelDuration * 1000).toFixed(2) + 'ms'
                })
            }
        )
    }

    getAdjustedSyncTime() {
        if (this.syncClient == null) return 0
        return this.syncClient.getSyncTime() - this.app.state.resetTime
    }

    ///////////////////////////////////////////////////////////////////////////////////////////
    /// SOUND HANDLING AND CLIENT LOGIC

    /// STEP
    preStepLogic() {
        // console.log('try sync')
        if (this.syncClient != null) {
            if (this.app.state.sendClockMessages) {
                if (this.app.state.xebraReady) {
                    console.log('sync')
                    this.app.xebraState.sendMessageToChannel(this.app.state.channel, [
                        this.app.state.clockMessage,
                        this.getAdjustedSyncTime()
                    ])
                }
            }
        }
        /* For some reason, Serializer gives an error only in production. 
        Ensuring that inboundMessages is empty prevents it and I don't need this right now. 
        If I add actual game objects will need to figure this out. */
        this.inboundMessages = []
    }

    postStepLogic() {}
}

module.exports = AppClientEngine
