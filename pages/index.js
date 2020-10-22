import { Component } from 'react'
import Head from 'next/head'
import { withRouter } from 'next/router'

import Layout, { siteTitle } from '../components/layout'
import utilStyles from '../styles/utils.module.css'
import TextField from '@material-ui/core/TextField'

class Index extends Component {

  constructor(props) {
    super(props)

    this.state = {
      roomInput: ''
    }
  }

  static async getInitialProps(context) {
    let query = context.query
    return {query}
  }

  handleChange = (e) => {
    const { target: { value } } = e
    this.state.roomInput = value
  }

  catchReturn = (e) => {
    console.log(`Pressed keyCode ${e.key}`);

    const { router } = this.props;

    if (e.key === 'Enter') {
      router.push({
        pathname: '/posts/first-post',
        query: { name: this.state.roomInput }
      })
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
          <p>{this.props.message}</p>
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