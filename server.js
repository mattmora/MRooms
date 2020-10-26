'use strict'

// https://medium.com/@markcolling/integrating-socket-io-with-next-js-33c4c435065e
// https://github.com/mars/heroku-nextjs-custom-server-express/blob/master/server.js

const dev = process.env.NODE_ENV !== 'production'
const port = process.env.PORT || 3000

const express = require('express')()
const http = require('http').Server(express)
const io = require('socket.io')(http)

const next = require('next')
const nextApp = next({ dev })
const nextHandler = nextApp.getRequestHandler()

const AppGameEngine = require('./engine/AppGameEngine')
const AppServerEngine = require('./engine/AppServerEngine')
const { Lib } = require('lance-gg')

nextApp.prepare().then(() => {
    express.get('*', (req, res) => {
        return nextHandler(req, res)
    })

    const requestHandler = http.listen(port, (err) => {
        if (err) throw err
        console.log(`> Ready on http://localhost:${port}`)
    })
})

const gameEngine = new AppGameEngine({ traceLevel: Lib.Trace.TRACE_NONE })
const serverEngine = new AppServerEngine(io, gameEngine, {
    traceLevel: Lib.Trace.TRACE_NONE,
    timeoutInterval: 0
})

serverEngine.start()
