import React, { Fragment, useEffect } from 'react'
import Web3Provider from 'web3-react'
import { InfuraConnector } from 'web3-react/connectors'
import { useWeb3Context } from 'web3-react/hooks'
import { CookiesProvider, withCookies } from 'react-cookie'
import { ethers } from 'ethers'

import { cookieName, CookieContext } from './contexts'
import { useInitializeCookie } from './hooks/cookies'
import { useEIN } from './hooks/general'

import Landing from './pages/Landing'
import Home from './pages/Home'

const infura = new InfuraConnector({ providerURL: process.env.REACT_APP_INFURA_URL })
const connectors = { infura }

if (process.env.NODE_ENV === 'production')
  ethers.errors.setLogLevel("error")
else
  ethers.errors.setLogLevel("error")

function _Initializer ({ children, cookies }) {
  const context = useWeb3Context()
  const [cookieInitialized, cookieValue, resetCookie] = useInitializeCookie(cookies)

  // set up connector one-time
  useEffect(() => {
    context.setConnector('infura').catch(e => console.error('Error initializing Infura.', e))
  }, [])

  return !(cookieInitialized && context.active) ? null : (
    <CookieContext.Provider
      value={{
        [cookieName]: cookieValue,
        resetCookie: resetCookie
      }}
    >
      <CookieContext.Consumer>
        {context =>
          <Fragment key={context[cookieName]}>
            {children}
          </Fragment>
        }
      </CookieContext.Consumer>
    </CookieContext.Provider>
  )
}

const Initializer = withCookies(_Initializer)

function Router () {
  const [ein, reFetchEIN] = useEIN()

  if (ein === undefined) return null
  if (ein === null) return <Landing reFetchEIN={reFetchEIN} />
  return <Home ein={ein} />
}

export default function App () {
  return (
    <Web3Provider connectors={connectors} libraryName="ethers.js">
      <CookiesProvider>
        <Initializer>
          <Router />
        </Initializer>
      </CookiesProvider>
    </Web3Provider>
  )
}
