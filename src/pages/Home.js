import React, { useReducer, useEffect, useRef } from 'react'
import Typography from '@material-ui/core/Typography'
import { makeStyles } from '@material-ui/styles';
import { useWeb3Context } from 'web3-react/hooks'

import { useContract } from '../hooks/general'
import ResetCookie from '../components/ResetCookie'
import SendTo from '../components/SendTo'
import Logs from '../components/Logs'

const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    width: '100%',
    minHeight: '100%'
  },
  wrapper: {
    margin: '2em',
    padding: '2em',
    borderRadius: '2em',
    backgroundColor: theme.palette.grey[200],
    width: '80%'
  },
  noDecoration: {
    color: 'inherit'
  },
  flex: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '1em'
  }
}))

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

export default function Home ({ wallet, resetWalletCookie, ein }) {
  const classes = useStyles()
  const context = useWeb3Context()
  const [logs, dispatchLogs] = useReducer(logsReducer, {})

  const snowMoResolver = useContract("SnowMoResolver")

  function initializeFilters (logName) {
    return logFilterArguments[logName](ein, wallet.address).map(filterArgument => {
      const filter = snowMoResolver.filters[logName](...filterArgument)
      filter.fromBlock = 3749195
      return filter
    })
  }

  async function augmentLog (log) {
    const timestamp = await context.library.getBlock(log.blockNumber)
      .then(({ timestamp }) => timestamp)
    log.decoded = snowMoResolver.interface.parseLog(log).values
    log.timestamp = timestamp
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
      snowMoResolver.on(filter, async (...args) => {
        const log = args[args.length - 1]
        const augmentedLog = await augmentLog(log)
        dispatchLogs({ type: 'APPEND', payload: { logName: log.event, log: augmentedLog } })
      })
    })

    return () => Object.values(filters.current).flat().forEach(filter => snowMoResolver.removeListener(filter))
  }, [])

  // TODO expose this via a refresh button?
  useEffect(() => {
    Object.keys(filters.current).forEach(logName => {
      Promise.all(filters.current[logName].map(filter => context.library.getLogs(filter)))
        .then(async (logs) => {
          const augmentedLogs = await Promise.all(logs.flat().map(log => augmentLog(log)))
          dispatchLogs({ type: 'INITIALIZE', payload: { logName, logs: augmentedLogs } })
        })
    })
  }, [])

  // on the (very) off chance the wallet has an EIN but no SnowMoSignup event, clear their wallet
  useEffect(() => {
    if (logs.SnowMoSignup && logs.SnowMoSignup.length === 0)
      resetWalletCookie()
  }, [logs.SnowMoSignup])

  return (
    <div className={classes.root}>
      <div className={classes.wrapper}>
      <Typography>Your EIN: {ein}</Typography>
      <SendTo wallet={wallet} ein={ein} />
      <Logs logs={logs} logNames={Object.keys(logFilterArguments)} />
      <ResetCookie resetWalletCookie={resetWalletCookie} />
      </div>
    </div>
  )
}
