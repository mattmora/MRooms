'use strict'

const { ServerEngine } = require('lance-gg')
const { SyncServer } = require('@ircam/sync')

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

        socket.on('messageToServer', (roomName, senderName, filters, message) => {
            console.log(message)
            console.log(roomName)
            for (const id of this.getRoomPlayers(roomName)) {
                if (filters[this.connectedPlayers[id].socket.userName].send)
                    this.connectedPlayers[id].socket.emit('messageFromServer', senderName, message)
            }
        })

        socket.on('midiMessageToServer', (roomName, senderName, filters, data, timestamp) => {
            for (const id of this.getRoomPlayers(roomName)) {
                if (filters[this.connectedPlayers[id].socket.userName].send)
                    this.connectedPlayers[id].socket.emit(
                        'midiMessageFromServer',
                        senderName,
                        data, 
                        timestamp
                    )
            }
        })

        socket.on('roomRequest', (roomName, userName) => {
            if (!Object.keys(this.rooms).includes(roomName)) {
                this.createRoom(roomName)
                this.rooms[roomName].resetTime = 0
                this.createSyncServer(roomName)
            }
            this.assignPlayerToRoom(socket.playerId, roomName)
            this.assignPlayerToSyncServer(socket, roomName)

            // Get a list of all existing usernames in the room
            let userList = []
            const roomPlayers = this.getRoomPlayers(roomName)
            for (const id of roomPlayers) {
                if (this.connectedPlayers[id].socket.userName)
                    userList.push(this.connectedPlayers[id].socket.userName)
            }

            // Make sure the new user has a unique name
            let uniqueName = userName
            let i = 2
            while (userList.includes(uniqueName)) {
                uniqueName = `${userName}${i}`
                i++
            }

            console.log(uniqueName)

            // Assign the name and add it to the list
            socket.userName = uniqueName
            userList.push(uniqueName)

            const roomInfo = {
                resetTime: this.rooms[roomName].resetTime
            }

            const state = 'success'
            socket.emit('roomRequestResponse', state, uniqueName, roomInfo)

            for (const id of roomPlayers) {
                this.connectedPlayers[id].socket.emit('usersChanged', userList)
            }
        })

        socket.on('resetClockRequest', (roomName, time) => {
            console.log(`Reset clock at ${time}`)
            this.rooms[roomName].resetTime = time
            for (const id of this.getRoomPlayers(roomName)) {
                this.connectedPlayers[id].socket.emit('resetClock', time)
            }
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
        // Get the disconnecting player
        const roomName = this.connectedPlayers[socketId].roomName

        // Disconnect them (delete them from connectedPlayers())
        super.onPlayerDisconnected(socketId, playerId)

        // Get players left in the room
        const roomPlayers = this.getRoomPlayers(roomName)

        // Delete the room and syncServer if no one is left in the room
        if (roomPlayers.length === 0) {
            delete this.rooms[roomName]
            delete this.syncServers[roomName]
        }
        // Otherwise send all users the updated user list
        else {
            let userList = []
            for (const id of roomPlayers) {
                userList.push(this.connectedPlayers[id].socket.userName)
            }

            for (const id of roomPlayers) {
                this.connectedPlayers[id].socket.emit('usersChanged', userList)
            }
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
