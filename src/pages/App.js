import React, { useEffect } from 'react'
import Web3Provider, { Connectors, useWeb3Context } from 'web3-react'
import { BrowserRouter as Router, Switch, Route, Redirect } from 'react-router-dom'
import { ethers } from 'ethers'
import { createMuiTheme } from "@material-ui/core/styles";
import { ThemeProvider } from "@material-ui/styles";

import { useEIN, useWallet, useLocalStorage } from '../hooks'
import Splash from '../components/Splash'
import Intro from './Intro'
import Home from './Home'
import Onboarding from './Onboarding'

const infura = new Connectors.NetworkOnlyConnector({ providerURL: process.env.REACT_APP_INFURA_URL })
const connectors = { infura }

const theme = createMuiTheme({ typography: { useNextVariants: true } });

const localStorageKeys = {
  wallet: 'SnowMoWallet',
  stepCompleted: 'SnowMoStepCompleted',
  creationTransactionHash: 'SnowMoCreationTransactionHash',
  currentTransactionHash: 'SnowMoCurrentTransactionHash'
}

if (process.env.NODE_ENV === 'production')
  ethers.errors.setLogLevel("error")
else
  ethers.errors.setLogLevel("error")

function Initializer () {
  const context = useWeb3Context()

  // keep track of the localstorage wallet
  const [privateKey, setPrivateKey, removePrivateKey] = useLocalStorage(localStorageKeys.wallet)
  const wallet = useWallet(privateKey)
  const [ein, reFetchEIN] = useEIN(wallet)

  // set up connector one-time
  // TODO add some basic error display here, just in case infura is unavailable
  useEffect(() => {
    context.setConnector('infura', true).catch(e => console.error('Error initializing Infura.', e))
  }, [])

  // use localStorage to store the currently completed onboarding step, creation transaction hash, and any ongoing tx
  const [stepCompleted, setStepCompleted, removeStepCompleted] = useLocalStorage(
    localStorageKeys.stepCompleted, value => Number(value)
  )
  const [creationTransactionHash, setCreationTransactionHash, removeCreationTransactionHash] = useLocalStorage(localStorageKeys.creationTransactionHash)
  const [currentTransactionHash, setCurrentTransactionHash, removeCurrentTransactionHash] = useLocalStorage(
    localStorageKeys.currentTransactionHash
  )

  // if a wallet exists, we have to wait to see if they have an EIN
  // TODO also add the ability here to detect a pending transaction, if the user refreshed post-tx but pre-confirm
  if (wallet && (!context.active || ein === undefined)) return null

  return (
    <Router basename={process.env.PUBLIC_URL}>
      <Switch>
        <Route
          exact
          path="/"
          render={({ location }) => {
            const { activeStep } = location.state || {}

            if (wallet && ein && stepCompleted === 2) return <Redirect to='/home' />
            if (Number.isInteger(activeStep) || Number.isInteger(stepCompleted))
              return <Redirect to={{ pathname: '/start', state: { activeStep: activeStep || stepCompleted + 1 } }} />
            else return (
              <Splash>
                <Intro />
              </Splash>
            )
          }}
        />
        <Route
          path="/start"
          render={({ location }) => {
            const { activeStep } = location.state || {}

            if (wallet && ein && stepCompleted === 2) return <Redirect to='/home' />
            else if (!Number.isInteger(activeStep) && !Number.isInteger(stepCompleted)) return <Redirect to='/' />
            else return (
              <Splash>
                <Onboarding
                  activeStep={Number.isInteger(activeStep) ? activeStep : stepCompleted} // this is the current step
                  stepCompleted={stepCompleted}
                  setStepCompleted={setStepCompleted}
                  setPrivateKey={setPrivateKey}
                  wallet={wallet}
                  creationTransactionHash={creationTransactionHash}
                  setCreationTransactionHash={setCreationTransactionHash}
                  reFetchEIN={reFetchEIN}
                />
              </Splash>
            )
          }}
        />
        <Route path="/home"
          render={() => {
            if (!(wallet && ein && stepCompleted === 2)) return <Redirect to='/' />
            else return (
              <Home
                wallet={wallet} ein={ein}
                creationTransactionHash={creationTransactionHash}
                currentTransactionHash={currentTransactionHash}
                setCurrentTransactionHash={setCurrentTransactionHash}
                removeCurrentTransactionHash={removeCurrentTransactionHash}
                removeStepCompleted={removeStepCompleted}
                removeCreationTransactionHash={removeCreationTransactionHash}
                removePrivateKey={removePrivateKey}
                />
            )
          }}
        />
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
