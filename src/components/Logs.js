import React, { useState } from 'react'
import Typography from '@material-ui/core/Typography';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import DateIcon from '@material-ui/icons/DateRangeSharp';
import Checkbox from '@material-ui/core/Checkbox';
import { makeStyles } from '@material-ui/styles';
import { useWeb3Context } from 'web3-react/hooks'
import { toDecimal, getEtherscanLink } from 'web3-react/utilities'
import moment from 'moment'
import { ReactComponent as DaiLogo } from '../assets/dai.svg'
import { ReactComponent as HydroLogo } from '../assets/hydro.svg'

const useStyles = makeStyles({
  title: {
    padding: '.75em'
  },
  checkboxCell: {
    whiteSpace: 'nowrap',
  },
  checkbox: {
    marginLeft: '.25em !important',
    padding: '0 !important',
  },
  tableRoot: {
    width: '100%',
    overflowX: 'auto'
  },
  table: {
    tableLayout: 'fixed'
  },
  logo: {
    height: '1em'
  }
})


// TODO investigate potentially unnecessary re-renders when logs are added by the .on event listener
export default function Logs ({ logs, logNames }) {
  const classes = useStyles()
  const context = useWeb3Context()
  const allLogsLoaded = logNames.every(logName => logName in logs)

  const [absoluteDates, setAbsoluteDates] = useState(false)

  function getLogDisplayData () {
    if (!allLogsLoaded) return (
      <Typography variant='body1' align='center' paragraph={true}>
        Loading...
      </Typography>
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

    if (validLogs.length === 0) return (
      <Typography variant='body1' align='center' paragraph={true}>
        No Transfer History
      </Typography>
    )

    return (
      <div className={classes.tableRoot}>
        <Table className={classes.table}>
          <TableHead>
            <TableRow>
              <TableCell align='right'>Type</TableCell>
              <TableCell align='right'>Counterparty</TableCell>
              <TableCell align='right'></TableCell>
              <TableCell align='right'>Amount</TableCell>
              <TableCell className={classes.checkboxCell}>
                Time
                <Checkbox
                  className={classes.checkbox} icon={<DateIcon fontSize="small" />} checkedIcon={<DateIcon fontSize="small" />}
                  onChange={() => setAbsoluteDates(!absoluteDates)}
                />
              </TableCell>
              <TableCell align='right'>Transaction Hash</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {validLogs.reverse().map((log, i) => {
              const relativeDate = moment().diff(moment.unix(log.timestamp), 'hours', true) < 1 ?
                moment.unix(log.timestamp).fromNow() :
                moment.unix(log.timestamp).calendar()

              const daiAmount = log.daiAmount && Number(toDecimal(log.daiAmount.toString(10), 18))
              const formattedDaiAmount = daiAmount && (daiAmount < .01 ? '<.01' : Math.round(daiAmount * 100) / 100)

              return (
                <TableRow key={i}>
                  <TableCell align='right'>{log.transferType}</TableCell>
                  <TableCell align='right'>
                    {log.transferType === 'Sent' ?
                      ((log.decoded.einTo && log.decoded.einTo.toNumber()) || log.einTo.toNumber()) :
                      log.decoded.einFrom.toNumber()
                    }
                  </TableCell>
                  <TableCell align='right' padding='checkbox'>
                    {formattedDaiAmount ? <DaiLogo className={classes.logo} /> : <HydroLogo className={classes.logo} />}
                  </TableCell>
                  <TableCell align='right'>
                    {formattedDaiAmount ? formattedDaiAmount : toDecimal(log.decoded.amount.toString(10), 18)}
                  </TableCell>
                  <TableCell>{absoluteDates ? moment.unix(log.timestamp).format('L LT') : relativeDate}</TableCell>
                  <TableCell align='right'>
                    <a
                      href={getEtherscanLink(context.networkId, 'transaction', log.transactionHash)}
                      target='_blank'
                      rel='noopener noreferrer'
                    >
                      {log.transactionHash.substring(0, 6)}
                      ...
                      {log.transactionHash.substring(log.transactionHash.length - 4)}
                    </a>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <>
      <Typography className={classes.title} variant='h6' align='center'>
        Transfer History
      </Typography>
      {getLogDisplayData()}
    </>
  )
}
