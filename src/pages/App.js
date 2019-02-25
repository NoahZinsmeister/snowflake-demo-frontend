import React, { useEffect } from 'react'
import Web3Provider, { Connectors, useWeb3Context } from 'web3-react'
import { BrowserRouter as Router, Switch, Route, Redirect } from 'react-router-dom'
import { ethers } from 'ethers'
import { createMuiTheme } from "@material-ui/core/styles";
import { ThemeProvider } from "@material-ui/styles";
import Typography from '@material-ui/core/Typography';

import { useEIN, useWallet, useLocalStorageObject } from '../hooks'
import Splash from '../components/Splash'
import Intro from './Intro'
import Recover from './Recover'
import Home from './Home'
import Onboarding from './Onboarding'

const infura = new Connectors.NetworkOnlyConnector({ providerURL: process.env.REACT_APP_INFURA_URL })
const connectors = { infura }

const theme = createMuiTheme({ typography: { useNextVariants: true } });

const localStorageKey = "SnowMo"
const localStorageKeys = [
  'Wallet',
  'StepCompleted',
  'CreationTransactionHash',
  'CurrentTransactionHash'
].reduce((accumulator, currentValue) => {
  accumulator[currentValue] = currentValue
  return accumulator
}, {})

if (process.env.NODE_ENV === 'production')
  ethers.errors.setLogLevel("error")
else
  ethers.errors.setLogLevel("error")

function Initializer () {
  const context = useWeb3Context()

  // keep track of the localstorage wallet
  const [localStorageState, setLocalStorageState, removeLocalStorageState] = useLocalStorageObject(
    localStorageKey, Object.keys(localStorageKeys)
  )
  
  function setPrivateKeyAndCreationTransactionHash(privateKey, creationTransactionHash, stepCompleted) {
    setLocalStorageState({
      [localStorageKeys.Wallet]: privateKey,
      [localStorageKeys.CreationTransactionHash]: creationTransactionHash,
      [localStorageKeys.StepCompleted]: stepCompleted
    })
  }

  function setStepCompleted(stepCompleted) {
    setLocalStorageState({ [localStorageKeys.StepCompleted]: stepCompleted })
  }

  function resetDemo () {
    removeLocalStorageState(Object.keys(localStorageKeys))
  }

  function setCurrentTransactionHash(currentTransactionHash) {
    setLocalStorageState({ [localStorageKeys.CurrentTransactionHash]: currentTransactionHash })
  }

  function removeCurrentTransactionHash() {
    removeLocalStorageState([localStorageKeys.CurrentTransactionHash])
  }

  const {
    Wallet: privateKey,
    StepCompleted: stepCompleted,
    CreationTransactionHash: creationTransactionHash,
    CurrentTransactionHash: currentTransactionHash
  } = localStorageState

  const wallet = useWallet(privateKey)
  const [ein, reFetchEIN] = useEIN(wallet)

  // this exists so that when step 2 is completed, EIN is re-fetched
  useEffect(() => {
    if (stepCompleted === 2) {
      reFetchEIN()
    }
  }, [stepCompleted])

  // set up connector one-time
  // TODO add some basic error display here, just in case infura is unavailable
  useEffect(() => {
    context.setConnector('infura', true).catch(e => console.error('Error initializing Infura.', e))
  }, [])

  // if a wallet exists, we have to wait to see if they have an EIN
  // TODO also add the ability here to detect a pending transaction, if the user refreshed post-tx but pre-confirm
  if (wallet && (!context.active || ein === undefined)) return null

  return (
    <Router basename={process.env.PUBLIC_URL}>
      <Switch>
        <Route path = '*' render={() => {
          return (
            <Splash>
              <Typography>SnowMo is currently undergoing maintenance, please check back soon!</Typography>
            </Splash>
          )
        }}>
        </Route>
        <Route
          exact
          path="/"
          render={({ location }) => {
            const { activeStep } = location.state || {}

            if (wallet && ein && stepCompleted === 2) return <Redirect to='/wallet' />
            if ((Number.isInteger(activeStep) && Number.isInteger(stepCompleted)) || Number.isInteger(stepCompleted))
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

            if (wallet && ein && stepCompleted === 2) return <Redirect to='/wallet' />
            else if (!Number.isInteger(activeStep) && !activeStep === 0) return <Redirect to='/' />
            else return (
              <Splash>
                <Onboarding
                  activeStep={Number.isInteger(activeStep) ? activeStep : stepCompleted} // this is the current step
                  stepCompleted={stepCompleted}
                  setStepCompleted={setStepCompleted}
                  wallet={wallet}
                  creationTransactionHash={creationTransactionHash}
                  setPrivateKeyAndCreationTransactionHash={setPrivateKeyAndCreationTransactionHash}
                  reFetchEIN={reFetchEIN}
                />
              </Splash>
            )
          }}
        />
        <Route path="/wallet"
          render={({ location }) => {
            const { fromRecovery } = location.state || {}

            if (fromRecovery && !ein) return null
            if (!(wallet && ein && stepCompleted === 2)) return <Redirect to='/' />
            else return (
              <Home
                wallet={wallet} ein={ein}
                creationTransactionHash={creationTransactionHash}
                currentTransactionHash={currentTransactionHash}
                setCurrentTransactionHash={setCurrentTransactionHash}
                removeCurrentTransactionHash={removeCurrentTransactionHash}
                resetDemo={resetDemo}
                tab='wallet'
              />
            )
          }}
        />
        <Route path="/store"
          render={() => {
            if (!(wallet && ein && stepCompleted === 2)) return <Redirect to='/' />
            else return (
              <Home
                wallet={wallet} ein={ein}
                creationTransactionHash={creationTransactionHash}
                currentTransactionHash={currentTransactionHash}
                setCurrentTransactionHash={setCurrentTransactionHash}
                removeCurrentTransactionHash={removeCurrentTransactionHash}
                resetDemo={resetDemo}
                tab='store'
              />
            )
          }}
        />
        <Route
          path="/recover"
          render={() => {
            if (privateKey) return <Redirect to={{ pathname: '/wallet', state: { fromRecovery: true } }} />

            return (
              <Splash>
                <Recover setPrivateKeyAndCreationTransactionHash={setPrivateKeyAndCreationTransactionHash} />
              </Splash>
            )
          }}
        />
        <Redirect to='/' />
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
