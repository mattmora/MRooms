// https://medium.com/@markcolling/integrating-socket-io-with-next-js-33c4c435065e

const app = require('express')()
const server = require('http').Server(app)
const io  = require('socket.io')(server)
const next = require('next')

const dev = process.env.NODE_ENV !== 'production'
const nextApp = next({ dev })
const nextHandler = nextApp.getRequestHandler()

let port = 8080

io.on('connect', socket => { 
    socket.emit('now', { 
        message: 'received'
    })
})

nextApp.prepare().then(() => {

    app.get('*', (req, res) => {
        return nextHandler(req, res)
    })

    server.listen(port, (err) => {
        if (err) throw err
        console.log(`> Ready on http://localhost:${port}`)
    })
})