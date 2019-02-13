import React, { useState, useEffect } from 'react'
import Button from '@material-ui/core/Button'
import Snackbar from '@material-ui/core/Snackbar';
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/styles';
import { useWeb3Context } from 'web3-react'
import { ethers, utils } from 'ethers'
import couch from '../assets/couch.png';

import TransactionController from './TransactionController'
import { Balances } from './IdentityCard'
import { getEtherscanLink, daillarGeneralAddress } from '../utilities'
import { useContract } from '../hooks'

const useStyles = makeStyles({
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  input: {
    flex: '1 1 auto',
    margin: '1em !important',
  },
  button: {
    flex: '0 1 auto',
    margin: '1em !important',
  },
  couch: {
    width: '80%',
    filter: 'brightness(175%)',
    userSelect: 'none'
  },
  couchWrapper: {
    marginTop: '2em',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',    
  },
  couchPriceWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    marginTop: '2em'
  }
})

export default function BuyFrom ({ wallet, ein, hasPurchased, snowflakeBalance }) {
  const classes = useStyles()

  const DaiExchange = useContract("DaiExchange")
  const HydroExchange = useContract("HydroExchange")

  const daiAmount = utils.parseUnits('1', 18)

  const [ethRequired, setEthRequired] = useState()
  const [hydroRequired, setHydroRequired] = useState()

  const canSend = (!!hydroRequired && utils.formatUnits(roundAmount(hydroRequired), 18) <= snowflakeBalance)

  useEffect(() => {
    DaiExchange.functions.getEthToTokenOutputPrice(daiAmount)
      .then(amount => setEthRequired(amount))
  }, [])

  useEffect(() => {
    if (ethRequired)
      HydroExchange.functions.getTokenToEthOutputPrice(ethRequired)
        .then(amount => setHydroRequired(amount))
  }, [ethRequired])
 
  const [transactionHash, setTransactionHash] = useState()

  function addTransactionHash(transactionHash) {
    setTransactionHash(transactionHash)
  }

  function removeTransactionHash() {
    setTransactionHash(undefined)
  }

  const context = useWeb3Context()
  const DAI = useContract("DAI")
  const snowMoResolver = useContract("SnowMoResolver")
  const snowflake = useContract("Snowflake")

  async function getSignedPermission (transactionBytes) {
    const nonce = await snowflake.functions.signatureNonce(ein)

    const allowAndCallMessage = ethers.utils.arrayify(ethers.utils.solidityKeccak256(
      ['bytes1', 'bytes1', 'address', 'string', 'uint256', 'address', 'uint256', 'bytes', 'uint256'],
      [
        '0x19', '0x00', snowflake.address, 'I authorize this allow and call.',
        ein, snowMoResolver.address, roundAmount(hydroRequired), transactionBytes, nonce.toString()
      ]
    ))

    return wallet.signMessage(allowAndCallMessage)
      .then(signature => ethers.utils.splitSignature(signature))
  }

  async function method () {
    // encode snowMoResolver.functions.forceWithdrawToVia
    const functionSelector = ethers.utils.hexDataSlice(
      ethers.utils.id('forceWithdrawToVia(uint256,address,uint256,address,string)'), 0, 4
    )

    const abiEncodedArguments = ethers.utils.defaultAbiCoder.encode(
      ['uint256', 'address', 'uint256', 'address', 'string'],
      [ein, daillarGeneralAddress, roundAmount(hydroRequired), DAI.address, '']
    )
    const transactionBytes = `${functionSelector}${abiEncodedArguments.substring(2)}`

    const permission = await getSignedPermission(transactionBytes)

    const to = snowflake.address
    const transactionData = snowflake.interface.functions.allowAndCallDelegated.encode([
      snowMoResolver.address, roundAmount(hydroRequired), transactionBytes, wallet.address,
      permission.v, permission.r, permission.s
    ])

    return { to, transactionData }
  }

  function roundAmount (amount) {
    return utils.parseUnits(Math.round(utils.formatUnits(amount, 18)).toString(), 18)
  }

  return (
    <>
      <div className={classes.title}>
        <Typography variant='h5' align='center' >
          Dai-llar General
        </Typography>
      </div>

      <div className={classes.couchWrapper}>
        <img src={couch} alt="Couch" className={classes.couch} />
      </div>

      <div className={classes.couchPriceWrapper}>
        <Balances type='DAI' balance={1} showBadge={!hasPurchased} />
      </div>

      {hasPurchased
        ? (
          <Typography variant='body2' align='center' >
            Congratulations! You're the proud owner of a Dai-llar General couch!
          </Typography>
        )
        : (
          <>
            <Typography variant='body1' align='center' >
              Welcome to the Dai-llar General. For just 1 DAI, you can purchase our exclusive digital couch. It looks like you only have HYDRO, but that's ok! Thanks to <a href='https://uniswap.io/' target='_blank' rel='noopener noreferrer'>Uniswap</a> and ERC1484, we can instantly transfer your HYDRO into DAI!
            </Typography>

            <div className={classes.couchPriceWrapper}>
              {hydroRequired && <Balances type='Hydro' balance={utils.formatUnits(roundAmount(hydroRequired), 18)} showBadge={false} />}

            <TransactionController
              method={method}
              onTransactionHash={addTransactionHash}
              onReceipt={removeTransactionHash}
            >
              {(transactionState, transactionControllers) => {
                switch (transactionState) {
                  case 'unsent': {
                    return (
                      <Button
                        disabled={!canSend}
                        variant='contained' color='secondary'
                        onClick={transactionControllers.sendTransaction}
                      >
                        Buy
                      </Button>
                    )
                  }
                  case 'waitingOnTransactionHash':
                  case 'waitingOnConfirmation': {
                    return (
                      <Button
                        disabled={true}
                        variant='contained' color='secondary'
                      >
                        Purchasing...
                      </Button>
                    )
                  }
                  case 'error': {
                    return (
                      <Button
                        variant='contained' color='secondary'
                        onClick={transactionControllers.resetTransaction}
                      >
                        Error. Try again?
                      </Button>
                    )
                  }
                  default:
                    return null
                }
              }}
            </TransactionController>
            </div>
          </>
        )
      }

      <div>
        <Snackbar
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          open={!!transactionHash}
          message={<span>Waiting on Transaction...</span>}
          action={[
            <Button
              component='a' target='_blank' href={getEtherscanLink(context.networkId, 'transaction', transactionHash)}
              key="etherscan" size="small" color='secondary'
            >
              Link
            </Button>
          ]}
        />
      </div>
    </>
  )
}
