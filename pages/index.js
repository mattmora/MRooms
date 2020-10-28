import { Component } from 'react'
import Head from 'next/head'
import { withRouter } from 'next/router'

import Layout, { siteTitle } from '../components/layout'
import utilStyles from '../styles/utils.module.css'
import TextField from '@material-ui/core/TextField'
import FormControlLabel from '@material-ui/core/FormControlLabel'
import Checkbox from '@material-ui/core/Checkbox'
import Grid from '@material-ui/core/Grid'
import Button from '@material-ui/core/Button'

class Index extends Component {
    constructor(props) {
        super(props)

        this.state = {
            roomField: '',
            autoconnect: true
        }
    }

    handleChange = (e) => {
        if (e.target.id === 'roomField') {
            this.state[e.target.id] = e.target.value
        } else if (e.target.id === 'autoconnect') {
            console.log(e.target.checked)
            this.state[e.target.id] = e.target.checked
        }
    }

    handleKeyPress = (e) => {
        console.log(`Pressed keyCode ${e.key}`)

        if (e.key === 'Enter') {
            this.enterRoom()
            e.preventDefault()
        }
    }

    enterRoom() {
        if (!this.state.roomField) return
        const { router } = this.props
        // Go to the room page
        router.push({
            pathname: '/room',
            query: {
                id: this.state.roomField,
                autoconnect: this.state.autoconnect
            }
        })
    }

    render() {
        return (
            <Layout home>
                <Head>
                    <title>{siteTitle}</title>
                </Head>
                <section className={utilStyles.headingMd}>
                    <Grid
                        container
                        spacing={1}
                        direction="column"
                        alignItems="center"
                        justify="center"
                    >
                        <Grid item xs="auto">
                            <Grid container spacing={1} alignItems="center" justify="center">
                                <Grid item xs={8}>
                                    <TextField
                                        id="roomField"
                                        label="Room"
                                        variant="outlined"
                                        fullWidth={true}
                                        onChange={this.handleChange}
                                        onKeyPress={this.handleKeyPress}
                                    />
                                </Grid>
                                <Grid item xs="auto">
                                    <Button
                                        id="enterButton"
                                        variant="outlined"
                                        color="primary"
                                        size="large"
                                        fullWidth={true}
                                        onClick={() => {
                                            this.enterRoom()
                                        }}
                                    >
                                        Enter
                                    </Button>
                                </Grid>
                            </Grid>
                        </Grid>
                        <Grid item xs="auto">
                            <Grid container spacing={1} alignItems="center" justify="center">
                                <Grid item xs="auto">
                                    <FormControlLabel
                                        label="Automatically attempt to connect to local server"
                                        labelPlacement="end"
                                        control={
                                            <Checkbox
                                                id="autoconnect"
                                                color="primary"
                                                defaultChecked
                                                onChange={this.handleChange}
                                            />
                                        }
                                    />
                                </Grid>
                            </Grid>
                        </Grid>
                    </Grid>
                </section>
            </Layout>
        )
    }
}

export default withRouter(Index)
