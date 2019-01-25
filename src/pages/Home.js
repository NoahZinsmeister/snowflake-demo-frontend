import React, { useReducer, useEffect, useRef, useContext } from 'react'
import Typography from '@material-ui/core/Typography'
import { useWeb3Context } from 'web3-react/hooks'

import { CookieContext } from '../contexts'
import { useContract } from '../hooks/general'
import ResetCookie from '../components/ResetCookie'
import SendTo from '../components/SendTo'

const logNames = ["SnowMoSignup", "TransferFrom", "WithdrawFrom", "WithdrawFromVia"]

function logsReducer (state, action) {
  switch (action.type) {
    case 'UPDATE': {
      const { logName, logs } = action.payload
      return { ...state, [logName]: logs }
    }
    default:
      throw Error('No default case.')
  }
}

export default function Home ({ ein }) {
  const context = useWeb3Context()
  const cookieContext = useContext(CookieContext)
  const [logs, dispatchLogs] = useReducer(logsReducer, {})

  const snowMoResolver = useContract("SnowMoResolver")

  function initializeFilter (logName) {
    const filter = snowMoResolver.filters[logName](ein)
    filter.fromBlock = 3749195
    return filter
  }

  const filters = useRef(logNames.reduce(
    (accumulator, logName) => {
      accumulator[logName] = initializeFilter(logName)
      return accumulator
    },
    {}
  ))

  // TODO expose this via a refresh button
  useEffect(() => {
    Object.keys(filters.current).forEach(logName => {
      context.library.getLogs(filters.current[logName])
        .then(logs => dispatchLogs({ type: 'UPDATE', payload: { logName, logs }}))
    })
  }, [])

  // TODO add .on listeners to SnowMo contract for new events

  // on the (very) off chance the wallet has an EIN but no SnowMoSignup event, clear their wallet
  useEffect(() => {
    if (logs.SnowMoSignup && logs.SnowMoSignup.length === 0)
      cookieContext.resetCookie()
  }, [logs.SnowMoSignup])

  return (
    <>
      <Typography>Your EIN: {ein}</Typography>
      <SendTo ein={ein}/>
      <ResetCookie />
    </>
  )
}
