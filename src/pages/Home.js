import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { gql } from 'apollo-boost'
import { Query } from 'react-apollo'
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
import { useContract, useBlockValue } from '../hooks'
import { getEtherscanLink } from '../utilities'
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

const LOGS_QUERY = gql`
  query allLogs($ein: Int!) {
    snowMoEntities(where: { ein: $ein }) {
      transactionHash
      blockNumber
      timestamp
    }
    snowMoWithdrawFromVias(where: { einFrom: $ein }) {
      id
    }
  }
`

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

  const [settingsModalOpen, setSettingsModalOpen] = useState(false)

  // unset the current transaction hash whenever it's mined
  useEffect(() => {
    if (currentTransactionHash) {
      context.library.waitForTransaction(currentTransactionHash)
        .then(() => removeCurrentTransactionHash())
    }
  }, [currentTransactionHash])

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
      const timeout = setTimeout(() => setShowSpinner(true), 250)
      return () => clearTimeout(timeout)
    }
  }, [snowflakeBalance])

  return (
    <Query
      query={LOGS_QUERY}
      variables={{ ein }}
    >
      {({ data, error, loading }) => {
        // if (error) console.error(error)
        if (!snowflakeBalance || loading || error)
          return (
            <div className={classes.spinnerWrapper}>
              {showSpinner && <Spinner className={classes.spinner} />}
            </div>
          )

        // if (!data.snowMoEntities[0]) {
        //   // this clears wallets if we've migrated Snowflake/Resolver addresses
        //   resetDemo()
        // }

        return (
          <div className={classes.wrapper}>
            <div className={classes.settingsWrapper}>
              <IconButton className={classes.settingsIcon} onClick={() => setSettingsModalOpen(true)}>
                <SettingsIcon />
              </IconButton>
            </div>

            <SettingsModal
              wallet={wallet}
              creationTransactionHash={/*data.snowMoEntities[0].transactionHash*/'0x72da266529f64010d4f2780e1ab3fe7b9aae2a2f3758465433056da3c75f426d'}
              resetDemo={resetDemo}
              open={settingsModalOpen} onClose={() => setSettingsModalOpen(false)}
            />

            <Header
              wallet={wallet} ein={ein}
              snowflakeBalance={snowflakeBalance}
            />

            <Tabs
              value={isWallet}
              onChange={(_, value) => setIsWallet(value)}
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
                  amountPurchased={data.snowMoWithdrawFromVias.length}
                  currentTransactionHash={currentTransactionHash}
                  setCurrentTransactionHash={setCurrentTransactionHash}
                />
              )
            }
            <Logs ein={ein} />

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
     }}
    </Query>
  )
}
