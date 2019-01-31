import React, { useEffect } from 'react'
import Web3Provider from 'web3-react'
import { InfuraConnector } from 'web3-react/connectors'
import { useWeb3Context } from 'web3-react/hooks'
import { BrowserRouter as Router, Switch, Route, Redirect } from 'react-router-dom'
import { ethers } from 'ethers'
import { createMuiTheme } from "@material-ui/core/styles";
import { ThemeProvider } from "@material-ui/styles";

import { useLocalEIN } from './hooks/general'
import { useLocalWalletManager, useWallet } from './hooks/localStorage'
import Splash from './components/Splash'
import Intro from './components/Intro'
import Home from './pages/Home'
import Onboarding from './components/Onboarding'

const infura = new InfuraConnector({ providerURL: process.env.REACT_APP_INFURA_URL })
const connectors = { infura }

const theme = createMuiTheme({ typography: { useNextVariants: true } });

if (process.env.NODE_ENV === 'production')
  ethers.errors.setLogLevel("error")
else
  ethers.errors.setLogLevel("error")

function Initializer ({ children, cookies }) {
  const context = useWeb3Context()
  const { privateKey, setPrivateKey, removePrivateKey } = useLocalWalletManager()
  const wallet = useWallet(privateKey)

  // ein logic
  const [ein, reFetchEIN] = useLocalEIN(wallet)

  // set up connector one-time
  useEffect(() => { context.setConnector('infura').catch(e => console.error('Error initializing Infura.', e)) }, [])

  // if a wallet exists, we have to wait until the web3 context is active and see if they have an EIN
  // TODO also add the ability here to detect a pending transaction, if the user refreshed post-tx but pre-confirm
  if (wallet && (!context.active || ein === undefined)) return null

  return (
    <Router basename={process.env.PUBLIC_URL}>
      <Switch>
        <Route exact path="/"
          render={({ location }) => {
            const { activeStep } = location.state || {}

            if (wallet && ein) return <Redirect to='/home' />
            else if (activeStep) return <Redirect to='/start' />
            else return (
              <Splash>
                <Intro />
              </Splash>
            )
          }}
        />
        <Route path="/start"
          render={({ location }) => {
            const { activeStep } = location.state || {}
            if (activeStep === undefined) return <Redirect to='/' />
            if (wallet && ein) return <Redirect to='/home' />

            return (
              <Splash>
                <Onboarding reFetchEIN={reFetchEIN} setPrivateKey={setPrivateKey} />
              </Splash>
            )
          }}
        />
        <Route path="/home"
          render={({ location }) => {
            if (!(wallet && ein)) return <Redirect to='/' />

            return (
              <Home wallet={wallet} ein={ein} removePrivateKey={removePrivateKey} />
            )
          }}
        />
        <Redirect to="/" />
      </Switch>
    </Router>
  )
}

export default function App () {
  return (
    <Web3Provider connectors={connectors} libraryName="ethers.js">
      <ThemeProvider theme={theme}>
        <Initializer />
      </ThemeProvider>
    </Web3Provider>
  )
}
