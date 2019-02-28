import React from 'react'
import { gql } from 'apollo-boost'
import { Query } from 'react-apollo'
import Chip from '@material-ui/core/Chip';
import MUIDataTable from "mui-datatables";
import { makeStyles } from '@material-ui/styles';
import { utils } from 'ethers'
import moment from 'moment'
import { createMuiTheme, MuiThemeProvider } from '@material-ui/core/styles';
import { ReactComponent as Spinner } from '../assets/spinner.svg'

import { getEtherscanLink } from '../utilities'
import { ReactComponent as DaiLogo } from '../assets/dai.svg'
import { ReactComponent as HydroLogo } from '../assets/hydro.svg'

const LOGS_QUERY = gql`
  query allLogs($ein: Int!) {
    snowMoTransfersTo: snowMoTransfers(where: { einTo: $ein }) {
      einFrom
      einTo
      amount
      message
      transactionHash
      blockNumber
      timestamp
    }
    snowMoTransfersFrom: snowMoTransfers(where: { einFrom: $ein }) {
      einFrom
      einTo
      amount
      message
      transactionHash
      blockNumber
      timestamp
    }
    snowMoWithdrawFromVias(where: { einFrom: $ein }) {
      einFrom
      to
      via
      amount
      message
      transactionHash
      blockNumber
      timestamp
    }
  }
`

const theme = createMuiTheme({
  typography: { useNextVariants: true },
  overrides: {
    MuiPaper: {
      root: {
        display: 'grid'
      }
    },
    MuiTableCell: {
      root: {
        overflowX: 'auto'
      }
    }
  }
})

const columns = [
  {
    name: 'Type',
    options: {
      customBodyRender: value => {
        return value === 'Sent'
          ? <Chip label={value} style={{ color: 'white', backgroundColor: 'red' }} />
          : <Chip label={value} style={{ color: 'white', backgroundColor: 'green' }} />
      }
    }
  },
  'Counterparty',
  {
    name: 'Currency',
    options: {
      customBodyRender: value => {
        return value === 'DAI'
          ? <DaiLogo style={{height: '2em'}} />
          : <HydroLogo style={{ height: '2em' }} />
      }
    }
  },
  'Amount',
  'Message',
  {
    name: 'Time',
    options: {
      customBodyRender: value => {
        return moment().diff(moment.unix(value), 'hours', true) < 1
          ? moment.unix(value).fromNow()
          : moment.unix(value).calendar()
      }
    }
  },
  {
    name: 'Transaction',
    options: {
      customBodyRender: value => (
        <a
          href={getEtherscanLink(4, 'transaction', value)} // TODO refacor from static
          target='_blank'
          rel='noopener noreferrer'
        >
          {value.substring(0, 6)}
          ...
          {value.substring(value.length - 4)}
        </a>
      )
    }
  }
]

const options = {
  expandableRows: false,
  rowsPerPage: 5,
  rowsPerPageOptions: [5, 10, 25, 50],
  responsive: 'scroll',
  print: false,
  search: false,
  sort: false,
  filter: false,
  selectableRows: false,
  rowHover: false
}

const useStyles = makeStyles({
  title: {
    marginTop: '2em'
  },
  spinner: {
    fill: theme.palette.secondary.main
  },
  spinnerWrapper: {
    display: 'flex',
    justifyContent: 'center'
  }  
})


// TODO investigate potentially unnecessary re-renders when logs are added by the .on event listener
export default function Logs ({ ein }) {
  const classes = useStyles()

  return (
    <Query
      query={LOGS_QUERY}
      variables={{ ein }}
    >
      {({ data, error, loading }) => {
        if (loading)
          return (
            <div className={classes.spinnerWrapper}>
              <Spinner className={classes.spinner} />
            </div>
          )

        if (error) {
          return null
        }

        const { snowMoTransfersFrom, snowMoTransfersTo, snowMoWithdrawFromVias } = data
        const validLogs = snowMoTransfersFrom.concat(snowMoTransfersTo).concat(snowMoWithdrawFromVias)

        validLogs.sort((a, b) => {
          if (Number(a.blockNumber) > Number(b.blockNumber)) return 1
          if (Number(a.blockNumber) < Number(b.blockNumber)) return -1

          return 0
        })

        validLogs.reverse()

        const parsedData = validLogs.map(log => {
          const transferType = Number(log.einFrom) === ein ? 'Sent' : 'Received'
          const otherIdentity = (log.to && log.via) ? 'Dai-llar General' : (
            transferType === 'Sent' ? log.einTo : log.einFrom
          )

          // actually should be fetching from uniswap logs...
          const daiAmount = otherIdentity === 'Dai-llar General' ? 1 : null
          // actually should be decoding...
          const message = log.message === '' ? '' : '<Decoding Error>'

          const isDai = !!daiAmount

          return [
            transferType,
            otherIdentity,
            isDai ? 'DAI' : 'HYDRO',
            isDai ? daiAmount : Math.round(Number(utils.formatUnits(log.amount, 18))),
            message,
            log.timestamp,
            log.transactionHash
          ]
        })

        return (
          <div className={classes.title}>
            <MuiThemeProvider theme={theme}>
              <MUIDataTable
                MUIDataTable
                title="Transfer History"
                data={parsedData}
                columns={columns}
                options={options}
              />
            </MuiThemeProvider>
          </div>
        )
      }}
    </Query>
  )
}
