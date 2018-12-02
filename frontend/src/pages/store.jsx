import React, {Component} from 'react';

import ScatterJS from 'scatterjs-core';
import ScatterEOS from 'scatterjs-plugin-eosjs2';


import {Api, JsonRpc} from 'eosjs';
// material-ui dependencies
import { withStyles } from '@material-ui/core/styles';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import CardActions from '@material-ui/core/CardActions';
import CardMedia from '@material-ui/core/CardMedia';
import Button from '@material-ui/core/Button';
import TextField from "@material-ui/core/TextField/TextField";
import Paper from "@material-ui/core/Paper/Paper";
import Grid from '@material-ui/core/Grid';

const customWindow = window;

const styles = theme => ({
    root: {
        flexGrow: 1,
    },
    grow: {
        flexGrow: 1,
    },
    menuButton: {
        marginLeft: -12,
        marginRight: 20,
    },
    paper: {
        ...theme.mixins.gutters(),
        paddingTop: theme.spacing.unit * 2,
        paddingBottom: theme.spacing.unit * 2,
    },
});

const orderStatus = ['empty', 'updating_orders', 'waiting_for_store', 'received_by_store', 'ready_for_pickup', 'completed'];

class Store extends Component {

    network = {
        blockchain: 'eos',
        protocol: 'http',
        host: 'localhost',
        port: 8888,
        chainId: 'cf057bbfb72640471fd910bcb67639c22df9f92470936cddc1ade0e2f2e7dc4f'
    };

    connected = false;
    scatter = null;
    contract_name = 'notechainacc';
    app_name = 'eosMarket';

    constructor(props) {
        super(props);
        ScatterJS.plugins(new ScatterEOS());
        const rpc = new JsonRpc(`${this.network.protocol}://${this.network.host}:${this.network.port}`);
        this.rpc = rpc;
        this.getApi = signatureProvider => new Api({rpc, signatureProvider});
    }

    state = {
        noteTable: [],
        itemTable: [],
        profileTable: [],
        bagTable: [],
        receiptTable: [],
        currentAccount: null
    };

    async connect() {
        await ScatterJS.scatter.connect(this.app_name).then((connected) => {
            if (connected) {
                this.connected = connected;
                this.scatter = ScatterJS.scatter;
                customWindow.scatter = null;
            }
            console.log(this.connected);
        })

    }

    // login with eos account via scatter
    async login() {
        if (!this.connected) {
            console.log('not connected');
            return;
        }
        try {
            let result = await this.scatter.getIdentity({accounts: [this.network]});
            this.setState({currentAccount: result.accounts[0]}, async () => {
                console.log("login success,", this.state.currentAccount);
                // alert("login success" + JSON.stringify(this.state.currentAccount));
                const found = this.state.profileTable.filter((e) => e.account === this.state.currentAccount.name);
                if (found.length === 0) {
                    await this.createprofile();
                }
            });
        } catch (e) {
            alert("login fail");
            console.log("login fail,", e)
        }
    }

    async createprofile() {
        if (this.state.currentAccount == null) {alert("You need to login")}

        let api = this.scatter.eos(this.network, Api, {rpc: this.rpc});
        try {
            let data = {
                account: this.state.currentAccount.name,
                username: this.state.currentAccount.name.toLowerCase(),
                address: 'sdfsdf@kdfjkdf.org'
            };
            let tr = await api.transact(
                {
                    actions: [
                        {
                            account: this.contract_name,
                            name: 'createprofile',
                            authorization: [{
                                actor: this.state.currentAccount.name,
                                permission: this.state.currentAccount.authority
                            }],
                            data,
                        }
                    ]
                }, {
                    blocksBehind: 3,
                    expireSeconds: 30,
                }
            );
            console.log(tr)
        } catch (e) {
            console.log("error", e)
        }
    }

    async logout() {
        this.scatter.forgetIdentity();
        this.setState({currentAccount: null})
    }

    async handleLogin() {
        await this.connect();
        await this.login()
    }

    getItems() {
        this.rpc.get_table_rows({
            "json": true,
            "code": "notechainacc",   // contract who owns the table
            "scope": "notechainacc",  // scope of the table
            "table": "item",    // name of the table as specified by the contract abi
            "limit": 100,
        }).then(result => this.setState({ itemTable: result.rows }));
    }

    getProfiles() {
        this.rpc.get_table_rows({
            "json": true,
            "code": "notechainacc",   // contract who owns the table
            "scope": "notechainacc",  // scope of the table
            "table": "profiletable",    // name of the table as specified by the contract abi
            "limit": 100,
        }).then(result => this.setState({ profileTable: result.rows }));
    }

    getBags() {
        this.rpc.get_table_rows({
            "json": true,
            "code": "notechainacc",   // contract who owns the table
            "scope": "notechainacc",  // scope of the table
            "table": "bag",    // name of the table as specified by the contract abi
            "limit": 100,
        }).then(result => this.setState({ bagTable: result.rows }));
    }

    getReceipts() {
        this.rpc.get_table_rows({
            "json": true,
            "code": "notechainacc",   // contract who owns the table
            "scope": "notechainacc",  // scope of the table
            "table": "receipt",    // name of the table as specified by the contract abi
            "limit": 100,
        }).then(result => this.setState({ receiptTable: result.rows }));
    }

    getBalance(account) {
        this.rpc.get_currency_balance({account: account}).then(result => this.setState({balance: result}))
    }


    componentDidMount() {
        this.updateAll();
    }

    updateAll() {
        this.getItems();
        this.getProfiles();
        this.getBags();
        this.getReceipts();
    }

    async handleFormEvent(event) {
        event.preventDefault();

        if (this.state.currentAccount == null) {
            alert("You need to login");
            return null;
        }

        let commonname = event.target.commonname.value;
        let amount = event.target.amount.value;
        let count = event.target.count.value;

        let api = this.scatter.eos(this.network, Api, {rpc: this.rpc});
        try {
            let data = {
                store: this.state.currentAccount.name,
                sku: Math.floor(Math.random() * (1000000-10000) + 10000),
                commonname: commonname,
                count: count,
                amount: amount + ' SYS'
            };
            console.log(data);
            let tr = await api.transact(
                {
                    actions: [
                        {
                            account: this.contract_name,
                            name: 'createitem',
                            authorization: [{
                                actor: this.state.currentAccount.name,
                                permission: this.state.currentAccount.authority
                            }],
                            data,
                        }
                    ]
                }, {
                    blocksBehind: 3,
                    expireSeconds: 30,
                }
            );
            console.log(tr);
            this.updateAll();
        } catch (e) {
            console.log("error", e)
        }
    }

    acceptBag = (owner) => async () => {
        if (this.state.currentAccount == null) {
            alert("You need to login");
            return null;
        }


        let api = this.scatter.eos(this.network, Api, {rpc: this.rpc});
        try {
            let data = {
                owner: owner,
                store: this.state.currentAccount.name
            };
            console.log(data);
            let tr = await api.transact(
                {
                    actions: [
                        {
                            account: this.contract_name,
                            name: 'checkoutcart',
                            authorization: [{
                                actor: this.state.currentAccount.name,
                                permission: this.state.currentAccount.authority
                            }],
                            data,
                        }
                    ]
                }, {
                    blocksBehind: 3,
                    expireSeconds: 30,
                }
            );
            console.log(tr);
            this.updateAll();
        } catch (e) {
            console.log("error", e)
        }
    };

    deleteItem = (sku) => async () => {
        if (this.state.currentAccount == null) {
            alert("You need to login");
            return null;
        }


        let api = this.scatter.eos(this.network, Api, {rpc: this.rpc});
        try {
            let data = {
                sku: sku,
                store: this.state.currentAccount.name
            };
            console.log(data);
            let tr = await api.transact(
                {
                    actions: [
                        {
                            account: this.contract_name,
                            name: 'removeitem',
                            authorization: [{
                                actor: this.state.currentAccount.name,
                                permission: this.state.currentAccount.authority
                            }],
                            data,
                        }
                    ]
                }, {
                    blocksBehind: 3,
                    expireSeconds: 30,
                }
            );
            console.log(tr);
            this.updateAll();
        } catch (e) {
            console.log("error", e)
        }
    };

    render() {
        const { itemTable, bagTable, currentAccount } = this.state;
        const { classes } = this.props;

        console.log(this.state);

        const generateCardItems = (key, sku, store, amount, count, commonname) => (
            <Card key={key} style={{marginBottom: '5px'}}>
                <CardContent>
                    <Typography variant="headline" component="h2">
                        {commonname}
                    </Typography>
                    <Typography component="pre">
                        ID: {sku}
                    </Typography>
                    <Typography style={{fontSize: 13}} color="textSecondary" gutterBottom>
                        Price: <b>{amount}</b> | Count: <b>{count}</b>
                    </Typography>
                </CardContent>
                <Button size="small" color="secondary" style={{margin: '5px'}} onClick={this.deleteItem(sku)}>
                    Delete
                </Button>
            </Card>
        );

        let itemCards = itemTable.map((row, i) => generateCardItems(i, row.sku, row.store, row.amount, row.count, row.commonname));


        const generateCardBags = (key, owner, status, total, orders) => (
            <Card key={key} style={{marginBottom: '5px'}}>
                <CardContent>
                    <Typography variant="headline" component="h2">
                        Client: { owner }
                    </Typography>
                    <Typography style={{fontSize: 13}} color="textSecondary" gutterBottom>
                        Status: { orderStatus[status] }
                    </Typography>
                    <Typography component="pre">
                        Elements:
                        <ul>
                            {orders.map((row, i) => <li>{row.sku}</li>)}
                        </ul>
                    </Typography>
                    <Typography style={{fontSize: 13}} color="textSecondary" gutterBottom>
                        Price: <b>{total}</b> | Count: <b>{orders.length}</b>
                    </Typography>
                </CardContent>
                <CardActions>
                    <Button size="small" color="primary" onClick={this.acceptBag(owner)}>
                        Accept
                    </Button>
                </CardActions>
            </Card>
        );

        const acc_name = currentAccount ? currentAccount.name : null;
        let bagCards = bagTable.filter((e) => e.store === acc_name)
            .map((row, i) => generateCardBags(i, row.owner, row.status, row.total, row.orders));

        console.log(bagTable.filter(e => e.store === 'grocery'));


        return (
            <div className={classes.root}>
                <AppBar position="static" color="secondary">
                    <Toolbar>
                        <Typography variant="title" color="inherit" className={classes.grow}>
                            EOSMART SHOP {currentAccount !== null ? '- ADMIN: ' + currentAccount.name : ''}
                        </Typography>
                        { currentAccount !== null ? <Button color="inherit" onClick={this.logout.bind(this)}>Logout</Button> :
                        <Button
                            color="inherit" onClick={this.handleLogin.bind(this)}>
                            Login
                        </Button> }
                    </Toolbar>
                </AppBar>
                {
                    currentAccount !== null ?
                    <Grid container spacing={16} style={{margin: '10px'}}>
                        <Grid item xs={8}>
                            <h2>All my good</h2>
                            { itemCards }
                            <br/>
                            <Paper className={classes.paper}>
                                <form onSubmit={this.handleFormEvent.bind(this)}>
                                    <TextField
                                        name="commonname"
                                        autoComplete="off"
                                        label="Good name"
                                        margin="normal"
                                        fullWidth
                                    />
                                    <TextField
                                        name="amount"
                                        autoComplete="off"
                                        label="Amount"
                                        margin="normal"
                                        fullWidth
                                    />
                                    <TextField
                                        name="count"
                                        autoComplete="off"
                                        label="Count"
                                        margin="normal"
                                        fullWidth
                                    />
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        className={classes.formButton}
                                        type="submit">
                                        Add Item
                                    </Button>
                                </form>
                            </Paper>
                        </Grid>
                        <Grid item xs={4}>
                            <h2>My orders</h2>
                            { bagCards }
                        </Grid>
                    </Grid> :
                        <Paper elevation={1} style={{padding: '20px', margin: '8px', textAlign: 'center'}}>
                            <Typography variant="h5" component="h3">
                                Please login
                            </Typography>
                        </Paper>
                }
            </div>
        );
    }
}

export default withStyles(styles)(Store);