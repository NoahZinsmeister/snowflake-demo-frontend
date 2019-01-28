import React, { Fragment, useState, useEffect } from 'react'
import Web3Provider from 'web3-react'
import { InfuraConnector } from 'web3-react/connectors'
import { useWeb3Context } from 'web3-react/hooks'
import { CookiesProvider, withCookies } from 'react-cookie'
import { ethers } from 'ethers'
import { useWalletCookie } from './hooks/cookies'
import { useEIN } from './hooks/general'
import { createMuiTheme } from "@material-ui/core/styles";
import { ThemeProvider } from "@material-ui/styles";

import Landing from './pages/Landing'
import Home from './pages/Home'

const infura = new InfuraConnector({ providerURL: process.env.REACT_APP_INFURA_URL })
const connectors = { infura }

const theme = createMuiTheme({ typography: { useNextVariants: true } });

if (process.env.NODE_ENV === 'production')
  ethers.errors.setLogLevel("error")
else
  ethers.errors.setLogLevel("error")

  function EINRouter ({ wallet, resetWalletCookie }) {
    const [ein, reFetchEIN] = useEIN(wallet)

    if (ein === undefined) return null
    if (ein === null) return <Landing wallet={wallet} reFetchEIN={reFetchEIN} />
    return <Home wallet={wallet} resetWalletCookie={resetWalletCookie} ein={ein} />
  }

function _Initializer ({ children, cookies }) {
  const context = useWeb3Context()
  const [privateKey, resetWalletCookie] = useWalletCookie(cookies)
  const [wallet, setWallet] = useState()

  // set up connector one-time
  useEffect(() => { context.setConnector('infura').catch(e => console.error('Error initializing Infura.', e)) }, [])

  // initialize wallet
  useEffect(() => {
    if (privateKey)
      setWallet(new ethers.Wallet(privateKey))
  }, [privateKey])

  // await web3-react and wallet cookie initialization
  if (!context.active || !wallet) return null

  return (
    <Fragment key={wallet}>
      <EINRouter wallet={wallet} resetWalletCookie={resetWalletCookie} />
    </Fragment>
  )
}

const Initializer = withCookies(_Initializer)

export default function App () {
  return (
    <Web3Provider connectors={connectors} libraryName="ethers.js">
      <CookiesProvider>
        <ThemeProvider theme={theme}>
          <Initializer />
        </ThemeProvider>
      </CookiesProvider>
    </Web3Provider>
  )
}
