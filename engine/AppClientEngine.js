'use strict'

const { ClientEngine } = require('lance-gg/dist/client-module/lance-gg')
const AppRenderer = require('./AppRenderer')
const SyncClient = require('@ircam/sync/client')
const { Transport } = require('tone')
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
    }

    start() {
        super.start()

    }

    connect(options = {}) {
        return super.connect().then(() => {
            return new Promise((resolve, reject) => {

                this.socket.on('now', data => {
                    this.app.setState({
                        message: data.message
                    })
                })

                this.socket.on('oscResponse', packet => {

                    if (this.app.localSocket.connected) {
                        // Send the received packet to localhost
                        this.app.localSocket.send(packet)
                    }

                    // Read the packet and do whatever with it
                    let message = osc.readPacket(packet, {})
                    this.app.setState({
                        message: message.address
                    })
                    console.log(message.address)
                })


            })
        })
    }

    startSyncClient(socket) {
        const startTime = performance.now()
        this.syncClient = new SyncClient(() => { return (performance.now() - startTime) / 1000 })
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
            callback => {
                // unpack args before executing the callback
                this.socket.on('syncServerData', function (data) {
                    var response = data

                    if (response[0] === 1) { // this is a pong
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
            status => { }//console.log(status) }
        )
    }

    assignToRoom(roomName) {
        if (this.socket) {
            this.gameEngine.setRoomParamsToDefault(roomName)
            if (this.params.spectator != null) this.isSpectator = this.params.spectator
            if (this.params.ringView != null) this.ringView = this.params.ringView
            if (this.params.numRows != null) this.numRows = this.params.numRows
            if (this.params.isLeader != null) this.isLeader = this.params.isLeader
            this.socket.emit('assignToRoom', roomName, this.params)
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////////
    /// SOUND HANDLING AND CLIENT LOGIC

    /// STEP
    preStepLogic() {

    }

    postStepLogic() {

    }
}

module.exports = AppClientEngine