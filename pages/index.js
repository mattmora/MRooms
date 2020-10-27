import { Component } from 'react'
import Head from 'next/head'
import { withRouter } from 'next/router'

import Layout, { siteTitle } from '../components/layout'
import utilStyles from '../styles/utils.module.css'
import { TextField } from '@material-ui/core'

class Index extends Component {
    constructor(props) {
        super(props)

        this.state = {
            roomField: ''
        }
    }

    handleChange = (e) => {
        this.state[e.target.id] = e.target.value
    }

    handleKeyPress = (e) => {
        console.log(`Pressed keyCode ${e.key}`)

        const { router } = this.props

        if (e.key === 'Enter') {
            // Go to the room page
            router.push({
                pathname: '/room',
                query: {
                    id: this.state.roomField
                }
            })

            e.preventDefault()
        }
    }

    render() {
        return (
            <Layout home>
                <Head>
                    <title>{siteTitle}</title>
                </Head>
                <section className={utilStyles.headingMd}>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <TextField
                            id="roomField"
                            label="Room"
                            variant="outlined"
                            onChange={this.handleChange}
                            onKeyPress={this.handleKeyPress}
                        />
                    </div>
                </section>
            </Layout>
        )
    }
}

export default withRouter(Index)
