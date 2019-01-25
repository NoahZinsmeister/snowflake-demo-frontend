import React from 'react'
import Typography from '@material-ui/core/Typography';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import { toDecimal } from 'web3-react/utilities'

// TODO investigate potentially unnecessary re-renders when logs are added by the .on event listener
export default function Logs ({ logs, logNames }) {
  const allLogsLoaded = logNames.every(logName => logName in logs)

  console.log('rendering logs')

  return allLogsLoaded && (
    <Paper>
      <Typography variant="h6">
       TransferFrom
     </Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Block Number</TableCell>
            <TableCell align="right">From</TableCell>
            <TableCell align="right">To</TableCell>
            <TableCell align="right">Amount</TableCell>
            <TableCell align="right">Transaction Hash</TableCell>
            <TableCell align="right">Removed</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {logs.TransferFrom.map((log, i) => {
            return (
            <TableRow key={i}>
              <TableCell component="th" scope="row">
                {log.blockNumber}
              </TableCell>
              <TableCell align="right">{log.decoded.einFrom.toNumber()}</TableCell>
              <TableCell align="right">{log.decoded.einTo.toNumber()}</TableCell>
              <TableCell align="right">{toDecimal(log.decoded.amount.toString(10), 18)}</TableCell>
              <TableCell align="right">{log.transactionHash}</TableCell>
              <TableCell align="right">{log.removed}</TableCell>
            </TableRow>
          )})}
        </TableBody>
      </Table>
    </Paper>
  )
}
