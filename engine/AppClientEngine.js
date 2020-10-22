'use strict'

const { ClientEngine } = require('lance-gg/dist/client-module/lance-gg')
const AppRenderer = require('./AppRenderer')
const SyncClient = require('@ircam/sync/client')
const { Transport } = require('tone')

class AppClientEngine extends ClientEngine {

    ///////////////////////////////////////////////////////////////////////////////////////////
    /// INITIALIZATION AND CONNECTION
    constructor(gameEngine, options) {
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
    }

    start() {
        super.start()
        let btn = document.getElementById('startButton')
        let roomNameInput = document.getElementById('roomNameInput')
        let errorText = document.querySelector('#startMenu .room-error')
        let paramInput = document.getElementById('paramInput')

        btn.onclick = () => {
            let regex = /^\w+$/
            if (regex.exec(roomNameInput.value) != null) {

                let paramString = paramInput.value.replace(/\s/g, '')
                let members = paramString.split('')
                for (let m of members) {
                    m = m.split(':')
                    if (isNaN(Number(m[1]))) this.params[m[0]] = m[1]
                    else {
                        this.params[m[0]] = Number(m[1])
                        //console.log(typeof this.params[m[0]])
                    }
                }

                this.assignToRoom(roomNameInput.value.substring(0, 20))
            } else {
                errorText.textContent = 
                'Room name can only contain alphanumeric characters or underscores and must be at least 1 character long.'
            }
        }

        document.body.requestPointerLock = document.body.requestPointerLock || document.body.mozRequestPointerLock

        // LOCAL CONTROLS
        // Any inputs that do nothing server-side (i.e. doesn't need to be known by other players)
        document.addEventListener('keypress', e => {
            //console.log(e.code)
            if (document.activeElement === roomNameInput || document.activeElement === paramInput) {
                if (e.code === 'Enter') {
                    let regex = /^\w+$/
                    if (regex.exec(roomNameInput.value) != null) {

                        let paramString = paramInput.value.replace(/\s/g, '')
                        let members = paramString.split('')
                        for (let m of members) {
                            m = m.split(':')
                            if (isNaN(Number(m[1]))) this.params[m[0]] = m[1]
                            else {
                                this.params[m[0]] = Number(m[1])
                                //console.log(typeof this.params[m[0]])
                            }
                        }

                        this.assignToRoom(roomNameInput.value.substring(0, 20))
                    } else {
                        errorText.textContent = 
                        'Room name can only contain alphanumeric characters or underscores and must be at least 1 character long.'
                    }
                }
            }
        })
    }

    connect(options = {}) {
        return super.connect().then(() => {
            this.socket.on('assignedRoom', (roomName, params) => { 
                document.getElementById('startMenuWrapper').style.display = 'none'
                document.getElementById('instructions').style.position = 'absolute'
                if (this.isSpectator) document.getElementById('instructions').style.visibility = 'hidden'

                this.params = params
                // console.log(`params=${this.params}`)
                Object.assign(this.gameEngine.paramsByRoom[roomName], this.params)
                
               //if (this.isLeader) this.controls.bindKey('b', 'b') // begin

                if (!this.isSpectator) {
                    // NETWORKED CONTROLS
                    // These inputs will also be processed on the server
                    //console.log('binding keys')
                    //this.controls.bindKey('space', 'space')
                    this.controls.bindKey('open bracket', '[')
                    this.controls.bindKey('close bracket / å', ']')
                    this.controls.bindKey('c', 'c') // change color
                    this.controls.bindKey('space', 'space')
                    // this.controls.bindKey('q', 'q')
                    this.controls.bindKey('b', 'b') // begin
                    this.controls.bindKey('r', 'r') // remove note in outro
                    this.controls.bindKey('w', 'w')
                    // this.controls.bindKey('e', 'e')
                    this.controls.bindKey('a', 'a')
                    this.controls.bindKey('s', 's')
                    this.controls.bindKey('d', 'd')
                    this.controls.bindKey('p', 'p')
                    // this.controls.bindKey('back slash', 'back slash')
                }
                this.startSyncClient(this.socket)
                this.room = roomName
                this.gameEngine.room = this.room
                this.transport.start('+0.1')
            })
            this.socket.on('accessDenied', () => {
                let errorText = document.querySelector('#startMenu .room-error')
                errorText.textContent = 
                'Cannot join room. Performance in progress.'
            })
            // this.socket.on('changeTempo', bpm => {
            //     this.transport.scheduleOnce(() => {
            //         this.transport.bpm.value = bpm
            //     }, this.nextDiv('1m'))
            // })
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