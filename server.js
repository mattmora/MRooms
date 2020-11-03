'use strict'

// https://medium.com/@markcolling/integrating-socket-io-with-next-js-33c4c435065e
// https://github.com/mars/heroku-nextjs-custom-server-express/blob/master/server.js

const dev = process.env.NODE_ENV !== 'production'
const port = process.env.PORT || 3000

const next = require('next')
const express = require('express')
const sslRedirect = require('heroku-ssl-redirect').default

const nextApp = next({ dev })
const nextHandler = nextApp.getRequestHandler()

const socket = require('socket.io')
const AppGameEngine = require('./engine/AppGameEngine')
const AppServerEngine = require('./engine/AppServerEngine')
const { Lib } = require('lance-gg')

nextApp.prepare().then(() => {
    const app = express()
    app.use(sslRedirect())

    app.get('*', (req, res) => {
        return nextHandler(req, res)
    })

    const server = app.listen(port, (err) => {
        if (err) throw err
        console.log(`> Ready on http://localhost:${port}`)
    })

    const io = socket.listen(server)

    const gameEngine = new AppGameEngine({ traceLevel: Lib.Trace.TRACE_NONE })
    const serverEngine = new AppServerEngine(io, gameEngine, {
        traceLevel: Lib.Trace.TRACE_NONE,
        timeoutInterval: 0
    })

    serverEngine.start()
})
