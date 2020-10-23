import '../styles/global.css'
import App from 'next/app'

export default class MyApp extends App {

  constructor(props) {
    super(props)

    console.log('App constructor')
  }

  render() {
    const { Component, pageProps } = this.props
    return <Component {...pageProps} {...this.state} />
  }
}