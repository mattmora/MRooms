import '../styles/global.css'
import App from 'next/app'
import io from 'socket.io-client'

import AppGameEngine from '../engine/AppGameEngine'
import AppClientEngine from '../engine/AppClientEngine'
import { Lib } from 'lance-gg'
import osc from 'osc/dist/osc-browser'


export default class MyApp extends App {

  constructor(props) {
    super(props)

    const { Component, pageProps } = this.props

    const options = {
      traceLevel: Lib.Trace.TRACE_NONE,
      delayInputCount: 3,
      scheduler: 'render-schedule',
      syncOptions: {
        sync: 'extrapolate',
        localObjBending: 1.0,
        remoteObjBending: 1.0,
        bendingIncrements: 1
      }
    }

    this.gameEngine = new AppGameEngine(options);
    this.clientEngine = new AppClientEngine(this.gameEngine, options);

    // The App state can be accessed as props in components
    this.state = {
      message: 'hello',
      socket: {}
    }
  }

  componentDidMount() {

    console.log('app mounted')

    this.state.socket = io(window.location.origin)

    this.state.socket.on('now', data => {
      this.setState({
        message: data.message
      })
    })

    this.state.socket.on('oscResponse', packet => {
      let message = osc.readPacket(packet, {})
      console.log(message.address)
    })

    this.clientEngine.start()

  }

  render() {
    const { Component, pageProps } = this.props
    return <Component {...pageProps} {...this.state}/>
  }
}