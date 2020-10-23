import { Component } from 'react'
import Head from 'next/head'
import { withRouter } from 'next/router'
import io from 'socket.io-client'

import Layout, { siteTitle } from '../components/layout'
import utilStyles from '../styles/utils.module.css'
import TextField from '@material-ui/core/TextField'

import AppGameEngine from '../engine/AppGameEngine'
import AppClientEngine from '../engine/AppClientEngine'
import { Lib } from 'lance-gg'
import osc from 'osc/dist/osc-browser'

class Index extends Component {

  constructor(props) {
    super(props)

    this.state = {
      roomInput: '',
      message: 'hello'
    }

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
  }

  componentDidMount() {

    console.log('app mounted')

    this.socket = io(window.location.origin)

    this.socket.on('now', data => {
      this.setState({
        message: data.message
      })
    })

    this.socket.on('oscResponse', packet => {
      let message = osc.readPacket(packet, {})
      console.log(message.address)
    })

    this.clientEngine.start()

  }

  handleChange = (e) => {
    const { target: { value } } = e
    this.state.roomInput = value
  }

  catchReturn = (e) => {
    console.log(`Pressed keyCode ${e.key}`);

    const { router } = this.props;

    if (e.key === 'Enter') {

      // Go to the room page
      // router.push({
      //   pathname: '/room',
      //   query: { name: this.state.roomInput }
      // })

      if (this.state.roomInput.startsWith('/')) {
        const packet = osc.writePacket({
          address: this.state.roomInput,
          args: [
            {
              type: 'f',
              value: 440.
            }
          ]
        })

        this.socket.emit('oscMessage', packet.buffer)
      }

      e.preventDefault();
    }
  }

  render() {
    return (
      <Layout home>
        <Head>
          <title>{siteTitle}</title>
        </Head>
        <section className={utilStyles.headingMd}>
          <p>{this.state.message}</p>
          <p>
            (This is a sample website - you’ll be building a site like this on{' '}
            <a href="https://nextjs.org/learn">our Next.js tutorial</a>.)
          </p>
          <TextField id='room-input' label="Room name" variant="outlined"
            onChange={this.handleChange}
            onKeyPress={this.catchReturn} />
        </section>
      </Layout>
    )
  }
}

export default withRouter(Index)