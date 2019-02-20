import React, { useState, useReducer, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import Snackbar from '@material-ui/core/Snackbar';
import Button from '@material-ui/core/Button'
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import WalletIcon from '@material-ui/icons/AccountBalanceWallet';
import StoreIcon from '@material-ui/icons/Store';
import IconButton from '@material-ui/core/IconButton';
import SettingsIcon from '@material-ui/icons/Settings';
import { makeStyles } from '@material-ui/styles';
import { useWeb3Context } from 'web3-react'
import { utils } from 'ethers'


import { ReactComponent as Spinner } from '../assets/spinner.svg'
import { getEINDetails } from '../utilities'
import { useContract, useBlockValue } from '../hooks'
import { getEtherscanLink, decryptMessage } from '../utilities'
import SettingsModal from '../components/SettingsModal'
import Header from '../components/Header'
import SendTo from '../components/SendTo'
import Logs from '../components/Logs'
import BuyFrom from '../components/BuyFrom';

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
  },
  settingsIcon: {
    right: '-.75em',
    top: '-.75em',
    padding: '.25em !important',
  },
  settingsWrapper: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginBottom: '-.75em',
  },
  navigation: {
    marginBottom: '1em',
  },
  spinner: {
    fill: theme.palette.secondary.main
  },
  spinnerWrapper: {
    margin: 'auto'
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

export default function Home ({
  wallet, ein,
  creationTransactionHash,
  currentTransactionHash, setCurrentTransactionHash, removeCurrentTransactionHash,
  resetDemo, tab
}) {
  const classes = useStyles()
  const context = useWeb3Context()
  const _1484 = useContract("1484")
  const snowflake = useContract("Snowflake")
  const [logs, dispatchLogs] = useReducer(logsReducer, {})

  const [settingsModalOpen, setSettingsModalOpen] = useState(false)
  const snowMoResolver = useContract("SnowMoResolver")

  // unset the current transaction hash whenever it's mined
  useEffect(() => {
    if (currentTransactionHash) {
      context.library.waitForTransaction(currentTransactionHash)
        .then(() => removeCurrentTransactionHash())
    }
  }, [currentTransactionHash])

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

    // add the transfer type
    if (log.decoded.einFrom) {
      if (log.decoded.einFrom.toNumber() === ein) {
        log.transferType = 'Sent'
      } else {
        log.transferType = 'Received'
      }

      const otherEIN = log.transferType === 'Sent' ? log.decoded.einTo : log.decoded.einFrom

      if (log.decoded.message !== '') {
        try {
          const { publicKey } = await getEINDetails(context.library, otherEIN)
          log.decodedMessage = decryptMessage(log.decoded.message, wallet.privateKey, publicKey)
        } catch (error) {
          console.error('Unable to decrypt data.')
        }
      } else {
        log.decodedMessage = ''
      }
    }

    // add identities to WithdrawFromVia logs
    if (!log.decoded.einTo && log.decoded.to) {
      const receipt = await context.library.getTransactionReceipt(log.transactionHash)
      const uniswapTransfer = receipt.logs.filter(
        l => l.topics[0] === "0xcd60aa75dea3072fbc07ae6d7d856b5dc5f4eee88854f5b4abf7b680ef8bc50f"
      )[0]

      const daiAmount = utils.defaultAbiCoder.decode(['uint256'], uniswapTransfer.topics[3])
      log.daiAmount = daiAmount[0]

      const identityTo = 'Dai-llar General'
      log.identityTo = identityTo
    }

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

  // this clears wallets if we've migrated Snowflake/Resolver addresses
  useEffect(() => {
    if (logs.SnowMoSignup && logs.SnowMoSignup.length === 0) {
      resetDemo()
    }
  }, [logs.SnowMoSignup])

  // keep track of stuff that can change every block
  const maxEIN = useBlockValue(async () => {
    return _1484.functions.nextEIN()
      .then(latestMaxEIN => latestMaxEIN.toNumber())
  }, [])

  const snowflakeBalance = useBlockValue(async () => {
    return snowflake.functions.deposits(ein)
      .then(latestSnowflakeBalance => {
        return Number(utils.formatUnits(latestSnowflakeBalance, 18))
      })
  }, [ein])

  const [isWallet, setIsWallet] = useState(tab === 'wallet' ? 0 : 1)

  const [showSpinner, setShowSpinner] = useState(false)
  useEffect(() => {
    if (!snowflakeBalance || true) {
      const timeout = setTimeout(() => setShowSpinner(true), 500)
      return () => clearTimeout(timeout)
    }
  }, [snowflakeBalance])

  return !snowflakeBalance
    ? (
      <div className={classes.spinnerWrapper}>
        {showSpinner && <Spinner className={classes.spinner} />}
      </div>
    )
    : (
      <div className={classes.wrapper}>
        <div className={classes.settingsWrapper}>
          <IconButton className={classes.settingsIcon} onClick={() => setSettingsModalOpen(true)}>
            <SettingsIcon />
          </IconButton>
        </div>

        <SettingsModal
          wallet={wallet}
          creationTransactionHash={creationTransactionHash}
          resetDemo={resetDemo}
          open={settingsModalOpen} onClose={() => setSettingsModalOpen(false)}
        />

        <Header
          wallet={wallet} ein={ein}
          snowflakeBalance={snowflakeBalance}
        />

        <Tabs
          value={isWallet}
          onChange={() => setIsWallet(v => v === 0 ? 1 : 0)}
          variant='fullWidth'
          centered
          indicatorColor="secondary"
          textColor="secondary"
          classes={{root: classes.navigation}}
        >
          <Tab component={Link} to={'/wallet'} icon={<WalletIcon />} label="Wallet" />
          <Tab component={Link} to={'/store'} icon={<StoreIcon />} label="Store" />
        </Tabs>

        {isWallet === 0
          ? (
            <SendTo
              wallet={wallet} ein={ein} maxEIN={maxEIN} snowflakeBalance={snowflakeBalance}
              currentTransactionHash={currentTransactionHash}
              setCurrentTransactionHash={setCurrentTransactionHash}
            />
          )
          : (
            <BuyFrom
              wallet={wallet} ein={ein} snowflakeBalance={snowflakeBalance}
              amountPurchased={logs && logs.WithdrawFromVia && logs.WithdrawFromVia.filter(log => !!log.identityTo).length}
              currentTransactionHash={currentTransactionHash}
              setCurrentTransactionHash={setCurrentTransactionHash}
            />
          )
        }
        <Logs logs={logs} logNames={Object.keys(logFilterArguments)} />

        <Snackbar
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          open={!!currentTransactionHash}
          message={<span>Waiting on Transaction...</span>}
          action={[
            <Button
              component='a' target='_blank' href={getEtherscanLink(context.networkId, 'transaction', currentTransactionHash)}
              key="etherscan" size="small" color='secondary'
            >
              Link
            </Button>
          ]}
        />
      </div>
  )
}
