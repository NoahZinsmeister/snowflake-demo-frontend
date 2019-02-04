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

    const validLogs = logs.TransferFrom.filter(l => !l.removed)

    if (validLogs.length === 0) return (
      <Typography variant='body1' align='center' paragraph={true}>
        No History Yet
      </Typography>
    )

    return (
      <div className={classes.tableRoot}>
        <Table className={classes.table}>
          <TableHead>
            <TableRow>
              <TableCell className={classes.checkboxCell}>
                Time
                <Checkbox
                  className={classes.checkbox} icon={<DateIcon fontSize="small" />} checkedIcon={<DateIcon fontSize="small" />}
                  onChange={() => setAbsoluteDates(!absoluteDates)}
                />
              </TableCell>
              <TableCell align='right'>From</TableCell>
              <TableCell align='right'>To</TableCell>
              <TableCell align='right'>Amount</TableCell>
              <TableCell align='right'>Transaction Hash</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {validLogs.reverse().map((log, i) => {
              const relativeDate = moment().diff(moment.unix(log.timestamp), 'hours', true) < 1 ?
                moment.unix(log.timestamp).fromNow() :
                moment.unix(log.timestamp).calendar()

              return (
                <TableRow key={i}>
                  <TableCell>{absoluteDates ? moment.unix(log.timestamp).format('L LT') : relativeDate}</TableCell>
                  <TableCell align='right'>{log.decoded.einFrom.toNumber()}</TableCell>
                  <TableCell align='right'>{log.decoded.einTo.toNumber()}</TableCell>
                  <TableCell align='right'>{toDecimal(log.decoded.amount.toString(10), 18)}</TableCell>
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
