'use strict'

const { GameEngine } = require('lance-gg')
const AppPhysicsEngine = require('./AppPhysicsEngine')

class AppGameEngine extends GameEngine {

    constructor(options) {
        super(options)
        // an even simpler physics engine
        this.physicsEngine = new AppPhysicsEngine({
            gameEngine: this,
        })

        this.on('preStep', this.preStep.bind(this))
        this.on('postStep', this.postStep.bind(this))
    }

    registerClasses(serializer) {
        // serializer.registerClass(Note)
    }

    start() {
        super.start()
    }

    preStep(stepInfo) {
        
    }

    postStep(stepInfo) {
        
    }

    processInput(inputData, playerId, isServer) {

        super.processInput(inputData, playerId)
    }
}

module.exports = AppGameEngine