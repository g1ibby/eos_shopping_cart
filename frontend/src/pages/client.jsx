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
import Grid from '@material-ui/core/Grid';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';

const customWindow = window;

const styles = {
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
};

class Client extends Component {

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

    async sayHello() {
        if (this.state.currentAccount == null) {
            await this.handleLogin();
        }

        let api = this.scatter.eos(this.network, Api, {rpc: this.rpc});
        try {
            let data = {
                user: this.state.currentAccount.name
            };
            let tr = await api.transact(
                {
                    actions: [
                        {
                            account: this.contract_name,
                            name: 'hi',
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

    async createcart(store) {
        if (this.state.currentAccount == null) {
            alert("You need to login");
            return null;
        }

        let api = this.scatter.eos(this.network, Api, {rpc: this.rpc});
        try {
            let data = {
                owner: this.state.currentAccount.name,
                store: store,
                title: 'bag1'
            };
            let tr = await api.transact(
                {
                    actions: [
                        {
                            account: this.contract_name,
                            name: 'createcart',
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

    addtocart = (store, sku) => async () =>  {
        if (this.state.currentAccount == null) {
            alert("You need to login");
            return null;
        }

        const found = this.state.bagTable.filter(e => e.store === store && e.owner === this.state.currentAccount.name);
        if (found.length === 0) {
            await this.createcart(store);
        }

        let api = this.scatter.eos(this.network, Api, {rpc: this.rpc});
        try {
            let data = {
                owner: this.state.currentAccount.name,
                sku: sku,
                count: 1
            };
            let tr = await api.transact(
                {
                    actions: [
                        {
                            account: this.contract_name,
                            name: 'addtocart',
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

    completeBag = (owner) => async () => {
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

    render() {
        const { itemTable, currentAccount, bagTable } = this.state;
        const { classes } = this.props;

        console.log(this.state);

        const generateCardItems = (key, store, amount, count, commonname, sku) => (
            <Card key={key} style={{marginBottom: '5px'}}>
                <CardContent>
                    <Typography variant="headline" component="h2">
                        {commonname}
                    </Typography>
                    <Typography style={{fontSize: 12}} color="textSecondary" gutterBottom>
                        {amount} - {count}
                    </Typography>
                    <Typography component="pre">
                        {store}
                    </Typography>
                </CardContent>
                <CardActions>
                    {currentAccount !== null ? <Button size="small" color="primary" onClick={this.addtocart(store, sku)}>
                        Buy
                    </Button> : null}

                </CardActions>
            </Card>
        );

        let itemCards = itemTable.map((row, i) => generateCardItems(i, row.store, row.amount, row.count, row.commonname, row.sku));


        let rows = [];
        let totalAmount = 0;
        if (currentAccount !== null) {
            const foundBags = bagTable.filter(e => e.owner === currentAccount.name);
            if (foundBags.length !== 0) {
                foundBags[0].orders.forEach(el => {
                    const item = itemTable.filter(e => e.sku === el.sku)[0];
                    rows.push({item: item, count: el.count})
                })
            }
            totalAmount = foundBags[0].total;
        }

        console.log(rows);

        return (
            <div className={classes.root}>
                <AppBar position="static" color="primary">
                    <Toolbar>
                        <Typography variant="title" color="inherit" className={classes.grow}>
                            EOSMART SHOP {currentAccount !== null ? '- CLIENT: ' + currentAccount.name : ''}
                        </Typography>
                        { currentAccount !== null ? <Button color="inherit" onClick={this.logout.bind(this)}>Logout</Button> :
                        <Button
                            color="inherit" onClick={this.handleLogin.bind(this)}>
                            Login
                        </Button> }
                    </Toolbar>
                </AppBar>

                <Grid container spacing={16} style={{margin: '10px'}}>
                    <Grid item xs={8}>
                        <h2>Products</h2>
                        { itemCards }
                    </Grid>
                    {
                        currentAccount !== null ?
                            <Grid>
                                <h2>My order</h2>
                                <Table className={classes.table}>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Product</TableCell>
                                            <TableCell numeric>Count</TableCell>
                                            <TableCell numeric>Price</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {rows.map(row => {
                                            return (
                                                <TableRow key={row.item.sku}>
                                                    <TableCell>{row.item.commonname}</TableCell>
                                                    <TableCell>{row.count}</TableCell>
                                                    <TableCell>{row.item.amount}</TableCell>
                                                </TableRow>
                                            );
                                        })}
                                        <TableRow>
                                            <TableCell colSpan={2}>Total</TableCell>
                                            <TableCell numeric>{totalAmount}</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                                <CardActions>
                                    <Button size="small" color="primary" onClick={this.completeBag(currentAccount.name)}>
                                        Complete Bag
                                    </Button>
                                </CardActions>
                            </Grid> : null
                    }
                </Grid>
            </div>
        );
    }
}

export default withStyles(styles)(Client);