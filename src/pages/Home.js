import React, { useState, useReducer, useEffect, useRef } from 'react'
import { makeStyles } from '@material-ui/styles';
import { useWeb3Context } from 'web3-react/hooks'
import { toDecimal } from 'web3-react/utilities'
import { useNetworkEffect } from 'web3-react/hooks'

import { useContract } from '../hooks/general'
import Header from '../components/Header'
import SendTo from '../components/SendTo'
import Logs from '../components/Logs'

const useStyles = makeStyles(theme => ({
  wrapper: {
    margin: 'auto',
    padding: '2em',
    borderRadius: '2em',
    height: 'fit-content',
    backgroundColor: theme.palette.grey[200],
    [theme.breakpoints.down('sm')]: {
      width: '100%',
      height: 'fit-content',
    },
    [theme.breakpoints.up('md')]: {
      width: '50%',
    }
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

export default function Home ({ wallet, removePrivateKey, ein }) {
  const classes = useStyles()
  const context = useWeb3Context()
  const _1484 = useContract("1484")
  const snowflake = useContract("Snowflake")
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
      removePrivateKey()
  }, [logs.SnowMoSignup])

  // keep track of stuff that can change every block
  const [maxEIN, setMaxEIN] = useState()
  const [snowflakeBalance, setSnowflakeBalance] = useState()

  function updateMaxEIN () {
    _1484.functions.nextEIN()
      .then(latestMaxEIN => {
        if (latestMaxEIN.toNumber() !== maxEIN)
          setMaxEIN(latestMaxEIN.toNumber())
      })
  }

  function updateSnowflakeBalance () {
    snowflake.functions.deposits(ein)
      .then(latestSnowflakeBalance => {
        const newSnowflakeBalance = Number(toDecimal(latestSnowflakeBalance.toString(10), 18))
        if (newSnowflakeBalance !== snowflakeBalance)
          setSnowflakeBalance(newSnowflakeBalance)
      })
  }

  useNetworkEffect(() => {
    updateMaxEIN()
    updateSnowflakeBalance()
    context.library.on('block', updateMaxEIN)
    context.library.on('block', updateSnowflakeBalance)
    return () => context.library.removeAllListeners('block')
  })

  // TODO actually add dai balance
  const daiBalance = 0

  return (
    <div className={classes.wrapper}>
      <Header
        log={logs.SnowMoSignup} wallet={wallet} ein={ein}
        snowflakeBalance={snowflakeBalance} daiBalance={daiBalance}
        removePrivateKey={removePrivateKey}
      />
      <SendTo wallet={wallet} ein={ein} maxEIN={maxEIN} snowflakeBalance={snowflakeBalance} />
      <Logs logs={logs} logNames={Object.keys(logFilterArguments)} />
    </div>
  )
}
