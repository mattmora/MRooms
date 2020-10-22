import '../styles/global.css'
import App from 'next/app'
import io from 'socket.io-client'

import AppGameEngine from '../engine/AppGameEngine'
import AppClientEngine from '../engine/AppClientEngine'
import { Lib } from 'lance-gg'

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
      message: 'hello'
    }
  }

  componentDidMount() {
    let socket = io()
    socket.on('now', data => {
      this.setState({
        message: data.message
      })
    })
  }

  render() {
    const { Component, pageProps } = this.props
    return <Component {...pageProps} {...this.state}/>
  }
}