import { Component } from 'react'
import Typography from '@material-ui/core/Typography'

export default class TransportTime extends Component {
    constructor(props) {
        super(props)

        this.state = {
            timer: null,
            time: 0
        }
    }

    componentDidMount() {
        this.state.timer = setInterval(() => {
            this.setState({
                time: this.getTransportTime()
            })
        }, this.props.updateInterval)
    }

    componentWillUnmount() {
        clearInterval(this.state.timer)
    }

    getTransportTime() {
        const { clientEngine } = this.props.room
        if (clientEngine !== null) {
            if (clientEngine.syncClient !== null)
                return Number.parseFloat(clientEngine.syncClient.getSyncTime()).toFixed(3)
        }
        return '-'
    }

    render() {
        return <Typography>Synchronized transport time: {this.state.time}</Typography>
    }
}
