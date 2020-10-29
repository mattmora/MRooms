import { Component } from 'react'
import FormControlLabel from '@material-ui/core/FormControlLabel'
import Checkbox from '@material-ui/core/Checkbox'
import ListItem from '@material-ui/core/ListItem'
import ListItemText from '@material-ui/core/ListItemText'
import { FixedSizeList } from 'react-window'
import Grid from '@material-ui/core/Grid'

export default class UserList extends Component {
    constructor(props) {
        super(props)
    }

    componentDidMount() {}

    componentWillUnmount() {}

    handleChange = (e) => {
        const { userFilters } = this.props.room.state
        if (e.target.id.startsWith('send-')) {
            console.log('Send checked')
            userFilters[e.target.id.slice(5)].send = e.target.checked
        } else if (e.target.id.startsWith('receive-')) {
            userFilters[e.target.id.slice(8)].receive = e.target.checked
        }
    }

    render() {
        const { users, userFilters } = this.props.room.state
        return (
            <FixedSizeList {...users} height={200} itemSize={40} itemCount={users.length}>
                {({ index, style }) => (
                    <ListItem style={style} key={index}>
                        <Grid container alignItems="center">
                            <Grid item xs={6}>
                                <ListItemText primary={users[index]} />
                            </Grid>
                            <Grid item xs="auto">
                                <FormControlLabel
                                    label="S"
                                    labelPlacement="start"
                                    control={
                                        <Checkbox
                                            id={`send-${users[index]}`}
                                            color="primary"
                                            defaultChecked={userFilters[users[index]] ? Boolean(userFilters[users[index]].send) : true}
                                            onChange={this.handleChange}
                                        />
                                    }
                                />
                            </Grid>
                            <Grid item xs="auto">
                                <FormControlLabel
                                    label="R"
                                    labelPlacement="start"
                                    control={
                                        <Checkbox
                                            id={`receive-${users[index]}`}
                                            color="primary"
                                            defaultChecked={userFilters[users[index]] ? Boolean(userFilters[users[index]].receive) : true}
                                            onChange={this.handleChange}
                                        />
                                    }
                                />
                            </Grid>
                        </Grid>
                    </ListItem>
                )}
            </FixedSizeList>
        )
    }
}
