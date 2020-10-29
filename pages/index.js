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
import Card from '@material-ui/core/Card'
import CardContent from '@material-ui/core/CardContent'
import CardMedia from '@material-ui/core/CardMedia'
import Typography from '@material-ui/core/Typography'
import Divider from '@material-ui/core/Divider'

class Index extends Component {
    constructor(props) {
        super(props)

        this.state = {
            room: '',
            username: '',
            autoconnect: true
        }
    }

    handleChange = (e) => {
        if (e.target.id === 'autoconnect') {
            console.log(e.target.checked)
            this.state[e.target.id] = e.target.checked
        } else {
            this.state[e.target.id] = e.target.value
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
        if (!this.state.room) return
        if (!this.state.username) return
        const { router } = this.props
        // Go to the room page
        router.push({
            pathname: '/room',
            query: {
                id: this.state.room,
                username: this.state.username,
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

                <Divider />
                <p></p>
                <Grid container spacing={1} direction="column" alignItems="center" justify="center">
                    <Grid item xs="auto">
                        <Grid container spacing={1} direction="column" alignItems="center" justify="center">
                            <Grid item xs="auto">
                                <TextField
                                    id="room"
                                    label="Room"
                                    variant="outlined"
                                    fullWidth={true}
                                    onChange={this.handleChange}
                                    onKeyPress={this.handleKeyPress}
                                />
                            </Grid>
                            <Grid item xs="auto">
                                <TextField
                                    id="username"
                                    label="Username"
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
                    <Grid item xs={6}>
                        <Card>
                            <CardContent>
                                <Typography gutterBottom variant="h5" component="h2">
                                    How to use with Max:
                                </Typography>
                                <Typography
                                    gutterBottom
                                    variant="body2"
                                    color="textSecondary"
                                    component="p"
                                >
                                    UtilOSC can connect with Max through the mira.channel object
                                    from the Max package{' '}
                                    <a href="https://github.com/Cycling74/miraweb">MiraWeb</a>.
                                </Typography>
                                <Typography variant="body2" color="textSecondary" component="p">
                                    Below is a minimal patch that can send, receive, and format
                                    messages. Note that a mira.frame object is required because it
                                    creates a WebSocket server for UtilOSC to connect to.
                                </Typography>
                            </CardContent>
                            <CardMedia
                                component="img"
                                alt="Example Max Patch"
                                image="./images/examplepatch.png"
                                title="Example Max Patch"
                            />
                        </Card>
                    </Grid>
                </Grid>
                <p></p>
                <Divider />
                <p></p>
                <Grid container spacing={1} direction="column" alignItems="center" justify="center">
                    <Grid item xs={6}>
                        <Typography>
                            <a href="https://github.com/mattmora/UtilOSC">Github</a>
                        </Typography>
                        <p></p>
                    </Grid>
                </Grid>
            </Layout>
        )
    }
}

export default withRouter(Index)
