import React, { useReducer, useEffect, useRef, useContext } from 'react'
import Typography from '@material-ui/core/Typography'
import { useWeb3Context } from 'web3-react/hooks'

import { CookieContext } from '../contexts'
import { useContract, useWallet } from '../hooks/general'
import ResetCookie from '../components/ResetCookie'
import SendTo from '../components/SendTo'
import Logs from '../components/Logs'

const filterArguments1 = ein => [[ein]]
const filterArguments2 = ein => [[ein, null], [null, ein]]
const filterArguments3 = (ein, address) => [[ein, null], [null, address]]

const logFilterArguments = {
  SnowMoSignup:    filterArguments1,
  TransferFrom:    filterArguments2,
  WithdrawFrom:    filterArguments3,
  WithdrawFromVia: filterArguments3
}

function logsReducer (state, action) {
  switch (action.type) {
    case 'INITIALIZE': {
      const { logName, logs } = action.payload
      return { ...state, [logName]: logs }
    }
    case 'APPEND': {
      const { logName, log } = action.payload
      return { ...state, [logName]: state[logName].concat([log]) }
    }
    default:
      throw Error('No default case.')
  }
}

export default function Home ({ ein }) {
  const context = useWeb3Context()
  const cookieContext = useContext(CookieContext)
  const [logs, dispatchLogs] = useReducer(logsReducer, {})

  const wallet = useWallet()
  const snowMoResolver = useContract("SnowMoResolver")

  function initializeFilters (logName) {
    return logFilterArguments[logName](ein, wallet.address).map(filterArgument => {
      const filter = snowMoResolver.filters[logName](...filterArgument)
      filter.fromBlock = 3749195
      return filter
    })
  }

  function decodeLog (log) {
    log.decoded = snowMoResolver.interface.parseLog(log).values
    return log
  }

  // { SnowMoSignup: [...] }
  const filters = useRef(Object.keys(logFilterArguments).reduce(
    (accumulator, logName) => {
      accumulator[logName] = initializeFilters(logName)
      return accumulator
    },
    {}
  ))

  // add .on listeners to SnowMo contract for all filters
  useEffect(() => {
    Object.values(filters.current).flat().forEach(filter => {
      snowMoResolver.on(filter, (...args) => {
        const event = args[args.length - 1]
        dispatchLogs({ type: 'APPEND', payload: { logName: event.event, log: decodeLog(event) } })
      })
    })

    return () => Object.values(filters.current).flat().forEach(filter => snowMoResolver.removeListener(filter))
  }, [])

  // TODO expose this via a refresh button?
  useEffect(() => {
    Object.keys(filters.current).forEach(logName => {
      Promise.all(filters.current[logName].map(filter => context.library.getLogs(filter)))
        .then(logs => dispatchLogs({
          type: 'INITIALIZE', payload: { logName, logs: logs.flat().map(log => decodeLog(log)) }
        }))
    })
  }, [])

  // on the (very) off chance the wallet has an EIN but no SnowMoSignup event, clear their wallet
  useEffect(() => {
    if (logs.SnowMoSignup && logs.SnowMoSignup.length === 0)
      cookieContext.resetCookie()
  }, [logs.SnowMoSignup])

  return (
    <>
      <Typography>Your EIN: {ein}</Typography>
      <SendTo ein={ein} />
      <Logs logs={logs} logNames={Object.keys(logFilterArguments)} />
      <ResetCookie />
    </>
  )
}
