"use strict";

const { Renderer } = require('lance-gg/dist/client-module/lance-gg')

class AppRenderer extends Renderer {

    constructor(gameEngine, clientEngine) {
        super(gameEngine, clientEngine);

    }

    draw(t, dt) {
        super.draw(t, dt);

    }
}

module.exports = AppRenderer