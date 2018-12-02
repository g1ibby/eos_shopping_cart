import * as React from "react"
import { Switch, Route } from "react-router-dom"
import Index from './pages/index';
import Client from './pages/client';
import Store from './pages/store';

export default class App extends React.Component {
    render() {
        return (
            <Switch>
                <React.Fragment>
                    <Route path="/" exact component={Index} />
                    <Route path="/client" exact component={Client} />
                    <Route path="/store" exact component={Store} />
                </React.Fragment>
            </Switch>
        );
    }
}