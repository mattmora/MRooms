'use strict'

const { ServerEngine } = require('lance-gg')
const { SyncServer } = require('@ircam/sync')
const osc = require('osc/dist/osc-browser')

class AppServerEngine extends ServerEngine {
    constructor(io, gameEngine, inputOptions) {
        super(io, gameEngine, inputOptions)

        this.syncServers = {}

        this.gameEngine.on('server__preStep', this.preStep.bind(this))
        this.gameEngine.on('server__postStep', this.postStep.bind(this))
    }

    start() {
        super.start()
    }

    onPlayerConnected(socket) {
        super.onPlayerConnected(socket)

        socket.on('oscMessage', (roomName, packet) => {
            const message = osc.readPacket(packet, {})
            console.log(message.address)

            console.log(roomName)
            for (const id of this.getRoomPlayers(roomName)) {
                this.connectedPlayers[id].socket.emit('oscResponse', packet)
            }
        })

        socket.on('roomRequest', (roomName) => {
            if (!Object.keys(this.rooms).includes(roomName)) {
                this.createRoom(roomName)
                this.createSyncServer(roomName)
            }
            this.assignPlayerToRoom(socket.playerId, roomName)
            this.assignPlayerToSyncServer(socket, roomName)
            const state = 'success'
            socket.emit('roomRequestResponse', state)
        })
    }

    createSyncServer(roomName) {
        const startTime = process.hrtime()
        this.syncServers[roomName] = new SyncServer(() => {
            let now = process.hrtime(startTime)
            return now[0] + now[1] * 1e-9
        })
    }

    assignPlayerToSyncServer(socket, roomName) {
        this.syncServers[roomName].start(
            // sync send function
            (pingId, clientPingTime, serverPingTime, serverPongTime) => {
                //console.log(`[pong] - id: %s, clientPingTime: %s, serverPingTime: %s, serverPongTime: %s`,
                //  pingId, clientPingTime, serverPingTime, serverPongTime)
                const response = []
                response[0] = 1 // this is a pong
                response[1] = pingId
                response[2] = clientPingTime
                response[3] = serverPingTime
                response[4] = serverPongTime
                socket.emit('syncServerData', response)
            },
            //sync receive function
            (callback) => {
                socket.on('syncClientData', (data) => {
                    const request = data

                    if (request[0] === 0) {
                        // this is a ping
                        const pingId = request[1]
                        const clientPingTime = request[2]

                        //console.log(`[ping] - pingId: %s, clientPingTime: %s`, clientPingTime)

                        callback(pingId, clientPingTime)
                    }
                })
            }
        )
    }

    onPlayerDisconnected(socketId, playerId) {
        super.onPlayerDisconnected(socketId, playerId)
        let player = this.gameEngine.world.queryObject({ playerId: playerId })
        if (player != null) {
            let room = player.room
            if (this.roomStages[room] === 'setup') {
                let removed = player.number
                this.gameEngine.removeObjectFromWorld(player.id)
                this.myRooms[room].splice(this.myRooms[room].indexOf(player), 1)
                for (let p of this.myRooms[room]) {
                    if (p.number > removed) {
                        p.number--
                        p.move(-Number(this.gameEngine.paramsByRoom[room].playerWidth), 0)
                    }
                }
            } else {
                player.active = false
                player.ammo = 0
            }
            let activePlayers = this.gameEngine.queryPlayers({ room: room, active: true })
            if (activePlayers.length === 0) {
                this.gameEngine.world.forEachObject((objId, obj) => {
                    if (obj.room === room) this.gameEngine.removeObjectFromWorld(objId)
                })
                delete this.myRooms[room]
                delete this.syncServers[room]
            }
            if (this.myRooms.length === 0) this.gameEngine.restoreDefaultSettings()
        }
    }

    preStep() {
        for (let room of Object.keys(this.rooms)) {
        }
    }

    postStep() {
        for (let room of Object.keys(this.rooms)) {
        }
    }

    // ========================================================================
    // Utility functions
    getRoomPlayers(roomName) {
        const roomPlayers = Object.keys(this.connectedPlayers).filter(
            (p) => this.connectedPlayers[p].roomName === roomName
        )
        return roomPlayers
    }
}

module.exports = AppServerEngine
