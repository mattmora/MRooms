import '../styles/global.css'
import App from 'next/app'

export default class MyApp extends App {

  constructor(props) {
    super(props)

  }

  render() {
    const { Component, pageProps } = this.props
    return <Component {...pageProps} {...this.state} />
  }
}