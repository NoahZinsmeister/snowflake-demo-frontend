import React from 'react'
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
export default function Logs ({ logs, logNames }) {
  const classes = useStyles()
  const allLogsLoaded = logNames.every(logName => logName in logs)

  function getTable () {
    if (!allLogsLoaded) return (
      <div className={classes.spinnerWrapper}>
        <Spinner className={classes.spinner} />
      </div>
    )

    const validTransferFromLogs = logs.TransferFrom.filter(l => !l.removed)
    const validWithdrawFromViaLogs = logs.WithdrawFromVia.filter(l => !l.removed)
    const validLogs = validTransferFromLogs.concat(validWithdrawFromViaLogs)

    validLogs.sort((a, b) => {
      if (a.blockNumber > b.blockNumber) return 1
      if (a.blockNumber < b.blockNumber) return -1

      if (a.transactionIndex > b.transactionIndex) return -1
      if (a.transactionIndex < b.transactionIndex) return 1

      return 0
    })

    validLogs.reverse()

    const data = validLogs.map((log, i) => {
      const identityTo = log.identityTo
        ? log.identityTo
        : (
            log.transferType === 'Sent'
              ? ((log.decoded.einTo && log.decoded.einTo.toNumber()) || log.einTo.toNumber())
              : log.decoded.einFrom.toNumber()
          )

      const daiAmount = log.daiAmount && Math.round(Number(utils.formatUnits(log.daiAmount, 18)))
      const isDai = !!daiAmount

      return [
        log.transferType,
        identityTo,
        isDai ? 'DAI' : 'HYDRO',
        isDai ? daiAmount : Math.round(Number(utils.formatUnits(log.decoded.amount, 18))),
        log.decodedMessage || '',
        log.timestamp,
        log.transactionHash
      ]
    })

    return (
      <MUIDataTable
        MUIDataTable
        title="Transfer History"
        data={data}
        columns={columns}
        options={options}
      />
    )
  }

  return (
    <div className={classes.title}>
      <MuiThemeProvider theme={theme}>
        {getTable()}
      </MuiThemeProvider>
    </div>
  )
}
