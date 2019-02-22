import React, { useState, useEffect } from 'react'
import Button from '@material-ui/core/Button'
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/styles';
import { ethers, utils } from 'ethers'
import couch from '../assets/couch.png';

import TransactionController from './TransactionController'
import { Balances } from './IdentityCard'
import { daillarGeneralAddress } from '../utilities'
import { useContract } from '../hooks'

const useStyles = makeStyles({
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  flexed: {
    display: 'flex',
    flex: '1 1 auto',
    alignItems: 'center',
    justifyContent: 'center'
  },
  couch: {
    maxWidth: '30em',
    width: '80%',
    filter: 'brightness(175%)',
    userSelect: 'none'
  },
  couchWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',    
  },
  couchPriceWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    flexWrap: 'wrap'    
  },
  title: {
    marginTop: '2em'
  },
  ownedCount: {
    margin: '2em',
  }
})

export default function BuyFrom ({
  wallet, ein, amountPurchased, snowflakeBalance, currentTransactionHash, setCurrentTransactionHash
}) {
  const classes = useStyles()

  const DaiExchange = useContract("DaiExchange")
  const HydroExchange = useContract("HydroExchange")

  const daiAmount = utils.parseUnits('1', 18)

  const [ethRequired, setEthRequired] = useState()
  const [hydroRequired, setHydroRequired] = useState()

  const canSend = (
    !currentTransactionHash && !!hydroRequired && utils.formatUnits(roundAmount(hydroRequired), 18) <= snowflakeBalance
  )

  useEffect(() => {
    DaiExchange.functions.getEthToTokenOutputPrice(daiAmount)
      .then(amount => setEthRequired(amount))
  }, [])

  useEffect(() => {
    if (ethRequired)
      HydroExchange.functions.getTokenToEthOutputPrice(ethRequired)
        .then(amount => setHydroRequired(amount))
  }, [ethRequired])

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

      <div className={classes.ownedCount}>
        {Number.isInteger(amountPurchased) && amountPurchased >= 1 && (
          <Typography variant='body2' align='center'>
            Congratulations! You're the proud owner of {amountPurchased} Dai-llar General {amountPurchased === 1 ? 'couch' : 'couches'}!
          </Typography>
        )}
      </div>

      <div className={classes.couchWrapper}>
        <img src={couch} alt="Couch" className={classes.couch} />
      </div>

      <div className={classes.couchPriceWrapper}>
        <Balances type='DAI' balance={1} showBadge={amountPurchased === 0} />
      </div>

      {Number.isInteger(amountPurchased) && (
        <>
          <Typography variant='body1' align='center' >
            Welcome to the Dai-llar General! For just 1 DAI, you can purchase an exclusive digital couch. It looks like you only have HYDRO, but that's ok. Thanks to <a href='https://uniswap.io/' target='_blank' rel='noopener noreferrer'>Uniswap</a> and <a href='https://erc1484.org/' target='_blank' rel='noopener noreferrer'>ERC1484</a>, we can instantly transfer your HYDRO into DAI.
          </Typography>

          <div className={classes.couchPriceWrapper}>
            {hydroRequired && (
              <div className={classes.flexed}>
                <Balances
                  type='Hydro' balance={utils.commify(Math.round(Number(utils.formatUnits(roundAmount(hydroRequired), 18))))} showBadge={false}
                />
              </div>
            )}

            <div className={classes.flexed}>
              <TransactionController
                method={method}
                onTransactionHash={setCurrentTransactionHash}
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
                    case 'receipt': {
                      return (
                        <Button
                          variant='contained' color='secondary'
                          onClick={transactionControllers.resetTransaction}
                        >
                          Success! Buy another?
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
          </div>
        </>
      )}
    </>
  )
}
